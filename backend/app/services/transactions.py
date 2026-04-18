from datetime import datetime, timedelta, UTC
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload

from app.models.enums import DealStatus, OfferStatus, DeliveryStatus, MeetupStatus
from app.models.listing import Listing
from app.models.transaction import Deal, Meetup, Offer
from app.models.user import User
from app.schemas.transaction import MeetupCreate, OfferCreate, CounterOfferCreate, DealDeliveryUpdate, DealDisputeCreate
from app.services.moderation import ensure_not_blocked


def create_offer(session: Session, buyer: User, payload: OfferCreate) -> Offer:
    listing = session.scalar(select(Listing).where(Listing.id == payload.listing_id))
    if not listing:
        raise ValueError("Listing not found")
    if listing.owner_id == buyer.id:
        raise ValueError("Owners cannot offer on their own listings")
    ensure_not_blocked(session, buyer.id, listing.owner_id)
    if not listing.is_available():
        raise ValueError("Listing is not available")
    
    expires_at = datetime.now(UTC) + timedelta(hours=8)
    offer = Offer(
        listing_id=listing.id, 
        buyer_id=buyer.id, 
        price=payload.price,
        expires_at=expires_at,
        is_counter_from_seller=False
    )
    session.add(offer)
    session.commit()
    session.refresh(offer)
    return offer

def counter_offer(session: Session, actor: User, parent_offer_id, payload: CounterOfferCreate) -> Offer:
    parent_offer = _offer_with_listing(session, parent_offer_id)
    if parent_offer.status != OfferStatus.PENDING:
        raise ValueError("Can only counter a pending offer")
    
    is_seller = parent_offer.listing.owner_id == actor.id
    if not is_seller and parent_offer.buyer_id != actor.id:
        raise ValueError("Only participants can counter this offer")

    parent_offer.status = OfferStatus.COUNTERED
    session.add(parent_offer)

    expires_at = datetime.now(UTC) + timedelta(hours=8)
    new_offer = Offer(
        listing_id=parent_offer.listing_id,
        buyer_id=parent_offer.buyer_id,
        price=payload.price,
        expires_at=expires_at,
        is_counter_from_seller=is_seller,
        parent_offer_id=parent_offer.id
    )
    session.add(new_offer)
    session.commit()
    session.refresh(new_offer)
    return new_offer

def _expire_offers_if_needed(session: Session, offers: list[Offer]):
    now = datetime.now(UTC)
    expired_any = False
    for o in offers:
        if o.status == OfferStatus.PENDING and o.expires_at and o.expires_at < now:
            o.status = OfferStatus.EXPIRED
            session.add(o)
            expired_any = True
    if expired_any:
        session.commit()


def _offer_with_listing(session: Session, offer_id) -> Offer:
    stmt = select(Offer).options(selectinload(Offer.listing)).where(Offer.id == offer_id)
    offer = session.scalar(stmt)
    if not offer:
        raise ValueError("Offer not found")
    return offer


def list_user_offers(session: Session, user: User) -> list[Offer]:
    stmt = (
        select(Offer)
        .options(selectinload(Offer.listing))
        .where(Offer.buyer_id == user.id)
        .order_by(Offer.created_at.desc())
    )
    offers = list(session.scalars(stmt))
    _expire_offers_if_needed(session, offers)
    return offers


def list_owner_offers(session: Session, user: User) -> list[Offer]:
    stmt = (
        select(Offer)
        .options(selectinload(Offer.listing))
        .join(Offer.listing)
        .where(Listing.owner_id == user.id)
        .order_by(Offer.created_at.desc())
    )
    offers = list(session.scalars(stmt))
    _expire_offers_if_needed(session, offers)
    return offers


def accept_offer(session: Session, actor: User, offer_id) -> Deal:
    offer = _offer_with_listing(session, offer_id)
    # Both buyer or seller can accept depending on who countered
    if offer.is_counter_from_seller:
        if offer.buyer_id != actor.id:
            raise ValueError("Only the buyer can accept a seller's counter-offer")
    else:
        if offer.listing.owner_id != actor.id:
            raise ValueError("Only the seller can accept a buyer's offer")
            
    deal = offer.accept()
    session.add_all([deal, offer, offer.listing])

    pending_offers = session.scalars(
        select(Offer).where(
            Offer.listing_id == offer.listing_id,
            Offer.id != offer.id,
            Offer.status == OfferStatus.PENDING,
        )
    )
    for pending_offer in pending_offers:
        pending_offer.decline()
        session.add(pending_offer)

    session.commit()
    session.refresh(deal)
    return deal


def decline_offer(session: Session, actor: User, offer_id) -> Offer:
    offer = _offer_with_listing(session, offer_id)
    if actor.id not in {offer.listing.owner_id, offer.buyer_id}:
        raise ValueError("Only participants can decline/withdraw an offer")
    offer.decline()
    session.add(offer)
    session.commit()
    session.refresh(offer)
    return offer


