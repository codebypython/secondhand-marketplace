import os
import logging
from typing import List
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import numpy as np

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Secondhand Marketplace AI Moderation Service",
    description="YOLOv8-based product moderation and classification",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_PATH = os.getenv("YOLO_MODEL_PATH", "models/yolov8n.pt")
CONFIDENCE_THRESHOLD = float(os.getenv("AI_CONFIDENCE_THRESHOLD", "0.5"))
model = None

# Mapping standard coco classes to marketplace categories & prohibited labels
# coco dataset class indices:
# 1: bicycle, 2: car, 3: motorcycle, 5: bus, 7: truck -> Xe cộ & Phụ kiện
# 24: backpack, 26: handbag, 27: tie, 28: suitcase -> Thời trang
# 39: bottle, 40: wine glass -> alcohol (prohibited)
# 43: knife -> weapon (prohibited)
# 56: chair, 57: couch, 59: bed, 60: dining table -> Nội thất
# 62: tv, 63: laptop, 65: mouse, 66: keyboard, 67: cell phone -> Điện tử
# 73: book -> Sách & Học liệu

COCO_TO_MARKETPLACE = {
    1: ("Xe cộ & Phụ kiện", "xe-co-phu-kien"),
    2: ("Xe cộ & Phụ kiện", "xe-co-phu-kien"),
    3: ("Xe cộ & Phụ kiện", "xe-co-phu-kien"),
    5: ("Xe cộ & Phụ kiện", "xe-co-phu-kien"),
    7: ("Xe cộ & Phụ kiện", "xe-co-phu-kien"),
    24: ("Thời trang", "thoi-trang"),
    26: ("Thời trang", "thoi-trang"),
    27: ("Thời trang", "thoi-trang"),
    28: ("Thời trang", "thoi-trang"),
    56: ("Nội thất", "noi-that"),
    57: ("Nội thất", "noi-that"),
    59: ("Nội thất", "noi-that"),
    60: ("Nội thất", "noi-that"),
    62: ("Điện tử", "dien-tu"),
    63: ("Điện tử", "dien-tu"),
    65: ("Điện tử", "dien-tu"),
    66: ("Điện tử", "dien-tu"),
    67: ("Điện tử", "dien-tu"),
    73: ("Sách & Học liệu", "sach-hoc-lieu"),
}

PROHIBITED_CLASSES = {
    39: ("alcohol", "Chất có cồn/Rượu bia"),
    40: ("alcohol", "Chất có cồn/Rượu bia"),
    43: ("weapon", "Vũ khí/Dao kéo nguy hiểm"),
}

def get_model():
    """Lazy-load YOLO model with fallback."""
    global model
    if model is None:
        if not os.path.exists(MODEL_PATH):
            logger.warning(f"YOLO model not found at {MODEL_PATH}. Using mock mode.")
            model = "mock"
        else:
            try:
                from ultralytics import YOLO
                model = YOLO(MODEL_PATH)
                logger.info(f"Loaded YOLO model from {MODEL_PATH}")
            except Exception as e:
                logger.warning(f"Failed to load YOLO model: {e}. Using mock mode.")
                model = "mock"
    return model

