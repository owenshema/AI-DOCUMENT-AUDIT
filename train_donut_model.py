"""
Donut Model Training Script for Logistics Document Understanding
Based on Untitled1.ipynb notebook
"""

import os
import json
from PIL import Image
import torch
from transformers import DonutProcessor, VisionEncoderDecoderModel, TrainingArguments, Trainer
from datasets import Dataset
from pdf2image import convert_from_path

# ====================== CONFIGURATION ======================
DOCUMENTS_DIR = "backend/data/training/reference"
IMAGES_DIR = "backend/data/training/images"
LABELS_DIR = "backend/data/training/labels"
MODEL_OUTPUT_DIR = "backend/models/logistics_donut_model"
FINAL_MODEL_DIR = "backend/models/logistics_donut_final"

# Create directories
os.makedirs(IMAGES_DIR, exist_ok=True)
os.makedirs(LABELS_DIR, exist_ok=True)
os.makedirs(MODEL_OUTPUT_DIR, exist_ok=True)

# ====================== STEP 1: CONVERT PDFs TO IMAGES ======================
print("📄 Step 1: Converting PDFs to images...")
pdf_files = [f for f in os.listdir(DOCUMENTS_DIR) if f.endswith(".pdf")]

for pdf_file in pdf_files:
    pdf_path = os.path.join(DOCUMENTS_DIR, pdf_file)
    try:
        pages = convert_from_path(pdf_path, dpi=200)
        for i, page in enumerate(pages):
            img_path = os.path.join(IMAGES_DIR, f"{pdf_file.replace('.pdf', f'_page_{i}.png')}")
            page.save(img_path, "PNG")
        print(f"  ✅ Converted: {pdf_file}")
    except Exception as e:
        print(f"  ❌ Error converting {pdf_file}: {e}")

print(f"✅ Converted {len(pdf_files)} PDFs to {len(os.listdir(IMAGES_DIR))} images\n")

# ====================== STEP 2: CREATE GROUND TRUTH LABELS ======================
print("📝 Step 2: Creating ground truth labels...")

ground_truth = [
    {
        "doc_id": "01-packing-list-unique-hybrid",
        "document_type": "Packing_List",
        "consignee": "UNIQUE HYBRID & EV SPARE PARTS",
        "cargo_type": "Auto_Spare_Parts",
        "total_packages": 37,
        "weight_kg": 1000,
        "container_number": "TEMU6439085",
        "bill_of_lading": "DXB1020247"
    },
    {
        "doc_id": "02-shipping-agreement-john",
        "document_type": "Shipping_Agreement",
        "consignee": "HATANGIMANA JOHN",
        "shipper": "SIFCO",
        "cargo_type": "Vehicle",
        "total_usd": 4595,
        "bill_of_lading": "DXB1022332",
        "weight_kg": 6000,
        "cargo_details": "MITSUBISHI-FUSO FIGHTER 1990"
    },
    {
        "doc_id": "03-hbl-unique-hybrid",
        "document_type": "House_Bill_of_Lading",
        "consignee": "UNIQUE HYBRID",
        "cargo_type": "Auto_Spare_Parts",
        "container_number": "TEMU6439085",
        "bill_of_lading": "DXB1020247"
    },
    {
        "doc_id": "04-freight-invoice-unique-hybrid",
        "document_type": "Freight_Invoice",
        "consignee": "UNIQUE HYBRID",
        "cargo_type": "Auto_Spare_Parts",
        "total_usd": 660,
        "container_number": "TEMU6439085"
    },
    {
        "doc_id": "05-trucking-invoice-ecmu5567458",
        "document_type": "Trucking_Invoice",
        "container_number": "ECMU5567458",
        "cargo_type": "Container_Transport",
        "total_usd": 350
    },
    {
        "doc_id": "06-sea-freight-john",
        "document_type": "Sea_Freight_Invoice",
        "consignee": "HATANGIMANA JOHN",
        "cargo_type": "Vehicle",
        "total_usd": 4595,
        "bill_of_lading": "DXB1022332"
    }
]

# Save as JSONL
labels_file = os.path.join(LABELS_DIR, "ground_truth.jsonl")
with open(labels_file, "w") as f:
    for item in ground_truth:
        f.write(json.dumps(item) + "\n")

print(f"✅ Ground truth saved with {len(ground_truth)} documents\n")

# ====================== STEP 3: CREATE DATASET ======================
print("📊 Step 3: Creating dataset...")

