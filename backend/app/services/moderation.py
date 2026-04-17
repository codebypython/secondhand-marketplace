from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models.enums import ReportStatus, UserRole
from app.models.moderation import Block, Report
from app.models.user import User
from app.schemas.moderation import BlockCreate, ReportCreate, ReportReview


def ensure_not_blocked(session: Session, actor_id, other_user_id) -> None:
    blocked = session.scalar(
        select(Block).where(
            or_(
                (Block.blocker_id == actor_id) & (Block.blocked_id == other_user_id),
                (Block.blocker_id == other_user_id) & (Block.blocked_id == actor_id),
            )
        )
    )
    if blocked:
        raise ValueError("Interaction is blocked between these users")


def create_report(session: Session, reporter: User, payload: ReportCreate) -> Report:
    report = Report(
        reporter_id=reporter.id,
        target_type=payload.target_type,
        target_id=payload.target_id,
        reason=payload.reason,
    )
    session.add(report)
    session.commit()
    session.refresh(report)
    return report


def list_reports(session: Session) -> list[Report]:
    return list(session.scalars(select(Report).order_by(Report.created_at.desc())))


def review_report(session: Session, admin: User, report_id, payload: ReportReview) -> Report:
    if admin.role != UserRole.ADMIN:
        raise ValueError("Admin access is required")
    report = session.get(Report, report_id)
    if not report:
        raise ValueError("Report not found")
    if payload.status == ReportStatus.PENDING:
        raise ValueError("Reviewed report cannot stay pending")
    report.status = payload.status
    session.add(report)
    session.commit()
    session.refresh(report)
    return report


def block_user(session: Session, blocker: User, payload: BlockCreate) -> Block:
    if blocker.id == payload.blocked_id:
        raise ValueError("You cannot block yourself")
    existing = session.scalar(
        select(Block).where(
            Block.blocker_id == blocker.id,
            Block.blocked_id == payload.blocked_id,
        )
    )
    if existing:
        return existing
    block = Block(blocker_id=blocker.id, blocked_id=payload.blocked_id)
    session.add(block)
    session.commit()
    session.refresh(block)
    return block


def list_blocks_for_user(session: Session, user: User) -> list[Block]:
    return list(session.scalars(select(Block).where(Block.blocker_id == user.id)))
