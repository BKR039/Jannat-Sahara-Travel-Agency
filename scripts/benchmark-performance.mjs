import { performance } from "node:perf_hooks";

const ROUTES = [
  { path: "/", label: "Homepage" },
  { path: "/about", label: "About" },
  { path: "/umrah", label: "Umrah Programmes" },
  { path: "/umrah/builder", label: "Umrah Builder" },
  { path: "/trips", label: "Trips / Tours" },
  { path: "/blog", label: "Blog Listing" },
  { path: "/blog/dalil-al-mutamir-omrah-guide-step-by-step", label: "Flagship Blog Article" },
  { path: "/contact", label: "Contact / Branches" },
  { path: "/gallery", label: "Gallery" },
  { path: "/admin", label: "Admin Root" },
];

const BASE_URL = "http://localhost:8081";

async function measureRoute(path, runs = 3) {
  const times = [];
  let size = 0;
  let status = 0;

  for (let i = 0; i < runs; i++) {
    const start = performance.now();
    try {
      const res = await fetch(`${BASE_URL}${path}`, {
        headers: { "Accept": "text/html" },
      });
      const text = await res.text();
      const duration = performance.now() - start;
      times.push(duration);
      size = text.length;
      status = res.status;
    } catch (err) {
      times.push(-1);
    }
  }

  // Calculate median time
  const validTimes = times.filter((t) => t > 0).sort((a, b) => a - b);
  const medianTime = validTimes.length ? validTimes[Math.floor(validTimes.length / 2)] : -1;

  return {
    path,
    status,
    medianMs: Math.round(medianTime),
    sizeKb: (size / 1024).toFixed(1),
  };
}

async function run() {
  console.log("==================================================");
  console.log("PERFORMANCE BENCHMARK — JANNAT SAHARA LOCAL SSR");
  console.log("==================================================\n");

  console.log("| Route | Status | Median TTFB (ms) | HTML Size (KB) |");
  console.log("| :--- | :--- | :--- | :--- |");

  for (const r of ROUTES) {
    const result = await measureRoute(r.path, 3);
    console.log(
      `| \`${result.path}\` (${r.label}) | ${result.status} | ${result.medianMs} ms | ${result.sizeKb} KB |`
    );
  }
}

run();
