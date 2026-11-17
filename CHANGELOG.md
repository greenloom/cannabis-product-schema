# Changelog

All notable changes to Cannabis Product Schema are documented here. This project is 0.x —
breaking changes may happen in a minor version without a deprecation
window (see GOVERNANCE.md).

## v0.1.1

Breaking for documents validated against the `us-ga-hemp` profile, and for
`Package.gtin` values that aren't GTINs. 0.x allows this in any release
(GOVERNANCE.md). Schema `$id`s are unchanged.

### Breaking

- **`us-ga-hemp`: `GA-REG-CLASS` allows only `hemp_derived`.** `delta8` is
  no longer accepted as a regulatory class; it's reported as a LabResult
  analyte. Cited to Ga. Comp. R. & Regs. r. 40-32-5-.01(1)(a)3 and
  O.C.G.A. § 2-23-3. (#17)
- **`us-ga-hemp`: `GA-THC-TOTAL` fails closed.** A package whose lab result
  has no `percent_dry_weight` reading for THC or THCA now fails, because
  the 0.3% formula can't be evaluated. Before, the rule didn't apply. This
  encodes the profile's own formula; it doesn't claim the statute requires
  a dry-weight reading on every COA (see NOT_MODELED.md). (#18)
- **Core: `Package.gtin` must use `scheme: "gtin"`** when present (it's
  still nullable). Lot numbers and internal codes no longer go in this
  field. (#14)

### Changed

- `us-ga-hemp` citations: GA-REG-CLASS and COA recency now cite primary
  sources, including O.C.G.A. § 2-23-9.1 ("within the last 12 months").
  The 365-day encoding of 12 months is kept. (#12, #17)
- Core descriptions: LabResult is authoritative for the COA URL and
  potency, and Label copies are display only. The three lot/batch shapes
  are documented (`LabResult.batch_lot`, `Label.identity_compliance.lot`;
  `Package.gtin` carries none). Party names four roles. (#13, #15, #16)
- `us-ga-hemp/config.example.json` gains `basis_mapping`, documenting how
  per-gummy, per-mL and per-12-fl-oz caps map to core's bases. (#9)

### Docs

- `docs/schema-org-mapping.md` (#8, #19).
- README: "Versions and pinning". The hosted `$id` URLs serve the latest
  0.1.x; to pin, use the files from a release tag.
- A public homepage, `index.html`.

### Tests

- Valid `us-ga-hemp` fixtures must now pass every rule function, not only
  the profile schema, checked as of a fixed date. Four of them (beverage,
  edible, tincture, topical) had no dry-weight THC reading and had been
  failing GA-THC-TOTAL since the fail-closed change; each gained one.
- New invalid fixtures: `GA-REG-CLASS/delta8`, `GA-THC-TOTAL/no-dry-weight`,
  and two wrong-scheme `Package.gtin` cases.

### Tooling

- GitHub Pages deploys from `main`; release tags keep the version guard
  and validation.

## v0.1.0

Initial publication.

### Core (`schema/v0.1/core/`)

Jurisdiction-neutral JSON Schema (draft 2020-12) for five objects:

- **Product** — a sellable good: form, brand, regulatory class, packages.
- **Package** — the sellable unit: contents, identifiers, pricing, linked
  lab result and label.
- **LabResult** — a Certificate of Analysis: cannabinoid and terpene
  readings, pass/fail, public URL, test date.
- **Label** — informed by ASTM D8449's module architecture (via a
  third-party summary; the standard itself is not reproduced).
- **Party** — brand, producer, laboratory, or processor reference.

Core is deliberately representable-everything: it carries no jurisdiction
constants, and a product no jurisdiction currently allows at retail is
still valid core data. `product_form` covers `flower`, `preroll`,
`edible`, `concentrate`, `vape`, `tincture`, `topical`, and `beverage`.
`regulatory_class` covers `hemp_derived`, `delta8`, `marijuana`, and
`other_cannabis`.

### Profile: `us-ga-hemp`

Georgia consumable-hemp retail, narrowing core via `allOf`-only
composition (profiles restrict, never extend):

- Excludes flower/preroll from retail sale (`GA-FORM-BAN`).
- Restricts `regulatory_class` to `hemp_derived` and `delta8`
  (`GA-REG-CLASS`).
- Enforces per-`product_form` THC mg caps for edible, tincture, topical,
  and beverage (`GA-CAP-<form>`).
- Enforces the total-THC ≤0.3% dry-weight formula (`GA-THC-TOTAL`).
- Requires a linked, in-date (≤12 months), publicly reachable, passing
  Certificate of Analysis covering the full analyte panel
  (`GA-COA-GATE`).

Every rule is cited to primary GA rule text (`GA Comp. R. & Regs.
40-32-5-.06`, GA Senate Bill 494) in `rules/README.md`, with a valid and
invalid fixture per rule ID. See `NOT_MODELED.md` for what this profile
deliberately does not enforce (checkout-time age verification, physical
packaging engineering, license-number validation, and others).

### Tooling

- `tests/run.mjs` — ajv 2020-12 conformance harness: compiles every
  schema, validates fixtures, asserts each invalid fixture trips its
  named rule, and greps core for jurisdiction constants.
- `tests/boundary.sh` — public-repository boundary check (denylist grep,
  URL host allowlist, fixture identity check).
- CI on every push and pull request.
