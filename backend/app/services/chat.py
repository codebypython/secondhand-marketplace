from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.chat import Conversation, Message
from app.models.listing import Listing
from app.models.user import User
from app.schemas.chat import ConversationCreate, MessageCreate
from app.services.moderation import ensure_not_blocked


def list_conversations(session: Session, user: User) -> list[Conversation]:
    stmt = (
        select(Conversation)
        .join(Conversation.participants)
        .where(User.id == user.id)
        .options(
            selectinload(Conversation.participants).selectinload(User.profile),
            selectinload(Conversation.messages).selectinload(Message.sender).selectinload(User.profile),
        )
        .order_by(Conversation.created_at.desc())
    )
    return list(session.scalars(stmt).unique())


def get_conversation_or_error(session: Session, conversation_id) -> Conversation:
    stmt = (
        select(Conversation)
        .where(Conversation.id == conversation_id)
        .options(
            selectinload(Conversation.participants).selectinload(User.profile),
            selectinload(Conversation.messages).selectinload(Message.sender).selectinload(User.profile),
        )
    )
    conversation = session.scalar(stmt)
    if not conversation:
        raise ValueError("Conversation not found")
    return conversation


def create_conversation(session: Session, user: User, payload: ConversationCreate) -> Conversation:
    participant_ids = list(dict.fromkeys([user.id, *payload.participant_ids]))
    participants = list(session.scalars(select(User).where(User.id.in_(participant_ids))))
    if len(participants) != len(participant_ids):
        raise ValueError("One or more participants do not exist")
    for participant in participants:
        if participant.id != user.id:
            ensure_not_blocked(session, user.id, participant.id)

    if payload.listing_id:
        listing = session.get(Listing, payload.listing_id)
        if not listing:
            raise ValueError("Listing not found")
        if listing.owner_id not in participant_ids:
            raise ValueError("Listing owner must be in the conversation")

    conversation = Conversation(title=payload.title, listing_id=payload.listing_id)
    conversation.participants = participants
    session.add(conversation)
    session.commit()
    session.refresh(conversation)
    return get_conversation_or_error(session, conversation.id)


def send_message(session: Session, user: User, payload: MessageCreate) -> Message:
    conversation = get_conversation_or_error(session, payload.conversation_id)
    participant_ids = {participant.id for participant in conversation.participants}
    if user.id not in participant_ids:
        raise ValueError("You are not a participant in this conversation")
    for participant in conversation.participants:
        if participant.id != user.id:
            ensure_not_blocked(session, user.id, participant.id)
    message = Message(conversation_id=conversation.id, sender_id=user.id, content=payload.content)
    session.add(message)
    session.commit()
    return session.scalar(
        select(Message)
        .where(Message.id == message.id)
        .options(selectinload(Message.sender).selectinload(User.profile))
    )


def soft_delete_message(session: Session, user: User, message_id) -> None:
    message = session.get(Message, message_id)
    if not message:
        raise ValueError("Message not found")
    if message.sender_id != user.id:
        raise ValueError("Only the sender can delete a message")
    message.soft_delete()
    session.add(message)
    session.commit()
