/**
 * JANNAT SAHRA — UI DRIFT DETECTOR
 *
 * A guard against the slow return of the inconsistencies this pass removed.
 * It reads the source rather than the rendered page, so it is cheap enough to
 * run on every change.
 *
 * The one thing it does that a plain grep cannot: it resolves which JSX
 * element an attribute actually belongs to. `type="number"` means a browser
 * spinner on `<Input>` and means nothing of the sort on `<TextField>`, which
 * routes the value to the canonical NumberInput — so counting the string finds
 * twenty-one problems where two exist. Every check here walks back to the
 * owning tag before deciding.
 *
 *   node scripts/check-ui-drift.mjs
 *
 * Exit code 1 when any check fails.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const SRC = path.join(ROOT, "src");

/* Primitives are allowed to contain the native elements they wrap — that is
   what makes them the canonical component. Dead vendored samples are excluded
   from drift, not from deletion. */
const EXEMPT = [
  path.join("src", "components", "ui") + path.sep,
  path.join("src", "components", "watermelon") + path.sep,
];

/**
 * Source with comments blanked out, length preserved so line numbers hold.
 *
 * Without this the detector flags its own documentation: `DateField.tsx` says
 * in a comment that it replaces `<input type="date">`, and a plain scan reads
 * that sentence as the very thing the file exists to remove.
 */
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/(^|[^:"'`\\])\/\/[^\n]*/g, (m, p) => p + " ".repeat(m.length - p.length));
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(tsx|ts)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const files = walk(SRC).filter((f) => {
  const rel = path.relative(ROOT, f);
  return !EXEMPT.some((e) => rel.startsWith(e));
});

/** The JSX element an attribute at `index` belongs to, e.g. "Input". */
function owningTag(source, index) {
  const open = source.lastIndexOf("<", index);
  if (open === -1) return null;
  const m = /^<\s*([A-Za-z][\w.]*)/.exec(source.slice(open, index));
  return m ? m[1] : null;
}

const failures = [];
const summary = [];

function check(name, hits, hint) {
  summary.push({ name, count: hits.length });
  if (hits.length) {
    failures.push({ name, hits, hint });
  }
}

/* ------------------------------------------------- native form controls */

const nativeSelects = [];
const nativeDates = [];
const nativeTimes = [];
const nativeNumbers = [];

for (const file of files) {
  const src = stripComments(fs.readFileSync(file, "utf8"));
  const rel = path.relative(ROOT, file);

  for (const m of src.matchAll(/<select[\s>]/g)) {
    nativeSelects.push(`${rel}:${lineOf(src, m.index)}`);
  }
  for (const m of src.matchAll(/type="(date|time|number)"/g)) {
    const tag = owningTag(src, m.index);
    // Only a lowercase tag is a real DOM element; a capitalised one is a
    // component prop, and the component decides what to render.
    if (!tag || tag[0] === tag[0].toUpperCase()) continue;
    const where = `${rel}:${lineOf(src, m.index)} (<${tag}>)`;
    if (m[1] === "date") nativeDates.push(where);
    else if (m[1] === "time") nativeTimes.push(where);
    else nativeNumbers.push(where);
  }
}

function lineOf(src, index) {
  return src.slice(0, index).split("\n").length;
}

check("native <select>", nativeSelects, "Use @/components/ui/select");
check('native type="date"', nativeDates, "Use @/components/ui/date-picker");
check('native type="time"', nativeTimes, "Use @/components/ui/time-picker");
check('native type="number"', nativeNumbers, "Use @/components/ui/number-input");

/* --------------------------------------------- realistic personal data */

/*
 * Placeholders that read like a real person or a real line.
 *
 * Masked forms (+216 98 000 000) are fine and common in this codebase, so the
 * rule is not "digits in a placeholder" but "digits that look dialable": three
 * or more distinct non-zero digits in the subscriber part.
 */
const personal = [];
const NAME_WORDS =
  /(أحمد|محمد|علي\s|منير|فاطمة|ahmed|mohamed|mohammed|jean dupont|john doe|jane doe)/i;

for (const file of files) {
  const src = fs.readFileSync(file, "utf8");
  const rel = path.relative(ROOT, file);
  for (const m of src.matchAll(/placeholder=(?:"([^"]*)"|\{`([^`]*)`\})/g)) {
    const text = m[1] ?? m[2] ?? "";
    if (NAME_WORDS.test(text)) {
      personal.push(`${rel}:${lineOf(src, m.index)} — name-like: ${text}`);
      continue;
    }
    if (/@(example|gmail|hotmail|yahoo|outlook)\./i.test(text)) {
      personal.push(`${rel}:${lineOf(src, m.index)} — email-like: ${text}`);
      continue;
    }
    /*
     * Only the subscriber part decides. "+216 98 000 000" is a mask and is
     * fine; "+216 71 234 567" reads like somebody's line. Stripping the
     * country code first is what separates them, and a string carrying a
     * clock time is a range rather than a number.
     */
    if (/\d:\d/.test(text)) continue;
    // A decimal is a coordinate or a price, not a number somebody dials.
    if (/\d\.\d/.test(text)) continue;
    const subscriber = text.replace(/[^\d]/g, "").replace(/^216/, "");
    if (subscriber.length >= 6) {
      const distinctNonZero = new Set(subscriber.replace(/0/g, "")).size;
      if (distinctNonZero >= 4) {
        personal.push(`${rel}:${lineOf(src, m.index)} — phone-like: ${text}`);
      }
    }
  }
}

check(
  "realistic personal placeholders",
  personal,
  "Use a semantic label, or mask the digits (+216 98 000 000)",
);

/* ------------------------------------------------------ visual drift */

const hexColours = [];
const foreignIcons = [];

/*
 * Two places a hex literal is correct rather than drift:
 *   - HTML e-mail, where no client resolves a CSS custom property, so the
 *     brand colour has to be written out;
 *   - the brand colour picker itself, whose values ARE hex by definition.
 */
const HEX_EXEMPT = /(-email\.server\.ts|email-template|error-page\.ts|BrandSection\.tsx)$/;

/*
 * Only hex used as a STYLE is drift.
 *
 * A hex literal is also legitimate *data*: the fallback and placeholder of the
 * brand colour picker are hex because a colour picker's value is hex. Matching
 * on the style positions — a Tailwind arbitrary value, an inline style, or an
 * SVG paint attribute — separates "someone picked a colour outside the system"
 * from "this field holds a colour".
 */
const HEX_IN_STYLE =
  /(?:className="[^"]*\[#[0-9a-fA-F]{6}\]|style=\{\{[^}]*#[0-9a-fA-F]{6}|(?:fill|stroke|stopColor|backgroundColor|color)=["{][^"}]*#[0-9a-fA-F]{6})/g;

for (const file of files) {
  const src = stripComments(fs.readFileSync(file, "utf8"));
  const rel = path.relative(ROOT, file);
  if (!HEX_EXEMPT.test(rel)) {
    for (const m of src.matchAll(HEX_IN_STYLE)) {
      const hex = /#[0-9a-fA-F]{6}/.exec(m[0])[0];
      hexColours.push(`${rel}:${lineOf(src, m.index)} — ${hex}`);
    }
  }
  for (const m of src.matchAll(/from "(react-icons|@heroicons|@tabler\/icons|@mui)[^"]*"/g)) {
    foreignIcons.push(`${rel}:${lineOf(src, m.index)} — ${m[1]}`);
  }
}

check("hard-coded hex colours", hexColours, "Use a design token from styles.css");
check("non-lucide icon imports", foreignIcons, "The icon family is lucide-react");

/* --------------------------------------------------- button geometry */

/*
 * The drift this file originally missed.
 *
 * Counting implementations said buttons were unified — one `Button`, 90
 * consumers — while the rendered pages disagreed: the Sales Center header and
 * the Control Center header used the same component at the same `size="sm"`
 * and came out 40px/28px-radius versus 36px/10px, a pill beside a rectangle.
 * The difference lived entirely in `className`.
 *
 * So the rule is about ownership: a `size` variant owns height, radius,
 * padding, gap, type and icon size; `className` positions the button in its
 * layout. Radius is checked hardest because it is the loudest — `rounded-xl`
 * resolves to 28px, which on a 36-40px control is a pill.
 */
const RADIUS_ALLOWED = new Set([
  // Circular by design: navbar icon toggles are chips, not action buttons.
  "src/components/common/LanguageSwitcher.tsx",
  "src/components/common/ThemeToggle.tsx",
  "src/components/admin/sales/LeadWorkspaceDrawer.tsx",
]);

const GEOMETRY_TOKENS = [
  /\bh-\d+(\.\d+)?\b/,
  /\bmin-h-\[?[\w.%-]+\]?/,
  /\bpx-\d+(\.\d+)?\b/,
  /\bpy-\d+(\.\d+)?\b/,
  /\bgap-\d+(\.\d+)?\b/,
  /\bshadow-[a-z0-9-]+/,
  /\bbg-(?!transparent\b)[a-z0-9/[\]().-]+/,
  /\bborder-[a-z0-9/[\]().-]+/,
  /\bfont-(bold|semibold|medium|black|extrabold)\b/,
  /\btext-(small|caption|button|body)\b/,
  /\b(from|to|via)-[a-z0-9/[\]().-]+/,
];

const buttonRadius = [];
const buttonGeometry = [];

for (const file of files) {
  const src = stripComments(fs.readFileSync(file, "utf8"));
  const rel = path.relative(ROOT, file).split(path.sep).join("/");
  if (rel.startsWith("src/components/ui/")) continue;

  for (const m of src.matchAll(/<Button\b[\s\S]{0,600}?>/g)) {
    const cm = /className=(?:"([^"]*)"|\{cn\(([\s\S]*?)\)\}|\{`([^`]*)`\})/.exec(m[0]);
    if (!cm) continue;
    const cls = (cm[1] ?? cm[2] ?? cm[3] ?? "").replace(/\s+/g, " ");
    const line = lineOf(src, m.index);

    for (const r of cls.matchAll(/\brounded-[a-z0-9[\]()-]+/g)) {
      if (r[0] === "rounded-full" && RADIUS_ALLOWED.has(rel)) continue;
      buttonRadius.push(`${rel}:${line} — ${r[0]} (the size variant owns radius)`);
    }
    const tokenMatch = GEOMETRY_TOKENS.find((re) => re.test(cls));
    if (tokenMatch) {
      buttonGeometry.push(`${rel}:${line} — ${tokenMatch} in "${cls}"`);
    }
  }
}

check(
  "button radius overrides",
  buttonRadius,
  "Pick a size variant; do not set rounded-* on Button",
);

check(
  "button geometry overrides",
  buttonGeometry,
  "Pick a size variant; do not set height, padding, gap, font or fill on Button",
);

/* ------------------------------------------------------------ report */

console.log("\nJANNAT SAHRA — UI DRIFT\n" + "=".repeat(48));
for (const s of summary) {
  console.log(
    `${s.count === 0 ? "PASS" : "FAIL"}  ${s.name.padEnd(34)} ${s.count}`,
  );
}

if (failures.length) {
  console.log("");
  for (const f of failures) {
    console.log(`\n${f.name} — ${f.hint}`);
    for (const h of f.hits.slice(0, 25)) console.log(`   ${h}`);
    if (f.hits.length > 25) console.log(`   … and ${f.hits.length - 25} more`);
  }
  console.log(`\n${failures.length} check(s) failed.\n`);
  process.exit(1);
}

console.log(`\nAll ${summary.length} checks passed.\n`);
