from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db_session
from app.models.user import User
from app.schemas.transaction import DealRead, MeetupCreate, MeetupRead, OfferCreate, OfferRead
from app.services.transactions import (
    accept_offer,
    cancel_deal,
    cancel_offer,
    complete_deal,
    create_offer,
    decline_offer,
    list_owner_offers,
    list_user_deals,
    list_user_offers,
    schedule_meetup,
    counter_offer,
    update_delivery_status,
    file_dispute,
    check_in_meetup,
)
from app.schemas.transaction import CounterOfferCreate, DealDeliveryUpdate, DealDisputeCreate

router = APIRouter()


def _offer_to_read(offer) -> Any:
    data = OfferRead.model_validate(offer)
    if hasattr(offer, "listing") and offer.listing:
        data.listing_title = offer.listing.title
    return data


def _deal_to_read(deal) -> Any:
    data = DealRead.model_validate(deal)
    if hasattr(deal, "listing") and deal.listing:
        data.listing_title = deal.listing.title
    if hasattr(deal, "meetups") and deal.meetups:
        data.meetups = [MeetupRead.model_validate(m) for m in deal.meetups]
    return data


@router.post("/offers", response_model=OfferRead, status_code=status.HTTP_201_CREATED)
def create_offer_endpoint(
    payload: OfferCreate,
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> Any:
    try:
        return create_offer(session, current_user, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/offers/mine", response_model=list[OfferRead])
def my_offers(session: Session = Depends(get_db_session), current_user: User = Depends(get_current_user)) -> Any:
    return [_offer_to_read(o) for o in list_user_offers(session, current_user)]


@router.get("/offers/received", response_model=list[OfferRead])
def received_offers(session: Session = Depends(get_db_session), current_user: User = Depends(get_current_user)) -> Any:
    return [_offer_to_read(o) for o in list_owner_offers(session, current_user)]


@router.post("/offers/{offer_id}/counter", response_model=OfferRead)
def counter_offer_endpoint(
    offer_id: UUID,
    payload: CounterOfferCreate,
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> Any:
    try:
        return counter_offer(session, current_user, offer_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/offers/{offer_id}/accept", response_model=DealRead)
def accept_offer_endpoint(
    offer_id: UUID,
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> Any:
    try:
        return accept_offer(session, current_user, offer_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/offers/{offer_id}/decline", response_model=OfferRead)
def decline_offer_endpoint(
    offer_id: UUID,
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> Any:
    try:
        return decline_offer(session, current_user, offer_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/offers/{offer_id}/cancel", response_model=OfferRead)
def cancel_offer_endpoint(
    offer_id: UUID,
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> Any:
    try:
        return cancel_offer(session, current_user, offer_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/deals", response_model=list[DealRead])
def list_deals_endpoint(session: Session = Depends(get_db_session), current_user: User = Depends(get_current_user)) -> Any:
    return [_deal_to_read(d) for d in list_user_deals(session, current_user)]


@router.post("/deals/{deal_id}/complete", response_model=DealRead)
def complete_deal_endpoint(
    deal_id: UUID,
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> Any:
    try:
        return complete_deal(session, current_user, deal_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/deals/{deal_id}/cancel", response_model=DealRead)
def cancel_deal_endpoint(
    deal_id: UUID,
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> Any:
    try:
        return cancel_deal(session, current_user, deal_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.patch("/deals/{deal_id}/delivery", response_model=DealRead)
def update_delivery_endpoint(
    deal_id: UUID,
    payload: DealDeliveryUpdate,
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> Any:
    try:
        return update_delivery_status(session, current_user, str(deal_id), payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/deals/{deal_id}/dispute", response_model=DealRead)
def file_dispute_endpoint(
    deal_id: UUID,
    payload: DealDisputeCreate,
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> Any:
    try:
        return file_dispute(session, current_user, str(deal_id), payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/meetups", response_model=MeetupRead, status_code=status.HTTP_201_CREATED)
def schedule_meetup_endpoint(
    payload: MeetupCreate,
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> Any:
    try:
        return schedule_meetup(session, current_user, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/meetups/{meetup_id}/check-in", response_model=MeetupRead)
def check_in_meetup_endpoint(
    meetup_id: UUID,
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> Any:
    try:
        return check_in_meetup(session, current_user, str(meetup_id))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
