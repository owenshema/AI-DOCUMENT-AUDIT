"""Extract full OCR text from an image or PDF (all pages)."""
from __future__ import annotations

import os
import sys

import cv2
import numpy as np
from PIL import Image

from analyze_document import TESSERACT_OK, configure_tesseract, sniff_file_type

try:
    import pytesseract
except ImportError:
    pytesseract = None

configure_tesseract()

# Cap pages so a huge scanned PDF can't hang the audit. Override with env var.
MAX_PDF_PAGES = int(os.environ.get("OCR_MAX_PDF_PAGES", "5"))
IMAGE_EXTS = (".png", ".jpg", ".jpeg", ".bmp", ".gif", ".tif", ".tiff", ".webp")


def _ocr_image_np(img_np) -> str:
    gray = cv2.cvtColor(img_np, cv2.COLOR_RGB2GRAY)
    # Otsu adapts the threshold per-image — far more robust than a fixed cutoff.
    _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    return pytesseract.image_to_string(Image.fromarray(thresh), config="--psm 6").strip()


def _ocr_pil(img) -> str:
    return _ocr_image_np(np.array(img.convert("RGB")))


def ocr_file(input_path: str) -> str:
    if not TESSERACT_OK or pytesseract is None:
        return ""

    input_path = os.path.abspath(input_path)
    ext = os.path.splitext(input_path)[1].lower()
    real_type = sniff_file_type(input_path)
    is_pdf = real_type == "pdf" or (real_type is None and ext == ".pdf")
    is_image = real_type == "image" or (real_type is None and ext in IMAGE_EXTS)

    if is_pdf:
        from pdf2image import convert_from_path
        try:
            pages = convert_from_path(input_path, dpi=150, first_page=1, last_page=MAX_PDF_PAGES)
        except Exception:
            # Fall back to a lower DPI / first page only if full conversion fails.
            try:
                pages = convert_from_path(input_path, dpi=120, first_page=1, last_page=1)
            except Exception:
                pages = []
        texts = []
        for page in pages:
            page_text = _ocr_pil(page)
            if page_text:
                texts.append(page_text)
        return "\n\n".join(texts).strip()

    if is_image:
        return _ocr_pil(Image.open(input_path))

    # Unknown type — last resort, try to open it as an image.
    try:
        return _ocr_pil(Image.open(input_path))
    except Exception:
        return ""


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("", end="")
        raise SystemExit(1)
    print(ocr_file(sys.argv[1]), end="")
