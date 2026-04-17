# Đề Xuất Tích Hợp AI (TFLite) vào Hệ Thống Chợ Đồ Cũ

## Tổng Quan

Tài liệu này phân tích khả năng tích hợp các mô hình AI dưới dạng `.tflite` (TensorFlow Lite) — được fine-tune hoặc train sẵn từ Kaggle — vào hệ thống Chợ Đồ Cũ (Secondhand Marketplace). Mục tiêu là tăng trải nghiệm người dùng, tự động hoá quy trình, và nâng cao độ tin cậy của nền tảng.

### Tại sao TFLite?
- Nhẹ, chạy inference nhanh trên CPU (không cần GPU).
- Dễ deploy trên backend Python qua thư viện `tflite-runtime`.
- Hàng ngàn pre-trained models trên Kaggle/TensorFlow Hub.
- Có thể fine-tune trên dữ liệu marketplace riêng.

---

## Chức năng Khả Thi Tích Hợp AI

### 1. 🖼️ Tự Động Phân Loại Sản Phẩm Từ Ảnh (Image Classification)

**Áp dụng vào:** Chức năng **Đăng tin bán hàng** (08) + **Quản lý danh mục** (12)

**Mô tả:** Khi seller upload ảnh sản phẩm, AI tự động nhận diện loại sản phẩm và gợi ý danh mục phù hợp.

**Model Kaggle đề xuất:**
- MobileNetV2 (pre-trained ImageNet, fine-tune trên dataset secondhand goods)
- EfficientNet-Lite (tối ưu cho TFLite)
- Dataset: "Secondhand Product Detection" hoặc custom dataset từ dữ liệu hệ thống

**Cách hoạt động:**
```
[User upload ảnh] → Frontend gửi ảnh (multipart/form-data)
  → Backend nhận ảnh → Resize 224x224 → Normalize pixels [0,1]
  → TFLite Interpreter load model "product_classifier.tflite"
  → model.invoke() → output: [{category: "Điện thoại", confidence: 0.92}, ...]
  → Trả về top-3 gợi ý danh mục cho user chọn
  → User confirm/chỉnh sửa → Lưu listing với category đã chọn
```

**Trình tự tích hợp:**
1. Thu thập & gán nhãn ~500-1000 ảnh sản phẩm theo 10 danh mục hiện có.
2. Fine-tune MobileNetV2 trên Kaggle Notebook (GPU miễn phí).
3. Export sang `.tflite` (quantized INT8 để giảm size < 5MB).
4. Tạo service `app/services/ai/image_classifier.py`:
   - Load model 1 lần khi startup.
   - Hàm `classify_image(image_bytes) → list[{category, confidence}]`.
5. Thêm endpoint `POST /api/v1/ai/classify-image` (nhận ảnh, trả gợi ý).
6. Frontend: sau khi upload ảnh, gọi API → hiển thị gợi ý danh mục dạng chips.

---

### 2. 💰 Gợi Ý Giá Bán Hợp Lý (Price Prediction)

**Áp dụng vào:** Chức năng **Đăng tin bán hàng** (08) + **Gửi đề xuất giá** (13)

**Mô tả:** AI dự đoán mức giá hợp lý cho sản phẩm dựa trên danh mục, tình trạng, và thuộc tính. Giúp seller đặt giá cạnh tranh và buyer biết giá nào là "deal tốt".

**Model Kaggle đề xuất:**
- Regression model (Dense NN / Gradient Boosting → export TFLite)
- Dataset: dữ liệu listings trong hệ thống + Kaggle "Used Product Pricing"
- Features: category_id, condition (NEW/LIKE_NEW/USED), title_embedding, image_features

**Cách hoạt động:**
```
[User điền thông tin sản phẩm]
  → Backend nhận: category_id, condition, title, image_url
  → Encode: one-hot category (10 dims) + condition (3 dims) + text embedding
  → TFLite model "price_predictor.tflite"
  → Output: {suggested_price: 2500000, price_range: [2000000, 3000000]}
  → Frontend hiển thị: "💡 Giá gợi ý: 2.500.000₫ (khoảng 2-3 triệu)"
```

