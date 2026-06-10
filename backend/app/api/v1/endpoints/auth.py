from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status, Request, BackgroundTasks
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db_session
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    MockEmailRead,
)
from app.schemas.user import UserRead
from app.services.auth import login_user, register_user

router = APIRouter()


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, session: Session = Depends(get_db_session)) -> Any:
    try:
        return register_user(session, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, session: Session = Depends(get_db_session)) -> Any:
    try:
        return login_user(session, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/me", response_model=UserRead)
def me(current_user: User = Depends(get_current_user)) -> Any:
    return current_user


def send_smtp_email_sync(recipient: str, subject: str, body_html: str, settings):
    import smtplib
    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText
    
    try:
        msg = MIMEMultipart("alternative")
        msg["From"] = settings.smtp_from_email or settings.smtp_user
        msg["To"] = recipient
        msg["Subject"] = subject
        
        part = MIMEText(body_html, "html", "utf-8")
        msg.attach(part)
        
        # Connect to SMTP
        server = smtplib.SMTP(settings.smtp_host, settings.smtp_port)
        server.starttls()
        server.login(settings.smtp_user, settings.smtp_password)
        server.sendmail(settings.smtp_user, recipient, msg.as_string())
        server.quit()
        print("=" * 60)
        print(f"[REAL SMTP EMAIL SENT TO {recipient}] successfully!")
        print("=" * 60)
    except Exception as e:
        print("=" * 60)
        print(f"[SMTP ERROR] Failed to send email to {recipient}: {e}")
        print("=" * 60)


@router.post("/forgot-password")
def forgot_password(
    payload: ForgotPasswordRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_db_session)
) -> Any:
    from app.models.mock_email import MockEmail
    from app.services.audit import log_activity
    from app.core.config import get_settings
    import uuid
    from datetime import datetime, timedelta, UTC

    user = session.scalar(select(User).where(User.email == payload.email.lower()))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email address not found"
        )
    
    token = uuid.uuid4().hex
    user.reset_token = token
    user.reset_token_expires = datetime.now(UTC) + timedelta(minutes=15)
    session.add(user)
    
    # Detect Frontend origin dynamically from headers (dynamic LAN support)
    origin = request.headers.get("origin")
    if not origin:
        referer = request.headers.get("referer")
        if referer:
            from urllib.parse import urlparse
            parsed = urlparse(referer)
            origin = f"{parsed.scheme}://{parsed.netloc}"
    if not origin:
        origin = "http://localhost:3000"
        
    reset_link = f"{origin}/reset-password?token={token}"
    email_body = f"""
    <html>
        <body style="font-family: sans-serif; padding: 20px; line-height: 1.6;">
            <h2 style="color: #6366f1;">Yêu cầu đặt lại mật khẩu</h2>
            <p>Xin chào,</p>
            <p>Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn (<strong>{user.email}</strong>).</p>
            <p>Vui lòng click vào đường dẫn dưới đây để tiến hành đặt lại mật khẩu:</p>
            <p style="margin: 20px 0;">
                <a href="{reset_link}" style="display: inline-block; padding: 10px 20px; background-color: #6366f1; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
                    Đặt lại mật khẩu
                </a>
            </p>
            <p>Đường dẫn này có hiệu lực trong vòng 15 phút.</p>
            <p>Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này.</p>
        </body>
    </html>
    """
    
    # Still write to mock emails in the database as fallback
    mock_email = MockEmail(
        recipient=user.email,
        subject="Đặt lại mật khẩu tài khoản Secondhand Marketplace",
        body=email_body
    )
    session.add(mock_email)
    session.commit()
    
    print("=" * 60)
    print(f"[MOCK EMAIL SENT TO {user.email}]")
    print(f"Reset password link: {reset_link}")
    print("=" * 60)
    
    # Try sending via real SMTP if configured in .env
    settings = get_settings()
    if settings.smtp_host and settings.smtp_user and settings.smtp_password:
        background_tasks.add_task(
            send_smtp_email_sync,
            user.email,
            "Đặt lại mật khẩu tài khoản Secondhand Marketplace",
            email_body,
            settings
        )
    
    log_activity(
        session,
        actor_id=str(user.id),
        verb="forgot_password",
        target_type="User",
        target_id=str(user.id),
        details={"token": token}
    )
    
    return {"message": "Reset instructions sent to your mailbox."}



@router.get("/verify-reset-token/{token}")
def verify_reset_token(
    token: str,
    session: Session = Depends(get_db_session)
) -> Any:
    from datetime import datetime, UTC, timezone
    
    user = session.scalar(
        select(User).where(User.reset_token == token)
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )
        
    now = datetime.now(UTC)
    expires = user.reset_token_expires
    if expires and expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
        
    if not expires or expires < now:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset token has expired"
        )
        
    return {"email": user.email}


@router.post("/reset-password")
def reset_password(
    payload: ResetPasswordRequest,
    session: Session = Depends(get_db_session)
) -> Any:
    from app.services.audit import log_activity
    from app.core.security import hash_password
    from datetime import datetime, UTC, timezone
    
    user = session.scalar(
        select(User).where(User.reset_token == payload.token)
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )
        
    now = datetime.now(UTC)
    expires = user.reset_token_expires
    if expires and expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
        
    if not expires or expires < now:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset token has expired"
        )
        
    user.password_hash = hash_password(payload.new_password)
    user.reset_token = None
    user.reset_token_expires = None
    session.add(user)
    session.commit()
    
    log_activity(
        session,
        actor_id=str(user.id),
        verb="reset_password",
        target_type="User",
        target_id=str(user.id)
    )
    return {"message": "Password has been reset successfully."}


@router.get("/mock-emails", response_model=list[MockEmailRead])
def list_mock_emails(
    session: Session = Depends(get_db_session)
) -> Any:
    from app.models.mock_email import MockEmail
    stmt = select(MockEmail).order_by(MockEmail.created_at.desc())
    return list(session.scalars(stmt))

