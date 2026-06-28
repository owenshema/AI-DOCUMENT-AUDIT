"""
SIFCO document audit engine — ported from Untitled3.ipynb
Rule-based classification, field extraction, and fraud checks for 7 SIFCO paper types.
"""
from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path

TEMPLATES = {
    "SHIPPING_AGREEMENT": {
        "name": "Shipping Agreement",
        "spec_id": "shipping_agreement",
        "keywords": ["shipping agreement", "sifco", "sea freight", "road freight", "bill of loading"],
        "required_fields": [
            "consignee", "model", "chs", "color", "sea freight",
            "road freight", "b/l fee", "local charges", "total",
            "method of loading", "weight", "bill of loading",
            "final destination", "name of vessel", "voyage number", "etd",
        ],
        "valid_tins": ["121348946"],
        "valid_issuers": ["SUPER INTERNATIONAL FREIGHT SERVICES LLC"],
        "required_signatures": ["SIFCO SIGNATURE", "CLIENT'S SIGNATURE"],
    },
    "FREIGHT_INVOICE": {
        "name": "Sea Freight Invoice",
        "spec_id": "sea_freight_invoice",
        "keywords": ["freight invoice", "freight invoce", "ganador", "sea freight", "port of loading"],
        "required_fields": [
            "consignee", "date", "sea freight", "total",
            "port of loading", "port of discharge", "bl number",
            "final destination", "name of vessel", "voyage number", "etd",
        ],
        "valid_tins": [],
        "valid_issuers": ["GANADOR GENERAL TRADING"],
        "required_signatures": [],
    },
    "PACKING_LIST": {
        "name": "Packing List",
        "spec_id": "packing_list",
        "keywords": ["packing list", "packages", "qty", "total packages"],
        "required_fields": [
            "consigne", "date", "total", "method of loading",
            "weight", "container number", "bill of loading",
            "final destination", "name of vessel", "voyage number", "etd",
        ],
        "valid_tins": [],
        "valid_issuers": ["GANADOR GENERAL TRADING"],
        "required_signatures": [],
    },
    "HBL": {
        "name": "House Bill of Lading",
        "spec_id": "bill_of_lading",
        "keywords": ["bill of lading", "shipper", "notify party", "port of discharge", "place of receipt", "vessel voyage"],
        "required_fields": [
            "shipper", "consignee", "notify party", "bill of lading no",
            "place of receipt", "port of loading", "port of discharge",
            "gross weight", "container no", "seal",
        ],
        "valid_tins": ["121348946"],
        "valid_issuers": ["AL SHAMALI INTERNATIONAL", "SUPER INTERNATIONAL FREIGHT"],
        "required_signatures": ["authorised signatory"],
    },
    "TRUCKING_INVOICE": {
        "name": "Trucking Invoice",
        "spec_id": "trucking_invoice",
        "keywords": ["trucking invoice", "top sifco", "inland transport", "plate number"],
        "required_fields": [
            "invoice no", "date", "currency", "plate number",
            "origin", "destination", "container no", "rate", "total amount",
        ],
        "valid_tins": ["4003036334"],
        "valid_issuers": ["TOP SIFCO"],
        "required_signatures": [],
    },
    "SIFCO_INVOICE": {
        "name": "SIFCO Freight Invoice",
        "spec_id": "freight_invoice",
        "keywords": ["invoice", "sifco", "freight charges", "bl fee", "local charges", "war cost"],
        "required_fields": [
            "invoice no", "date", "currency", "origin", "destination",
            "container no", "freight charges", "bl fee", "local charges", "bank",
        ],
        "valid_tins": ["121348946"],
        "valid_issuers": ["SUPER INTERNATIONAL FREIGHT SERVICES LLC"],
        "required_signatures": [],
    },
    "SHIPPING_INSTRUCTION": {
        "name": "Shipping Instruction",
        "spec_id": "shipping_instruction",
        "keywords": [
            "shipping instruction", "sifco", "al shamali", "container", "roro",
            "port of discharge", "final place of delivery", "trading conditions",
        ],
        "required_fields": [
            "shipper", "consignee", "port of discharge", "final place of delivery",
            "container no", "method of loading", "description of goods",
            "freight", "b/l fee", "total",
        ],
        "valid_tins": [],
        "valid_issuers": ["AL SHAMALI INTERNATIONAL FREIGHT SERVICES LLC"],
        "required_signatures": ["SIGNATURE (H.O.D)", "SIGNATURE (CUSTOMER)"],
    },
}

