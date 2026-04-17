from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload

from app.models.enums import DealStatus, OfferStatus
from app.models.listing import Listing
from app.models.transaction import Deal, Meetup, Offer
from app.models.user import User
from app.schemas.transaction import MeetupCreate, OfferCreate
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
    offer = Offer(listing_id=listing.id, buyer_id=buyer.id, price=payload.price)
    session.add(offer)
    session.commit()
    session.refresh(offer)
    return offer


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
    return list(session.scalars(stmt))


def list_owner_offers(session: Session, user: User) -> list[Offer]:
    stmt = (
        select(Offer)
        .options(selectinload(Offer.listing))
        .join(Offer.listing)
        .where(Listing.owner_id == user.id)
        .order_by(Offer.created_at.desc())
    )
    return list(session.scalars(stmt))


def accept_offer(session: Session, seller: User, offer_id) -> Deal:
    offer = _offer_with_listing(session, offer_id)
    if offer.listing.owner_id != seller.id:
        raise ValueError("Only the listing owner can accept an offer")
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


def decline_offer(session: Session, seller: User, offer_id) -> Offer:
    offer = _offer_with_listing(session, offer_id)
    if offer.listing.owner_id != seller.id:
        raise ValueError("Only the listing owner can decline an offer")
    offer.decline()
    session.add(offer)
    session.commit()
    session.refresh(offer)
    return offer


def cancel_offer(session: Session, buyer: User, offer_id) -> Offer:
    offer = _offer_with_listing(session, offer_id)
    if offer.buyer_id != buyer.id:
        raise ValueError("Only the buyer can cancel the offer")
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
