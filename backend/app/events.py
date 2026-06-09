"""
Domain Events Module
====================
Simple event dispatcher for decoupling business-logic side effects
(notifications, audit logging, email) from the core domain model.

Usage:
    from app.events import event_bus, DomainEvent

    # Define events
    class OfferAccepted(DomainEvent):
        pass

    # Subscribe a handler
    @event_bus.subscribe(OfferAccepted)
    def on_offer_accepted(event: OfferAccepted):
        print(f"Offer accepted! Data: {event.data}")

    # Publish an event (typically from service layer)
    event_bus.publish(OfferAccepted(data={"offer_id": "...", "deal_id": "..."}))
"""

from __future__ import annotations

import logging
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any, Callable

logger = logging.getLogger(__name__)


@dataclass
class DomainEvent:
    """Base class for all domain events."""

    data: dict[str, Any] = field(default_factory=dict)
    occurred_at: datetime = field(default_factory=lambda: datetime.now(UTC))

    @property
    def event_name(self) -> str:
        return self.__class__.__name__


# ── Concrete Events ──────────────────────────────────────────────────────────


class OfferAcceptedEvent(DomainEvent):
    """Fired when an offer is accepted and a Deal is created."""
    pass


class OfferDeclinedEvent(DomainEvent):
    """Fired when an offer is declined."""
    pass


class OfferCounteredEvent(DomainEvent):
    """Fired when a counter-offer is made."""
    pass


class DealCompletedEvent(DomainEvent):
    """Fired when a deal is completed and listing marked as SOLD."""
    pass


class DealCancelledEvent(DomainEvent):
    """Fired when a deal is cancelled and listing reopened."""
    pass


class MeetupCompletedEvent(DomainEvent):
    """Fired when both parties check in to a meetup."""
    pass


# ── Event Bus ────────────────────────────────────────────────────────────────


class EventBus:
    """
    In-process synchronous event bus.
    Handlers are called in registration order within the same thread/transaction.
    """

    def __init__(self) -> None:
        self._handlers: dict[type[DomainEvent], list[Callable]] = defaultdict(list)

    def subscribe(self, event_type: type[DomainEvent]) -> Callable:
        """Decorator to register a handler for a given event type."""
        def decorator(fn: Callable) -> Callable:
            self._handlers[event_type].append(fn)
            return fn
        return decorator

    def publish(self, event: DomainEvent) -> None:
        """Dispatch event to all registered handlers."""
        handler_list = self._handlers.get(type(event), [])
        for handler in handler_list:
            try:
                handler(event)
            except Exception:
                logger.exception(
                    "Error in event handler %s for event %s",
                    handler.__name__,
                    event.event_name,
                )

    def clear(self) -> None:
        """Remove all handlers (useful for testing)."""
        self._handlers.clear()


# Global singleton event bus
event_bus = EventBus()


# ── Default Handlers (Audit Logging & Notifications) ─────────────────────────

from app.db.session import SessionFactory
from app.models.listing import Listing
from app.models.transaction import Offer, Deal, Meetup
from app.models.enums import NotificationType
from app.services.notification import create_notification
from app.services.audit import log_activity


@event_bus.subscribe(OfferAcceptedEvent)
def handle_offer_accepted(event: OfferAcceptedEvent) -> None:
    offer_id = event.data.get("offer_id")
    deal_id = event.data.get("deal_id")
    buyer_id = event.data.get("buyer_id")
    seller_id = event.data.get("seller_id")
    listing_id = event.data.get("listing_id")
    
    logger.info(
        "📋 [DOMAIN EVENT] OfferAccepted — offer_id=%s, deal_id=%s, buyer_id=%s, listing_id=%s",
        offer_id, deal_id, buyer_id, listing_id
    )
    
    with SessionFactory() as session:
        listing = session.get(Listing, listing_id)
        listing_title = listing.title if listing else "sản phẩm"
        
        # 1. Notify Buyer
        create_notification(
            session,
            recipient_id=buyer_id,
            type=NotificationType.OFFER_ACCEPTED,
            title="Đề xuất mua hàng được chấp nhận",
            message=f"Đề xuất mua '{listing_title}' với giá {event.data.get('agreed_price')}đ của bạn đã được chấp nhận. Thỏa thuận đã được tạo.",
            link="/dashboard/offers"
        )
        # 2. Notify Seller
        create_notification(
            session,
            recipient_id=seller_id,
            type=NotificationType.OFFER_ACCEPTED,
            title="Bạn đã chấp nhận đề xuất mua hàng",
            message=f"Bạn đã chấp nhận đề xuất mua '{listing_title}' với giá {event.data.get('agreed_price')}đ.",
            link="/dashboard/offers"
        )
        # 3. Log Activity
        log_activity(
            session,
            actor_id=seller_id,
            verb="accept_offer",
            target_type="Offer",
            target_id=offer_id,
            details={"deal_id": deal_id, "listing_id": listing_id}
        )


