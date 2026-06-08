from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
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
