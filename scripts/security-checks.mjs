#!/usr/bin/env node
/**
 * Security invariants that must hold for every build.
 *
 * This is not a unit-test suite — the project has no test runner — it is a
 * small set of assertions in the same plain-node style as `i18n-audit.mjs`,
 * guarding the failures that would be worst and quietest if they came back:
 * a server-only secret reaching the browser, and structured data that can
 * escape its own script tag.
 *
 * Usage:
 *   node scripts/security-checks.mjs           # source checks only
 *   node scripts/security-checks.mjs --bundle  # also scan .output/public
 *
 * Exits non-zero on any failure.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SCAN_BUNDLE = process.argv.includes("--bundle");

let failures = 0;
let checks = 0;

function ok(label) {
  checks++;
  console.log(`  PASS  ${label}`);
}
function fail(label, detail) {
  checks++;
  failures++;
  console.log(`  FAIL  ${label}`);
  if (detail) console.log(`        ${detail}`);
}

function walk(dir, out = [], skip = new Set(["node_modules", ".git", ".output", "dist"])) {
  for (const entry of fs.readdirSync(dir)) {
    const p = path.join(dir, entry);
    let stat;
    try {
      stat = fs.statSync(p);
    } catch {
      continue;
    }
    if (stat.isDirectory()) {
      if (!skip.has(entry)) walk(p, out, skip);
    } else out.push(p);
  }
  return out;
}

/* ------------------------------------------------------------------ 1. JSON-LD */

console.log("\nJSON-LD cannot escape its <script> element");
{
  const files = walk(path.join(ROOT, "src")).filter((f) => /\.tsx?$/.test(f));
  const offenders = [];
  for (const f of files) {
    const src = fs.readFileSync(f, "utf8");
    if (!src.includes("application/ld+json")) continue;
    /*
     * `JSON.stringify` leaves `<` alone, so a CMS value containing `</script>`
     * closes the tag and the rest is parsed as HTML. Every JSON-LD payload has
     * to go through `jsonLd()` from `@/lib/seo`, which escapes it.
     */
    const lines = src.split("\n");
    lines.forEach((line, i) => {
      if (/children:\s*JSON\.stringify\(|__html:\s*JSON\.stringify\(/.test(line)) {
        offenders.push(`${path.relative(ROOT, f)}:${i + 1}`);
      }
    });
  }
  if (offenders.length === 0) ok("every ld+json payload uses the escaping serializer");
  else fail("raw JSON.stringify in a JSON-LD script", offenders.join(", "));

  // And the serializer itself must actually escape.
  const seo = fs.readFileSync(path.join(ROOT, "src/lib/seo.ts"), "utf8");
  if (/export function jsonLd/.test(seo) && /\\\\u003c/.test(seo)) {
    ok("jsonLd() escapes `<` as \\u003c");
  } else {
    fail("jsonLd() missing or no longer escapes `<`");
  }
}

/* -------------------------------------------------- 2. server-only boundary */

console.log("\nService-role client stays on the server");
{
  const files = walk(path.join(ROOT, "src")).filter((f) => /\.tsx?$/.test(f));
  const bad = [];
  for (const f of files) {
    const rel = path.relative(ROOT, f).replace(/\\/g, "/");
    if (rel === "src/integrations/supabase/client.server.ts") continue;
    const src = fs.readFileSync(f, "utf8");
    if (!src.includes("client.server")) continue;
    const serverOnly = /\.server\.ts$/.test(rel) || /\.functions\.ts$/.test(rel);
    if (!serverOnly) bad.push(rel);
  }
  if (bad.length === 0) ok("client.server imported only by .server.ts / .functions.ts");
  else fail("service-role client reachable from client code", bad.join(", "));
}

/* -------------------------------------------- 3. privileged fns are gated */

console.log("\nPrivileged server functions are authorized");
{
  const adminFiles = walk(path.join(ROOT, "src/lib/admin")).filter((f) =>
    /\.functions\.ts$/.test(f),
  );
  const ungated = [];
  for (const f of adminFiles) {
    const src = fs.readFileSync(f, "utf8");
    // Split on each exported server function and require a guard in its body.
    const parts = src.split(/^export const /m).slice(1);
    for (const part of parts) {
      const name = part.split(/[\s=]/)[0];
      if (!/createServerFn/.test(part.split("\n").slice(0, 3).join("\n"))) continue;
      const body = part.split(/^export const /m)[0];
      if (!/requireAdmin\(|requireSuperAdmin\(/.test(body)) {
        ungated.push(`${path.relative(ROOT, f)} :: ${name}`);
      }
    }
  }
  if (ungated.length === 0) ok("every admin server function calls requireAdmin/requireSuperAdmin");
  else fail("admin server function without an authorization gate", ungated.join(", "));
}

/* ------------------------------------------------------- 4. bundle secrets */

if (SCAN_BUNDLE) {
  console.log("\nNo server secrets in the client bundle");
  const pub = path.join(ROOT, ".output/public");
  if (!fs.existsSync(pub)) {
    fail("no build found at .output/public — run `vite build` first");
  } else {
    const assets = walk(pub);
    const envPath = path.join(ROOT, ".env");
    const secrets = [];
    if (fs.existsSync(envPath)) {
      const env = {};
      for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
        const i = line.indexOf("=");
        if (i < 0) continue;
        env[line.slice(0, i).trim()] = line
          .slice(i + 1)
          .trim()
          .replace(/^["']|["']$/g, "");
      }
      /*
       * `VITE_*` values are public by design — the anon key and project URL
       * have to reach the browser. This project also defines un-prefixed
       * duplicates of those same values for server code (`SUPABASE_URL` beside
       * `VITE_SUPABASE_URL`), so a value is only a secret when it is not also
       * published under a VITE_ name. Comparing by value rather than by key is
       * what keeps that from reading as three leaked credentials.
       */
      const publicValues = new Set(
        Object.entries(env)
          .filter(([k]) => k.startsWith("VITE_"))
          .map(([, v]) => v),
      );
      for (const [key, val] of Object.entries(env)) {
        if (key.startsWith("VITE_") || val.length < 12) continue;
        if (publicValues.has(val)) continue;
        secrets.push([key, val]);
      }
    }
    let leaked = [];
    for (const file of assets) {
      let content;
      try {
        content = fs.readFileSync(file, "utf8");
      } catch {
        continue;
      }
      for (const [key, val] of secrets) {
        if (content.includes(val)) leaked.push(`${key} in ${path.relative(ROOT, file)}`);
      }
      if (/\bsupabaseAdmin\b|\bservice_role\b/.test(content)) {
        leaked.push(`service-role reference in ${path.relative(ROOT, file)}`);
      }
    }
    if (leaked.length === 0) ok(`no secret values across ${assets.length} built files`);
    else fail("SECRET LEAKED TO BROWSER", leaked.join(", "));
  }
}

console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures > 0) {
  console.log(`${failures} FAILED`);
  process.exit(1);
}
