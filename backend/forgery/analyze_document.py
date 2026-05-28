"""
Colab-compatible document forgery analysis (Document_Forgery_Detection.ipynb).
OpenCV stamp/signature/logo detection + Tesseract OCR + EfficientNet ONNX.
"""
from __future__ import annotations

import json
import os
import re
import sys

import cv2
import numpy as np
from PIL import Image

try:
    import pytesseract
except ImportError:
    pytesseract = None

try:
    import onnxruntime as ort
except ImportError:
    ort = None

ROOT = os.path.dirname(os.path.abspath(__file__))
META_PATH = os.path.join(ROOT, "model", "model_metadata.json")
ONNX_PATH = os.path.join(ROOT, "model", "forgery_model.onnx")

REQUIRED_FIELDS = [
    "invoice", "date", "total", "consignee", "container",
    "bill of lading", "freight", "destination", "origin",
    "signature", "stamp", "vessel", "weight",
]

LABELS = [
    "has_stamp", "has_signature", "has_logo",
    "has_missing_fields", "high_forgery_risk",
]

MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)
THRESHOLD = 0.5
DL_RISK_THRESHOLD = 0.6

_meta = {}
if os.path.isfile(META_PATH):
    with open(META_PATH, encoding="utf-8") as f:
        _meta = json.load(f)
    LABELS = _meta.get("labels", LABELS)
    REQUIRED_FIELDS = _meta.get("required_fields", REQUIRED_FIELDS)
    THRESHOLD = _meta.get("threshold", THRESHOLD)


def configure_tesseract():
    if pytesseract is None:
        return False
    if os.environ.get("TESSERACT_CMD"):
        pytesseract.pytesseract.tesseract_cmd = os.environ["TESSERACT_CMD"]
        return True
    if sys.platform == "win32":
        for candidate in [
            r"C:\Program Files\Tesseract-OCR\tesseract.exe",
            r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
        ]:
            if os.path.isfile(candidate):
                pytesseract.pytesseract.tesseract_cmd = candidate
                return True
    try:
        pytesseract.get_tesseract_version()
        return True
    except Exception:
        return False


TESSERACT_OK = configure_tesseract()


def detect_stamp(img_np):
    gray = cv2.cvtColor(img_np, cv2.COLOR_RGB2GRAY)
    blurred = cv2.GaussianBlur(gray, (9, 9), 2)

    circles = cv2.HoughCircles(
        blurred, cv2.HOUGH_GRADIENT, dp=1.2, minDist=50,
        param1=50, param2=30, minRadius=20, maxRadius=150,
    )

    img_hsv = cv2.cvtColor(img_np, cv2.COLOR_RGB2HSV)
    blue_mask = cv2.inRange(img_hsv, (100, 50, 50), (130, 255, 255))
    red_mask = cv2.inRange(img_hsv, (0, 50, 50), (10, 255, 255))
    color_stamp = (
        cv2.countNonZero(blue_mask) > 500 or cv2.countNonZero(red_mask) > 500
    )

    has_circle_stamp = circles is not None and len(circles[0]) > 0
    return has_circle_stamp or color_stamp, {
        "circle_detected": bool(has_circle_stamp),
        "color_region_detected": bool(color_stamp),
        "circle_count": len(circles[0]) if circles is not None else 0,
    }


def detect_signature(img_np):
    gray = cv2.cvtColor(img_np, cv2.COLOR_RGB2GRAY)
    h = gray.shape[0]
    bottom_region = gray[int(h * 0.6):, :]

    thresh = cv2.adaptiveThreshold(
        bottom_region, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY_INV, 11, 2,
    )
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    sig_candidates = [
        c for c in contours
        if 20 < cv2.contourArea(c) < 5000
    ]
    has_signature = len(sig_candidates) > 15
    return has_signature, {"candidate_strokes": len(sig_candidates)}


def detect_logo(img_np):
    h, w = img_np.shape[:2]
    top_region = img_np[: int(h * 0.25), : int(w * 0.5)]

    gray = cv2.cvtColor(top_region, cv2.COLOR_RGB2GRAY)
    edges = cv2.Canny(gray, 50, 150)
    edge_density = np.sum(edges > 0) / edges.size

    has_logo = edge_density > 0.02
    return has_logo, {"edge_density": round(float(edge_density), 4)}


