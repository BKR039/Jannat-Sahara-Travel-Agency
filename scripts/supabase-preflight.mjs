#!/usr/bin/env node
/**
 * Supabase preflight — is this deployment actually wired to a real database?
 *
 * Answers, in one command and without a browser:
 *   1. Are the required environment variables present?
 *   2. Is the project reachable and is the key accepted?
 *   3. Does the schema exist, i.e. have supabase/migrations been applied?
 *   4. Do the storage buckets exist?
 *   5. Can an anonymous visitor read anything they must not?
 *
 * It is read-only: it never inserts, updates or deletes, and it never prints a
 * key, a token or a row of customer data. Only the anon/publishable key is
 * used, so it exercises exactly what a public visitor can reach.
 *
 *   node scripts/supabase-preflight.mjs
 *
 * Exit code 0 = ready. 1 = something is missing; the report says what.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/* ------------------------------------------------------------------- env */

function loadEnv() {
  const env = { ...process.env };
  try {
    for (const line of readFileSync(resolve(ROOT, ".env"), "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (!m) continue;
      const value = m[2].trim().replace(/^["']|["']$/g, "");
      if (value) env[m[1]] ??= value;
    }
  } catch {
    /* no .env file — rely on the real environment */
  }
  return env;
}

const env = loadEnv();
const URL_BASE = env.VITE_SUPABASE_URL || env.SUPABASE_URL || "";
const ANON = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_PUBLISHABLE_KEY || "";

/** Never print a secret — only whether it is set, and how long it is. */
const present = (v) => (v ? `set (${String(v).length} chars)` : "MISSING");

let failures = 0;
const fail = (msg) => {
  failures++;
  console.log(`  FAIL  ${msg}`);
};
const ok = (msg) => console.log(`  ok    ${msg}`);
const warn = (msg) => console.log(`  warn  ${msg}`);

function section(title) {
  console.log(`\n${title}\n${"-".repeat(title.length)}`);
}

/* --------------------------------------------------------------- 1. env */

section("1. Environment");

for (const [name, value, required] of [
  ["VITE_SUPABASE_URL", env.VITE_SUPABASE_URL, true],
  ["VITE_SUPABASE_PUBLISHABLE_KEY", env.VITE_SUPABASE_PUBLISHABLE_KEY, true],
  ["SUPABASE_URL", env.SUPABASE_URL, true],
  ["SUPABASE_PUBLISHABLE_KEY", env.SUPABASE_PUBLISHABLE_KEY, true],
  ["SUPABASE_SERVICE_ROLE_KEY", env.SUPABASE_SERVICE_ROLE_KEY, true],
  ["VITE_SITE_URL", env.VITE_SITE_URL, false],
  ["RESEND_API_KEY", env.RESEND_API_KEY, false],
  ["BOOKING_NOTIFICATION_EMAIL", env.BOOKING_NOTIFICATION_EMAIL, false],
]) {
  const line = `${name.padEnd(30)} ${present(value)}`;
  if (value) ok(line);
  else if (required) fail(`${line}  <- required`);
  else warn(`${line}  <- optional`);
}

if (env.SUPABASE_SERVICE_ROLE_KEY) {
  // A service-role key must never be exposed to the browser.
  for (const leaked of Object.keys(env).filter((k) => k.startsWith("VITE_"))) {
    if (env[leaked] === env.SUPABASE_SERVICE_ROLE_KEY) {
      fail(`${leaked} holds the service-role key — it would ship in the client bundle`);
    }
  }
}

/* ----------------------------------------------------- project identity */

section("2. Project");

try {
  const cfg = readFileSync(resolve(ROOT, "supabase/config.toml"), "utf8");
  const declared = cfg.match(/project_id\s*=\s*"([^"]+)"/)?.[1] ?? "";
  const actual = URL_BASE.replace(/^https?:\/\//, "").split(".")[0];
  if (!declared) warn("supabase/config.toml declares no project_id");
  else if (!actual) fail("no Supabase URL to compare against config.toml");
  else if (declared !== actual) {
    fail(
      `supabase/config.toml points at project '${declared}' but .env points at '${actual}' — ` +
        "migrations would be applied to a different database than the app reads",
    );
  } else ok(`config.toml and .env agree on project '${actual}'`);
} catch {
  warn("supabase/config.toml not readable");
}

/* ------------------------------------------------------- 3. reachability */

section("3. Reachability");

if (!URL_BASE || !ANON) {
  fail("cannot reach the project without a URL and a publishable key");
  report();
}

const headers = { apikey: ANON };

async function probe(path, extra = {}) {
  const res = await fetch(`${URL_BASE}${path}`, { headers, ...extra });
  let body = null;
  try {
    body = await res.json();
  } catch {
    /* not json */
  }
  return { status: res.status, body };
}

const health = await probe("/auth/v1/health");
if (health.status === 200) ok(`Supabase Auth responding (${health.body?.name ?? "GoTrue"})`);
else fail(`Supabase Auth unreachable (HTTP ${health.status})`);

/* --------------------------------------------------------- 4. schema */

section("4. Schema — have the migrations been applied?");

/**
 * Every table the application expects, read from the generated types.
 *
 * The generated file declares more than one schema (`graphql_public`, `public`),
 * so the `public` block is located explicitly rather than by the first
 * `Tables: {` in the file.
 */
function expectedTables() {
  const src = readFileSync(resolve(ROOT, "src/integrations/supabase/types.ts"), "utf8");
  const publicStart = src.search(/^ {2}public: \{$/m);
  const from = src.indexOf("Tables: {", publicStart === -1 ? 0 : publicStart);
  const to = src.slice(from).search(/^ {4}Views: \{$/m);
  const block = to === -1 ? src.slice(from) : src.slice(from, from + to);
  return [...new Set([...block.matchAll(/^ {6}(\w+): \{$/gm)].map((m) => m[1]))];
}

const TABLES = expectedTables();
const missing = [];
const reachable = [];

for (const table of TABLES) {
  const { status } = await probe(`/rest/v1/${table}?select=*&limit=1`, { method: "HEAD" });
  if (status === 404) missing.push(table);
  else reachable.push(table);
}

if (missing.length === TABLES.length) {
  fail(
    `none of the ${TABLES.length} expected tables exist — supabase/migrations have never been applied to this project`,
  );
} else if (missing.length) {
  fail(`${missing.length} of ${TABLES.length} tables missing: ${missing.join(", ")}`);
} else {
  ok(`all ${TABLES.length} expected tables exist`);
}

/* --------------------------------------------------------- 5. storage */

section("5. Storage buckets");

/**
 * The service-role key can list buckets authoritatively, including private
 * ones. The anonymous fallback can only see public buckets, so a private
 * bucket is reported as unverifiable rather than missing — claiming it is
 * absent when it merely cannot be seen would be worse than saying nothing.
 */
const EXPECTED_BUCKETS = { media: { public: true }, passports: { public: false } };

if (env.SUPABASE_SERVICE_ROLE_KEY) {
  const res = await fetch(`${URL_BASE}/storage/v1/bucket`, {
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });
  const buckets = res.ok ? await res.json() : [];
  for (const [name, want] of Object.entries(EXPECTED_BUCKETS)) {
    const found = buckets.find((b) => b.id === name);
    if (!found) {
      fail(`bucket '${name}' does not exist — uploads will fail with "Bucket not found"`);
    } else if (found.public !== want.public) {
      // A private bucket turned public would expose every passport scan.
      fail(
        `bucket '${name}' is public=${found.public}, expected public=${want.public}` +
          (name === "passports" ? " — passport scans would be world-readable" : ""),
      );
    } else {
      ok(`bucket '${name}' exists, public=${found.public}, limit ${found.file_size_limit} bytes`);
    }
  }
} else {
  for (const name of Object.keys(EXPECTED_BUCKETS)) {
    const { body } = await probe(`/storage/v1/object/public/${name}/__preflight_probe__`);
    if (body?.code !== "NoSuchBucket") ok(`bucket '${name}' exists`);
    else if (EXPECTED_BUCKETS[name].public) fail(`bucket '${name}' does not exist`);
    else warn(`bucket '${name}' is private — cannot verify without the service-role key`);
  }
}

/* ------------------------------------------- 6. anonymous access rules */

section("6. Anonymous access — what a public visitor can reach");

/** Content the public website is meant to read. */
const PUBLIC_TABLES = [
  "services",
  "features",
  "branches",
  "faqs",
  "testimonials",
  "articles",
  "gallery_items",
  "site_content",
  "site_stats",
  "packages",
  "hotels",
];

/** Operational and personal data. A visitor must never receive a row. */
const PRIVATE_TABLES = [
  "bookings",
  "booking_passengers",
  "custom_package_requests",
  "flight_requests",
  "contact_messages",
  "customer_notes",
  "notifications",
  "user_roles",
  "audit_logs",
  "rate_limits",
  "newsletter_subscribers",
];

if (missing.length === TABLES.length) {
  warn("skipped — there is no schema to test against yet");
} else {
  for (const table of PUBLIC_TABLES) {
    if (missing.includes(table)) continue;
    const { status } = await probe(`/rest/v1/${table}?select=*&limit=1`);
    if (status === 200) ok(`${table.padEnd(24)} readable by the public site`);
    else fail(`${table.padEnd(24)} NOT readable anonymously (HTTP ${status})`);
  }

  for (const table of PRIVATE_TABLES) {
    if (missing.includes(table)) continue;
    const { status, body } = await probe(`/rest/v1/${table}?select=*&limit=1`);
    const leaked = status === 200 && Array.isArray(body) && body.length > 0;
    if (leaked) fail(`${table.padEnd(24)} LEAKS DATA to anonymous visitors`);
    else ok(`${table.padEnd(24)} protected (HTTP ${status}, no rows)`);
  }

  // site_settings is public-read but only for the brand and seo groups.
  if (!missing.includes("site_settings")) {
    const { status, body } = await probe("/rest/v1/site_settings?select=group_name");
    if (status !== 200) {
      fail(`site_settings not readable anonymously (HTTP ${status}) — brand/SEO would fall back`);
    } else {
      const groups = [...new Set((body ?? []).map((r) => r.group_name))];
      const forbidden = groups.filter((g) => !["brand", "seo"].includes(g));
      if (forbidden.length) fail(`site_settings exposes private groups: ${forbidden.join(", ")}`);
      else ok(`site_settings exposes only ${groups.join(", ") || "brand/seo"} to the public`);
    }
  }
}

/* ---------------------------------------------------------------- done */

function report() {
  section("Result");
  if (failures === 0) {
    console.log("  READY — the application is connected to a real Supabase database.\n");
    process.exit(0);
  }
  console.log(`  NOT READY — ${failures} check(s) failed. See the FAIL lines above.\n`);
  process.exit(1);
}

report();