@event_bus.subscribe(OfferDeclinedEvent)
def handle_offer_declined(event: OfferDeclinedEvent) -> None:
    offer_id = event.data.get("offer_id")
    listing_id = event.data.get("listing_id")
    
    logger.info(
        "📋 [DOMAIN EVENT] OfferDeclined — offer_id=%s",
        offer_id
    )
    
    with SessionFactory() as session:
        offer = session.get(Offer, offer_id)
        listing = session.get(Listing, listing_id)
        listing_title = listing.title if listing else "sản phẩm"
        
        if offer:
            # Notify Buyer
            create_notification(
                session,
                recipient_id=str(offer.buyer_id),
                type=NotificationType.OFFER_DECLINED,
                title="Đề xuất mua hàng bị từ chối",
                message=f"Đề xuất mua '{listing_title}' của bạn đã bị từ chối.",
                link="/dashboard/offers"
            )
            # Log Activity
            log_activity(
                session,
                actor_id=listing.owner_id if listing else None,
                verb="decline_offer",
                target_type="Offer",
                target_id=offer_id,
                details={"listing_id": listing_id}
            )


@event_bus.subscribe(OfferCounteredEvent)
def handle_offer_countered(event: OfferCounteredEvent) -> None:
    parent_offer_id = event.data.get("parent_offer_id")
    new_offer_id = event.data.get("new_offer_id")
    price = event.data.get("price")
    listing_id = event.data.get("listing_id")
    
    logger.info(
        "📋 [DOMAIN EVENT] OfferCountered — parent_offer_id=%s, new_offer_id=%s, price=%s",
        parent_offer_id, new_offer_id, price
    )
    
    with SessionFactory() as session:
        new_offer = session.get(Offer, new_offer_id)
        listing = session.get(Listing, listing_id)
        listing_title = listing.title if listing else "sản phẩm"
        
        if new_offer and listing:
            if new_offer.is_counter_from_seller:
                # Counter from seller to buyer
                recipient_id = str(new_offer.buyer_id)
                actor_id = str(listing.owner_id)
                msg = f"Người bán đã phản hồi giá mới {price}đ cho sản phẩm '{listing_title}'."
            else:
                # Counter from buyer to seller
                recipient_id = str(listing.owner_id)
                actor_id = str(new_offer.buyer_id)
                msg = f"Người mua đã phản hồi giá mới {price}đ cho sản phẩm '{listing_title}'."
                
            create_notification(
                session,
                recipient_id=recipient_id,
                type=NotificationType.OFFER_COUNTERED,
                title="Đề xuất phản hồi giá mới",
                message=msg,
                link="/dashboard/offers"
            )
            log_activity(
                session,
                actor_id=actor_id,
                verb="counter_offer",
                target_type="Offer",
                target_id=new_offer_id,
                details={"parent_offer_id": parent_offer_id, "price": price}
            )