def extract_text_and_check_fields(img_np, fallback_text=""):
    raw_text = (fallback_text or "").lower()

    if TESSERACT_OK and pytesseract is not None:
        gray = cv2.cvtColor(img_np, cv2.COLOR_RGB2GRAY)
        _, thresh = cv2.threshold(gray, 150, 255, cv2.THRESH_BINARY)
        ocr_img = Image.fromarray(thresh)
        raw_text = pytesseract.image_to_string(ocr_img, config="--psm 6").lower()

    found_fields = {}
    missing_fields = []
    for field in REQUIRED_FIELDS:
        present = field.lower() in raw_text
        found_fields[field] = present
        if not present:
            missing_fields.append(field)

    amounts = re.findall(r"\$?\d{1,3}(?:,\d{3})*(?:\.\d{2})?", raw_text)
    dates = re.findall(r"\d{1,2}[/-]\d{1,2}[/-]\d{2,4}", raw_text)

    return {
        "found_fields": found_fields,
        "missing_fields": missing_fields,
        "amounts_found": amounts[:5],
        "dates_found": dates[:3],
        "text_length": len(raw_text),
        "raw_text_preview": raw_text[:200],
        "ocr_engine": "tesseract" if TESSERACT_OK else "fallback",
    }


def analyze_document_image(img_path, fallback_text=""):
    img = Image.open(img_path).convert("RGB")
    img_np = np.array(img)

    stamp_found, stamp_info = detect_stamp(img_np)
    sig_found, sig_info = detect_signature(img_np)
    logo_found, logo_info = detect_logo(img_np)
    text_info = extract_text_and_check_fields(img_np, fallback_text=fallback_text)

    risk_score = 0
    risk_factors = []

    if not stamp_found:
        risk_score += 30
        risk_factors.append("MISSING_STAMP")
    if not sig_found:
        risk_score += 25
        risk_factors.append("MISSING_SIGNATURE")
    if not logo_found:
        risk_score += 20
        risk_factors.append("MISSING_LOGO")
    if len(text_info["missing_fields"]) > 4:
        risk_score += 25
        risk_factors.append("MANY_MISSING_FIELDS")
    if text_info["text_length"] < 100:
        risk_score += 20
        risk_factors.append("LOW_TEXT_CONTENT")

    risk_level = "LOW" if risk_score < 30 else "MEDIUM" if risk_score < 60 else "HIGH"

    return {
        "image_path": img_path,
        "doc_name": os.path.basename(img_path),
        "stamp": {"detected": stamp_found, **stamp_info},
        "signature": {"detected": sig_found, **sig_info},
        "logo": {"detected": logo_found, **logo_info},
        "text_analysis": text_info,
        "forgery_risk": {
            "score": risk_score,
            "level": risk_level,
            "factors": risk_factors,
        },
    }


def pdf_first_page_to_image(pdf_path, out_path):
    from pdf2image import convert_from_path

    pages = convert_from_path(pdf_path, dpi=200, first_page=1, last_page=1)
    img = pages[0].convert("RGB").resize((1024, 1024), Image.LANCZOS)
    os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
    img.save(out_path, "JPEG", quality=95)
    return out_path


def prepare_image_path(input_path, temp_dir=None):
    input_path = os.path.abspath(input_path)
    ext = os.path.splitext(input_path)[1].lower()

    if ext in (".png", ".jpg", ".jpeg"):
        img = Image.open(input_path).convert("RGB").resize((1024, 1024), Image.LANCZOS)
        temp_dir = temp_dir or os.path.join(ROOT, "..", "data", "audit_temp")
        os.makedirs(temp_dir, exist_ok=True)
        out_path = os.path.join(temp_dir, os.path.basename(input_path).rsplit(".", 1)[0] + "_1024.jpg")
        img.save(out_path, "JPEG", quality=95)
        return out_path

    if ext == ".pdf":
        temp_dir = temp_dir or os.path.join(ROOT, "..", "data", "audit_temp")
        os.makedirs(temp_dir, exist_ok=True)
        out_path = os.path.join(temp_dir, os.path.basename(input_path).rsplit(".", 1)[0] + "_page1.jpg")
        return pdf_first_page_to_image(input_path, out_path)

    raise ValueError(f"Unsupported file type: {ext}")


def preprocess_for_onnx(image_path):
    img = Image.open(image_path).convert("RGB").resize((224, 224))
    arr = np.array(img, dtype=np.float32) / 255.0
    arr = (arr - MEAN) / STD
    arr = np.transpose(arr, (2, 0, 1))
    return np.expand_dims(arr, axis=0)