**Trình tự tích hợp:**
1. Export dữ liệu listings hiện có (category, condition, price) làm training data.
2. Train regression model trên Kaggle (TensorFlow/Keras Dense layers).
3. Convert sang TFLite.
4. Tạo `app/services/ai/price_predictor.py`:
   - Hàm `predict_price(category_id, condition, title) → {suggested, min, max}`.
5. Thêm endpoint `POST /api/v1/ai/predict-price`.
6. Frontend: khi user chọn category + condition → auto-call API → hiển thị gợi ý dưới input giá.

---

### 3. 🛡️ Phát Hiện Tin Đăng Lừa Đảo / Spam (Text Classification)

**Áp dụng vào:** Chức năng **Đăng tin bán hàng** (08) + **Báo cáo vi phạm** (19) + **Xem xét báo cáo Admin** (21)

**Mô tả:** AI tự động phân tích nội dung tin đăng (title + description) để phát hiện tin spam, lừa đảo, hoặc nội dung vi phạm chính sách.

**Model Kaggle đề xuất:**
- Text Classification: DistilBERT-tiny hoặc LSTM → TFLite
- Hoặc đơn giản hơn: TF-IDF + Dense NN → TFLite
- Dataset Kaggle: "Spam Detection", "Fraud Product Detection", "Vietnamese Text Classification"

**Cách hoạt động:**
```
[User submit tin đăng mới]
  → Backend nhận title + description
  → Tokenize text → Pad/truncate to max_length=128
  → TFLite model "spam_detector.tflite"
  → Output: {is_spam: 0.15, is_fraud: 0.03, is_normal: 0.82}
  → Nếu is_spam > 0.7 → auto-flag "Cần kiểm duyệt"
  → Nếu is_fraud > 0.5 → auto-hide + thông báo admin
  → Frontend: hiển thị badge "✅ Đã kiểm tra" hoặc "⚠️ Đang kiểm duyệt"
```

**Trình tự tích hợp:**
1. Gán nhãn ~500 tin đăng: bình thường / spam / lừa đảo.
2. Train text classifier trên Kaggle (LSTM + Vietnamese tokenizer).
3. Export TFLite.
4. Tạo `app/services/ai/content_moderator.py`:
   - Hàm `check_listing(title, description) → {spam_score, fraud_score}`.
5. Hook vào `create_listing()` service: sau khi tạo listing → chạy AI check.
6. Nếu score cao → listing.status = "PENDING_REVIEW" thay vì "AVAILABLE".
7. Admin dashboard hiển thị AI confidence score bên cạnh mỗi listing cần duyệt.

---

### 4. 📷 Đánh Giá Chất Lượng Ảnh Sản Phẩm (Image Quality Assessment)

**Áp dụng vào:** Chức năng **Đăng tin bán hàng** (08)

**Mô tả:** AI đánh giá chất lượng ảnh sản phẩm (mờ, tối, cắt xén kém, không liên quan) và đưa ra gợi ý cải thiện.

**Model Kaggle đề xuất:**
- Image Quality Assessment (IQA): NIMA (Neural Image Assessment) → TFLite
- Hoặc custom CNN classifier: good_photo / bad_photo / blurry / too_dark
- Dataset Kaggle: "Image Quality Assessment", "Photo Quality Prediction"

**Cách hoạt động:**
```
[User upload ảnh sản phẩm]
  → Backend resize → TFLite "image_quality.tflite"
  → Output: {quality_score: 7.2/10, issues: ["too_dark", "low_resolution"]}
  → Frontend hiển thị:
    - Score ≥ 7: "✅ Ảnh đẹp, sản phẩm dễ bán hơn!"
    - Score 4-7: "⚠️ Ảnh hơi tối, nên chụp lại với ánh sáng tốt hơn"
    - Score < 4: "❌ Ảnh mờ/tối, khuyến khích chụp lại"
```

