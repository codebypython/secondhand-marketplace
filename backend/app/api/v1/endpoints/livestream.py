from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_user
from app.db.session import get_db_session
from app.models.livestream import LiveRoom, LiveComment
from app.models.user import User
from app.schemas.livestream import LiveRoomRead, LiveRoomUpdate, LiveCommentCreate, LiveCommentRead

router = APIRouter()


@router.get("/rooms/me", response_model=LiveRoomRead)
def get_my_room(
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> Any:
    stmt = select(LiveRoom).options(
        selectinload(LiveRoom.user).selectinload(User.profile)
    ).where(LiveRoom.user_id == current_user.id)
    room = session.scalar(stmt)
    if not room:
        room = LiveRoom(
            user_id=current_user.id,
            title=f"Phòng live của {current_user.profile.full_name if current_user.profile else current_user.email}",
            is_live=False,
            is_online=False
        )
        session.add(room)
        session.commit()
        session.refresh(room)
        
        stmt = select(LiveRoom).options(
            selectinload(LiveRoom.user).selectinload(User.profile)
        ).where(LiveRoom.user_id == current_user.id)
        room = session.scalar(stmt)
    return room


@router.patch("/rooms/me", response_model=LiveRoomRead)
def update_my_room(
    payload: LiveRoomUpdate,
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> Any:
    stmt = select(LiveRoom).options(
        selectinload(LiveRoom.user).selectinload(User.profile)
    ).where(LiveRoom.user_id == current_user.id)
    room = session.scalar(stmt)
    if not room:
        room = LiveRoom(
            user_id=current_user.id,
            is_live=False,
            is_online=False
        )
        session.add(room)

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(room, key, value)

    session.commit()
    session.refresh(room)

    stmt = select(LiveRoom).options(
        selectinload(LiveRoom.user).selectinload(User.profile)
    ).where(LiveRoom.user_id == current_user.id)
    room = session.scalar(stmt)
    return room


@router.get("/rooms", response_model=list[LiveRoomRead])
def get_active_rooms(
    session: Session = Depends(get_db_session),
) -> Any:
    stmt = (
        select(LiveRoom)
        .options(selectinload(LiveRoom.user).selectinload(User.profile))
        .where(LiveRoom.is_live == True)
        .order_by(LiveRoom.updated_at.desc())
    )
    return list(session.scalars(stmt).unique())


@router.get("/rooms/{streamer_id}", response_model=LiveRoomRead)
def get_room_details(
    streamer_id: UUID,
    session: Session = Depends(get_db_session),
) -> Any:
    stmt = (
        select(LiveRoom)
        .options(selectinload(LiveRoom.user).selectinload(User.profile))
        .where(LiveRoom.user_id == streamer_id)
    )
    room = session.scalar(stmt)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    return room


@router.get("/rooms/{streamer_id}/comments", response_model=list[LiveCommentRead])
def get_room_comments(
    streamer_id: UUID,
    session: Session = Depends(get_db_session),
) -> Any:
    cutoff = datetime.now(timezone.utc) - timedelta(hours=72)
    stmt = (
        select(LiveComment)
        .options(selectinload(LiveComment.sender).selectinload(User.profile))
        .where(
            LiveComment.room_owner_id == streamer_id,
            LiveComment.created_at >= cutoff
        )
        .order_by(LiveComment.created_at.asc())
    )
    return list(session.scalars(stmt).unique())


@router.post("/rooms/{streamer_id}/comments", response_model=LiveCommentRead)
def create_room_comment(
    streamer_id: UUID,
    payload: LiveCommentCreate,
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> Any:
    stmt = select(LiveRoom).where(LiveRoom.user_id == streamer_id)
    room = session.scalar(stmt)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    comment = LiveComment(
        room_owner_id=streamer_id,
        sender_id=current_user.id,
        content=payload.content
    )
    session.add(comment)
    session.commit()
    session.refresh(comment)

    stmt = (
        select(LiveComment)
        .options(selectinload(LiveComment.sender).selectinload(User.profile))
        .where(LiveComment.id == comment.id)
    )
    return session.scalar(stmt)
