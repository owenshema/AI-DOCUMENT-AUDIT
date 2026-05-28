"""
Train forgery detection model on SIFCO reference documents.
Uses Colab-compatible OpenCV + OCR analysis for labels (Document_Forgery_Detection.ipynb).
"""
import json
import os
import sys

import numpy as np
import torch
import torch.nn as nn
import torchvision.transforms as transforms
from PIL import Image
from sklearn.model_selection import train_test_split
from sklearn.metrics import f1_score
from torch.optim.lr_scheduler import CosineAnnealingLR
from torch.utils.data import DataLoader, Dataset
from torchvision.models import EfficientNet_B0_Weights, efficientnet_b0

FORGERY_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, FORGERY_DIR)
from analyze_document import analyze_document_image  # noqa: E402

ROOT = os.path.dirname(FORGERY_DIR)
IMAGES_DIR = os.path.join(ROOT, "data", "training", "images")
MODEL_DIR = os.path.join(FORGERY_DIR, "model")

LABELS = [
    "has_stamp",
    "has_signature",
    "has_logo",
    "has_missing_fields",
    "high_forgery_risk",
]
REQUIRED_FIELDS = [
    "invoice", "date", "total", "consignee", "container", "bill of lading",
    "freight", "destination", "origin", "signature", "stamp", "vessel", "weight",
]
NUM_LABELS = len(LABELS)
EPOCHS = 10


def build_results():
    results = []
    for name in sorted(os.listdir(IMAGES_DIR)):
        if not name.lower().endswith((".png", ".jpg", ".jpeg")):
            continue
        path = os.path.join(IMAGES_DIR, name)
        analysis = analyze_document_image(path)
        results.append(analysis)
        print(f"  [OK] {name} -> risk={analysis['forgery_risk']['level']}")
    return results


class DocumentDataset(Dataset):
    def __init__(self, results, augment=False):
        self.data = results
        if augment:
            self.transform = transforms.Compose([
                transforms.Resize((256, 256)),
                transforms.RandomCrop(224),
                transforms.RandomHorizontalFlip(p=0.3),
                transforms.ToTensor(),
                transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
            ])
        else:
            self.transform = transforms.Compose([
                transforms.Resize((224, 224)),
                transforms.ToTensor(),
                transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
            ])

    def __len__(self):
        return len(self.data)

    def __getitem__(self, idx):
        r = self.data[idx]
        img = Image.open(r["image_path"]).convert("RGB")
        img = self.transform(img)
        label = torch.tensor([
            float(r["stamp"]["detected"]),
            float(r["signature"]["detected"]),
            float(r["logo"]["detected"]),
            float(len(r["text_analysis"]["missing_fields"]) > 2),
            float(r["forgery_risk"]["level"] == "HIGH"),
        ], dtype=torch.float32)
        return img, label


class DocumentForgeryModel(nn.Module):
    def __init__(self, num_labels=NUM_LABELS):
        super().__init__()
        backbone = efficientnet_b0(weights=EfficientNet_B0_Weights.IMAGENET1K_V1)
        in_features = backbone.classifier[1].in_features
        backbone.classifier = nn.Identity()
        self.backbone = backbone
        self.classifier = nn.Sequential(
            nn.Dropout(0.3),
            nn.Linear(in_features, 256),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(256, num_labels),
        )

    def forward(self, x):
        return self.classifier(self.backbone(x))


def main():
    os.environ.setdefault("OMP_NUM_THREADS", "2")
    torch.set_num_threads(2)

    os.makedirs(MODEL_DIR, exist_ok=True)

    print("[STEP 1] Building labels from training images + text files...")
    results = build_results()
    if not results:
        print("[ERROR] No training images found.")
        return 1
    print(f"[OK] {len(results)} samples\n")

    with open(os.path.join(MODEL_DIR, "..", "analysis_results.json"), "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)

    if len(results) >= 4:
        train_data, val_data = train_test_split(results, test_size=0.2, random_state=42)
    else:
        train_data, val_data = results, results

    if len(train_data) < 20:
        repeat = 20 // len(train_data) + 1
        train_data = train_data * repeat
        print(f"[INFO] Augmented train set to {len(train_data)} samples")

    train_loader = DataLoader(
        DocumentDataset(train_data, augment=True),
        batch_size=1,
        shuffle=True,
        num_workers=0,
        pin_memory=False,
    )
    val_loader = DataLoader(
        DocumentDataset(val_data, augment=False),
        batch_size=1,
        shuffle=False,
        num_workers=0,
        pin_memory=False,
    )

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"[STEP 2] Training EfficientNet-B0 on {device} for {EPOCHS} epochs...\n")

    model = DocumentForgeryModel().to(device)
    criterion = nn.BCEWithLogitsLoss()
    optimizer = torch.optim.AdamW(model.parameters(), lr=1e-4, weight_decay=1e-4)
    scheduler = CosineAnnealingLR(optimizer, T_max=EPOCHS, eta_min=1e-6)

    best_val_loss = float("inf")
    best_path = os.path.join(MODEL_DIR, "best_model.pth")

    for epoch in range(EPOCHS):
        model.train()
        train_loss = 0.0
        for imgs, labels in train_loader:
            imgs, labels = imgs.to(device), labels.to(device)
            optimizer.zero_grad()
            loss = criterion(model(imgs), labels)
            loss.backward()
            optimizer.step()
            train_loss += loss.item()

        model.eval()
        val_loss = 0.0
        all_preds, all_targets = [], []
        with torch.no_grad():
            for imgs, labels in val_loader:
                imgs, labels = imgs.to(device), labels.to(device)
                outputs = model(imgs)
                val_loss += criterion(outputs, labels).item()
                all_preds.append((torch.sigmoid(outputs) > 0.5).cpu().numpy())
                all_targets.append(labels.cpu().numpy())

        avg_train = train_loss / max(1, len(train_loader))
        avg_val = val_loss / max(1, len(val_loader))
        f1 = f1_score(np.vstack(all_targets), np.vstack(all_preds), average="macro", zero_division=0)
        scheduler.step()

        saved = ""
        if avg_val < best_val_loss:
            best_val_loss = avg_val
            torch.save(model.state_dict(), best_path)
            saved = " [SAVED]"

        print(f"Epoch {epoch + 1}/{EPOCHS} | train={avg_train:.4f} val={avg_val:.4f} f1={f1:.3f}{saved}")

    print(f"\n[STEP 3] Exporting model...")
    model.load_state_dict(torch.load(best_path, map_location=device))
    model.eval()

    dummy = torch.randn(1, 3, 224, 224).to(device)
    onnx_path = os.path.join(MODEL_DIR, "forgery_model.onnx")
    torch.onnx.export(
        model, dummy, onnx_path,
        input_names=["document_image"],
        output_names=["label_logits"],
        dynamic_axes={"document_image": {0: "batch"}},
        opset_version=11,
    )

    metadata = {
        "labels": LABELS,
        "required_fields": REQUIRED_FIELDS,
        "input_size": [224, 224],
        "threshold": 0.5,
        "architecture": "EfficientNet-B0 + Multi-label head",
        "training_samples": len(train_data),
        "best_val_loss": float(best_val_loss),
    }
    with open(os.path.join(MODEL_DIR, "model_metadata.json"), "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    print(f"[OK] Model saved:")
    print(f"     {best_path}")
    print(f"     {onnx_path}")
    print("\nTRAINING COMPLETE!")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
