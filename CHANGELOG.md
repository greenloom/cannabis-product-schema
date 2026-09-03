# Changelog

All notable changes to Cannabis Product Schema are documented here. This project is 0.x —
breaking changes may happen in a minor version without a deprecation
window (see GOVERNANCE.md).

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
