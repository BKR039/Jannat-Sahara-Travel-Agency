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
const KEY = env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(URL, KEY);

async function list() {
  const { data, error } = await supabase.from("articles").select("id, title, slug, published, published_at, tags");
  if (error) {
    console.error(error);
    return;
  }
  console.log("Count:", data.length);
  for (const a of data) {
    console.log(`- [${a.slug}] "${a.title}" (published: ${a.published})`);
  }
}
list();