**Trình tự tích hợp:**
1. Download NIMA pre-trained model từ Kaggle/TF Hub.
2. Quantize sang TFLite INT8.
3. Tạo `app/services/ai/image_quality.py`:
   - Hàm `assess_quality(image_bytes) → {score, issues[]}`.
4. Tích hợp vào upload flow: trước khi lưu ảnh → check quality → trả warning.
5. Frontend: hiển thị quality indicator dưới mỗi ảnh upload.

---

### 5. 💬 Phát Hiện Tin Nhắn Độc Hại (Chat Toxicity Detection)

**Áp dụng vào:** Chức năng **Nhắn tin** (18) + **Chặn người dùng** (20)

**Mô tả:** AI phân tích tin nhắn real-time để phát hiện ngôn ngữ thù địch, quấy rối, hoặc lừa đảo trong chat.

**Model Kaggle đề xuất:**
- Toxic Comment Classification (Kaggle Competition model) → TFLite
- Multilingual toxic detection: fine-tune trên tiếng Việt
- Dataset: "Jigsaw Toxic Comment Classification" + Vietnamese toxic comments

**Cách hoạt động:**
```
[User gửi tin nhắn]
  → Backend nhận content
  → TFLite "toxicity_detector.tflite"
  → Output: {toxic: 0.85, threat: 0.12, insult: 0.72}
  → Nếu toxic > 0.8 → block message + cảnh báo sender
  → Nếu toxic > 0.5 → cho phép gửi nhưng flag cho admin
  → Auto-suggest block nếu user gửi ≥ 3 toxic messages
```

**Trình tự tích hợp:**
1. Fine-tune multilingual toxic model trên Vietnamese chat data.
2. Export TFLite (model nhỏ, inference < 50ms).
3. Tạo `app/services/ai/toxicity_detector.py`.
4. Hook vào `send_message()`: kiểm tra content trước khi INSERT.
5. Frontend: hiển thị cảnh báo "Tin nhắn này có thể vi phạm chính sách cộng đồng".

---

### 6. 🔍 Tìm Kiếm Sản Phẩm Bằng Ảnh (Visual Search)

**Áp dụng vào:** Chức năng **Duyệt danh sách sản phẩm** (06) + **Xem chi tiết sản phẩm** (07)

**Mô tả:** Thay vì gõ text, user upload ảnh sản phẩm mình muốn tìm → AI tìm sản phẩm tương tự trong hệ thống.

**Model Kaggle đề xuất:**
- Feature Extraction: MobileNetV2 (bỏ layer cuối) → TFLite
- Similarity search: cosine similarity trên feature vectors
- Dataset: không cần train thêm — dùng pre-trained feature extractor

**Cách hoạt động:**
```
[Tạo index] (chạy offline / khi listing mới được tạo):
  → Mỗi listing → extract ảnh → MobileNetV2 → feature vector (1280 dims)
  → Lưu vector vào DB (cột mới "image_embedding" JSONB)

[User tìm kiếm bằng ảnh]:
  → Upload ảnh → extract feature vector
  → Cosine similarity với tất cả listing vectors
  → Trả về top-10 sản phẩm tương tự nhất
```

**Trình tự tích hợp:**
1. Download MobileNetV2 feature extractor TFLite từ TF Hub.
2. Thêm cột `image_embedding` (JSONB) vào bảng `listings`.
3. Script batch: chạy extract embedding cho tất cả listings hiện có.
4. Hook vào `create_listing()`: auto-extract embedding khi tạo listing mới.
5. Endpoint `POST /api/v1/ai/visual-search` (nhận ảnh → trả listings tương tự).
6. Frontend: nút "📷 Tìm bằng ảnh" trên trang chủ → upload → grid kết quả.

