from fastapi import APIRouter

from app.api.v1.endpoints import (
    auth,
    chat,
    health,
    listings,
    moderation,
    social,
    transactions,
    users,
    notifications,
    media,
    map_legends,
)

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(listings.router, prefix="/listings", tags=["listings"])
api_router.include_router(transactions.router, prefix="/transactions", tags=["transactions"])
api_router.include_router(chat.router, prefix="/chat", tags=["chat"])
api_router.include_router(moderation.router, prefix="/moderation", tags=["moderation"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
api_router.include_router(social.router, tags=["social"])
api_router.include_router(media.router, prefix="/media", tags=["media"])
api_router.include_router(map_legends.router, tags=["map-legends"])

