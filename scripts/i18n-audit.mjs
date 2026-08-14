#!/usr/bin/env node
/**
 * i18n audit: detects mixed-language / untranslated UI strings.
 *  1. Arabic literals hardcoded in .ts/.tsx source (must live in locales/ar).
 *  2. Human-readable JSX text nodes and user-facing attributes not wrapped in t().
 *  3. Missing / empty keys between locale files (ar is the reference).
 * Usage: bun scripts/i18n-audit.mjs
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const SRC = join(ROOT, "src");
const LOCALES = join(SRC, "locales");
const LANGS = ["ar", "fr", "en"];
const ARABIC = /[\u0600-\u06FF]/;
const SKIP_DIRS = new Set(["ui", "locales", "integrations"]);
const SKIP_FILES = [/routeTree\.gen\.ts$/, /\.server\.ts$/, /airports\.ts$/, /i18n\.ts$/, /localize\.ts$/];

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

const dicts = Object.fromEntries(
  LANGS.map((l) => [l, flatten(JSON.parse(readFileSync(join(LOCALES, l, "common.json"), "utf8")))]),
);

const problems = [];

// 1 + 2: source scan
for (const file of walk(SRC)) {
  const rel = relative(ROOT, file);
  const lines = readFileSync(file, "utf8").split("\n");
  lines.forEach((line, i) => {
    const at = `${rel}:${i + 1}`;
    if (ARABIC.test(line) && !line.trim().startsWith("//") && !line.trim().startsWith("*")) {
      problems.push([`hardcoded-arabic`, at, line.trim().slice(0, 120)]);
    }
    // JSX text node with 2+ latin words, not inside t()
    const jsxText = line.match(/>\s*([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'’.,!? ]{4,})\s*</);
    if (jsxText && !/\bt\(/.test(line) && !/^\s*\/\//.test(line)) {
      const words = jsxText[1].trim().split(/\s+/);
      if (words.length >= 2) problems.push([`hardcoded-text`, at, jsxText[1].trim().slice(0, 120)]);
    }
    const attr = line.match(/\b(placeholder|aria-label|title|alt)="([A-Za-zÀ-ÿ][^"]{3,})"/);
    if (attr && attr[2] !== "" && !/^(https?:|#)/.test(attr[2])) {
      problems.push([`hardcoded-attr`, at, `${attr[1]}="${attr[2].slice(0, 80)}"`]);
    }
  });
}

// 3: locale parity
const refKeys = Object.keys(dicts.ar);
for (const lang of LANGS.filter((l) => l !== "ar")) {
  for (const key of refKeys) {
    const v = dicts[lang][key];
    if (v === undefined) problems.push(["missing-key", `locales/${lang}`, key]);
    else if (typeof v === "string" && v.trim() === "") problems.push(["empty-value", `locales/${lang}`, key]);
    else if (typeof v === "string" && ARABIC.test(v)) problems.push(["arabic-in-latin-locale", `locales/${lang}`, `${key} = ${v.slice(0, 60)}`]);
  }
  for (const key of Object.keys(dicts[lang])) {
    if (dicts.ar[key] === undefined) problems.push(["orphan-key", `locales/${lang}`, key]);
  }
}

const byKind = problems.reduce((acc, [kind]) => ((acc[kind] = (acc[kind] ?? 0) + 1), acc), {});
for (const [kind, count] of Object.entries(byKind)) console.log(`${kind}: ${count}`);
console.log("");
for (const [kind, where, detail] of problems) console.log(`[${kind}] ${where} :: ${detail}`);
console.log(`\nTOTAL: ${problems.length}`);
process.exit(problems.length ? 1 : 0);
