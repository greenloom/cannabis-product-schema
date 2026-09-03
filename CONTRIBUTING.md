# Contributing

## Core changes

Core (`schema/v0.1/core/`) is jurisdiction-neutral by design — it stays
representable-everything, never gains a jurisdiction constant. Changes to
core must keep `tests/run.mjs`'s jurisdiction-denylist grep green. Widening
an enum (adding a value) is the normal path for a new physical form or
regulatory class; narrowing or renaming an existing value is a breaking
change and needs a version bump discussion first (open an issue).

## Jurisdiction profiles

A new or changed jurisdiction profile (`schema/v0.1/profiles/<profile-id>/`)
must arrive with, for every rule it adds or changes:

1. **A citation to primary rule text.** A statute section, agency
   regulation citation, or equivalent primary source — not a blog post,
   not a secondary summary, not "I believe this is the rule." Cite the
   specific section (e.g. `40-32-5-.06`), not just the parent title.
2. **A valid fixture** demonstrating a document that satisfies the rule.
3. **An invalid fixture** demonstrating a document that violates the rule,
   placed under `tests/fixtures/<profile-id>/invalid/<RULE-ID>/` so
   `tests/run.mjs` can assert it trips that specific rule ID.

**No citation, no merge.** A rule without a primary-source citation does
not go in, regardless of how confident the contribution is. If the primary
text is genuinely unclear or contested, say so in the rule's documentation
(see `rules/README.md` in `us-ga-hemp` for the pattern) rather than
guessing silently.

Every profile is `allOf`-only over core: profiles restrict what core
allows, they never add fields core doesn't have. If a jurisdiction needs a
field core doesn't carry, that's a core proposal (see above), not a profile
workaround.

## Running the tests

```
npm install
node tests/run.mjs
bash tests/boundary.sh
```

Both must be green before a PR is opened. CI runs both on every push and
pull request.

## What NOT to contribute

See `BOUNDARY.md` for what can never enter this repository (business
internals, real store/customer identifiers, internal service names). If
you're unsure whether something belongs, ask in an issue before opening
a PR.
