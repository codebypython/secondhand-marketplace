from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import Profile, User
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse
from app.schemas.user import ProfileUpdate


def _load_user(session: Session, user_id):
    stmt = select(User).options(selectinload(User.profile)).where(User.id == user_id)
    return session.scalar(stmt)


def register_user(session: Session, payload: RegisterRequest) -> TokenResponse:
    existing = session.scalar(select(User).where(User.email == payload.email.lower()))
    if existing:
        raise ValueError("Email is already registered")

    user = User(
        email=payload.email.lower(),
        password_hash=hash_password(payload.password),
        profile=Profile(full_name=payload.full_name),
    )
    session.add(user)
    session.commit()
    hydrated = _load_user(session, user.id)
    return TokenResponse(access_token=create_access_token(user.id), user=hydrated)


def login_user(session: Session, payload: LoginRequest) -> TokenResponse:
    user = session.scalar(select(User).where(User.email == payload.email.lower()))
    if not user or not verify_password(payload.password, user.password_hash):
        raise ValueError("Invalid credentials")
    user.ensure_active()
    hydrated = _load_user(session, user.id)
    return TokenResponse(access_token=create_access_token(user.id), user=hydrated)


def update_profile(session: Session, user: User, payload: ProfileUpdate) -> User:
    profile = user.profile or Profile(user=user, full_name=user.email.split("@")[0])
    updates = payload.model_dump(exclude_unset=True)
    
    if "shop_slug" in updates and updates["shop_slug"] is not None:
        slug = updates["shop_slug"]
        existing = session.scalar(select(Profile).where(Profile.shop_slug == slug, Profile.id != profile.id))
        if existing:
            raise ValueError("Shop slug is already taken")

    for field, value in updates.items():
        setattr(profile, field, value)
    session.add(profile)
    session.commit()
    return _load_user(session, user.id)
