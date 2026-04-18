from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db_session
from app.models.user import User
from app.schemas.chat import ConversationCreate, ConversationRead, MessageCreate, MessageRead
from app.services.chat import (
    create_conversation,
    get_conversation_or_error,
    list_conversations,
    send_message,
    soft_delete_message,
)

router = APIRouter()


@router.get("/conversations", response_model=list[ConversationRead])
def list_conversations_endpoint(session: Session = Depends(get_db_session), current_user: User = Depends(get_current_user)) -> Any:
    return list_conversations(session, current_user)


@router.post("/conversations", response_model=ConversationRead, status_code=status.HTTP_201_CREATED)
def create_conversation_endpoint(
    payload: ConversationCreate,
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> Any:
    try:
        return create_conversation(session, current_user, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/conversations/{conversation_id}", response_model=ConversationRead)
def get_conversation_endpoint(
    conversation_id: UUID,
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> Any:
    try:
        conversation = get_conversation_or_error(session, conversation_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    if current_user.id not in {participant.id for participant in conversation.participants}:
        raise HTTPException(status_code=403, detail="You are not in this conversation")
    return conversation


@router.post("/messages", response_model=MessageRead, status_code=status.HTTP_201_CREATED)
def send_message_endpoint(
    payload: MessageCreate,
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> Any:
    try:
        return send_message(session, current_user, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.delete("/messages/{message_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_message_endpoint(
    message_id: UUID,
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> None:
    try:
        soft_delete_message(session, current_user, message_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
