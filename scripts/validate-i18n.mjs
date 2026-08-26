/* Validate that all locale files are valid JSON with the exact key structure
 * of en.json and that every {placeholder} token is preserved. */
import fs from "node:fs";

const base = JSON.parse(fs.readFileSync("src/lib/i18n/en.json", "utf8"));

function leaves(obj, prefix = "", out = []) {
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) leaves(v, path, out);
    else out.push(path);
  }
  return out;
}

const get = (obj, path) => path.split(".").reduce((a, s) => a[s], obj);
const baseKeys = leaves(base);

let failed = false;
for (const lang of ["es", "fr", "pt"]) {
  const file = `src/lib/i18n/${lang}.json`;
  let data;
  try {
    data = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (e) {
    console.log(`${lang.toUpperCase()}: INVALID JSON — ${e.message}`);
    failed = true;
    continue;
  }
  const keys = new Set(leaves(data));
  const missing = baseKeys.filter((k) => !keys.has(k));
  const extra = [...keys].filter((k) => !new Set(baseKeys).has(k));
  const placeholderMismatch = baseKeys.filter((k) => {
    const original = String(get(base, k));
    const translated = String(get(data, k));
    const tokens = original.match(/\{[^}]+\}/g) || [];
    return tokens.some((t) => !translated.includes(t));
  });

  console.log(`${lang.toUpperCase()}: valid JSON, ${keys.size} strings`);
  if (missing.length) {
    failed = true;
    console.log("  MISSING:", missing);
  }
  if (extra.length) {
    failed = true;
    console.log("  EXTRA:", extra);
  }
  if (placeholderMismatch.length) {
    failed = true;
    console.log("  PLACEHOLDER MISMATCH:", placeholderMismatch);
  }
  if (!missing.length && !extra.length && !placeholderMismatch.length) {
    console.log("  ✓ structure matches en.json, placeholders preserved");
  }
}
process.exit(failed ? 1 : 0);
