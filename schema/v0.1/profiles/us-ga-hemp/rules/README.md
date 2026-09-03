# us-ga-hemp rule IDs

Every constraint this profile enforces is cited to a primary source and
executable — either directly as JSON Schema (`../product.profile.schema.json`,
`../lab-result.profile.schema.json`) or, where JSON Schema can't express
cross-field/date-relative math, as a function in `index.mjs`. `tests/run.mjs`
asserts every `tests/fixtures/us-ga-hemp/invalid/<rule-id>/*.json` fixture
trips exactly the rule its folder names, printing the message below.

GA figures are never hand-copied twice: `../config.example.json` is the one
place the numbers live, and `index.mjs` reads it rather than re-declaring
them. Not legal advice — see the profile's `confidence_note` in `profile.json`
and `NOT_MODELED.md`.

## GA-FORM-BAN

**Requirement:** Retail sale of hemp flower/leaf is prohibited outright;
prerolls are included in the ban.
**Citation:** SB 494 (research-synthesis-ga-hemp-rule-read-and-d8449, P7).
**Enforced by:** JSON Schema — `product.profile.schema.json` narrows core's
`product_form` enum to exclude `flower` and `preroll`. Also checked
redundantly by `checkFormBan()` in `index.mjs` (defense in depth; the schema
alone is sufficient).
**Pseudocode:**
```
BANNED_FORMS = {flower, preroll}
fail if product.product_form in BANNED_FORMS
```
**Fixtures:** `invalid/GA-FORM-BAN/flower.json`, `invalid/GA-FORM-BAN/preroll.json`.

## GA-REG-CLASS

**Requirement:** GA consumable-hemp retail covers `hemp_derived` and
`delta8` products; `marijuana` and `other_cannabis` fall outside this retail
channel (different licensing regime).
**Citation:** Relay's interpretation of "GA hemp retail" scope — **not** a
verbatim figure from a numbered claim in the research synthesis. Flagged as
an interpretation in the Phase 4 report; revisit with counsel before launch.
**Enforced by:** JSON Schema — `product.profile.schema.json` narrows core's
`regulatory_class` enum. Also checked by `checkRegulatoryClass()`.
**Pseudocode:**
```
GA_RETAIL_CLASSES = {hemp_derived, delta8}
fail if product.regulatory_class not in GA_RETAIL_CLASSES
```
**Fixtures:** `invalid/GA-REG-CLASS/marijuana.json`.

## GA-CAP-\<form\>

**Requirement:** THC caps are per `product_form`, each with a per-unit rule
and a container rule — not a scalar.

| form | per-unit | container |
| --- | --- | --- |
| `edible` | 10 mg / piece | 300 mg / package |
| `tincture` | 2 mg / mL | 60 mL |
| `topical` | — | 1000 mg / package |
| `beverage` | 10 mg / serving (= container) | 12 fl oz |

**Citation:** GA Comp. R. & Regs. 40-32-5-.06 (P1–P4). The 150 mg figure
that appeared in an earlier secondary-source draft was wrong — 300 mg is
the primary-rule number for edibles; do not carry 150 anywhere.
**Enforced by:** `checkFormCap(productForm, pkg)` in `index.mjs`, reading
the cap table from `config.example.json`. Not schema-expressible: the cap
compares two field values against each other (or against `net_contents`),
which JSON Schema's static keyword set can't do.

