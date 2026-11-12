# Product and Service Information

## Document metadata

| Field | Value |
|---|---|
| Document ID | `SHO-PROD-001` |
| Module / submodule | Products / catalogue and product support |
| Document type / intent | Reference and procedures / product information |
| Customer segment / region / channel | Shoppers / `[COMPANY INPUT REQUIRED]` / web chat |
| Version / last updated / effective date | 1.0 / 2026-10-30 / `[COMPANY INPUT REQUIRED]` |
| Status / source | Catalogue facts missing; do not answer specifics / project brief defines broad categories only |
| Related documents | `SHO-RET-001`, `SHO-ORDER-001`, `SHO-ESC-001` |

## Confirmed demo scope

The fictional store offers broad categories: electronics, clothing, accessories, and home products. No SKU catalogue, specifications, inventory, sellers, prices, warranty terms, authenticity evidence, product usage instructions, or recall data has been supplied.

## Safe answer workflow

1. Identify the product name or SKU and the exact attribute asked about.
2. Retrieve that attribute from an approved, current catalogue record.
3. Check variant, seller, region, and effective date.
4. State only the retrieved fact and any documented limitation.
5. If the catalogue has no verified value, say the information is not available in the current support information; route the customer to the approved product-support channel.

## Topic coverage

| Topic | Required source of truth | If unavailable |
|---|---|---|
| Specifications, size, colour, compatibility | Approved SKU/variant catalogue | Do not infer from category or similar SKU |
| Availability and out-of-stock status | Live inventory service | Do not promise restock or reserve inventory |
| Price, discount, tax | Current checkout/catalogue and region | Ask customer to check the displayed total; escalate mismatch |
| Seller and authenticity | Verified seller record and authenticity process | Do not guarantee authenticity without evidence |
| Warranty and service | Product-specific warranty document | Say terms are not confirmed; escalate |
| Defect, damage, missing accessories | Order and returns process | Record non-sensitive description; use `SHO-RET-001` |
| Recall or safety issue | Approved safety/recall notice | Escalate promptly; do not improvise usage or medical advice |
| Recommendations and comparisons | Approved product data and customer constraints | Avoid invented performance claims |

## Required catalogue record

Each product record needs: stable SKU, display name, category, variants, approved description, specifications with units, availability source, price region/currency, seller identity, warranty source, return exclusions, safety notices, version, effective date, and content owner. Every field not yet provided is `[COMPANY INPUT REQUIRED]`.
