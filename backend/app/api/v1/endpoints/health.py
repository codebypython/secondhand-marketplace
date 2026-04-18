from typing import Any
from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
def healthcheck() -> Any:
    return {"status": "ok"}
