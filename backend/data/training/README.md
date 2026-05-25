# SIFCO ML Training Corpus

The AI audit is trained **only** on these six reference documents used daily by SIFCO / Super International:

| File | Paper type |
|------|------------|
| `01-packing-list-unique-hybrid.txt` | Packing List |
| `02-shipping-agreement-john.txt` | Shipping Agreement |
| `03-hbl-unique-hybrid.txt` | Bill of Lading (HBL) |
| `04-freight-invoice-unique-hybrid.txt` | Freight Invoice |
| `05-trucking-invoice-ecmu5567458.txt` | Trucking Invoice |
| `06-sea-freight-john.txt` | Sea Freight Invoice |

Reference PDFs are stored in `reference/`.

## Rebuild training after new PDFs

```bash
cd backend
node scripts/build-sifco-training.js
```

Then restart the backend server.

## How matching works

- TF-IDF text similarity against each reference
- Fingerprint markers (Super International, SIFCO, Al Shamali, Top Sifco, Agape House, signatures, B/L layout)
- No generic violation rules — accept/reject is based on training match confidence
