from datetime import datetime
from uuid import UUID
from typing import Any
from app.schemas.common import ORMModel


class ActivityLogRead(ORMModel):
    id: UUID
    actor_id: UUID | None = None
    actor_email: str | None = None
    verb: str
    target_type: str
    target_id: str
    details: dict[str, Any] | None = None
    created_at: datetime
