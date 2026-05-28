"""
Forgery detection inference — delegates to Colab-compatible analyze_document.py
"""
import json
import os
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ROOT)

from analyze_document import predict_document, to_api_payload  # noqa: E402


def predict_image(image_path, fallback_text=""):
    result = predict_document(image_path, fallback_text=fallback_text)
    return to_api_payload(result)


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "..", "data", "training", "images")
    fallback_text = ""
    if "--fallback-text-file" in sys.argv:
        idx = sys.argv.index("--fallback-text-file")
        if idx + 1 < len(sys.argv) and os.path.isfile(sys.argv[idx + 1]):
            with open(sys.argv[idx + 1], encoding="utf-8", errors="ignore") as f:
                fallback_text = f.read()

    results = []
    if os.path.isdir(path):
        files = sorted(f for f in os.listdir(path) if f.lower().endswith((".jpg", ".jpeg", ".png", ".pdf")))
        for name in files:
            results.append(predict_image(os.path.join(path, name), fallback_text=fallback_text))
    else:
        results.append(predict_image(path, fallback_text=fallback_text))

    if "--json" in sys.argv:
        print(json.dumps(results if len(results) > 1 else results[0], indent=2))
    else:
        for r in results:
            print(f"\nDocument: {r['doc_name']}")
            for label, prob in (r.get("labels") or {}).items():
                bar = "#" * int(prob * 20)
                print(f"  {label:<22} {bar:<20} {prob:.1%}")
            print(f"  => score={r['forgery_score']} level={r['risk_level']} suspicious={r['is_suspicious']}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