<a id="basis-mapping"></a>**Basis mapping (a documented interpretation):**
core's `cannabinoid.basis` enum is `per_serving | per_package |
percent_dry_weight` — there is no `per_piece` or `per_mL` basis. This rule
module treats:
- edible "per piece" ↔ a cannabinoid reading with `basis: per_serving`
  (one gummy = one serving).
- tincture "per mL" ↔ computed concentration = (`basis: per_package` THC
  mg) ÷ (`net_contents.value` where `net_contents.unit == "mL"`).
- beverage "per serving" ↔ a cannabinoid reading with `basis: per_serving`,
  the same mapping as edible: a beverage container is sold as a single
  serving, so per-serving and per-container are the same reading.

**Pseudocode:**
```
cap = CAP_TABLE[product_form]
if cap.per_piece_mg:   fail if cannabinoid(THC, per_serving) > cap.per_piece_mg
if cap.per_package_mg: fail if cannabinoid(THC, per_package) > cap.per_package_mg
if cap.per_ml_mg:       fail if cannabinoid(THC, per_package) / net_contents_mL > cap.per_ml_mg
if cap.container_max_ml: fail if net_contents_mL > cap.container_max_ml
if cap.per_serving_mg:  fail if cannabinoid(THC, per_serving) > cap.per_serving_mg
if cap.container_max_volume: fail if net_contents (matched by unit) > cap.container_max_volume.value
```
**Fixtures:**
- `invalid/GA-CAP-edible/over-10mg-piece.json` (per-piece)
- `invalid/GA-CAP-edible/over-300mg.json` (container)
- `invalid/GA-CAP-tincture/over-2mg-ml.json` (concentration)
- `invalid/GA-CAP-tincture/over-60ml-container.json` (container)
- `invalid/GA-CAP-topical/over-1000mg.json` (container)
- `invalid/GA-CAP-beverage/over-cap.json` (per-serving)

## GA-THC-TOTAL

**Requirement:** `(THCa × 0.877) + Δ9-THC ≤ 0.3%`, by dry weight — the
statutory hemp-definition line.
**Citation:** SB 494; GA Dept. of Agriculture (P5).
**Enforced by:** `checkThcTotal(labResult)` in `index.mjs`. Applies only
when the COA reports `percent_dry_weight` readings for THCA and/or THC —
silent (not vacuously passing) on an mg-only COA, since that COA is simply
not reporting the figure this formula needs.
**Pseudocode:**
```
if no percent_dry_weight THCA/THC reported: rule does not apply
total = (THCA_percent ?? 0) * 0.877 + (THC_percent ?? 0)
fail if total > 0.3
```
**Fixtures:** `invalid/GA-THC-TOTAL/over-0.3-percent.json`.

## GA-COA-GATE

**Requirement:** A GA package requires a linked LabResult that is (a)
in-date — tested within the last 12 months, (b) publicly reachable, (c)
overall-passing, (d) contaminants-passing, and (e) covers the full analyte
panel (Δ9-THC, CBD, CBDA, CBG, CBGA, CBN, HHC).
**Citation:** GA Dept. of Agriculture guidance (P6); accepted policy at
`decisions/coa-publication-gate.md`.
**Enforced by:** two layers.
- JSON Schema (`product.profile.schema.json` requires `lab_result` on every
  package; `lab-result.profile.schema.json` requires `tested_at`,
  `public_url`, `overall_pass: true`, `contaminants_passed: true`, and
  `contains` clauses for all seven analyte codes) — catches (a)-linked,
  (c), (d), (e), and the presence half of (b).
- `checkCoaGate(pkg, now)` in `index.mjs` — the **only** thing that can
  catch (b)-in-date, because "≤12 months old" is relative to today and no
  static schema keyword does date math.

<a id="twelve-months-as-365-days"></a>**"12 months" is encoded as 365 days**
(`config.example.json.coa_gate.max_age_days`) rather than a calendar-month
subtraction. This is a rounding simplification, not a sourced figure — GA
guidance says "12 months," not "365 days"; the two differ by up to a day
across leap years. Flagged as an interpretation.

**Pseudocode:**
```
if no lab_result: fail ("no linked lab_result")
fail if not lab_result.public_url
fail if lab_result.overall_pass != true
fail if lab_result.contaminants_passed != true
fail if not lab_result.tested_at
fail if (now - lab_result.tested_at) > 365 days
fail if any of {THC, CBD, CBDA, CBG, CBGA, CBN, HHC} missing from lab_result.cannabinoids
```
**Fixtures:**
- `invalid/GA-COA-GATE/missing-lab-result.json` (a, linked)
- `invalid/GA-COA-GATE/stale-coa.json` (a, in-date — the one case JSON Schema cannot catch)
- `invalid/GA-COA-GATE/missing-public-url.json` (b)
- `invalid/GA-COA-GATE/failed-overall-pass.json` (c)
- `invalid/GA-COA-GATE/missing-analyte.json` (e)