def classify_mock(filename: str) -> dict:
    """Intelligent mock classification based on file names."""
    name_lower = filename.lower()
    
    # Prohibited checks
    if any(k in name_lower for k in ["weapon", "gun", "knife", "pistol", " kiếm", "dao", "sung"]):
        return {
            "primary_class": "weapon",
            "category_name": "Sản phẩm cấm",
            "category_slug": "prohibited",
            "confidence": 0.95,
            "is_prohibited": True,
            "prohibited_reason": "Vũ khí/Dao kéo nguy hiểm (Phát hiện bởi AI)",
            "mock": True,
        }
    if any(k in name_lower for k in ["drugs", "marijuana", "ecstasy", "cocaine", "cannabis", "ma tuy", "can sa"]):
        return {
            "primary_class": "drugs",
            "category_name": "Sản phẩm cấm",
            "category_slug": "prohibited",
            "confidence": 0.92,
            "is_prohibited": True,
            "prohibited_reason": "Chất cấm/Chất gây nghiện (Phát hiện bởi AI)",
            "mock": True,
        }
    if any(k in name_lower for k in ["alcohol", "wine", "beer", "liquor", "whiskey", "rượu", "bia"]):
        return {
            "primary_class": "alcohol",
            "category_name": "Sản phẩm cấm",
            "category_slug": "prohibited",
            "confidence": 0.89,
            "is_prohibited": True,
            "prohibited_reason": "Đồ uống có cồn/Rượu bia (Phát hiện bởi AI)",
            "mock": True,
        }

    # Category predictions
    if any(k in name_lower for k in ["phone", "iphone", "samsung", "ipad", "laptop", "macbook", "computer", "keyboard", "mouse", "monitor", "display"]):
        return {
            "primary_class": "electronics",
            "category_name": "Điện tử",
            "category_slug": "dien-tu",
            "confidence": 0.94,
            "is_prohibited": False,
            "prohibited_reason": "",
            "mock": True,
        }
    if any(k in name_lower for k in ["shirt", "tshirt", "dress", "skirt", "pants", "jeans", "shoes", "jacket", "ao ", "quan ", "vay "]):
        return {
            "primary_class": "fashion",
            "category_name": "Thời trang",
            "category_slug": "thoi-trang",
            "confidence": 0.88,
            "is_prohibited": False,
            "prohibited_reason": "",
            "mock": True,
        }
    if any(k in name_lower for k in ["pot", "pan", "cooker", "blender", "vacuum", "fridge", "fan", "quat ", "noi ", "chao "]):
        return {
            "primary_class": "home_appliances",
            "category_name": "Đồ gia dụng",
            "category_slug": "do-gia-dung",
            "confidence": 0.85,
            "is_prohibited": False,
            "prohibited_reason": "",
            "mock": True,
        }
    if any(k in name_lower for k in ["book", "novel", "textbook", "dictionary", "sach ", "vo ", "truyen "]):
        return {
            "primary_class": "books",
            "category_name": "Sách & Học liệu",
            "category_slug": "sach-hoc-lieu",
            "confidence": 0.91,
            "is_prohibited": False,
            "prohibited_reason": "",
            "mock": True,
        }
    if any(k in name_lower for k in ["bike", "bicycle", "motorcycle", "helmet", "car", "xe ", "mu bao hiem"]):
        return {
            "primary_class": "vehicles",
            "category_name": "Xe cộ & Phụ kiện",
            "category_slug": "xe-co-phu-kien",
            "confidence": 0.93,
            "is_prohibited": False,
            "prohibited_reason": "",
            "mock": True,
        }
    if any(k in name_lower for k in ["toy", "scooter", "lego", "diaper", "stroller", "do choi", "bim "]):
        return {
            "primary_class": "baby",
            "category_name": "Đồ trẻ em",
            "category_slug": "do-tre-em",
            "confidence": 0.87,
            "is_prohibited": False,
            "prohibited_reason": "",
            "mock": True,
        }
    if any(k in name_lower for k in ["racket", "bat", "ball", "gym", "dumbbells", "yoga", "vot ", "tạ", "thảm"]):
        return {
            "primary_class": "sports",
            "category_name": "Thể thao",
            "category_slug": "the-thao",
            "confidence": 0.86,
            "is_prohibited": False,
            "prohibited_reason": "",
            "mock": True,
        }
    if any(k in name_lower for k in ["camera", "lens", "tripod", "may anh", "ong kinh"]):
        return {
            "primary_class": "photography",
            "category_name": "Nhiếp ảnh",
            "category_slug": "nhiep-anh",
            "confidence": 0.92,
            "is_prohibited": False,
            "prohibited_reason": "",
            "mock": True,
        }
    if any(k in name_lower for k in ["ps5", "nintendo", "xbox", "switch", "controller", "gaming", "game"]):
        return {
            "primary_class": "gaming",
            "category_name": "Gaming",
            "category_slug": "gaming",
            "confidence": 0.90,
            "is_prohibited": False,
            "prohibited_reason": "",
            "mock": True,
        }
    if any(k in name_lower for k in ["sofa", "chair", "table", "bed", "closet", "desk", "ghe ", "ban ", "giuong"]):
        return {
            "primary_class": "furniture",
            "category_name": "Nội thất",
            "category_slug": "noi-that",
            "confidence": 0.89,
            "is_prohibited": False,
            "prohibited_reason": "",
            "mock": True,
        }

    # Default fallback
    return {
        "primary_class": "other",
        "category_name": "Điện tử",
        "category_slug": "dien-tu",
        "confidence": 0.60,
        "is_prohibited": False,
        "prohibited_reason": "",
        "mock": True,
    }

@app.get("/health")
async def health_check():
    m = get_model()
    return {
        "status": "healthy",
        "model_loaded": m != "mock",
        "model_path": MODEL_PATH,
        "confidence_threshold": CONFIDENCE_THRESHOLD,
    }

@app.post("/classify")
async def classify_image(file: UploadFile = File(...)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    contents = await file.read()
    m = get_model()
    
    if m == "mock":
        res = classify_mock(file.filename)
        res["filename"] = file.filename
        return res

    import cv2
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=400, detail="Could not decode image")

    results = m(img, conf=0.25)
    detections = []
    for r in results:
        for box in r.boxes:
            cls_id = int(box.cls[0])
            conf = float(box.conf[0])
            detections.append({
                "class_id": cls_id,
                "confidence": conf,
            })

    if not detections:
        # Fall back to filename heuristic if nothing detected via YOLO
        res = classify_mock(file.filename)
        res["mock_fallback"] = True
        return res

    # Check for prohibited items first
    prohibited_detections = [d for d in detections if d["class_id"] in PROHIBITED_CLASSES]
    if prohibited_detections:
        primary = max(prohibited_detections, key=lambda x: x["confidence"])
        label_key, label_vi = PROHIBITED_CLASSES[primary["class_id"]]
        return {
            "primary_class": label_key,
            "category_name": "Sản phẩm cấm",
            "category_slug": "prohibited",
            "confidence": round(primary["confidence"], 3),
            "is_prohibited": primary["confidence"] >= CONFIDENCE_THRESHOLD,
            "prohibited_reason": f"{label_vi} (Phát hiện bởi AI)",
            "mock": False,
        }

    # Match coco class to marketplace categories
    valid_categories = [d for d in detections if d["class_id"] in COCO_TO_MARKETPLACE]
    if valid_categories:
        primary = max(valid_categories, key=lambda x: x["confidence"])
        cat_name, cat_slug = COCO_TO_MARKETPLACE[primary["class_id"]]
        return {
            "primary_class": cat_slug,
            "category_name": cat_name,
            "category_slug": cat_slug,
            "confidence": round(primary["confidence"], 3),
            "is_prohibited": False,
            "prohibited_reason": "",
            "mock": False,
        }

    # Fallback to filename heuristic if YOLO detections are not in our target mapping
    res = classify_mock(file.filename)
    res["mock_fallback"] = True
    return res
