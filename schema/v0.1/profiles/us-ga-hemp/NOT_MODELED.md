# Not modeled

GA requirements from research-synthesis-ga-hemp-rule-read-and-d8449 that
this profile deliberately does **not** express as an executable constraint,
and why. This is not a compliance gap list to silently accept — Phase 5
(publication) or the eventual retail migration should read this before
assuming the schema/tests cover everything the law requires.

## Age 21+ (P8)

Checkout-time identity verification, not a catalog-document property. A
Product/Package document has no "buyer" to check the age of. Enforced (per
`integration-contract-hemp-product-interchange-v0-1.md`) at the point of
sale, not in this schema.

## Department-approved THC warning sticker (P8)

GA requires a Department-approved physical warning sticker on the package.
`core/label.schema.json`'s `warnings[]` can carry the *text* of a
state-mandated statement, and `intoxicating_symbol.required`/`.placement`
can flag that a symbol belongs on the label — but "this exact sticker,
physically affixed, using Department-issued artwork" is a manufacturing/QA
process, not a data shape. No JSON document proves a sticker is stuck to a
physical package.

## Tamper-evident, child-resistant, not-candy-resembling packaging (P8)

Physical packaging-engineering attributes verified by inspection or lab
testing of the packaging itself, not by any field in a product interchange
document. Not modeled.

## ASTM D8441 intoxicating-symbol artwork

`core/label.schema.json.intoxicating_symbol` carries a boolean + placement
string — a *reference* to the requirement. The symbol artwork itself
(`assets/iicps-official.png` in the third-party D8449/D8441 summary Aaron
supplied) is never modeled or redistributed here, matching the standard's
own copyright and the research synthesis's explicit note not to reproduce
it.

## Full ASTM D8449 label conformance

The label module structure (`core/label.schema.json`) is informed by a
third-party educational summary of D8449, not the purchased normative
standard. It is sufficient to design v0.1's *structure* but not sufficient
to assert D8449 *conformance*, or to resolve exact required-vs-recommended
distinctions within a module. Purchase the standard before making any D8449
conformance claim (research-synthesis-ga-hemp-rule-read-and-d8449,
Confidence and limitations).

## Effective-date and amendment currency

`profile.json`'s `effective_date: "2024-10-01"` and the P1–P4 cap figures
are as read from the primary rule text via the GA Secretary of State rules
portal on 2026-09-02 (research-synthesis-ga-hemp-rule-read-and-d8449). The
research synthesis explicitly flags that "the exact adoption date and any
2025–2026 amendments were not confirmed line-by-line." Nothing in this
profile detects a rule amendment — there is no version-check mechanism.
This is the revisit trigger already recorded in
`decisions/coa-publication-gate.md`.

## License number validation (Party.license_number)

`core/party.schema.json.license_number` is a bare string. Nothing here
validates it against the GA Department of Agriculture's actual licensee
registry — that would require an external lookup, not a static schema
constraint.

## Track-and-trace / seed-to-sale integration

`core/label.schema.json.identity_compliance.track_and_trace` is a free-form
string. No state track-and-trace system's identifiers or validation rules
are modeled.

## Medical / Low-THC-Oil program

Out of scope entirely, by an existing decision
(`decisions/product-type-vocabulary.md`, "Medical use cases"): GA's medical
program is a separate license these Stores do not hold, and encoding a
therapeutic-use field would itself create a labeling/health-claim liability.
Not a gap to close — a deliberate exclusion.

## GA-THC-TOTAL dry-weight data requirement (P5)

We have not confirmed whether 40-32-5-.06 or SB 494 requires a
`percent_dry_weight` reading on every COA. When a hemp_derived package's
linked LabResult has no DW THC/THCA, `checkThcTotal` now fails closed
("0.3% formula cannot be evaluated (needs DW verification)"). This is a
fail-closed encoding of the profile's own formula — `(THCa × 0.877) + Δ9-THC ≤ 0.3%`
by dry weight — rather than an assertion that statute mandates DW on every
COA. (See rules/README.md for GA-THC-TOTAL and config.example.json
`total_thc_formula`.) Same interpretive posture as the 365-day encoding of
"12 months" for GA-COA-GATE recency.