def create_dataset():
    data = []
    with open(labels_file, "r") as f:
        for line in f:
            item = json.loads(line)
            # Match with image
            image_files = [f for f in os.listdir(IMAGES_DIR) if item["doc_id"] in f]
            if image_files:
                data.append({
                    "image_path": os.path.join(IMAGES_DIR, image_files[0]),
                    "ground_truth": json.dumps(item)
                })
                print(f"  ✅ Matched: {item['doc_id']} -> {image_files[0]}")
            else:
                print(f"  ⚠️  No image found for: {item['doc_id']}")
    return Dataset.from_list(data)

dataset = create_dataset()
print(f"✅ Dataset ready with {len(dataset)} samples\n")

if len(dataset) == 0:
    print("❌ No samples in dataset! Check that PDFs were converted and doc_ids match.")
    exit(1)

# ====================== STEP 4: LOAD MODEL AND PROCESSOR ======================
print("🤖 Step 4: Loading Donut model and processor...")

processor = DonutProcessor.from_pretrained("naver-clova-ix/donut-base")
model = VisionEncoderDecoderModel.from_pretrained("naver-clova-ix/donut-base")

print("✅ Model and processor loaded\n")

# ====================== STEP 5: PREPROCESS DATASET ======================
print("🔄 Step 5: Preprocessing dataset...")

def preprocess(example):
    # Load image
    image = Image.open(example["image_path"]).convert("RGB")
    pixel_values = processor(image, return_tensors="pt").pixel_values.squeeze(0)

    # Donut expects special format: <s> JSON content </s>
    ground_truth_text = "<s>" + example["ground_truth"] + "</s>"

    target = processor.tokenizer(
        ground_truth_text,
        max_length=768,
        padding="max_length",
        truncation=True,
        return_tensors="pt"
    )

    labels = target.input_ids.squeeze(0)
    labels[labels == processor.tokenizer.pad_token_id] = -100  # Ignore padding in loss

    return {
        "pixel_values": pixel_values,
        "labels": labels
    }

dataset = dataset.map(
    preprocess,
    remove_columns=dataset.column_names,
    num_proc=1
)

print("✅ Preprocessing complete\n")

# ====================== STEP 6: CONFIGURE MODEL ======================
print("⚙️  Step 6: Configuring model...")

# Set model config attributes
model.config.pad_token_id = processor.tokenizer.pad_token_id
model.config.decoder_start_token_id = processor.tokenizer.bos_token_id
model.config.eos_token_id = processor.tokenizer.eos_token_id
model.config.vocab_size = len(processor.tokenizer)

# Also ensure the decoder's specific config has these
model.decoder.config.pad_token_id = processor.tokenizer.pad_token_id
model.decoder.config.decoder_start_token_id = processor.tokenizer.bos_token_id
model.decoder.config.eos_token_id = processor.tokenizer.eos_token_id
model.decoder.config.vocab_size = len(processor.tokenizer)

print("✅ Model configured\n")

# ====================== STEP 7: TRAINING ======================
print("🚀 Step 7: Starting training...")
print("=" * 60)

training_args = TrainingArguments(
    output_dir=MODEL_OUTPUT_DIR,
    num_train_epochs=5,
    per_device_train_batch_size=1,
    gradient_accumulation_steps=8,
    learning_rate=1e-4,
    weight_decay=0.01,
    fp16=torch.cuda.is_available(),  # Use FP16 only if GPU available
    logging_steps=5,
    save_steps=20,
    save_total_limit=2,
    report_to="none",
    push_to_hub=False,
    remove_unused_columns=False,
    dataloader_num_workers=0,  # Set to 0 for Windows compatibility
    gradient_checkpointing=True,
)

trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=dataset,
)

print("Training configuration:")
print(f"  - Epochs: {training_args.num_train_epochs}")
print(f"  - Batch size: {training_args.per_device_train_batch_size}")
print(f"  - Learning rate: {training_args.learning_rate}")
print(f"  - FP16: {training_args.fp16}")
print(f"  - Device: {'GPU' if torch.cuda.is_available() else 'CPU'}")
print()

try:
    trainer.train()
    print("\n✅ Training completed successfully!\n")
except Exception as e:
    print(f"\n❌ Training failed: {e}\n")
    raise

# ====================== STEP 8: SAVE MODEL ======================
print("💾 Step 8: Saving final model...")

model.save_pretrained(FINAL_MODEL_DIR)
processor.save_pretrained(FINAL_MODEL_DIR)

print(f"✅ Model saved to: {FINAL_MODEL_DIR}")
print("\n" + "=" * 60)
print("🎉 TRAINING COMPLETE!")
print("=" * 60)
print(f"\nYou can now use the trained model from: {FINAL_MODEL_DIR}")
print("\nTo use the model:")
print("  1. Load with: DonutProcessor.from_pretrained('{FINAL_MODEL_DIR}')")
print("  2. Load model: VisionEncoderDecoderModel.from_pretrained('{FINAL_MODEL_DIR}')")
