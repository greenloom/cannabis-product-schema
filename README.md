# Cannabis Product Schema

A jurisdiction-neutral JSON Schema (draft 2020-12) interchange format for
cannabis and hemp product data, meant to let producers, marketplaces, and
retailers exchange product documents against a shared shape.

## What this is

Core describes *what a product is* — Product, Package, LabResult, Label,
Party — and is deliberately representable-everything: a product no
jurisdiction currently allows at retail is still valid core data.
Jurisdiction-specific rules (allowed forms, potency caps, label
requirements, COA gates) live in separate, pluggable compliance profiles
that narrow core; core itself carries no jurisdiction constants. Label
structure is informed by ASTM D8449's module architecture (via a
third-party summary, cited by designation — the standard itself is not
reproduced).

## What this is NOT

- **Not "the standard."** Cannabis Product Schema is one schema, maintained by one company.
  It doesn't speak for the industry and makes no claim to.
- **Not an alliance, consortium, or working group.** See GOVERNANCE.md —
  there is no shared governance body behind this repository.
- **Not legal advice.** Jurisdiction profiles encode our best reading of
  cited primary rule text at a point in time. Verify against current law
  and your own counsel before relying on them for compliance.

## Maintainer

Cannabis Product Schema is maintained by **Green Loom**. Version 0.x means the schema will
change — pin an exact version and re-validate on upgrade. See
GOVERNANCE.md for how decisions get made.

## What's in v0.1

- **`schema/v0.1/core/`** — five jurisdiction-neutral objects: Product,
  Package, LabResult, Label, Party. (LabResult is authoritative for COA URL/potency; Label fields are display copies. Three lot/batch shapes documented; Lot vs Batch left open.)
- **`schema/v0.1/profiles/us-ga-hemp/`** — Georgia consumable-hemp retail:
  flower/preroll excluded, per-form THC mg caps (edible, tincture,
  topical, beverage), the total-THC ≤0.3% formula, and a COA gate. See
  `rules/README.md` for rule IDs and citations, and `NOT_MODELED.md` for
  what this profile deliberately does not enforce.

See CHANGELOG.md for the full v0.1.0 release notes.

## Validating

```
npm install
node tests/run.mjs
```

This compiles every schema (proving `$id`/`$ref` resolution), validates
every fixture in `tests/fixtures/`, asserts each invalid fixture trips its
named rule, and greps core for jurisdiction constants. All green is the
bar for a passing change.

`bash tests/boundary.sh` runs the separate public-repository boundary
check (see BOUNDARY.md).

## Contributing

See CONTRIBUTING.md — jurisdiction profile changes require a primary-source
citation plus valid and invalid fixtures per rule. No citation, no merge.

## License

Schema files: Apache-2.0 (LICENSE). Documentation: CC BY 4.0
(LICENSE-DOCS).
