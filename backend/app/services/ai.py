import logging
import httpx
from app.core.config import get_settings

logger = logging.getLogger(__name__)


def classify_image_via_ai(image_url_or_bytes: str | bytes, filename: str = "image.jpg") -> dict:
    settings = get_settings()
    url = f"{settings.ai_service_url}/classify"

    # Default safe fallback response
    fallback = {
        "primary_class": "unknown",
        "category_name": "Điện tử",
        "category_slug": "dien-tu",
        "confidence": 1.0,
        "is_prohibited": False,
        "prohibited_reason": "",
        "mock": True,
    }

    try:
        # Step 1: Resolve image bytes
        if isinstance(image_url_or_bytes, str):
            if image_url_or_bytes.startswith("http"):
                # Download image bytes
                with httpx.Client() as client:
                    resp = client.get(image_url_or_bytes, timeout=5.0)
                    resp.raise_for_status()
                    image_bytes = resp.content
                    # Extract filename if possible
                    if "/" in image_url_or_bytes:
                        filename = image_url_or_bytes.split("/")[-1] or filename
            elif image_url_or_bytes.startswith("/static/uploads/"):
                # Đọc tệp tin từ ổ đĩa cục bộ
                import os
                local_path = image_url_or_bytes.lstrip("/")
                if os.path.exists(local_path):
                    with open(local_path, "rb") as f:
                        image_bytes = f.read()
                    filename = os.path.basename(local_path)
                else:
                    logger.warning("Local file not found for AI classifier: %s", local_path)
                    return fallback
            else:
                logger.warning("Invalid image URL format passed to AI classifier: %s", image_url_or_bytes)
                return fallback
        else:
            image_bytes = image_url_or_bytes

        # Step 2: Post to AI Service
        with httpx.Client() as client:
            files = {"file": (filename, image_bytes, "image/jpeg")}
            response = client.post(url, files=files, timeout=8.0)
            response.raise_for_status()
            return response.json()

    except Exception as e:
        logger.error("Error communicating with AI Service at %s: %s. Using default safe fallback.", url, e)
        return fallback
