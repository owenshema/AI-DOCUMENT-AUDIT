@echo off
echo ========================================
echo FORGERY MODEL STATUS
echo ========================================
echo.

if exist "backend\forgery\model\forgery_model.onnx" (
    echo [OK] ONNX model found
    dir "backend\forgery\model\forgery_model.onnx"
) else (
    echo [X] ONNX model missing
)

if exist "backend\forgery\model\model_metadata.json" (
    echo [OK] Model metadata found
    type "backend\forgery\model\model_metadata.json"
) else (
    echo [X] Metadata missing
)

echo.
echo ========================================
echo TEST ON TRAINING IMAGES
echo ========================================
echo.
py -3.12 backend\forgery\analyze_document.py backend\data\training\reference\01-packing-list-unique-hybrid.pdf
echo.
pause
