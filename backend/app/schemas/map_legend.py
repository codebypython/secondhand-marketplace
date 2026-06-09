from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field

from app.schemas.common import ORMModel


class MapLegendRead(ORMModel):
    id: UUID
    symbol_type: str
    icon: str
    name: str
    description: str
    color: str
    created_at: datetime
    updated_at: datetime


class MapLegendUpdate(BaseModel):
    icon: str = Field(min_length=1, max_length=10)
    name: str = Field(min_length=1, max_length=100)
    description: str = Field(min_length=1, max_length=1000)
    color: str = Field(min_length=1, max_length=20)
