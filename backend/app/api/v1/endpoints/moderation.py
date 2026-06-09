import csv
import io
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.deps import get_admin_user, get_current_user
from app.db.session import get_db_session
from app.models.user import User
from app.schemas.moderation import (
    BlockCreate,
    BlockRead,
    DisputeResolve,
    ReportCreate,
    ReportRead,
    ReportReview,
)
from app.schemas.transaction import DealRead
from app.schemas.audit import ActivityLogRead
from app.services.moderation import (
    block_user,
    create_report,
    list_blocks_for_user,
    list_disputed_deals,
    list_reports,
    resolve_dispute,
    review_report,
    unblock_user,
)
from app.services.audit import list_activity_logs

router = APIRouter()


@router.post("/reports", response_model=ReportRead, status_code=status.HTTP_201_CREATED)
def create_report_endpoint(
    payload: ReportCreate,
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> Any:
    try:
        return create_report(session, current_user, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/reports", response_model=list[ReportRead])
def list_reports_endpoint(session: Session = Depends(get_db_session), _admin: User = Depends(get_admin_user)) -> Any:
    return list_reports(session)


@router.patch("/reports/{report_id}", response_model=ReportRead)
def review_report_endpoint(
    report_id: UUID,
    payload: ReportReview,
    session: Session = Depends(get_db_session),
    admin: User = Depends(get_admin_user),
) -> Any:
    try:
        return review_report(session, admin, report_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/blocks", response_model=BlockRead, status_code=status.HTTP_201_CREATED)
def block_user_endpoint(
    payload: BlockCreate,
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> Any:
    try:
        return block_user(session, current_user, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/blocks", response_model=list[BlockRead])
def list_blocks_endpoint(session: Session = Depends(get_db_session), current_user: User = Depends(get_current_user)) -> Any:
    return list_blocks_for_user(session, current_user)


@router.delete("/blocks/{blocked_id}", status_code=status.HTTP_204_NO_CONTENT)
def unblock_user_endpoint(
    blocked_id: UUID,
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> None:
    try:
        unblock_user(session, current_user, str(blocked_id))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc



@router.get("/disputes", response_model=list[DealRead])
def list_disputes_endpoint(
    session: Session = Depends(get_db_session),
    admin: User = Depends(get_admin_user),
) -> Any:
    return list_disputed_deals(session)


@router.post("/disputes/{deal_id}/resolve", response_model=DealRead)
def resolve_dispute_endpoint(
    deal_id: UUID,
    payload: DisputeResolve,
    session: Session = Depends(get_db_session),
    admin: User = Depends(get_admin_user),
) -> Any:
    try:
        return resolve_dispute(session, admin, deal_id, payload.resolution)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/audit-logs", response_model=list[ActivityLogRead])
def get_audit_logs_endpoint(
    session: Session = Depends(get_db_session),
    admin: User = Depends(get_admin_user),
) -> Any:
    logs = list_activity_logs(session)
    result = []
    for log in logs:
        email = log.actor.email if log.actor else None
        result.append(
            ActivityLogRead(
                id=log.id,
                actor_id=log.actor_id,
                actor_email=email,
                verb=log.verb,
                target_type=log.target_type,
                target_id=log.target_id,
                details=log.details,
                created_at=log.created_at,
            )
        )
    return result


@router.get("/reports/export")
def export_reports_csv_endpoint(
    session: Session = Depends(get_db_session),
    admin: User = Depends(get_admin_user),
) -> Any:
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Reporter ID", "Target Type", "Target ID", "Reason", "Status", "Created At"])
    for r in list_reports(session):
        t_type = r.target_type.value if hasattr(r.target_type, "value") else r.target_type
        status_val = r.status.value if hasattr(r.status, "value") else r.status
        writer.writerow([str(r.id), str(r.reporter_id), str(t_type), str(r.target_id), r.reason, str(status_val), str(r.created_at)])
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8-sig")),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=reports_export.csv"},
    )


@router.get("/analytics/stats")
def get_analytics_stats(
    session: Session = Depends(get_db_session),
    admin: User = Depends(get_admin_user)
) -> Any:
    from app.models.user import User
    from app.models.listing import Listing, Category
    from app.models.transaction import Deal
    from app.models.enums import UserStatus, ListingStatus, DealStatus
    from sqlalchemy import select, func
    
    total_users = session.scalar(select(func.count(User.id)))
    active_users = session.scalar(select(func.count(User.id)).where(User.status == UserStatus.ACTIVE))
    banned_users = session.scalar(select(func.count(User.id)).where(User.status == UserStatus.BANNED))
    
    total_listings = session.scalar(select(func.count(Listing.id)).where(Listing.deleted_at.is_(None)))
    listings_by_status = session.execute(
        select(Listing.status, func.count(Listing.id))
        .where(Listing.deleted_at.is_(None))
        .group_by(Listing.status)
    ).all()
    
    status_distribution = {}
    for row in listings_by_status:
        status_key = row[0].value if hasattr(row[0], "value") else str(row[0])
        status_distribution[status_key] = row[1]
        
    listings_by_category = session.execute(
        select(Category.name, func.count(Listing.id))
        .join(Listing.category)
        .where(Listing.deleted_at.is_(None))
        .group_by(Category.name)
    ).all()
    
    category_distribution = {row[0]: row[1] for row in listings_by_category}
    
    completed_deals = session.scalars(
        select(Deal).where(Deal.status == DealStatus.COMPLETED)
    ).all()
    total_revenue = sum(deal.agreed_price for deal in completed_deals)
    
    deals_by_status = session.execute(
        select(Deal.status, func.count(Deal.id))
        .group_by(Deal.status)
    ).all()
    deal_status_distribution = {}
    for row in deals_by_status:
        status_key = row[0].value if hasattr(row[0], "value") else str(row[0])
        deal_status_distribution[status_key] = row[1]
        
    return {
        "users": {
            "total": total_users,
            "active": active_users,
            "banned": banned_users
        },
        "listings": {
            "total": total_listings,
            "by_status": status_distribution,
            "by_category": category_distribution
        },
        "deals": {
            "total_revenue": float(total_revenue),
            "completed_count": len(completed_deals),
            "by_status": deal_status_distribution
        }
    }


