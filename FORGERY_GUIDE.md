# Forgery Detection — Training & Usage Guide

This project uses the **Document Forgery Detection** model (EfficientNet-B0), not Donut.

## What was removed

- Old Donut / `Untitled1.ipynb` training scripts
- Local CPU training batch files (they failed due to low RAM)

## What you use now

| Item | Location |
|------|----------|
| **Colab notebook** | `Document_Forgery_Detection.ipynb` |
| **Trained model (ONNX)** | `backend/forgery/model/forgery_model.onnx` |
| **Local predict script** | `backend/forgery/predict.py` |
| **Audit integration** | `backend/services/forgeryDetectionService.js` |

## Train / retrain in Google Colab

1. Open **`Document_Forgery_Detection.ipynb`** in [Google Colab](https://colab.research.google.com)
2. **Runtime → Change runtime type → T4 GPU** (not CPU)
3. Upload your 6 PDFs from `backend/data/training/reference/` to Google Drive folder `shipping_docs`
4. Run all cells
5. Download the model folder and copy to:
   ```
   backend/forgery/model/
   ```
   Files: `forgery_model.onnx`, `model_metadata.json`, (optional) `best_model.pth`

## Test locally (lightweight — uses ONNX, low RAM)

```powershell
py -3.12 -m pip install onnxruntime pillow numpy
py -3.12 backend/forgery/predict.py backend/data/training/images
```

Or double-click **`check-forgery.bat`**

## Model labels

- `has_stamp`
- `has_signature`
- `has_logo`
- `has_missing_fields`
- `high_forgery_risk`

## How it connects to your audit app

When documents are audited, `forgeryDetectionService.js` runs text-based forgery checks (stamp, signature, missing fields). If you pass an image path, it uses the ONNX model for deeper analysis.
