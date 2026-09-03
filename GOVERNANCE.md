# Governance

Cannabis Product Schema is built and maintained by Green Loom, a single company. There is no
consortium, alliance, working group, or steering committee. Maintainers
decide; disagreements are resolved by the maintainers in public issues. If
external adoption grows enough to justify shared governance, we will
propose it here first. Version 0.x means the schema will change.

## What Cannabis Product Schema is

Cannabis Product Schema is a schema and interchange format — a shared JSON Schema shape that
producers, marketplaces, and retailers can validate product documents
against. It is not "the standard" for cannabis or hemp product data, and it
is not an alliance, consortium, or industry body. Referring to it as either
misrepresents both its authorship (one company) and its authority (none
beyond what adopters choose to give it).

## Decision-making

- Maintainers (Green Loom) make final calls on schema changes, profile
  acceptance, and releases.
- Proposals and disagreements are worked out in public GitHub issues, not
  private channels, so the reasoning behind a decision is part of the
  historical record.
- Jurisdiction profile changes require the citation and fixture standard in
  CONTRIBUTING.md; that standard is not negotiable per-PR.

## Versioning stance

0.x releases may change core shapes, `$id` paths, or profile contents
without a deprecation window. Do not build production dependencies on a
0.x release without pinning the exact version and re-validating on upgrade.
