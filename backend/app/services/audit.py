from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload
from app.models.audit import ActivityLog


def log_activity(
    session: Session,
    actor_id: str | None,
    verb: str,
    target_type: str = "",
    target_id: str = "",
    details: dict | None = None,
) -> ActivityLog:
    activity = ActivityLog(
        actor_id=actor_id,
        verb=verb,
        target_type=target_type,
        target_id=str(target_id) if target_id else "",
        details=details or {},
    )
    session.add(activity)
    session.commit()
    session.refresh(activity)
    return activity


def list_activity_logs(session: Session, limit: int = 100) -> list[ActivityLog]:
    stmt = (
        select(ActivityLog)
        .options(selectinload(ActivityLog.actor))
        .order_by(ActivityLog.created_at.desc())
        .limit(limit)
    )
    return list(session.scalars(stmt))
