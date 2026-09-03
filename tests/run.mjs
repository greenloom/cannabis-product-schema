// ajv 2020-12 conformance harness for cannabis-product-schema core + profiles.
// Core (unchanged): 1. compiles every schema (proves $id/$ref resolution),
// 2. every valid/*.json validates against core Product, 3. every
// invalid/*.json fails (prints which rule tripped), 4. greps core/ for
// jurisdiction constants (must find none).
// us-ga-hemp (Phase 4, added below): 5. compiles the profile schemas against
// the same ajv instance (proves cross-file $ref to core resolves), 6. every
// us-ga-hemp/valid fixture validates against BOTH the profile schema and
// core Product (composition-direction check: profile-valid implies
// core-valid), 7. every us-ga-hemp/invalid/<rule-id>/*.json fixture is
// asserted to trip THAT specific rule ID, via the JS rule module for
// cross-field/computed rules or via the profile schema for static ones.
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import * as gaRules from "../schema/v0.1/profiles/us-ga-hemp/rules/index.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const coreDir = path.join(root, "schema/v0.1/core");
const validDir = path.join(root, "tests/fixtures/core/valid");
const invalidDir = path.join(root, "tests/fixtures/core/invalid");
const profilesDir = path.join(root, "schema/v0.1/profiles");
const gaValidDir = path.join(root, "tests/fixtures/us-ga-hemp/valid");
const gaInvalidDir = path.join(root, "tests/fixtures/us-ga-hemp/invalid");
const PRODUCT_ID =
  "https://greenloom.github.io/cannabis-product-schema/v0.1/core/product.schema.json";
const GA_PRODUCT_ID =
  "https://greenloom.github.io/cannabis-product-schema/v0.1/profiles/us-ga-hemp/product.profile.schema.json";

let failures = 0;
const fail = (msg) => {
  console.error(`FAIL: ${msg}`);
  failures++;
};
const pass = (msg) => console.log(`PASS: ${msg}`);

function walk(dir, suffix = ".json") {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const p = path.join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...walk(p, suffix));
    else if (p.endsWith(suffix)) out.push(p);
  }
  return out.sort();
}

// --- 1. compile every schema, all $ids resolving -------------------------
const ajv = new Ajv2020({ strict: true, allErrors: true });
addFormats(ajv);

const schemaFiles = walk(coreDir, ".schema.json");
const schemas = schemaFiles.map((f) => JSON.parse(readFileSync(f, "utf8")));
for (const s of schemas) {
  try {
    ajv.addSchema(s, s.$id);
  } catch (e) {
    fail(`register ${path.relative(root, s.$id)}: ${e.message}`);
  }
}
for (const s of schemas) {
  try {
    // Invoking the compiled validator forces ajv to resolve every $ref it
    // touches, transitively — the pass/fail result on `{}` is irrelevant.
    ajv.getSchema(s.$id)({});
    pass(`compiled + resolved ${s.$id}`);
  } catch (e) {
    fail(`compile/resolve ${s.$id}: ${e.message}`);
  }
}

// --- 1b. compile the us-ga-hemp profile schemas onto the SAME ajv instance,
// so their $ref to ../../core/*.schema.json resolves against schemas already
// registered above (proves the profile is allOf-composed over core, not a
// copy of it). ------------------------------------------------------------
const profileSchemaFiles = walk(profilesDir, ".schema.json");
const profileSchemas = profileSchemaFiles.map((f) => JSON.parse(readFileSync(f, "utf8")));
for (const s of profileSchemas) {
  try {
    ajv.addSchema(s, s.$id);
  } catch (e) {
    fail(`register ${path.relative(root, s.$id)}: ${e.message}`);
  }
}
for (const s of profileSchemas) {
  try {
    ajv.getSchema(s.$id)({});
    pass(`compiled + resolved ${s.$id}`);
  } catch (e) {
    fail(`compile/resolve ${s.$id}: ${e.message}`);
  }
}

const validateProduct = ajv.getSchema(PRODUCT_ID);
if (!validateProduct) fail(`could not load ${PRODUCT_ID}`);

const validateGaProduct = ajv.getSchema(GA_PRODUCT_ID);
if (!validateGaProduct) fail(`could not load ${GA_PRODUCT_ID}`);

// --- 2. every valid fixture validates against core Product ---------------
if (validateProduct) {
  for (const f of walk(validDir)) {
    const data = JSON.parse(readFileSync(f, "utf8"));
    if (validateProduct(data)) {
      pass(`valid fixture ${path.basename(f)} validates`);
    } else {
      fail(
        `valid fixture ${path.basename(f)} did NOT validate: ${ajv.errorsText(
          validateProduct.errors
        )}`
      );
    }
  }
}

// --- 3. every invalid fixture fails, print which rule tripped ------------
if (validateProduct) {
  for (const f of walk(invalidDir)) {
    const data = JSON.parse(readFileSync(f, "utf8"));
    if (!validateProduct(data)) {
      const rule = validateProduct.errors
        .map((e) => `${e.instancePath || "/"} ${e.keyword} ${JSON.stringify(e.params)}`)
        .join("; ");
      pass(`invalid fixture ${path.basename(f)} correctly rejected — ${rule}`);
    } else {
      fail(`invalid fixture ${path.basename(f)} unexpectedly validated`);
    }
  }
}

