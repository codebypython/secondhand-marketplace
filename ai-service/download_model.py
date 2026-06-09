import os
import sys
from pathlib import Path

MODELS_DIR = Path(__file__).parent / 'models'
MODELS_DIR.mkdir(exist_ok=True)
TARGET = MODELS_DIR / 'yolov8n.pt'

def main():
    if TARGET.exists():
        print(f'Model already exists at {TARGET}. Skipping download.')
        return 0
    try:
        from ultralytics import YOLO
    except ImportError:
        print('ultralytics not installed. Run `pip install -r requirements.txt` first.')
        return 1

    print('Downloading yolov8n.pt via ultralytics...')
    model = YOLO('yolov8n.pt')
    weights = Path(model.ckpt_path) if hasattr(model, 'ckpt_path') and model.ckpt_path else None
    if weights and weights.exists():
        TARGET.write_bytes(weights.read_bytes())
        print(f'Saved to {TARGET}')
    else:
        print('ultralytics auto-downloaded weights.')
    return 0

if __name__ == '__main__':
    sys.exit(main())
