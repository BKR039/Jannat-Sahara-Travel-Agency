import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

function loadEnv() {
  const env = { ...process.env };
  try {
    const content = readFileSync(resolve(ROOT, ".env"), "utf8");
    for (const line of content.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (!m) continue;
      const value = m[2].trim().replace(/^["']|["']$/g, "");
      if (value) env[m[1]] = value;
    }
  } catch (err) {}
  return env;
}

const env = loadEnv();
const URL = env.VITE_SUPABASE_URL || env.SUPABASE_URL || "";
const KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

const supabase = createClient(URL, KEY);

async function runTests() {
  console.log("=== STARTING GALLERY WORKFLOW VERIFICATION ===");
  let passed = 0;
  let failed = 0;

  function assert(condition, name) {
    if (condition) {
      console.log(`  ✓ PASS: ${name}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${name}`);
      failed++;
    }
  }

  const testGroup1 = "عمرة جانفي 2027 (اختبار)";
  const testGroup2 = "عمرة رمضان 2027 (اختبار)";
  const mockImage = "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=1200&q=80";

  // 1. Test inserting 30 images in one batch into a single group with null titles
  console.log("\n1. Testing bulk insert of 30 images into group with null metadata...");
  const batch = Array.from({ length: 30 }).map((_, i) => ({
    image: `${mockImage}&mockIndex=${i}`,
    category: testGroup1,
    active: true,
    sort_order: 0,
    title: null,
    title_fr: null,
    title_en: null,
  }));

  const { data: inserted, error: insertError } = await supabase
    .from("gallery_items")
    .insert(batch)
    .select("id, category, title, active");

  assert(!insertError && inserted?.length === 30, "Insert 30 images in one batch");
  assert(inserted?.every((i) => i.category === testGroup1), "All 30 images assigned to testGroup1");
  assert(inserted?.every((i) => i.title === null), "All 30 images have null title (no forced metadata)");

  const insertedIds = (inserted || []).map((i) => i.id);

  // 2. Test querying images by group
  console.log("\n2. Testing group query filtering...");
  const { data: groupItems, error: queryError } = await supabase
    .from("gallery_items")
    .select("*")
    .eq("category", testGroup1);

  assert(!queryError && (groupItems?.length ?? 0) >= 30, "Query images by category matches count");

  // 3. Test moving a subset (15 images) to another group (bulk move)
  console.log("\n3. Testing bulk move of 15 images to another group...");
  const toMove = insertedIds.slice(0, 15);
  const { error: moveError } = await supabase
    .from("gallery_items")
    .update({ category: testGroup2 })
    .in("id", toMove);

  assert(!moveError, "Bulk update category of 15 images");

  const { data: movedItems } = await supabase
    .from("gallery_items")
    .select("id, category")
    .in("id", toMove);

  assert(movedItems?.every((i) => i.category === testGroup2), "Moved items now belong to testGroup2");

  const { data: remainingItems } = await supabase
    .from("gallery_items")
    .select("id, category")
    .in("id", insertedIds.slice(15));

  assert(remainingItems?.every((i) => i.category === testGroup1), "Remaining items still in testGroup1");

  // 4. Test public gallery query behavior
  console.log("\n4. Testing public gallery query contract...");
  const anonClient = createClient(URL, env.VITE_SUPABASE_PUBLISHABLE_KEY || "");
  const { data: publicItems, error: publicError } = await anonClient
    .from("gallery_items")
    .select("*")
    .eq("active", true)
    .eq("category", testGroup1);

  assert(!publicError && (publicItems?.length ?? 0) >= 15, "Public query succeeds for active group images");
  assert(publicItems?.every((i) => i.title === null), "Public items safely handle null titles");

  // 5. Test bulk delete of test images
  console.log("\n5. Testing bulk delete...");
  const { error: deleteError } = await supabase
    .from("gallery_items")
    .delete()
    .in("id", insertedIds);

  assert(!deleteError, "Bulk delete test items succeeds");

  const { data: checkDeleted } = await supabase
    .from("gallery_items")
    .select("id")
    .in("id", insertedIds);

  assert(checkDeleted?.length === 0, "Database is completely clean; zero test remnants left");

  console.log("\n=== SUMMARY ===");
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  if (failed > 0) process.exit(1);
}

runTests().catch((e) => {
  console.error("Test failed with error:", e);
  process.exit(1);
});
