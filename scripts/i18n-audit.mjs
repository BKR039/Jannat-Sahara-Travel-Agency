#!/usr/bin/env node
/**
 * i18n audit: detects mixed-language / untranslated UI strings.
 *
 *  1. Arabic literals hardcoded in .ts/.tsx source (must live in locales/ar).
 *  2. Human-readable JSX text nodes and user-facing attributes not wrapped in t().
 *  3. Missing / empty / mistranslated keys across ALL namespaces (ar is the reference).
 *
 * Usage: node scripts/i18n-audit.mjs [--quiet]
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// fileURLToPath handles Windows drive letters and percent-encoded spaces;
// `new URL(...).pathname` yields "/B:/Work/JANAT%20SAHRA/..." and breaks every read.
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "src");
const LOCALES = join(SRC, "locales");
const LANGS = ["ar", "fr", "en"];

/** Every namespace file, not just common.json — the admin lives in the other three. */
const NAMESPACE_FILES = ["common.json", "adminShell.json", "adminOps.json", "adminContent.json"];

const ARABIC = /[\u0600-\u06FF]/;
const LATIN_WORD = /[A-Za-z]{3,}/;
// `watermelon` holds the vendored Astrix reference registry — third-party
// demo code kept for design reference, not Jannat Sahara UI. Its English demo
// strings are not ours to translate, so it is skipped for the same reason
// node_modules is. This keeps the count a measure of OUR strings.
const SKIP_DIRS = new Set(["ui", "locales", "integrations", "watermelon"]);
const SKIP_FILES = [
  /routeTree\.gen\.ts$/,
  /\.server\.ts$/,
  /airports\.ts$/,
  /i18n\.ts$/,
  /localize\.ts$/,
];

/** Values that are identical in every language by nature. */
const LANGUAGE_NEUTRAL = /^(https?:\/\/|[^\s@]+@[^\s@]+\.)/;

/** Tailwind class lists, CSS values and variant names — never user-facing prose. */
const CSS_LIKE = /^[a-z0-9/[\]().:_-]+(\s+[a-z0-9/[\]().:_-]+)*$/;
/** Dotted i18n keys such as `toast.created`. */
const KEY_LIKE = /^[a-z][A-Za-z0-9]*(\.[A-Za-z0-9]+)+$/;

/** True when a literal reads as sentence/label text a person would see. */
function isProse(value) {
  const v = value.trim();
  if (!v || LANGUAGE_NEUTRAL.test(v)) return false;
  if (KEY_LIKE.test(v)) return false;
  if (CSS_LIKE.test(v)) return false;
  // Needs at least one capitalised or multi-word run to be a label.
  return /[A-ZÀ-Þ]/.test(v) || /\s/.test(v);
}

const QUIET = process.argv.includes("--quiet");

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) {
      if (!SKIP_DIRS.has(entry)) walk(p, out);
    } else if (/\.tsx?$/.test(p) && !SKIP_FILES.some((re) => re.test(p))) out.push(p);
  }
  return out;
}

function flatten(obj, prefix = "", out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) flatten(v, key, out);
    else out[key] = v;
  }
  return out;
}

const problems = [];

/* ------------------------------------------------- 1 + 2: source scan */

