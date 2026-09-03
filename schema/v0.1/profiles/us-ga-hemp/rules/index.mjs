// us-ga-hemp cross-field rule module.
//
// JSON Schema (product.profile.schema.json / lab-result.profile.schema.json)
// covers everything static: enum restriction, required fields, const, and
// "does this array contain an item shaped like X". It cannot do date math
// against "today" or arithmetic across two field values, so the rules that
// need that live here instead — one function per rule ID, each returning
// { ruleId, ok, message }. Reference pseudocode for each rule is in
// ../rules/README.md; this file is the executable form.
//
// Every GA figure below is READ from config.example.json (the single source
// of the numbers, per its own $comment) rather than re-declared, so a number
// never has to agree with itself in two places.
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(
  readFileSync(path.join(__dirname, "..", "config.example.json"), "utf8")
);

export const CAP_TABLE = config.product_form_caps;
export const COA_GATE_CONFIG = config.coa_gate;
const REQUIRED_ANALYTES = COA_GATE_CONFIG.required_analytes;
const MAX_AGE_MS = COA_GATE_CONFIG.max_age_days * 24 * 60 * 60 * 1000;

function cannabinoidValue(cannabinoids, code, basis) {
  const hit = (cannabinoids ?? []).find((c) => c.code === code && c.basis === basis);
  return hit ? hit.value : undefined;
}

/**
 * GA-THC-TOTAL — SB 494 / GA Dept. of Agriculture (P5):
 *   (THCa × 0.877) + Δ9-THC ≤ 0.3%, by dry weight.
 * Only applies when the COA actually reports percent_dry_weight readings —
 * a package whose COA is mg-only (per_serving/per_package) is silent on this
 * rule, not passing it vacuously by omission of the wrong data shape.
 */
export function checkThcTotal(labResult) {
  const ruleId = "GA-THC-TOTAL";
  const thca = cannabinoidValue(labResult?.cannabinoids, "THCA", "percent_dry_weight");
  const thc = cannabinoidValue(labResult?.cannabinoids, "THC", "percent_dry_weight");
  if (thca === undefined && thc === undefined) {
    return { ruleId, ok: true, message: "no percent_dry_weight THC/THCA reported — rule does not apply" };
  }
  const total = (thca ?? 0) * 0.877 + (thc ?? 0);
  const ok = total <= 0.3;
  return {
    ruleId,
    ok,
    message: `total THC = (${thca ?? 0} × 0.877) + ${thc ?? 0} = ${total.toFixed(4)}% ${ok ? "<=" : ">"} 0.3%`,
  };
}

/**
 * GA-CAP-<form> — 40-32-5-.06 per-form mg caps (P1–P4), read from the cap
 * table in config.example.json. Not a scalar: each form carries its own
 * per-unit rule and container rule, keyed by unit basis (mg/piece, mg/mL, or
 * mg/package only).
 */
