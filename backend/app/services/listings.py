from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.enums import ListingStatus
from app.models.listing import Category, Listing
from app.models.user import User
from app.schemas.listing import CategoryCreate, ListingCreate, ListingUpdate


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
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(listing, field, value)
    listing.touch()
    session.add(listing)
    session.commit()
    return get_listing_or_error(session, listing.id)


def delete_listing(session: Session, actor: User, listing_id) -> None:
    listing = get_listing_or_error(session, listing_id)
    if listing.owner_id != actor.id:
        raise ValueError("Only the owner can delete this listing")
    listing.soft_delete()
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
