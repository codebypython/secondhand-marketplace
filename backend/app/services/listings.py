from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.enums import ListingStatus, NotificationType
from app.models.listing import Category, Listing
from app.models.user import User
from app.schemas.listing import CategoryCreate, ListingCreate, ListingUpdate
from app.services.ai import classify_image_via_ai
from app.services.notification import create_notification
from app.services.audit import log_activity


def normalize_text(text: str | None) -> str:
    if not text:
        return ""
    import unicodedata
    text = text.lower()
    nfkd_form = unicodedata.normalize('NFKD', text)
    without_diacritics = "".join([c for c in nfkd_form if not unicodedata.combining(c)])
    without_diacritics = without_diacritics.replace('đ', 'd').replace('Đ', 'd')
    return without_diacritics.strip()


def check_category_cycle(session: Session, parent_id: str | None, current_id: str | None = None) -> None:
    """Walk up the parent chain to detect circular references in category hierarchy."""
    if parent_id is None:
        return
    visited: set[str] = set()
    temp_id = parent_id
    while temp_id:
        if current_id and temp_id == current_id:
            raise ValueError("Tạo danh mục bị lặp vòng tuần hoàn (Category cycle detected)!")
        if temp_id in visited:
            break  # already-existing cycle in data, stop walking
        visited.add(temp_id)
        parent = session.get(Category, temp_id)
        temp_id = parent.parent_id if parent else None


def list_categories(session: Session) -> list[Category]:
    return list_categories_for_real(session)


def list_categories_for_real(session: Session) -> list[Category]:
    return list(session.scalars(select(Category).order_by(Category.name.asc())))


def create_category(session: Session, payload: CategoryCreate) -> Category:
    if payload.parent_id:
        check_category_cycle(session, payload.parent_id)
    category = Category(name=payload.name, parent_id=payload.parent_id, slug=payload.slug, image_url=payload.image_url)
    session.add(category)
    session.commit()
    session.refresh(category)
    return category


def create_listing(session: Session, owner: User, payload: ListingCreate) -> Listing:
    owner.ensure_active()
    listing = Listing(owner_id=owner.id, **payload.model_dump())
    session.add(listing)
    session.flush()

    ai_suggested = None
    if listing.image_urls:
        try:
            ai_result = classify_image_via_ai(listing.image_urls[0])
            if ai_result.get("is_prohibited"):
                listing.status = ListingStatus.HIDDEN
                log_activity(
                    session,
                    actor_id=str(owner.id),
                    verb="ai_flag_prohibited",
                    target_type="Listing",
                    target_id=str(listing.id),
                    details={
                        "reason": ai_result.get("prohibited_reason"),
                        "confidence": ai_result.get("confidence"),
                        "image_url": listing.image_urls[0]
                    }
                )
                create_notification(
                    session,
                    recipient_id=str(owner.id),
                    type=NotificationType.SYSTEM,
                    title="Tin đăng bị ẩn do vi phạm chính sách",
                    message=f"Tin đăng '{listing.title}' đã bị ẩn tự động vì hình ảnh vi phạm chính sách: {ai_result.get('prohibited_reason')}.",
                    link="/profile"
                )
            else:
                if not listing.category_id and ai_result.get("category_slug"):
                    cat_slug = ai_result.get("category_slug")
                    db_cat = session.scalar(select(Category).where(Category.slug == cat_slug))
                    if db_cat:
                        listing.category_id = db_cat.id
                        ai_suggested = db_cat.name
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning("AI moderation failed: %s", e)

    log_activity(
        session,
        actor_id=str(owner.id),
        verb="create_listing",
        target_type="Listing",
        target_id=str(listing.id),
        details={"ai_suggested_category": ai_suggested} if ai_suggested else {}
    )
    session.commit()
    return get_listing_or_error(session, listing.id)


def get_listing_or_error(session: Session, listing_id) -> Listing:
    stmt = (
        select(Listing)
        .options(selectinload(Listing.owner).selectinload(User.profile), selectinload(Listing.category))
        .where(Listing.id == listing_id)
    )
    listing = session.scalar(stmt)
    if not listing:
        raise ValueError("Listing not found")
    return listing


