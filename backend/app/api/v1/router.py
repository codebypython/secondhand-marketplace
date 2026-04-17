from fastapi import APIRouter

from app.api.v1.endpoints import auth, chat, health, listings, moderation, transactions, users

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(listings.router, prefix="/listings", tags=["listings"])
api_router.include_router(transactions.router, prefix="/transactions", tags=["transactions"])
api_router.include_router(chat.router, prefix="/chat", tags=["chat"])
api_router.include_router(moderation.router, prefix="/moderation", tags=["moderation"])