---

## Kiến Trúc Tích Hợp TFLite

### Cấu trúc thư mục đề xuất
```
backend/
├── app/
│   ├── services/
│   │   ├── ai/
│   │   │   ├── __init__.py
│   │   │   ├── base.py              # TFLiteModel base class
│   │   │   ├── image_classifier.py   # Phân loại sản phẩm
│   │   │   ├── price_predictor.py    # Gợi ý giá
│   │   │   ├── content_moderator.py  # Phát hiện spam/fraud
│   │   │   ├── image_quality.py      # Đánh giá chất lượng ảnh
│   │   │   ├── toxicity_detector.py  # Phát hiện toxic chat
│   │   │   └── visual_search.py      # Tìm kiếm bằng ảnh
│   ├── api/v1/endpoints/
│   │   ├── ai.py                     # AI endpoints
├── models/                           # Thư mục chứa file .tflite
│   ├── product_classifier.tflite
│   ├── price_predictor.tflite
│   ├── spam_detector.tflite
│   ├── image_quality.tflite
│   ├── toxicity_detector.tflite
│   └── feature_extractor.tflite
```

### Base Class cho TFLite Models
```python
# app/services/ai/base.py
import numpy as np
import tflite_runtime.interpreter as tflite
from pathlib import Path

class TFLiteModel:
    """Base class quản lý lifecycle của TFLite model."""

    def __init__(self, model_path: str):
        model_file = Path(__file__).parent.parent.parent.parent / "models" / model_path
        self.interpreter = tflite.Interpreter(model_path=str(model_file))
        self.interpreter.allocate_tensors()
        self.input_details = self.interpreter.get_input_details()
        self.output_details = self.interpreter.get_output_details()

    def predict(self, input_data: np.ndarray) -> np.ndarray:
        self.interpreter.set_tensor(self.input_details[0]['index'], input_data)
        self.interpreter.invoke()
        return self.interpreter.get_tensor(self.output_details[0]['index'])
```

### Ví dụ Image Classifier chi tiết
```python
# app/services/ai/image_classifier.py
import numpy as np
from PIL import Image
from io import BytesIO
from app.services.ai.base import TFLiteModel

CATEGORIES = [
    "Điện thoại", "Laptop", "Thời trang", "Gia dụng", "Xe cộ",
    "Sách", "Thể thao", "Đồ chơi", "Nội thất", "Khác"
]

class ProductClassifier(TFLiteModel):
    def __init__(self):
        super().__init__("product_classifier.tflite")

    def classify(self, image_bytes: bytes, top_k: int = 3) -> list[dict]:
        # Preprocessing
        img = Image.open(BytesIO(image_bytes)).convert("RGB")
        img = img.resize((224, 224))
        input_data = np.expand_dims(np.array(img, dtype=np.float32) / 255.0, axis=0)

        # Inference
        output = self.predict(input_data)[0]

        # Top-K results
        top_indices = output.argsort()[-top_k:][::-1]
        return [
            {"category": CATEGORIES[i], "confidence": float(output[i])}
            for i in top_indices
        ]

# Singleton instance (load 1 lần khi import)
classifier = ProductClassifier()
```

### Endpoint API
```python
# app/api/v1/endpoints/ai.py
from fastapi import APIRouter, UploadFile, File
from app.services.ai.image_classifier import classifier

router = APIRouter()

@router.post("/classify-image")
async def classify_image(file: UploadFile = File(...)):
    image_bytes = await file.read()
    results = classifier.classify(image_bytes, top_k=3)
    return {"predictions": results}
```

---

## Ma Trận Đánh Giá Khả Thi

