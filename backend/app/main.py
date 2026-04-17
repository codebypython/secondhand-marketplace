from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.logging import configure_logging
from app.db.session import SessionFactory, get_db_session


def create_app(session_factory=SessionFactory) -> FastAPI:
    settings = get_settings()
    configure_logging()

    app = FastAPI(
        title=settings.project_name,
        version="0.1.0",
        description="Production-leaning social marketplace backend",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.backend_cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    def get_session_override():
        with session_factory() as session:
            yield session

    app.dependency_overrides[get_db_session] = get_session_override
    app.include_router(api_router, prefix=settings.api_v1_prefix)

    @app.get("/")
    def root() -> dict[str, str]:
        return {"message": "Secondhand Marketplace API is running"}

    return app


app = create_app()