// --- 5. us-ga-hemp/valid fixtures validate against the profile AND against
// core (composition-direction check: allOf guarantees this mathematically,
// but a broken profile schema — e.g. a typo'd $ref — would defeat that
// guarantee silently, so it's asserted explicitly per fixture). -----------
if (validateGaProduct && validateProduct) {
  for (const f of walk(gaValidDir)) {
    const data = JSON.parse(readFileSync(f, "utf8"));
    const name = path.basename(f);

    if (validateGaProduct(data)) {
      pass(`us-ga-hemp valid fixture ${name} validates against the profile`);
    } else {
      fail(
        `us-ga-hemp valid fixture ${name} did NOT validate against the profile: ${ajv.errorsText(
          validateGaProduct.errors
        )}`
      );
    }

    if (validateProduct(data)) {
      pass(`us-ga-hemp valid fixture ${name} validates against core (composition-direction holds)`);
    } else {
      fail(
        `COMPOSITION-DIRECTION VIOLATED: us-ga-hemp valid fixture ${name} is profile-valid but NOT core-valid: ${ajv.errorsText(
          validateProduct.errors
        )}`
      );
    }
  }
}

// --- 6. us-ga-hemp/invalid/<rule-id>/*.json each trip THEIR named rule ---
// Static rules (enum restriction) are checked via the profile schema, cross
// referenced against the rule module's own semantic check. Cross-field /
// computed rules (caps, THC-total, COA recency) are checked via the rule
// module directly, since JSON Schema alone can't express them (see
// schema/v0.1/profiles/us-ga-hemp/rules/README.md).
function tripRule(ruleId, doc) {
  const productForm = doc.product_form;
  const packages = doc.packages ?? [];

  switch (ruleId) {
    case "GA-FORM-BAN":
      return gaRules.checkFormBan(productForm);
    case "GA-REG-CLASS":
      return gaRules.checkRegulatoryClass(doc.regulatory_class);
    case "GA-THC-TOTAL": {
      const results = packages.map((pkg) => gaRules.checkThcTotal(pkg.lab_result));
      return results.find((r) => !r.ok) ?? results[0];
    }
    case "GA-COA-GATE": {
      const results = packages.map((pkg) => gaRules.checkCoaGate(pkg));
      return results.find((r) => !r.ok) ?? results[0];
    }
    default:
      if (ruleId.startsWith("GA-CAP-")) {
        const results = packages.map((pkg) => gaRules.checkFormCap(productForm, pkg));
        return results.find((r) => !r.ok) ?? results[0];
      }
      return null;
  }
}

if (validateGaProduct) {
  for (const ruleDir of readdirSync(gaInvalidDir).sort()) {
    const ruleId = ruleDir;
    const dirPath = path.join(gaInvalidDir, ruleDir);
    if (!statSync(dirPath).isDirectory()) continue;

    for (const f of walk(dirPath)) {
      const name = path.basename(f);
      const data = JSON.parse(readFileSync(f, "utf8"));
      const result = tripRule(ruleId, data);

      if (!result) {
        fail(`us-ga-hemp invalid fixture ${ruleId}/${name}: no rule dispatch for "${ruleId}"`);
        continue;
      }
      if (result.ruleId !== ruleId) {
        fail(
          `us-ga-hemp invalid fixture ${ruleId}/${name}: dispatched to wrong rule "${result.ruleId}"`
        );
        continue;
      }
      if (result.ok) {
        fail(`us-ga-hemp invalid fixture ${ruleId}/${name} unexpectedly PASSED ${ruleId}: ${result.message}`);
      } else {
        pass(`us-ga-hemp invalid fixture ${ruleId}/${name} correctly tripped ${ruleId} — ${result.message}`);
      }

      // GA-FORM-BAN and GA-REG-CLASS are documented as schema-enforced
      // (rules/README.md) — confirm the profile schema itself also rejects
      // the fixture, not just the redundant JS check above.
      if ((ruleId === "GA-FORM-BAN" || ruleId === "GA-REG-CLASS") && validateGaProduct) {
        if (validateGaProduct(data)) {
          fail(`us-ga-hemp invalid fixture ${ruleId}/${name} unexpectedly validated against the profile SCHEMA`);
        } else {
          pass(`us-ga-hemp invalid fixture ${ruleId}/${name} also rejected by the profile schema (enum restriction)`);
        }
      }
    }
  }
}

// --- 4. jurisdiction denylist grep over core/ -----------------------------
const denylist = [
  { name: "0.3", re: /0\.3\b/ },
  { name: "0.877", re: /0\.877\b/ },
  { name: "300", re: /\b300\b/ },
  { name: "1000", re: /\b1000\b/ },
  { name: "georgia", re: /\bgeorgia\b/i },
  { name: "ga", re: /\bga\b/i },
  { name: "21", re: /\b21\b/ },
];
let denylistHits = 0;
for (const f of walk(coreDir, ".json")) {
  const text = readFileSync(f, "utf8");
  for (const { name, re } of denylist) {
    if (re.test(text)) {
      fail(`jurisdiction denylist token "${name}" found in ${path.relative(root, f)}`);
      denylistHits++;
    }
  }
}
if (denylistHits === 0) pass("jurisdiction denylist grep: core/ is jurisdiction-neutral");

console.log(failures === 0 ? "\nALL GREEN" : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
