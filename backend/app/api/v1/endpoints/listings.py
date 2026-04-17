from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db_session
from app.models.enums import ItemCondition, ListingStatus
from app.models.user import User
from app.schemas.listing import (
    CategoryCreate,
    CategoryRead,
    FavoriteResponse,
    ListingCreate,
    ListingRead,
    ListingUpdate,
)
from app.services.listings import (
    create_category,
    create_listing,
    delete_listing,
    get_listing_or_error,
    list_categories,
    list_listings,
    toggle_favorite,
    update_listing,
)

router = APIRouter()


@router.get("/categories", response_model=list[CategoryRead])
def categories(session: Session = Depends(get_db_session)) -> list[CategoryRead]:
    return list_categories(session)


@router.post("/categories", response_model=CategoryRead, status_code=status.HTTP_201_CREATED)
def create_category_endpoint(
    payload: CategoryCreate,
    session: Session = Depends(get_db_session),
    _current_user: User = Depends(get_current_user),
) -> CategoryRead:
    return create_category(session, payload)


@router.get("", response_model=list[ListingRead])
def list_listings_endpoint(
    session: Session = Depends(get_db_session),
    search: str | None = Query(default=None),
    category_id: UUID | None = Query(default=None),
    condition: ItemCondition | None = Query(default=None),
    status_filter: ListingStatus | None = Query(default=None, alias="status"),
    owner_id: UUID | None = Query(default=None),
) -> list[ListingRead]:
    return list_listings(session, search, category_id, condition, status_filter, owner_id)


@router.post("", response_model=ListingRead, status_code=status.HTTP_201_CREATED)
def create_listing_endpoint(
    payload: ListingCreate,
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> ListingRead:
    try:
        return create_listing(session, current_user, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/{listing_id}", response_model=ListingRead)
def get_listing_endpoint(listing_id: UUID, session: Session = Depends(get_db_session)) -> ListingRead:
    try:
        return get_listing_or_error(session, listing_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.patch("/{listing_id}", response_model=ListingRead)
def update_listing_endpoint(
    listing_id: UUID,
    payload: ListingUpdate,
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> ListingRead:
    try:
        return update_listing(session, current_user, listing_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.delete("/{listing_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_listing_endpoint(
    listing_id: UUID,
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> None:
    try:
        delete_listing(session, current_user, listing_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/{listing_id}/favorite", response_model=FavoriteResponse)
def toggle_favorite_endpoint(
    listing_id: UUID,
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> FavoriteResponse:
    try:
        return FavoriteResponse(favorite=toggle_favorite(session, current_user, listing_id))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
