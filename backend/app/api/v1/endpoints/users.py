from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_user
from app.db.session import get_db_session
from app.models.listing import Listing
from app.models.user import User
from app.schemas.listing import ListingRead
from app.schemas.user import ProfileUpdate, UserPublicRead, UserRead
from app.services.auth import update_profile

router = APIRouter()


@router.patch("/me", response_model=UserRead)
def patch_me(
    payload: ProfileUpdate,
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> UserRead:
    try:
        return update_profile(session, current_user, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/{user_id}", response_model=UserPublicRead)
def get_public_profile(
    user_id: UUID,
    session: Session = Depends(get_db_session),
) -> UserPublicRead:
    stmt = select(User).options(selectinload(User.profile)).where(User.id == user_id)
    user = session.scalar(stmt)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.get("/{user_id}/listings", response_model=list[ListingRead])
def get_user_listings(
    user_id: UUID,
    session: Session = Depends(get_db_session),
) -> list[ListingRead]:
    stmt = (
        select(Listing)
        .options(selectinload(Listing.owner).selectinload(User.profile), selectinload(Listing.category))
        .where(Listing.owner_id == user_id)
        .order_by(Listing.created_at.desc())
    )
    return list(session.scalars(stmt).unique())