@event_bus.subscribe(DealCompletedEvent)
def handle_deal_completed(event: DealCompletedEvent) -> None:
    deal_id = event.data.get("deal_id")
    listing_id = event.data.get("listing_id")
    buyer_id = event.data.get("buyer_id")
    seller_id = event.data.get("seller_id")
    
    logger.info(
        "📋 [DOMAIN EVENT] DealCompleted — deal_id=%s, listing_id=%s",
        deal_id, listing_id
    )
    
    with SessionFactory() as session:
        listing = session.get(Listing, listing_id)
        listing_title = listing.title if listing else "sản phẩm"
        
        # Notify both parties
        create_notification(
            session,
            recipient_id=buyer_id,
            type=NotificationType.DEAL_COMPLETED,
            title="Giao dịch hoàn tất thành công",
            message=f"Giao dịch mua '{listing_title}' đã hoàn tất. Hãy để lại đánh giá cho người bán!",
            link=f"/users/{seller_id}" # link to seller profile for review
        )
        create_notification(
            session,
            recipient_id=seller_id,
            type=NotificationType.DEAL_COMPLETED,
            title="Giao dịch hoàn tất thành công",
            message=f"Giao dịch bán '{listing_title}' đã hoàn tất. Thỏa thuận giao dịch thành công.",
            link="/dashboard/offers"
        )
        log_activity(
            session,
            actor_id=buyer_id, # buyer check-in finishes it usually
            verb="complete_deal",
            target_type="Deal",
            target_id=deal_id,
            details={"listing_id": listing_id}
        )


@event_bus.subscribe(DealCancelledEvent)
def handle_deal_cancelled(event: DealCancelledEvent) -> None:
    deal_id = event.data.get("deal_id")
    listing_id = event.data.get("listing_id")
    
    logger.info(
        "📋 [DOMAIN EVENT] DealCancelled — deal_id=%s, listing_id=%s",
        deal_id, listing_id
    )
    
    with SessionFactory() as session:
        deal = session.get(Deal, deal_id)
        listing = session.get(Listing, listing_id)
        listing_title = listing.title if listing else "sản phẩm"
        
        if deal:
            create_notification(
                session,
                recipient_id=str(deal.buyer_id),
                type=NotificationType.DEAL_CANCELLED,
                title="Giao dịch đã bị hủy",
                message=f"Giao dịch cho '{listing_title}' đã bị hủy.",
                link="/dashboard/offers"
            )
            create_notification(
                session,
                recipient_id=str(deal.seller_id),
                type=NotificationType.DEAL_CANCELLED,
                title="Giao dịch đã bị hủy",
                message=f"Giao dịch bán '{listing_title}' đã bị hủy. Tin đăng đã được mở bán lại.",
                link="/dashboard/offers"
            )
            log_activity(
                session,
                actor_id=str(deal.seller_id),
                verb="cancel_deal",
                target_type="Deal",
                target_id=deal_id,
                details={"listing_id": listing_id}
            )


@event_bus.subscribe(MeetupCompletedEvent)
def handle_meetup_completed(event: MeetupCompletedEvent) -> None:
    meetup_id = event.data.get("meetup_id")
    deal_id = event.data.get("deal_id")
    
    logger.info(
        "📋 [DOMAIN EVENT] MeetupCompleted — meetup_id=%s, deal_id=%s",
        meetup_id, deal_id
    )
    
    with SessionFactory() as session:
        meetup = session.get(Meetup, meetup_id)
        deal = session.get(Deal, deal_id)
        
        if meetup and deal:
            listing = session.get(Listing, deal.listing_id)
            listing_title = listing.title if listing else "sản phẩm"
            
            # Notify both parties
            create_notification(
                session,
                recipient_id=str(deal.buyer_id),
                type=NotificationType.MEETUP_COMPLETED,
                title="Cuộc hẹn gặp đã hoàn thành",
                message=f"Cả hai bên đã check-in thành công tại điểm hẹn cho '{listing_title}'. Giao dịch đã hoàn tất.",
                link="/dashboard/offers"
            )
            create_notification(
                session,
                recipient_id=str(deal.seller_id),
                type=NotificationType.MEETUP_COMPLETED,
                title="Cuộc hẹn gặp đã hoàn thành",
                message=f"Cả hai bên đã check-in thành công tại điểm hẹn cho '{listing_title}'. Giao dịch đã hoàn tất.",
                link="/dashboard/offers"
            )
            log_activity(
                session,
                actor_id=None,
                verb="complete_meetup",
                target_type="Meetup",
                target_id=meetup_id,
                details={"deal_id": deal_id}
            )
