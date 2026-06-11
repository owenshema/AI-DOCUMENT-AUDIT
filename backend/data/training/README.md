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

## Rebuild training after new PDFs or Excel report

1. Place reference PDFs in `reference/`
2. Place **`SIFCO_Audit_Report.xlsx`** in this folder (`data/training/`)
3. **`Untitled3.ipynb`** rules are applied automatically via `backend/forgery/sifco_audit_engine.py`

```bash
cd backend
npm run train
```

Then restart the backend server.

### Excel columns (flexible headers)

The ingest script maps common column names automatically, for example:

| Purpose | Accepted column names |
|---------|----------------------|
| Link to reference doc | `doc_id`, `document_id`, `reference_id` |
| Paper type | `document_type`, `paper_type`, `type` |
| Parties / cargo | `consignee`, `shipper`, `cargo_type`, `cargo_details` |
| Shipping refs | `container_number`, `bill_of_lading`, `bl_number`, `vessel`, `voyage` |
| Amounts | `total_usd`, `total`, `amount`, `weight_kg`, `total_packages` |
| Company | `tin`, `nif` |
| Notes | `notes`, `remarks`, `audit_status` |

Use `doc_id` values like `04-freight-invoice-unique-hybrid` to attach rows to the six reference papers.

## How matching works

- TF-IDF text similarity against each reference
- Fingerprint markers (Super International, SIFCO, Al Shamali, Top Sifco, Agape House, signatures, B/L layout)
- No generic violation rules — accept/reject is based on training match confidence
