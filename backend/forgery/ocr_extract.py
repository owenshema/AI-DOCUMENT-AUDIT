"""Extract full OCR text from an image or PDF (first page)."""
from __future__ import annotations

import sys

import cv2
import numpy as np
from PIL import Image

from analyze_document import TESSERACT_OK, configure_tesseract, prepare_image_path

try:
    import pytesseract
except ImportError:
    pytesseract = None

configure_tesseract()


def ocr_file(input_path: str) -> str:
    if not TESSERACT_OK or pytesseract is None:
        return ""

    img_path = prepare_image_path(input_path)
    img = Image.open(img_path).convert("RGB")
    img_np = np.array(img)
    gray = cv2.cvtColor(img_np, cv2.COLOR_RGB2GRAY)
    _, thresh = cv2.threshold(gray, 150, 255, cv2.THRESH_BINARY)
    return pytesseract.image_to_string(Image.fromarray(thresh), config="--psm 6").strip()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("", end="")
        raise SystemExit(1)
    print(ocr_file(sys.argv[1]), end="")
