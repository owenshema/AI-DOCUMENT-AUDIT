@echo off
title Forgery Model Training
cd /d "%~dp0"

echo ========================================
echo  FORGERY MODEL TRAINING
echo ========================================
echo.

for /f "usebackq delims=" %%a in (`powershell -NoProfile -Command "[math]::Round((Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory/1MB,2)"`) do set FREERAM=%%a
echo Free RAM: %FREERAM% GB (need at least 3 GB)
echo.

powershell -NoProfile -Command "exit ([double]'%FREERAM%' -lt 3)"
if not errorlevel 1 (
    echo [WARNING] Low memory - training may fail.
    echo Close Chrome/Cursor and other apps, then retry.
    echo Or use Document_Forgery_Detection.ipynb in Colab with T4 GPU.
    echo.
)

set OMP_NUM_THREADS=2
py -3.12 -m pip install -q torch==2.6.0 torchvision==0.21.0 scikit-learn pillow numpy onnx onnxscript onnxruntime opencv-python-headless pytesseract pdf2image --index-url https://download.pytorch.org/whl/cpu

echo Starting training...
echo.
py -3.12 -u backend\forgery\train_forgery_model.py > forgery_training_log.txt 2>&1
set EXITCODE=%ERRORLEVEL%

type forgery_training_log.txt

echo.
if %EXITCODE%==0 (
    echo SUCCESS - Run check-forgery.bat to test
) else (
    echo FAILED - Use Colab notebook with T4 GPU instead
)
pause
exit /b %EXITCODE%
