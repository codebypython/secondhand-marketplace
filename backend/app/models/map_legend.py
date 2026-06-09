from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.mixins import TimestampMixin, UUIDMixin


class MapLegend(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "map_legends"

    symbol_type: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    icon: Mapped[str] = mapped_column(String(10), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    color: Mapped[str] = mapped_column(String(20), nullable=False)