ALL_VALID_TINS = {
    "121348946": "SUPER INTERNATIONAL FREIGHT SERVICES LLC — Kigali, Rwanda",
    "4003036334": "TOP SIFCO SURL — Bujumbura, Burundi",
}

KNOWN_BL_NUMBERS = ["DXB1022332", "DXB1020247"]
KNOWN_CONTAINERS = ["TEMU6439085", "ECMU5567458"]
KNOWN_VOYAGES = ["02SOGS1MA"]
KNOWN_VESSELS = ["CMA CGM SEMARANG", "SEMARSNG"]

REFERENCE_PDF_MAP = {
    "01-packing-list-unique-hybrid.pdf": "PACKING_LIST",
    "02-shipping-agreement-john.pdf": "SHIPPING_AGREEMENT",
    "03-hbl-unique-hybrid.pdf": "HBL",
    "04-freight-invoice-unique-hybrid.pdf": "SIFCO_INVOICE",
    "05-trucking-invoice-ecmu5567458.pdf": "TRUCKING_INVOICE",
    "06-sea-freight-john.pdf": "FREIGHT_INVOICE",
    "07-shipping-instruction-sifco-3452.png": "SHIPPING_INSTRUCTION",
}


def _fuzz_partial_ratio(a: str, b: str) -> float:
    try:
        from fuzzywuzzy import fuzz
        return float(fuzz.partial_ratio(a, b))
    except Exception:
        a, b = a.lower(), b.lower()
        if a in b or b in a:
            return 100.0
        return 0.0


def extract_text(filepath: str) -> str:
    ext = Path(filepath).suffix.lower()

    if ext == ".pdf":
        text = ""
        try:
            import pdfplumber
            with pdfplumber.open(filepath) as pdf:
                for page in pdf.pages:
                    t = page.extract_text()
                    if t:
                        text += t + "\n"
        except Exception as e:
            print(f"  pdfplumber error: {e}", file=sys.stderr)

        if len(text.strip()) < 100:
            try:
                import pytesseract
                from pdf2image import convert_from_path
                images = convert_from_path(filepath, dpi=300)
                for img in images:
                    text += pytesseract.image_to_string(img) + "\n"
            except Exception as e:
                print(f"  OCR error: {e}", file=sys.stderr)
        return text.strip()

    if ext in [".docx", ".doc"]:
        from docx import Document
        doc = Document(filepath)
        return "\n".join(p.text for p in doc.paragraphs).strip()

    if ext in [".png", ".jpg", ".jpeg", ".tiff", ".bmp"]:
        import pytesseract
        from PIL import Image
        return pytesseract.image_to_string(Image.open(filepath)).strip()

    if ext == ".txt":
        return Path(filepath).read_text(encoding="utf-8", errors="ignore").strip()

    return ""


def classify_document(text: str) -> tuple[str, float]:
    text_lower = text.lower()
    scores = {}
    for doc_type, template in TEMPLATES.items():
        score = 0.0
        for keyword in template["keywords"]:
            if keyword.lower() in text_lower:
                score += 1
            else:
                for line in text_lower.split("\n"):
                    if _fuzz_partial_ratio(keyword.lower(), line) > 85:
                        score += 0.5
                        break
        scores[doc_type] = score / max(1, len(template["keywords"]))

    best = max(scores, key=scores.get)
    confidence = round(scores[best] * 100, 1)
    if confidence < 20:
        return "UNKNOWN", 0.0
    return best, confidence


