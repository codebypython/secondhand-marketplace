import os
import shutil
import uuid
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status, Request

from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter()

ALLOWED_EXTENSIONS = {
    "png", "jpg", "jpeg", "gif", "webp",  # Images
    "mp4", "mov", "webm", "avi", "mkv"     # Videos
}


@router.post("/upload")
async def upload_file(
    request: Request,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    current_user.ensure_active()
    filename = file.filename or "file"
    ext = filename.split(".")[-1].lower() if "." in filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format. Allowed formats: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    unique_filename = f"{uuid.uuid4().hex}.{ext}"
    os.makedirs("static/uploads", exist_ok=True)
    file_path = os.path.join("static/uploads", unique_filename)

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not save file: {str(e)}"
        )

    # Trả về URL đầy đủ phục vụ kiểm duyệt AI và hiển thị Next.js
    base_url = str(request.base_url).rstrip("/")
    url = f"{base_url}/static/uploads/{unique_filename}"
    return {"url": url}