export function checkFormCap(productForm, pkg) {
  const ruleId = `GA-CAP-${productForm}`;
  const cap = CAP_TABLE[productForm];
  if (!cap || cap.enforceable === false) {
    return { ruleId, ok: true, message: cap?.note ?? "no GA cap defined for this form" };
  }
  const cannabinoids = pkg?.lab_result?.cannabinoids ?? [];
  const reasons = [];

  if (cap.per_piece_mg !== undefined) {
    const v = cannabinoidValue(cannabinoids, "THC", "per_serving");
    if (v === undefined) reasons.push("no per_serving THC reading to check against the per-piece cap");
    else if (v > cap.per_piece_mg) reasons.push(`per-piece THC ${v}mg > ${cap.per_piece_mg}mg cap`);
  }
  if (cap.per_package_mg !== undefined) {
    const v = cannabinoidValue(cannabinoids, "THC", "per_package");
    if (v === undefined) reasons.push("no per_package THC reading to check against the container cap");
    else if (v > cap.per_package_mg) reasons.push(`per-package THC ${v}mg > ${cap.per_package_mg}mg cap`);
  }
  if (cap.per_ml_mg !== undefined) {
    const totalMg = cannabinoidValue(cannabinoids, "THC", "per_package");
    const volumeMl = pkg?.net_contents?.unit === "mL" ? pkg.net_contents.value : undefined;
    if (totalMg === undefined || volumeMl === undefined) {
      reasons.push("missing per_package THC mg or mL net_contents to compute concentration");
    } else {
      const concentration = totalMg / volumeMl;
      if (concentration > cap.per_ml_mg) {
        reasons.push(`concentration ${concentration.toFixed(3)}mg/mL > ${cap.per_ml_mg}mg/mL cap`);
      }
    }
  }
  if (cap.container_max_ml !== undefined) {
    const volumeMl = pkg?.net_contents?.unit === "mL" ? pkg.net_contents.value : undefined;
    if (volumeMl !== undefined && volumeMl > cap.container_max_ml) {
      reasons.push(`container ${volumeMl}mL > ${cap.container_max_ml}mL cap`);
    }
  }
  if (cap.per_serving_mg !== undefined) {
    // beverage: a single container is sold as one serving, so "per serving"
    // ↔ basis=per_serving directly (same mapping as edible's per_piece_mg).
    const v = cannabinoidValue(cannabinoids, "THC", "per_serving");
    if (v === undefined) reasons.push("no per_serving THC reading to check against the per-serving cap");
    else if (v > cap.per_serving_mg) reasons.push(`per-serving THC ${v}mg > ${cap.per_serving_mg}mg cap`);
  }
  if (cap.container_max_volume !== undefined) {
    const { value: maxVal, unit } = cap.container_max_volume;
    const netVal = pkg?.net_contents?.unit === unit ? pkg.net_contents.value : undefined;
    if (netVal === undefined) {
      reasons.push(`missing net_contents in ${unit} to check against the container volume cap`);
    } else if (netVal > maxVal) {
      reasons.push(`container ${netVal}${unit} > ${maxVal}${unit} cap`);
    }
  }

  return { ruleId, ok: reasons.length === 0, message: reasons.join("; ") || "within cap" };
}

/**
 * GA-COA-GATE — decision-coa-publication-gate / 40-32-5-.06 / P6:
 * linked, in-date (≤12 months), publicly reachable, overall pass, and
 * contaminants pass. `now` is injectable for deterministic testing; defaults
 * to real wall-clock time.
 */
export function checkCoaGate(pkg, now = new Date()) {
  const ruleId = "GA-COA-GATE";
  const lr = pkg?.lab_result;
  if (!lr) return { ruleId, ok: false, message: "no linked lab_result" };

  const reasons = [];
  if (!lr.public_url) reasons.push("missing public_url");
  if (lr.overall_pass !== true) reasons.push("overall_pass is not true");
  if (lr.contaminants_passed !== true) reasons.push("contaminants_passed is not true");
  if (!lr.tested_at) {
    reasons.push("missing tested_at");
  } else {
    const ageMs = now.getTime() - new Date(lr.tested_at).getTime();
    if (Number.isNaN(ageMs)) reasons.push("tested_at is not a parseable date");
    else if (ageMs > MAX_AGE_MS) reasons.push(`tested_at is more than ${COA_GATE_CONFIG.max_age_days} days old`);
  }

  const codes = new Set((lr.cannabinoids ?? []).map((c) => c.code));
  const missing = REQUIRED_ANALYTES.filter((code) => !codes.has(code));
  if (missing.length) reasons.push(`missing analytes: ${missing.join(", ")}`);

  return { ruleId, ok: reasons.length === 0, message: reasons.join("; ") || "COA gate satisfied" };
}

/** GA-FORM-BAN — SB 494: retail sale of hemp flower/leaf, prerolls included, is prohibited. */
const BANNED_FORMS = new Set(["flower", "preroll"]);
export function checkFormBan(productForm) {
  const ruleId = "GA-FORM-BAN";
  const ok = !BANNED_FORMS.has(productForm);
  return {
    ruleId,
    ok,
    message: ok ? "form is GA-retail-eligible" : `${productForm} is banned from GA retail sale (SB 494)`,
  };
}

/**
 * GA-REG-CLASS — Relay's interpretation (not a verbatim P-row): GA
 * consumable-hemp retail covers hemp_derived and delta8; marijuana and
 * other_cannabis sit under a different licensing regime.
 */
const GA_RETAIL_CLASSES = new Set(["hemp_derived", "delta8"]);
export function checkRegulatoryClass(regulatoryClass) {
  const ruleId = "GA-REG-CLASS";
  const ok = GA_RETAIL_CLASSES.has(regulatoryClass);
  return {
    ruleId,
    ok,
    message: ok
      ? "regulatory_class is GA-retail-eligible"
      : `${regulatoryClass} is outside GA consumable-hemp retail scope`,
  };
}
