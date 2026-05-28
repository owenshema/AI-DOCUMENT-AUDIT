"""Convert first PDF page to PNG for forgery model inference."""
import os
import sys

try:
    from pdf2image import convert_from_path
except ImportError:
    print("Install: pip install pdf2image pillow", file=sys.stderr)
    raise SystemExit(1)


def main():
    if len(sys.argv) < 2:
        print("Usage: pdf_to_image.py <input.pdf> [output.png]", file=sys.stderr)
        return 1

    pdf_path = sys.argv[1]
    if not os.path.isfile(pdf_path):
        print(f"File not found: {pdf_path}", file=sys.stderr)
        return 1

    base = os.path.splitext(os.path.basename(pdf_path))[0]
    out_path = sys.argv[2] if len(sys.argv) > 2 else os.path.join(
        os.path.dirname(os.path.abspath(pdf_path)), f"{base}_page0.png"
    )

    os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
    images = convert_from_path(pdf_path, first_page=1, last_page=1, dpi=150)
    images[0].save(out_path, "PNG")
    print(out_path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
