from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_admin_user
from app.db.session import get_db_session
from app.models.map_legend import MapLegend
from app.models.user import User
from app.schemas.map_legend import MapLegendRead, MapLegendUpdate
from app.services.audit import log_activity

router = APIRouter()


@router.get("/listings/map-legends", response_model=list[MapLegendRead])
def get_map_legends(session: Session = Depends(get_db_session)) -> Any:
    """Get all map legend symbols and descriptions (Public API)."""
    stmt = select(MapLegend).order_by(MapLegend.symbol_type.asc())
    return list(session.scalars(stmt).all())


@router.put("/moderation/map-legends/{symbol_type}", response_model=MapLegendRead)
def update_map_legend(
    symbol_type: str,
    payload: MapLegendUpdate,
    session: Session = Depends(get_db_session),
    admin: User = Depends(get_admin_user),
) -> Any:
    """Update a specific map legend (Admin only)."""
    stmt = select(MapLegend).where(MapLegend.symbol_type == symbol_type)
    legend = session.scalar(stmt)
    if not legend:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Map legend for symbol type '{symbol_type}' not found",
        )

    legend.icon = payload.icon
    legend.name = payload.name
    legend.description = payload.description
    legend.color = payload.color
    legend.touch()

    log_activity(
        session,
        actor_id=str(admin.id),
        verb="update_map_legend",
        target_type="MapLegend",
        target_id=str(legend.id),
        details={"symbol_type": symbol_type, "name": payload.name},
    )

    session.add(legend)
    session.commit()
    session.refresh(legend)
    return legend
