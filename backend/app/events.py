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


# ── Default Handlers (Audit Logging) ─────────────────────────────────────────


@event_bus.subscribe(OfferAcceptedEvent)
def log_offer_accepted(event: OfferAcceptedEvent) -> None:
    logger.info(
        "📋 [DOMAIN EVENT] OfferAccepted — offer_id=%s, deal_id=%s, buyer_id=%s, listing_id=%s",
        event.data.get("offer_id"),
        event.data.get("deal_id"),
        event.data.get("buyer_id"),
        event.data.get("listing_id"),
    )


@event_bus.subscribe(OfferDeclinedEvent)
def log_offer_declined(event: OfferDeclinedEvent) -> None:
    logger.info(
        "📋 [DOMAIN EVENT] OfferDeclined — offer_id=%s",
        event.data.get("offer_id"),
    )


@event_bus.subscribe(OfferCounteredEvent)
def log_offer_countered(event: OfferCounteredEvent) -> None:
    logger.info(
        "📋 [DOMAIN EVENT] OfferCountered — parent_offer_id=%s, new_offer_id=%s, price=%s",
        event.data.get("parent_offer_id"),
        event.data.get("new_offer_id"),
        event.data.get("price"),
    )


@event_bus.subscribe(DealCompletedEvent)
def log_deal_completed(event: DealCompletedEvent) -> None:
    logger.info(
        "📋 [DOMAIN EVENT] DealCompleted — deal_id=%s, listing_id=%s",
        event.data.get("deal_id"),
        event.data.get("listing_id"),
    )


@event_bus.subscribe(DealCancelledEvent)
def log_deal_cancelled(event: DealCancelledEvent) -> None:
    logger.info(
        "📋 [DOMAIN EVENT] DealCancelled — deal_id=%s, listing_id=%s",
        event.data.get("deal_id"),
        event.data.get("listing_id"),
    )


@event_bus.subscribe(MeetupCompletedEvent)
def log_meetup_completed(event: MeetupCompletedEvent) -> None:
    logger.info(
        "📋 [DOMAIN EVENT] MeetupCompleted — meetup_id=%s, deal_id=%s",
        event.data.get("meetup_id"),
        event.data.get("deal_id"),
    )