def run_onnx(image_path):
    if ort is None or not os.path.isfile(ONNX_PATH):
        return None

    session = ort.InferenceSession(ONNX_PATH, providers=["CPUExecutionProvider"])
    input_name = session.get_inputs()[0].name
    logits = session.run(None, {input_name: preprocess_for_onnx(image_path)})[0][0]
    probs = 1.0 / (1.0 + np.exp(-logits))

    dl_result = {}
    for label, prob, detected in zip(LABELS, probs, probs > THRESHOLD):
        dl_result[label] = {
            "prob": round(float(prob), 4),
            "detected": bool(detected),
        }
    return dl_result


def predict_document(input_path, fallback_text=""):
    img_path = prepare_image_path(input_path)
    rule_result = analyze_document_image(img_path, fallback_text=fallback_text)
    dl_result = run_onnx(img_path)

    combined_risk = dict(rule_result["forgery_risk"])
    if dl_result and dl_result.get("high_forgery_risk", {}).get("prob", 0) > DL_RISK_THRESHOLD:
        combined_risk["dl_flag"] = "HIGH_RISK_DETECTED_BY_MODEL"

    return {
        "doc_name": os.path.basename(input_path),
        "image_path": img_path,
        "rule_based": rule_result,
        "deep_learning": dl_result,
        "risk": combined_risk,
    }


def _json_safe(value):
    if isinstance(value, dict):
        return {k: _json_safe(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_json_safe(v) for v in value]
    if isinstance(value, (np.bool_,)):
        return bool(value)
    if isinstance(value, (np.integer,)):
        return int(value)
    if isinstance(value, (np.floating,)):
        return float(value)
    return value


def to_api_payload(result):
    rule = result["rule_based"]
    risk = result["risk"]
    dl = result.get("deep_learning") or {}

    flags = list(risk.get("factors", []))
    if risk.get("dl_flag"):
        flags.append(risk["dl_flag"])

    dl_labels = {}
    if dl:
        for label, info in dl.items():
            dl_labels[label] = info.get("prob", 0)

    score = int(risk.get("score", 0))
    level = risk.get("level", "LOW")
    is_suspicious = score >= 30 or bool(risk.get("dl_flag"))

    payload = {
        "doc_name": result.get("doc_name"),
        "image": os.path.basename(result.get("image_path", "")),
        "is_suspicious": is_suspicious,
        "forgery_score": score,
        "risk_level": level,
        "flags": flags,
        "missing_fields": rule.get("text_analysis", {}).get("missing_fields", []),
        "stamp": rule.get("stamp"),
        "signature": rule.get("signature"),
        "logo": rule.get("logo"),
        "text_analysis": rule.get("text_analysis"),
        "labels": dl_labels,
        "deep_learning": dl,
        "rule_based": rule,
        "risk": risk,
        "engine": "forgery-colab-v1",
        "tesseract_available": TESSERACT_OK,
    }
    return _json_safe(payload)


def main():
    import argparse

    parser = argparse.ArgumentParser(description="Colab-compatible forgery analysis")
    parser.add_argument("path", help="PDF or image path")
    parser.add_argument("--json", action="store_true", help="Print JSON result")
    parser.add_argument("--fallback-text", default="", help="PDF text fallback when OCR unavailable")
    args = parser.parse_args()

    if not os.path.exists(args.path):
        print(json.dumps({"error": f"File not found: {args.path}"}))
        return 1

    result = predict_document(args.path, fallback_text=args.fallback_text)
    payload = to_api_payload(result)

    if args.json:
        print(json.dumps(payload, indent=2))
    else:
        print(f"\nDOCUMENT: {payload['doc_name']}")
        print("\nRULE-BASED DETECTION")
        print(f"  Stamp:     {'FOUND' if payload['stamp']['detected'] else 'NOT FOUND'}")
        print(f"  Signature: {'FOUND' if payload['signature']['detected'] else 'NOT FOUND'}")
        print(f"  Logo:      {'FOUND' if payload['logo']['detected'] else 'NOT FOUND'}")
        print(f"  Missing:   {payload['missing_fields'] or 'None'}")
        if payload.get("deep_learning"):
            print("\nDEEP LEARNING")
            for label, info in payload["deep_learning"].items():
                print(f"  {label:<22} {info['prob']:.1%}")
        print(f"\nFORGERY RISK: [{payload['risk_level']}] Score: {payload['forgery_score']}/100")
        for flag in payload["flags"]:
            print(f"  -> {flag}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
