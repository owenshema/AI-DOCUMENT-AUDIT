# Donut Model Training Guide

This guide explains how to train the Donut model for logistics document understanding based on your `Untitled1.ipynb` notebook.

## Overview

The training script will:
1. Convert PDF documents to images
2. Create ground truth labels for 6 document types
3. Train a Donut (Document Understanding Transformer) model
4. Save the trained model for use in your audit system

## Prerequisites

### 1. Install Poppler (Required for PDF conversion)

**Windows:**
1. Download poppler from: https://github.com/oschwartz10612/poppler-windows/releases/
2. Extract the ZIP file (e.g., to `C:\poppler`)
3. Add the `bin` folder to your PATH:
   - Right-click "This PC" → Properties → Advanced System Settings
   - Click "Environment Variables"
   - Under "System Variables", find "Path" and click "Edit"
   - Click "New" and add: `C:\poppler\Library\bin` (adjust path as needed)
   - Click OK on all dialogs
4. Restart your terminal/command prompt

### 2. Python Dependencies

All Python dependencies will be installed automatically by the training script.

## Training Data

The script uses the following documents from `backend/data/training/reference/`:

1. **01-packing-list-unique-hybrid.pdf** - Packing List
2. **02-shipping-agreement-john.pdf** - Shipping Agreement
3. **03-hbl-unique-hybrid.pdf** - House Bill of Lading
4. **04-freight-invoice-unique-hybrid.pdf** - Freight Invoice
5. **05-trucking-invoice-ecmu5567458.pdf** - Trucking Invoice
6. **06-sea-freight-john.pdf** - Sea Freight Invoice

## How to Train

### Option 1: Using the Batch Script (Recommended)

Simply double-click `train-model.bat` or run:

```bash
train-model.bat
```

### Option 2: Manual Training

```bash
# Install dependencies
pip install -r requirements-training.txt

# Run training
python train_donut_model.py
```

## Training Process

The training will:
- **Duration**: 30-60 minutes (CPU) or 10-20 minutes (GPU)
- **Epochs**: 5
- **Batch Size**: 1 (with gradient accumulation of 8)
- **Learning Rate**: 1e-4

### Expected Output

```
📄 Step 1: Converting PDFs to images...
  ✅ Converted: 01-packing-list-unique-hybrid.pdf
  ✅ Converted: 02-shipping-agreement-john.pdf
  ...
✅ Converted 6 PDFs to 6 images

📝 Step 2: Creating ground truth labels...
✅ Ground truth saved with 6 documents

📊 Step 3: Creating dataset...
  ✅ Matched: 01-packing-list-unique-hybrid -> 01-packing-list-unique-hybrid_page_0.png
  ...
✅ Dataset ready with 6 samples

🤖 Step 4: Loading Donut model and processor...
✅ Model and processor loaded

🔄 Step 5: Preprocessing dataset...
✅ Preprocessing complete

⚙️  Step 6: Configuring model...
✅ Model configured

🚀 Step 7: Starting training...
Training configuration:
  - Epochs: 5
  - Batch size: 1
  - Learning rate: 0.0001
  - FP16: True/False
  - Device: GPU/CPU

[Training progress will be displayed here]

✅ Training completed successfully!

💾 Step 8: Saving final model...
✅ Model saved to: backend/models/logistics_donut_final

🎉 TRAINING COMPLETE!
```

## Output

The trained model will be saved in:
```
backend/models/logistics_donut_final/
├── config.json
├── preprocessor_config.json
├── pytorch_model.bin
├── special_tokens_map.json
├── tokenizer_config.json
└── vocab.json
```

## Using the Trained Model

After training, you can use the model in your application:

```python
from transformers import DonutProcessor, VisionEncoderDecoderModel
from PIL import Image

# Load the trained model
processor = DonutProcessor.from_pretrained("backend/models/logistics_donut_final")
model = VisionEncoderDecoderModel.from_pretrained("backend/models/logistics_donut_final")

# Process a document
image = Image.open("path/to/document.png").convert("RGB")
pixel_values = processor(image, return_tensors="pt").pixel_values

# Generate predictions
outputs = model.generate(
    pixel_values,
    max_length=768,
    num_beams=4,
    early_stopping=True
)

# Decode the output
result = processor.tokenizer.decode(outputs[0], skip_special_tokens=True)
print(result)
```

## Troubleshooting

### Error: "poppler not found"
- Make sure poppler is installed and added to PATH
- Restart your terminal after adding to PATH

### Error: "CUDA out of memory"
- Reduce `per_device_train_batch_size` in `train_donut_model.py`
- Or train on CPU (slower but works)

### Error: "No samples in dataset"
- Check that PDF files exist in `backend/data/training/reference/`
- Verify that `doc_id` in ground truth matches PDF filenames

### Training is very slow
- GPU is highly recommended for training
- On CPU, training may take 1-2 hours
- Consider using Google Colab with GPU for faster training

## Integration with Audit System

Once trained, integrate the model into your audit system by:

1. Update `backend/services/aiService.js` to use the trained model
2. Add model loading logic in your document analysis pipeline
3. Use the model for automatic document classification and data extraction

## Notes

- The model is trained on SIFCO-specific logistics documents
- For better accuracy, add more training samples
- Fine-tuning on your specific document formats will improve results
- The model learns document structure, field locations, and data patterns

## Support

For issues or questions about training:
1. Check the console output for error messages
2. Verify all prerequisites are installed
3. Ensure training data PDFs are in the correct location
4. Check that you have sufficient disk space (at least 5GB free)
