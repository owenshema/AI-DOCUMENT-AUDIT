@echo off
echo ========================================
echo Donut Model Training Script
echo ========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    pause
    exit /b 1
)

echo Step 1: Installing training dependencies...
echo.
pip install -r requirements-training.txt

echo.
echo ========================================
echo Step 2: Starting model training...
echo ========================================
echo.
echo NOTE: This may take 30-60 minutes depending on your hardware
echo       GPU is recommended for faster training
echo.

python train_donut_model.py

if errorlevel 1 (
    echo.
    echo ========================================
    echo ERROR: Training failed!
    echo ========================================
    pause
    exit /b 1
)

echo.
echo ========================================
echo SUCCESS: Training completed!
echo ========================================
echo.
echo The trained model is saved in: backend/models/logistics_donut_final
echo.
pause
