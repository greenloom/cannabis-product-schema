# Boundary

Cannabis Product Schema is a public schema repository. It must never carry Green Loom's
internal business context — only the schema, its rationale, and cited
public rule text.

## What never enters this repo

- **Green Loom business internals**: internal project names, roadmaps,
  Linear/Notion issue references, or anything describing how Green Loom
  Retail operates as a business.
- **Store or customer names**: real store names, customer names, or any
  other retail-operator-identifying detail. Fixtures use `example.com`
  identities only (see `tests/boundary.sh`).
- **Internal identifiers**: Green Loom Retail issue/decision IDs (e.g.
  `GRE-`, `DEC-0` prefixes) and any other internal tracking codes.
- **Retail-internal implementation details**: internal table names, store
  IDs, channel IDs, or other Green Loom Retail database/schema internals
  that aren't part of the public interchange shape.
- **Design and tooling references**: `@greenloom/ui` (the private design
  system package), `design-dash` artifacts, `object-library` prose,
  `MCSFD` spec references, or Green Loom's internal deployment hosts
  (e.g. `vercel.app` preview URLs).

## What is intentional and allowed

- **"Green Loom" as maintainer attribution.** The company name appears
  throughout (LICENSE, GOVERNANCE.md, README.md, package.json) as the
  publisher of this schema. That is expected and correct — it is not a
  boundary violation.
- **`greenloom.github.io` as the Pages host.** All `$id` URLs resolve
  under this GitHub Pages host; it's the public hosting location, not an
  internal reference.

## Enforcement

`tests/boundary.sh` greps tracked files against `tests/boundary-terms.txt`
(the denylist) and fails CI on any hit. It also checks that every URL host
in the repo is allowlisted and that fixtures use only `example.com`
identities. See that script for the exact checks it runs.
