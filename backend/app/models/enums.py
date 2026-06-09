import enum


class UserRole(enum.Enum):
    USER = "USER"
    ADMIN = "ADMIN"


class UserStatus(enum.Enum):
    ACTIVE = "ACTIVE"
    BANNED = "BANNED"


class ListingStatus(enum.Enum):
    AVAILABLE = "AVAILABLE"
    RESERVED = "RESERVED"
    SOLD = "SOLD"
    HIDDEN = "HIDDEN"


class ItemCondition(enum.Enum):
    NEW = "NEW"
    LIKE_NEW = "LIKE_NEW"
    USED = "USED"
    DAMAGED = "DAMAGED"


class OfferStatus(enum.Enum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    DECLINED = "DECLINED"
    CANCELLED = "CANCELLED"
    EXPIRED = "EXPIRED"
    COUNTERED = "COUNTERED"

class DeliveryStatus(enum.Enum):
    PENDING = "PENDING"
    SHIPPING = "SHIPPING"
    DELIVERED = "DELIVERED"


class DealStatus(enum.Enum):
    OPEN = "OPEN"
    CANCELLED = "CANCELLED"
    COMPLETED = "COMPLETED"


class MeetupStatus(enum.Enum):
    SCHEDULED = "SCHEDULED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class ReportStatus(enum.Enum):
    PENDING = "PENDING"
    RESOLVED = "RESOLVED"
    DISMISSED = "DISMISSED"


class ReportTargetType(enum.Enum):
    USER = "USER"
    LISTING = "LISTING"
    MESSAGE = "MESSAGE"


class NotificationType(enum.Enum):
    OFFER_RECEIVED = "OFFER_RECEIVED"
    OFFER_ACCEPTED = "OFFER_ACCEPTED"
    OFFER_DECLINED = "OFFER_DECLINED"
    OFFER_COUNTERED = "OFFER_COUNTERED"
    DEAL_COMPLETED = "DEAL_COMPLETED"
    DEAL_CANCELLED = "DEAL_CANCELLED"
    MEETUP_SCHEDULED = "MEETUP_SCHEDULED"
    MEETUP_COMPLETED = "MEETUP_COMPLETED"
    REPORT_RESOLVED = "REPORT_RESOLVED"
    SYSTEM = "SYSTEM"