def list_listings(
    session: Session,
    search: str | None = None,
    category_id=None,
    condition=None,
    status: ListingStatus | None = None,
    owner_id=None,
    include_deleted: bool = False,
    lat: float | None = None,
    lng: float | None = None,
    radius_km: float | None = None,
) -> list[Listing]:
    stmt = select(Listing).options(
        selectinload(Listing.owner).selectinload(User.profile),
        selectinload(Listing.category),
    )
    if category_id:
        stmt = stmt.where(Listing.category_id == category_id)
    if condition:
        stmt = stmt.where(Listing.condition == condition)
    if status:
        stmt = stmt.where(Listing.status == status)
    if owner_id:
        stmt = stmt.where(Listing.owner_id == owner_id)
    if not include_deleted:
        stmt = stmt.where(Listing.deleted_at.is_(None))
    stmt = stmt.order_by(Listing.created_at.desc())
    results = list(session.scalars(stmt).unique())

    if lat is not None and lng is not None and radius_km is not None:
        import math

        def calculate_haversine_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
            R = 6371.0  # Earth radius in km
            d_lat = math.radians(lat2 - lat1)
            d_lng = math.radians(lng2 - lng1)
            a = (math.sin(d_lat / 2) ** 2 +
                 math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
                 math.sin(d_lng / 2) ** 2)
            c = 2 * math.asin(math.sqrt(a))
            return R * c

        filtered = []
        for item in results:
            if not item.location_data:
                continue
            item_lat = item.location_data.get("lat")
            item_lng = item.location_data.get("lng")
            if item_lat is not None and item_lng is not None:
                dist = calculate_haversine_distance(lat, lng, float(item_lat), float(item_lng))
                if dist <= radius_km:
                    filtered.append(item)
        results = filtered

    if search:
        search_norm = normalize_text(search)
        search_tokens = [t for t in search_norm.split() if t]
        
        if search_tokens:
            scored_results = []
            for item in results:
                score = 0.0
                title_norm = normalize_text(item.title)
                desc_norm = normalize_text(item.description)
                cat_norm = normalize_text(item.category.name) if item.category else ""
                
                title_words = title_norm.split()
                desc_words = desc_norm.split()
                cat_words = cat_norm.split()
                
                # Full query matches
                if search_norm == title_norm:
                    score += 200.0
                elif search_norm in title_norm:
                    score += 100.0
                
                if cat_norm and (search_norm == cat_norm or search_norm in cat_norm):
                    score += 80.0
                
                if search_norm in desc_norm:
                    score += 20.0
                
                # Token word-by-word matches
                for token in search_tokens:
                    # Title matches
                    if token in title_words:
                        score += 15.0
                    elif token in title_norm:
                        score += 5.0
                    
                    # Category matches
                    if cat_norm:
                        if token in cat_words:
                            score += 10.0
                        elif token in cat_norm:
                            score += 3.0
                        
                    # Description matches
                    if token in desc_words:
                        score += 5.0
                    elif token in desc_norm:
                        score += 1.0
                
                if score > 0:
                    scored_results.append((item, score))
            
            # Stable sort: Python's sort is stable, and results is already sorted by created_at desc.
            # So sorting by score desc retains the created_at desc ordering for equal scores.
            scored_results.sort(key=lambda x: x[1], reverse=True)
            results = [x[0] for x in scored_results]
        else:
            # If search is only whitespace, return original results
            pass

    return results


def update_listing(session: Session, actor: User, listing_id, payload: ListingUpdate) -> Listing:
    listing = get_listing_or_error(session, listing_id)
    if listing.owner_id != actor.id:
        raise ValueError("Only the owner can update this listing")
        
    old_image_urls = list(listing.image_urls)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(listing, field, value)
        
    if payload.image_urls is not None and payload.image_urls != old_image_urls and listing.image_urls:
        try:
            ai_result = classify_image_via_ai(listing.image_urls[0])
            if ai_result.get("is_prohibited"):
                listing.status = ListingStatus.HIDDEN
                log_activity(
                    session,
                    actor_id=str(actor.id),
                    verb="ai_flag_prohibited",
                    target_type="Listing",
                    target_id=str(listing.id),
                    details={
                        "reason": ai_result.get("prohibited_reason"),
                        "confidence": ai_result.get("confidence"),
                        "image_url": listing.image_urls[0]
                    }
                )
                create_notification(
                    session,
                    recipient_id=str(actor.id),
                    type=NotificationType.SYSTEM,
                    title="Tin đăng bị ẩn do vi phạm chính sách",
                    message=f"Tin đăng '{listing.title}' đã bị ẩn tự động vì hình ảnh vi phạm chính sách: {ai_result.get('prohibited_reason')}.",
                    link="/profile"
                )
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning("AI moderation failed on update: %s", e)

    listing.touch()
    log_activity(
        session,
        actor_id=str(actor.id),
        verb="update_listing",
        target_type="Listing",
        target_id=str(listing.id)
    )
    session.add(listing)
    session.commit()
    return get_listing_or_error(session, listing.id)


def delete_listing(session: Session, actor: User, listing_id) -> None:
    listing = get_listing_or_error(session, listing_id)
    if listing.owner_id != actor.id:
        raise ValueError("Only the owner can delete this listing")
    listing.soft_delete()
    log_activity(
        session,
        actor_id=str(actor.id),
        verb="delete_listing",
        target_type="Listing",
        target_id=str(listing.id)
    )
    session.add(listing)
    session.commit()


def restore_listing(session: Session, actor: User, listing_id) -> Listing:
    stmt = (
        select(Listing)
        .options(selectinload(Listing.owner).selectinload(User.profile), selectinload(Listing.category))
        .where(Listing.id == listing_id)
    )
    listing = session.scalar(stmt)
    if not listing:
        raise ValueError("Listing not found")
    if listing.owner_id != actor.id:
        raise ValueError("Only the owner can restore this listing")
        
    listing.deleted_at = None
    listing.touch()
    session.add(listing)
    session.commit()
    return listing


def toggle_favorite(session: Session, user: User, listing_id) -> bool:
    listing = get_listing_or_error(session, listing_id)
    if listing in user.favorites:
        user.favorites.remove(listing)
        favorite = False
    else:
        user.favorites.append(listing)
        favorite = True
    session.add(user)
    session.commit()
    return favorite
