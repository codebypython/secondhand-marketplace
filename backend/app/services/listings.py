from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.enums import ListingStatus, NotificationType
from app.models.listing import Category, Listing
from app.models.user import User
from app.schemas.listing import CategoryCreate, ListingCreate, ListingUpdate
from app.services.ai import classify_image_via_ai
from app.services.notification import create_notification
from app.services.audit import log_activity


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


def list_listings(session: Session, search: str | None = None, category_id=None, condition=None, status: ListingStatus | None = None, owner_id=None, include_deleted: bool = False) -> list[Listing]:
    stmt = select(Listing).options(
        selectinload(Listing.owner).selectinload(User.profile),
        selectinload(Listing.category),
    )
    if search:
        search_term = f"%{search}%"
        stmt = stmt.where(Listing.title.ilike(search_term) | Listing.description.ilike(search_term))
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
    return list(session.scalars(stmt).unique())


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