def extract_fields(text: str) -> dict:
    text_upper = text.upper()
    fields = {}

    tins = re.findall(r"(?:TIN|NIF)\s*(?:NUMBER)?\s*[:\-]?\s*(\d{6,12})", text_upper)
    fields["tin_numbers"] = list(set(tins))

    bls = re.findall(
        r"(?:BILL OF LAD(?:ING|ING NO)|BILL OF LOAD(?:ING)?|BL NUMBER|BL NO|B/L)[:\s#]*([A-Z]{2,4}\d{6,10})",
        text_upper,
    )
    fields["bl_numbers"] = list(set(bls))

    container = re.search(r"CONTAINER\s*(?:NO|NUMBER|N[O°]?)[:\s]*([A-Z]{4}\d{7})", text_upper)
    fields["container"] = container.group(1) if container else None

    vessel = re.search(r"(?:NAME OF VESSEL|VESSEL\s*VOYAGE)[:\s]*([\w\s]+?)(?:\n|/)", text_upper)
    fields["vessel"] = vessel.group(1).strip() if vessel else None

    voyage = re.search(r"VOYAGE\s*(?:NUMBER)?[:\s]*(\w+)", text_upper)
    fields["voyage"] = voyage.group(1).strip() if voyage else None

    consignee = re.search(r"CONSIGN(?:EE|E)[:\s]+([^\n]+)", text_upper)
    fields["consignee"] = consignee.group(1).strip() if consignee else None

    inv = re.search(r"INVOICE\s*(?:NO\.?|NUMBER)[:\s]+(\S+)", text_upper)
    fields["invoice_no"] = inv.group(1).strip() if inv else None

    dates = re.findall(r"\b(\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4})\b", text)
    fields["dates"] = list(set(dates))

    total = re.search(r"TOTAL\s*[/USD]*[:\s]*(\d[\d,\.]+)", text_upper)
    fields["total"] = float(total.group(1).replace(",", "")) if total else None

    origin = re.search(r"ORIGIN\s*[:\s]+([^\n]+)", text_upper)
    fields["origin"] = origin.group(1).strip() if origin else None

    dest = re.search(r"(?:FINAL\s+)?DESTINATION\s*[:\s]+([^\n]+)", text_upper)
    fields["destination"] = dest.group(1).strip() if dest else None

    weight = re.search(r"WEIGHT\s*[:\s]*(\d+\s*KGS?)", text_upper)
    fields["weight"] = weight.group(1).strip() if weight else None

    return fields


def check_document(text: str, doc_type: str, fields: dict) -> list[dict]:
    issues = []
    text_upper = text.upper()
    template = TEMPLATES.get(doc_type)
    if not template:
        return [{"severity": "CRITICAL", "check": "Type", "message": "Document type unknown"}]

    valid_tins = template.get("valid_tins", [])
    found_tins = fields.get("tin_numbers", [])
    if valid_tins:
        if not found_tins:
            issues.append({"severity": "HIGH", "check": "TIN", "message": f"TIN missing. Expected: {valid_tins}"})
        else:
            for tin in found_tins:
                if tin not in ALL_VALID_TINS:
                    issues.append({"severity": "CRITICAL", "check": "TIN", "message": f"Invalid TIN '{tin}'"})
                elif tin not in valid_tins:
                    issues.append({"severity": "HIGH", "check": "TIN", "message": f"TIN '{tin}' wrong for this document type"})

    missing = []
    for field in template.get("required_fields", []):
        in_text = field.upper() in text_upper
        fuzzy_match = any(_fuzz_partial_ratio(field.upper(), line) > 80 for line in text_upper.split("\n"))
        if not in_text and not fuzzy_match:
            missing.append(field)
    if missing:
        issues.append({"severity": "MEDIUM", "check": "Required Fields", "message": f"Missing: {', '.join(missing)}"})

    for bl in fields.get("bl_numbers", []):
        if bl not in KNOWN_BL_NUMBERS:
            issues.append({"severity": "HIGH", "check": "BL Number", "message": f"BL '{bl}' not in known list"})

    container = fields.get("container")
    if container and container not in KNOWN_CONTAINERS:
        issues.append({"severity": "HIGH", "check": "Container", "message": f"Container '{container}' not in known list"})

    vessel = fields.get("vessel")
    if vessel and not any(_fuzz_partial_ratio(vessel, v) > 80 for v in KNOWN_VESSELS):
        issues.append({"severity": "MEDIUM", "check": "Vessel", "message": f"Vessel '{vessel}' not matching known vessels"})

    voyage = fields.get("voyage")
    if voyage and voyage not in KNOWN_VOYAGES:
        issues.append({"severity": "MEDIUM", "check": "Voyage", "message": f"Voyage '{voyage}' not in known voyages"})

    issuer_found = any(
        _fuzz_partial_ratio(issuer.upper(), text_upper) > 75
        for issuer in template.get("valid_issuers", [])
    )
    if template.get("valid_issuers") and not issuer_found:
        issues.append({"severity": "HIGH", "check": "Issuer", "message": f"Expected issuer not found: {template['valid_issuers']}"})

    for sig in template.get("required_signatures", []):
        if sig.upper() not in text_upper:
            issues.append({"severity": "MEDIUM", "check": "Signature", "message": f"Missing signature field: '{sig}'"})

    ai_signals = ["as an ai", "language model", "chatgpt", "openai", "artificial intelligence assistant"]
    for signal in ai_signals:
        if signal in text.lower():
            issues.append({"severity": "CRITICAL", "check": "AI Content", "message": f"AI-generated text detected"})

    if not fields.get("dates"):
        issues.append({"severity": "MEDIUM", "check": "Date", "message": "No date found in document"})

    return issues


