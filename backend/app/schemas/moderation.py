from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.enums import ReportStatus, ReportTargetType
from app.schemas.common import ORMModel


class ReportCreate(BaseModel):
    target_type: ReportTargetType
    target_id: UUID
    reason: str = Field(min_length=5, max_length=1000)


class ReportReview(BaseModel):
    status: ReportStatus


class ReportRead(ORMModel):
    id: UUID
    reporter_id: UUID
    target_type: ReportTargetType
    target_id: UUID
    reason: str
    status: ReportStatus
    created_at: datetime


class BlockCreate(BaseModel):
    blocked_id: UUID


class BlockRead(ORMModel):
    id: UUID
    blocker_id: UUID
    blocked_id: UUID
    created_at: datetime