for (const file of walk(SRC)) {
  const rel = relative(ROOT, file);
  const lines = readFileSync(file, "utf8").split("\n");
  lines.forEach((line, i) => {
    const at = `${rel}:${i + 1}`;
    const trimmed = line.trim();
    if (trimmed.startsWith("//") || trimmed.startsWith("*")) return;

    // `// i18n-audit-ignore` within the preceding lines marks a deliberate
    // literal (e.g. language names, which must appear in their own language).
    if (lines.slice(Math.max(0, i - 3), i).some((l) => l.includes("i18n-audit-ignore"))) return;

    if (ARABIC.test(line)) {
      problems.push(["hardcoded-arabic", at, trimmed.slice(0, 120)]);
    }

    // JSX text node with 2+ latin words, not already inside t()
    const jsxText = line.match(/>\s*([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'’.,!? ]{4,})\s*</);
    if (jsxText && !/\bt\(/.test(line)) {
      if (jsxText[1].trim().split(/\s+/).length >= 2) {
        problems.push(["hardcoded-text", at, jsxText[1].trim().slice(0, 120)]);
      }
    }

    const attr = line.match(/\b(placeholder|aria-label|title|alt|label)="([A-Za-zÀ-ÿ][^"]{3,})"/);
    if (attr && !LANGUAGE_NEUTRAL.test(attr[2])) {
      problems.push(["hardcoded-attr", at, `${attr[1]}="${attr[2].slice(0, 80)}"`]);
    }

    // Object-literal UI strings, e.g. `label: "General"` inside a config array.
    const prop = line.match(
      /\b(label|title|description|summary|detail|placeholder|addLabel|emptyTitle|emptyDescription):\s*"([A-Za-zÀ-ÿ][^"]{3,})"/,
    );
    if (prop && isProse(prop[2])) {
      problems.push(["hardcoded-prop", at, `${prop[1]}: "${prop[2].slice(0, 80)}"`]);
    }

    // Inline ternaries such as `{isEdit ? "Edit FAQ" : "New FAQ"}`.
    const ternary = line.match(/\?\s*"([A-Za-zÀ-ÿ][^"]{3,})"\s*:\s*"([A-Za-zÀ-ÿ][^"]{3,})"/);
    if (ternary && isProse(ternary[1]) && isProse(ternary[2])) {
      problems.push(["hardcoded-ternary", at, `"${ternary[1]}" / "${ternary[2]}"`]);
    }
  });
}

/* ------------------------------------------------- 3: locale parity, all namespaces */

/*
 * Plural keys are compared per language, not key-for-key.
 *
 * `x_one` / `x_two` / `x_few` ... are one logical string. CLDR gives Arabic six
 * categories and English two, so demanding an English `adults_two` asks for a
 * form that can never be selected, while counting keys never noticed an Arabic
 * catalogue that was *missing* `_two` - which makes i18next fall back to the
 * bare key and print `ops.requests.travellers.adults` on screen. So each
 * language is checked against its own plural rules instead.
 *
 * The sample is the range this product actually renders: travellers, nights
 * and days (0-20), plus 100 and 1000 so a large count is covered too.
 */
const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;
const SAMPLE_COUNTS = [...Array(21).keys(), 100, 1000];
const requiredCategories = (lang) => {
  const rules = new Intl.PluralRules(lang);
  return [...new Set(SAMPLE_COUNTS.map((n) => rules.select(n)))];
};

/** Split a flat dictionary into plain keys and plural groups. */
function splitPlurals(dict) {
  const plain = new Set();
  const groups = new Map(); // base -> Set(category)
  for (const key of Object.keys(dict)) {
    const m = key.match(PLURAL_SUFFIX);
    if (!m) {
      plain.add(key);
      continue;
    }
    const base = key.slice(0, -m[0].length);
    if (!groups.has(base)) groups.set(base, new Set());
    groups.get(base).add(m[1]);
  }
  return { plain, groups };
}

for (const file of NAMESPACE_FILES) {
  const dicts = Object.fromEntries(
    LANGS.map((l) => [l, flatten(JSON.parse(readFileSync(join(LOCALES, l, file), "utf8")))]),
  );
  const split = Object.fromEntries(LANGS.map((l) => [l, splitPlurals(dicts[l])]));

  // Every language must carry the categories its own rules can select.
  for (const lang of LANGS) {
    const need = requiredCategories(lang);
    for (const [base, have] of split[lang].groups) {
      for (const cat of need) {
        if (!have.has(cat)) {
          problems.push(["missing-plural", `${lang}/${file}`, `${base}_${cat}`]);
        }
      }
    }
  }

  for (const lang of LANGS.filter((l) => l !== "ar")) {
    // A plural group present in Arabic must exist in every language too.
    for (const base of split.ar.groups.keys()) {
      if (!split[lang].groups.has(base)) {
        problems.push(["missing-key", `${lang}/${file}`, `${base}_*`]);
      }
    }
    for (const key of split.ar.plain) {
      const v = dicts[lang][key];
      if (v === undefined) problems.push(["missing-key", `${lang}/${file}`, key]);
      else if (typeof v === "string" && v.trim() === "")
        problems.push(["empty-value", `${lang}/${file}`, key]);
      else if (typeof v === "string" && ARABIC.test(v))
        problems.push(["arabic-in-latin-locale", `${lang}/${file}`, `${key} = ${v.slice(0, 60)}`]);
    }
    // Plural forms still get the value checks, against their own language.
    for (const key of Object.keys(dicts[lang])) {
      if (!PLURAL_SUFFIX.test(key)) continue;
      const v = dicts[lang][key];
      if (typeof v === "string" && v.trim() === "")
        problems.push(["empty-value", `${lang}/${file}`, key]);
      else if (typeof v === "string" && ARABIC.test(v))
        problems.push(["arabic-in-latin-locale", `${lang}/${file}`, `${key} = ${v.slice(0, 60)}`]);
    }
    for (const key of split[lang].plain) {
      if (dicts.ar[key] === undefined) problems.push(["orphan-key", `${lang}/${file}`, key]);
    }
    for (const base of split[lang].groups.keys()) {
      if (!split.ar.groups.has(base)) {
        problems.push(["orphan-key", `${lang}/${file}`, `${base}_*`]);
      }
    }
  }

  // Arabic entries that are still latin text (untranslated placeholders).
  for (const key of Object.keys(dicts.ar)) {
    const v = dicts.ar[key];
    if (typeof v !== "string") continue;
    if (ARABIC.test(v) || !LATIN_WORD.test(v) || LANGUAGE_NEUTRAL.test(v)) continue;
    problems.push(["untranslated-in-ar", `ar/${file}`, `${key} = ${v.slice(0, 60)}`]);
  }
}

/* --------------------------------------------------------------- report */

const byKind = problems.reduce((acc, [kind]) => ((acc[kind] = (acc[kind] ?? 0) + 1), acc), {});
for (const [kind, count] of Object.entries(byKind)) console.log(`${kind}: ${count}`);

if (!QUIET) {
  console.log("");
  for (const [kind, where, detail] of problems) console.log(`[${kind}] ${where} :: ${detail}`);
}

console.log(`\nTOTAL: ${problems.length}`);
process.exit(problems.length ? 1 : 0);