def cancel_offer(session: Session, actor: User, offer_id) -> Offer:
    offer = _offer_with_listing(session, offer_id)
    if actor.id not in {offer.listing.owner_id, offer.buyer_id}:
        raise ValueError("Only participants can cancel an offer")
    offer.cancel()
    session.add(offer)
    session.commit()
    session.refresh(offer)
    return offer


def list_user_deals(session: Session, user: User) -> list[Deal]:
    stmt = (
        select(Deal)
        .options(selectinload(Deal.listing), selectinload(Deal.meetups))
        .where(or_(Deal.buyer_id == user.id, Deal.seller_id == user.id))
        .order_by(Deal.created_at.desc())
    )
    return list(session.scalars(stmt))


def get_deal_or_error(session: Session, deal_id) -> Deal:
    stmt = select(Deal).options(selectinload(Deal.listing), selectinload(Deal.meetups)).where(Deal.id == deal_id)
    deal = session.scalar(stmt)
    if not deal:
        raise ValueError("Deal not found")
    return deal


def complete_deal(session: Session, actor: User, deal_id) -> Deal:
    deal = get_deal_or_error(session, deal_id)
    if actor.id not in {deal.buyer_id, deal.seller_id}:
        raise ValueError("Only deal participants can complete a deal")
    deal.complete(deal.listing)
    session.add_all([deal, deal.listing])
    session.commit()
    return get_deal_or_error(session, deal.id)


def cancel_deal(session: Session, actor: User, deal_id) -> Deal:
    deal = get_deal_or_error(session, deal_id)
    if actor.id not in {deal.buyer_id, deal.seller_id}:
        raise ValueError("Only deal participants can cancel a deal")
    deal.cancel(deal.listing)
    session.add_all([deal, deal.listing])
    session.commit()
    return get_deal_or_error(session, deal.id)

def update_delivery_status(session: Session, actor: User, deal_id: str, payload: DealDeliveryUpdate) -> Deal:
    deal = get_deal_or_error(session, deal_id)
    if deal.seller_id != actor.id:
        raise ValueError("Only the seller can update delivery status")
    if deal.status != DealStatus.OPEN:
        raise ValueError("Cannot update delivery on a closed deal")
    
    deal.delivery_status = payload.delivery_status
    if payload.tracking_code is not None:
        deal.tracking_code = payload.tracking_code
        
    session.add(deal)
    session.commit()
    session.refresh(deal)
    return deal

def file_dispute(session: Session, actor: User, deal_id: str, payload: DealDisputeCreate) -> Deal:
    deal = get_deal_or_error(session, deal_id)
    if deal.buyer_id != actor.id:
        raise ValueError("Only the buyer can file a dispute")
    if deal.status != DealStatus.OPEN:
        raise ValueError("Cannot file a dispute on a closed deal")
        
    deal.has_dispute = True
    deal.dispute_reason = payload.reason
    session.add(deal)
    session.commit()
    session.refresh(deal)
    return deal

def schedule_meetup(session: Session, actor: User, payload: MeetupCreate) -> Meetup:
    deal = get_deal_or_error(session, payload.deal_id)
    if actor.id not in {deal.buyer_id, deal.seller_id}:
        raise ValueError("Only participants can schedule a meetup")
    if deal.status != DealStatus.OPEN:
        raise ValueError("Meetups can only be scheduled for open deals")
    meetup = Meetup(deal_id=deal.id, scheduled_at=payload.scheduled_at, location=payload.location)
    session.add(meetup)
    session.commit()
    session.refresh(meetup)
    return meetup

def check_in_meetup(session: Session, actor: User, meetup_id: str) -> Meetup:
    stmt = select(Meetup).options(selectinload(Meetup.deal)).where(Meetup.id == meetup_id)
    meetup = session.scalar(stmt)
    if not meetup:
        raise ValueError("Meetup not found")
        
    deal = meetup.deal
    if actor.id == deal.buyer_id:
        meetup.buyer_checked_in = True
    elif actor.id == deal.seller_id:
        meetup.seller_checked_in = True
    else:
        raise ValueError("Only deal participants can check in")
        
    if meetup.buyer_checked_in and meetup.seller_checked_in:
        meetup.status = MeetupStatus.COMPLETED
        # Auto complete deal
        if deal.status == DealStatus.OPEN and not deal.has_dispute:
            from app.models.listing import Listing
            listing = session.scalar(select(Listing).where(Listing.id == deal.listing_id))
            deal.complete(listing)
            session.add(listing)
            
    session.add_all([meetup, deal])
    session.commit()
    session.refresh(meetup)
    return meetup