def audit(filepath: str, forced_type: str | None = None) -> dict:
    filename = Path(filepath).name
    text = extract_text(filepath)
    if not text:
        return {"filename": filename, "status": "ERROR", "issues": [], "fields": {}, "doc_type": "UNKNOWN"}

    doc_type, confidence = classify_document(text)
    if forced_type and forced_type in TEMPLATES:
        doc_type = forced_type
        confidence = 100.0

    fields = extract_fields(text)
    issues = check_document(text, doc_type, fields)

    critical = [i for i in issues if i["severity"] == "CRITICAL"]
    high = [i for i in issues if i["severity"] == "HIGH"]
    medium = [i for i in issues if i["severity"] == "MEDIUM"]

    if critical:
        status = "REJECTED"
    elif high:
        status = "FLAGGED"
    elif medium:
        status = "WARNING"
    else:
        status = "APPROVED"

    template = TEMPLATES.get(doc_type, {})
    return {
        "filename": filename,
        "doc_type": doc_type,
        "doc_type_name": template.get("name", doc_type),
        "spec_id": template.get("spec_id"),
        "confidence": confidence,
        "status": status,
        "fields": fields,
        "issues": issues,
        "text_length": len(text),
        "text_preview": text[:500],
    }


def build_training_bundle(reference_dir: str, out_path: str) -> dict:
    reference_dir = Path(reference_dir)
    results = []
    templates_export = {
        "source": "Untitled3.ipynb",
        "templates": TEMPLATES,
        "known_values": {
            "bl_numbers": KNOWN_BL_NUMBERS,
            "containers": KNOWN_CONTAINERS,
            "voyages": KNOWN_VOYAGES,
            "vessels": KNOWN_VESSELS,
            "tins": ALL_VALID_TINS,
        },
        "reference_results": [],
        "supplements_by_spec": {},
        "markers_by_spec": {},
    }

    for pdf_name, forced_type in REFERENCE_PDF_MAP.items():
        pdf_path = reference_dir / pdf_name
        if not pdf_path.exists():
            print(f"[SKIP] Missing {pdf_name}", file=sys.stderr)
            continue
        result = audit(str(pdf_path), forced_type=forced_type)
        results.append(result)
        templates_export["reference_results"].append(result)

        spec_id = result.get("spec_id") or TEMPLATES.get(forced_type, {}).get("spec_id")
        if not spec_id:
            continue

        parts = [
            f"Notebook type: {result.get('doc_type_name')}",
            f"Audit status: {result.get('status')}",
            f"Confidence: {result.get('confidence')}%",
        ]
        fields = result.get("fields") or {}
        for key in ["consignee", "container", "vessel", "voyage", "origin", "destination", "total"]:
            if fields.get(key):
                parts.append(f"{key}: {fields[key]}")
        if fields.get("bl_numbers"):
            parts.append("BL: " + ", ".join(fields["bl_numbers"]))
        if fields.get("tin_numbers"):
            parts.append("TIN: " + ", ".join(fields["tin_numbers"]))

        templates_export["supplements_by_spec"].setdefault(spec_id, []).append("\n".join(parts))

        markers = []
        for key in ["consignee", "container", "vessel", "voyage"]:
            val = fields.get(key)
            if val and isinstance(val, str) and len(val) >= 4:
                markers.append(val)
        for bl in fields.get("bl_numbers") or []:
            markers.append(bl)
        for tin in fields.get("tin_numbers") or []:
            markers.append(tin)
        for kw in TEMPLATES.get(forced_type, {}).get("keywords", []):
            markers.append(kw)
        templates_export["markers_by_spec"][spec_id] = list(dict.fromkeys(markers))

    templates_export["audited_count"] = len(results)
    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(templates_export, indent=2), encoding="utf-8")
    return templates_export


def main() -> int:
    root = Path(__file__).resolve().parents[1]
    reference_dir = root / "data" / "training" / "reference"
    out_path = root / "data" / "training" / "labels" / "notebook_training.json"

    if len(sys.argv) > 1 and sys.argv[1] == "audit" and len(sys.argv) > 2:
        print(json.dumps(audit(sys.argv[2]), indent=2))
        return 0

    print("[NOTEBOOK TRAIN] Auditing reference PDFs with Untitled3.ipynb logic...")
    bundle = build_training_bundle(reference_dir, out_path)
    print(f"[OK] {bundle['audited_count']} reference PDFs -> {out_path}")
    for r in bundle.get("reference_results", []):
        print(f"  {r['filename']}: {r['doc_type_name']} ({r['status']}, {r['confidence']}%)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