| # | Chức năng AI | Độ khó | Giá trị UX | Model size | Inference time | Ưu tiên |
|---|---|---|---|---|---|---|
| 1 | Phân loại sản phẩm từ ảnh | ⭐⭐ | ⭐⭐⭐⭐⭐ | ~5 MB | ~100ms | 🔴 Cao |
| 2 | Gợi ý giá bán | ⭐⭐ | ⭐⭐⭐⭐ | ~1 MB | ~10ms | 🔴 Cao |
| 3 | Phát hiện spam/fraud | ⭐⭐⭐ | ⭐⭐⭐⭐ | ~3 MB | ~50ms | 🟡 TB |
| 4 | Đánh giá chất lượng ảnh | ⭐⭐ | ⭐⭐⭐ | ~5 MB | ~100ms | 🟡 TB |
| 5 | Phát hiện toxic chat | ⭐⭐⭐ | ⭐⭐⭐ | ~3 MB | ~30ms | 🟢 Thấp |
| 6 | Tìm kiếm bằng ảnh | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ~10 MB | ~150ms | 🟢 Thấp |

---

## Lộ Trình Triển Khai Đề Xuất

### Phase 1 — Foundation (Tuần 1-2)
```
[x] Cài đặt tflite-runtime vào backend
[ ] Tạo cấu trúc thư mục app/services/ai/
[ ] Implement TFLiteModel base class
[ ] Tạo endpoint router /api/v1/ai/
[ ] Unit test cho base class
```

### Phase 2 — Image Classification (Tuần 3-4)
```
[ ] Thu thập + gán nhãn 500 ảnh sản phẩm (10 categories)
[ ] Fine-tune MobileNetV2 trên Kaggle Notebook
[ ] Export + quantize → product_classifier.tflite
[ ] Implement ProductClassifier service
[ ] Tích hợp vào trang đăng tin (frontend)
[ ] Testing: accuracy ≥ 80% trên test set
```

### Phase 3 — Price Prediction (Tuần 5-6)
```
[ ] Export training data từ DB hiện có
[ ] Train regression model trên Kaggle
[ ] Export price_predictor.tflite
[ ] Implement PricePredictor service
[ ] Tích hợp gợi ý giá trong form đăng tin
[ ] Testing: MAE ≤ 15% giá thực tế
```

### Phase 4 — Content Moderation (Tuần 7-8)
```
[ ] Gán nhãn 500 tin đăng (normal/spam/fraud)
[ ] Train text classifier
[ ] Implement ContentModerator service
[ ] Hook vào create_listing() flow
[ ] Cập nhật admin dashboard hiển thị AI score
```

### Phase 5 — Nâng cao (Tuần 9+)
```
[ ] Image Quality Assessment
[ ] Toxicity Detection cho chat
[ ] Visual Search (feature extraction + similarity)
[ ] A/B testing các model
[ ] Monitoring: tracking accuracy theo thời gian
```

---

## Yêu Cầu Kỹ Thuật

### Dependencies cần thêm
```
# pyproject.toml hoặc requirements.txt:
tflite-runtime==2.14.0    # TFLite inference engine
Pillow>=10.0              # Image processing (đã có)
numpy>=1.24               # Numerical operations (đã có)
```

### Cấu hình
```python
# app/core/config.py (thêm)
AI_MODELS_DIR: str = "models/"
AI_IMAGE_CLASSIFIER_ENABLED: bool = True
AI_PRICE_PREDICTOR_ENABLED: bool = True
AI_CONTENT_MODERATOR_ENABLED: bool = False  # enable khi model sẵn sàng
AI_CONFIDENCE_THRESHOLD: float = 0.7        # ngưỡng tin cậy tối thiểu
```

### Lưu ý Production
- **Model caching:** Load model 1 lần duy nhất (singleton pattern), không load mỗi request.
- **Async inference:** Dùng `asyncio.to_thread()` để không block event loop.
- **Fallback:** Nếu AI service lỗi → gracefully degrade, không block user flow.
- **Monitoring:** Log inference time + confidence distribution để theo dõi model drift.
- **Model versioning:** Đặt tên file `model_v1.tflite`, `model_v2.tflite` để dễ rollback.
