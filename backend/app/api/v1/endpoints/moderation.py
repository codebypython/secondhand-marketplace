from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_admin_user, get_current_user
from app.db.session import get_db_session
from app.models.user import User
from app.schemas.moderation import BlockCreate, BlockRead, ReportCreate, ReportRead, ReportReview
from app.services.moderation import (
    block_user,
    create_report,
    list_blocks_for_user,
    list_reports,
    review_report,
)

router = APIRouter()


@router.post("/reports", response_model=ReportRead, status_code=status.HTTP_201_CREATED)
def create_report_endpoint(
    payload: ReportCreate,
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> ReportRead:
    try:
        return create_report(session, current_user, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/reports", response_model=list[ReportRead])
def list_reports_endpoint(session: Session = Depends(get_db_session), _admin: User = Depends(get_admin_user)) -> list[ReportRead]:
    return list_reports(session)


@router.patch("/reports/{report_id}", response_model=ReportRead)
def review_report_endpoint(
    report_id: UUID,
    payload: ReportReview,
    session: Session = Depends(get_db_session),
    admin: User = Depends(get_admin_user),
) -> ReportRead:
    try:
        return review_report(session, admin, report_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/blocks", response_model=BlockRead, status_code=status.HTTP_201_CREATED)
def block_user_endpoint(
    payload: BlockCreate,
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> BlockRead:
    try:
        return block_user(session, current_user, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/blocks", response_model=list[BlockRead])
def list_blocks_endpoint(session: Session = Depends(get_db_session), current_user: User = Depends(get_current_user)) -> list[BlockRead]:
    return list_blocks_for_user(session, current_user)
