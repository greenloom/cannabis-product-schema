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

**Requirement:** GA consumable-hemp retail is limited to `hemp_derived`
products (statutory "consumable hemp product"). `delta8` is an analyte
reported on LabResult, not a regulatory class. `marijuana` and
`other_cannabis` fall outside this retail channel (different licensing
regime).
**Citation:** Ga. Comp. R. & Regs. r. 40-32-5-.01(1)(a)3 (F. 2024-09-11, eff. 2024-10-01) — marijuana products or low THC oil products shall not be sold as consumable hemp. https://www.law.cornell.edu/regulations/georgia/Ga-Comp-R-Regs-R-40-32-5-.01. Also: O.C.G.A. §§ 2-23-3 (consumable hemp product), 2-23-6.2 (retail license), 2-23-9.2 (must not suggest medical cannabis / low THC oil), 16-12-190 / 16-12-200; GDA https://agr.georgia.gov/hemp-retail-consumable-hemp-licenses (retrieved 2026-09-02). `hemp_derived` is our token mapping to the statutory consumable-hemp-product concept.
**Enforced by:** JSON Schema — `product.profile.schema.json` narrows core's
`regulatory_class` enum to `hemp_derived` only. Also checked by `checkRegulatoryClass()`.
**Pseudocode:**
```
GA_RETAIL_CLASSES = {hemp_derived}
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
percent_dry_weight` — there is no `per_piece` or `per_mL` basis. This is a
jurisdiction-neutral core enum; profile-specific interpretation is required
to align statutory per-unit language with core fields. The mapping is
surfaced in `config.example.json` under `basis_mapping` (and duplicated here
for rule documentation so it is not only in one place).

Mapping (unchanged behavior):
- edible "per piece" (statutory "per gummy") ↔ a cannabinoid reading with
  `basis: per_serving` (one gummy = one serving).
- tincture "per mL" (statutory "per 1 milliliter") ↔ computed concentration
  = (`basis: per_package` THC mg) ÷ (`net_contents.value` where
  `net_contents.unit == "mL"`).
- beverage "per serving" (statutory "per 12 fl oz") ↔ a cannabinoid reading
  with `basis: per_serving`, the same mapping as edible: a beverage container
  is sold as a single serving, so per-serving and per-container are the same
  reading for cap purposes.

**Citation (primary):** Ga. Comp. R. & Regs. r. 40-32-5-.06 (per gummy / per
12 fl oz / per 1 milliliter / per package). Cornell LII is acceptable for
related provisions (e.g., r. 40-32-5-.01). Retrieved 2026-09-02. This is an
interpretation because core `basis` is jurisdiction-neutral; the statute does
not use the token `per_serving`. See `config.example.json.basis_mapping` for
the machine-readable note. Do not claim the statute uses `per_serving`.

This mapping does not alter `checkFormCap` behavior and introduces no new
executable rule. No DW-reporting mandate is invented here; see NOT_MODELED.md
and the total_thc_formula entry in config for DW handling.

(The original short mapping is preserved below for continuity; the expanded
version above is authoritative for #9.)

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
**Enforced by:** `checkThcTotal(labResult)` in `index.mjs`.
If both THCA and THC lack `percent_dry_weight` readings, the formula
cannot be evaluated — fail closed (needs DW verification). This is a
fail-closed encoding of the profile's own formula, not an assertion that
SB 494 or 40-32-5-.06 mandates DW on every COA. When at least one DW
reading exists, a missing counterpart is treated as 0 for the arithmetic
(consistent with `(x ?? 0)`).
**Pseudocode:**
```
if (no percent_dry_weight for THCA AND no percent_dry_weight for THC):
  fail ("missing percent_dry_weight for both THCA and THC — 0.3% formula cannot be evaluated (needs DW verification)")
total = (THCA_percent ?? 0) * 0.877 + (THC_percent ?? 0)
fail if total > 0.3
```
**Fixtures:**
- `invalid/GA-THC-TOTAL/over-0.3-percent.json` (DW present but exceeds 0.3%)
- `invalid/GA-THC-TOTAL/no-dry-weight.json` (mg-only or no DW THC/THCA on a hemp_derived package — fails closed).

## GA-COA-GATE

**Requirement:** A GA package requires a linked LabResult that is (a)
in-date — tested within the last 12 months, (b) publicly reachable, (c)
overall-passing, (d) contaminants-passing, and (e) covers the full analyte
panel (Δ9-THC, CBD, CBDA, CBG, CBGA, CBN, HHC).
**Citation:** O.C.G.A. § 2-23-9.1 ("within the last 12 months"); GDA https://agr.georgia.gov/hemp-retail-consumable-hemp-licenses (retrieved 2026-09-02); accepted policy at `decisions/coa-publication-gate.md`.
**Enforced by:** two layers.
- JSON Schema (`product.profile.schema.json` requires `lab_result` on every
  package; `lab-result.profile.schema.json` requires `tested_at`,
  `public_url`, `overall_pass: true`, `contaminants_passed: true`, and
  `contains` clauses for all seven analyte codes) — catches (a)-linked,
  (c), (d), (e), and the presence half of (b).
- `checkCoaGate(pkg, now)` in `index.mjs` — the **only** thing that can
  catch (b)-in-date, because "≤12 months old" is relative to today and no
  static schema keyword does date math.

<a id="twelve-months-as-365-days"></a>**"12 months" (O.C.G.A. § 2-23-9.1) is encoded as 365 days**
(`config.example.json.coa_gate.max_age_days`) rather than a calendar-month
subtraction. Statute and GDA page say "within the last 12 months," not "365 days."
365 is a fail-closed encoding: 12 calendar months can span 366 days (leap years),
so 365 is the stricter bound. Do not claim the statute says 365.

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
