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
    conversations = list_conversations(session, current_user)
    # Filter messages that are deleted for the current user
    for conv in conversations:
        conv.messages = [msg for msg in conv.messages if current_user not in msg.deleted_by]
    return conversations


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
    
    # Filter messages that are deleted for the current user
    conversation.messages = [msg for msg in conversation.messages if current_user not in msg.deleted_by]
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


import json
from typing import Dict
from fastapi import WebSocket, WebSocketDisconnect
from app.core.security import decode_access_token

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.active_connections[user_id] = websocket

    def disconnect(self, user_id: str):
        self.active_connections.pop(user_id, None)

    async def send_personal_message(self, message: dict, user_id: str):
        websocket = self.active_connections.get(user_id)
        if websocket:
            try:
                await websocket.send_json(message)
            except Exception:
                self.disconnect(user_id)

    async def broadcast(self, message: dict):
        for user_id, websocket in list(self.active_connections.items()):
            try:
                await websocket.send_json(message)
            except Exception:
                self.disconnect(user_id)

manager = ConnectionManager()


@router.websocket("/ws/{token}")
async def websocket_endpoint(websocket: WebSocket, token: str) -> None:
    from app.db.session import SessionFactory
    from app.models.user import User
    
    try:
        user_id = decode_access_token(token)
        with SessionFactory() as session:
            user = session.get(User, user_id)
            if not user:
                await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
                return
            user.ensure_active()
    except Exception:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await manager.connect(websocket, str(user_id))
    
    try:
        while True:
            data = await websocket.receive_text()
            try:
                message_data = json.loads(data)
            except Exception:
                continue
            
            msg_type = message_data.get("type")
            
            if msg_type == "chat_message":
                conv_id = message_data.get("conversation_id")
                content = message_data.get("content")
                if not conv_id or not content:
                    continue
                
                from app.schemas.chat import MessageCreate, MessageRead
                from app.services.chat import send_message
                
                with SessionFactory() as session:
                    db_user = session.get(User, user_id)
                    try:
                        new_msg = send_message(
                            session, 
                            db_user, 
                            MessageCreate(conversation_id=conv_id, content=content)
                        )
                        msg_read = MessageRead.model_validate(new_msg)
                        payload = {
                            "type": "chat_message",
                            "message": msg_read.model_dump(mode="json")
                        }
                    except Exception as e:
                        await websocket.send_json({"type": "error", "message": str(e)})
                        continue
                
                from app.services.chat import get_conversation_or_error
                with SessionFactory() as session:
                    try:
                        conv = get_conversation_or_error(session, conv_id)
                        participants = [str(p.id) for p in conv.participants]
                    except Exception:
                        continue
                
                for pid in participants:
                    await manager.send_personal_message(payload, pid)
            
            elif msg_type in ("rtc_offer", "rtc_answer", "rtc_ice_candidate", "rtc_hangup"):
                target_user_id = message_data.get("target_user_id")
                if not target_user_id:
                    continue
                
                forward_payload = {
                    "type": msg_type,
                    "sender_user_id": str(user_id),
                    **{k: v for k, v in message_data.items() if k not in ("target_user_id", "type")}
                }
                await manager.send_personal_message(forward_payload, target_user_id)

            elif msg_type in ("stream_start", "stream_join", "stream_leave", "stream_offer", "stream_answer", "stream_ice"):
                listing_id = message_data.get("listing_id")
                if not listing_id:
                    continue
                
                if msg_type == "stream_start":
                    await manager.broadcast({
                        "type": "stream_active",
                        "listing_id": listing_id,
                        "broadcaster_id": str(user_id),
                        "status": "active"
                    })
                elif msg_type == "stream_join":
                    broadcaster_id = message_data.get("broadcaster_id")
                    if broadcaster_id:
                        await manager.send_personal_message({
                            "type": "stream_join",
                            "viewer_id": str(user_id),
                            "listing_id": listing_id
                        }, broadcaster_id)
                elif msg_type == "stream_leave":
                    broadcaster_id = message_data.get("broadcaster_id")
                    if broadcaster_id:
                        await manager.send_personal_message({
                            "type": "stream_leave",
                            "viewer_id": str(user_id),
                            "listing_id": listing_id
                        }, broadcaster_id)
                elif msg_type in ("stream_offer", "stream_answer", "stream_ice"):
                    target_id = message_data.get("target_id")
                    if target_id:
                        forward_payload = {
                            "type": msg_type,
                            "sender_id": str(user_id),
                            **{k: v for k, v in message_data.items() if k not in ("target_id", "type")}
                        }
                        await manager.send_personal_message(forward_payload, target_id)
    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(str(user_id))
        await manager.broadcast({
            "type": "stream_inactive",
            "broadcaster_id": str(user_id)
        })

