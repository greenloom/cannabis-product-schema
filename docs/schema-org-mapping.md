# schema.org mapping notes (v0.1)

**This is a schema-practice note, not a legal or regulatory claim.**  
schema.org terms are considered as inspiration for field shapes and semantics where they align with product interchange needs. This repository does not implement schema.org, does not claim conformance, and does not treat competitor POS or schema.org as regulatory authority.

Admin mapping reference (external): https://github.com/greenloom/docs/pull/9 (merged).  
Note: the interchange `Package` in this repository is not the same as Green Loom Admin's internal Package concept; GTIN is not a lot; operator noun "Batch" and dry-weight handling differences are documented there. See also `BOUNDARY.md`.

## sku / gtin
- Lives on: `Package.sku` and `Package.gtin` (when present, `gtin` must use `scheme: "gtin"`; nullable).
- Not on Product: one Product may have many Packages (different sellable units, pack sizes, barcodes). Different Packages under the same Product can carry different GTINs.
- If a downstream feed or consumer requires a single "representative GTIN", that selection or projection is an adapter or profile concern, not a core requirement.
- Core documents three lot/batch representations; `Package.gtin` carries GTIN semantics only and does not carry lot/batch (see `Package.gtin` description, `Label.identity_compliance.lot`, and `LabResult.batch_lot`).

## offers / price / availability
- Commercial pricing and store/channel context live on: `Package.prices[]` (array of `{ amount, currency_code, store_id?, channel_id? }`).
- No `offers`, top-level `price`, or `availability` fields on Product or Package.
- Product is deliberately scope-neutral (no inventory/availability fields). See `Package` description: "prices[] carries commercial (store/channel) context so Product itself can stay scope-neutral."

## hasAdultConsideration
- Absent from Product and Package (and catalog documents generally).
- Age gating (e.g., 21+) is a checkout-time identity verification concern, not a property of the product catalog interchange document. See `profiles/us-ga-hemp/NOT_MODELED.md` ("Age 21+").

## hasCertification
- No dedicated `hasCertification` field.
- Where needed, certifications, warnings, or required statements are carried in `Label.warnings[]` (text) or `Label.intoxicating_symbol`, or via profile `extensions`. No normative mapping from schema.org `hasCertification`.

## isVariantOf
- Absent. Core does not define an explicit product-variation or "is variant of" hierarchy.
- Differentiation between related items is typically modeled via separate Products, or distinguished by Package-level attributes (net_contents, title, sku/gtin) with external grouping as needed.

## category / name / brand
- `name`: `Product.name` (object keyed by BCP 47 language tags).
- `brand`: `Product.brand` (Party object).
- `category`: closest analogue is `Product.categories` (array of free-form strings). Not a controlled taxonomy in core.

All notes above describe current v0.1 shapes for interchange purposes only.
