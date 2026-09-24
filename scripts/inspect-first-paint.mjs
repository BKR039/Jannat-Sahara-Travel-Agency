const res = await fetch("http://localhost:8081/");
const html = await res.text();

console.log("=== SSR HTML INSPECTION ===");
console.log("Status:", res.status);
console.log("Total bytes:", html.length);

// 1. Check Header
const hasHeader = html.includes("<header");
console.log("Contains <header>:", hasHeader);

// 2. Check Hero Section
const hasHeroSection = html.includes("data-section=\"hero\"");
console.log("Contains data-section='hero':", hasHeroSection);

// 3. Check Hero Image and Preload
const hasHeroImg = html.includes("<img") && html.includes("home.hero.imageAlt");
console.log("Contains Hero <img> tag:", hasHeroImg);

// Check if image tag has src
const imgMatches = [...html.matchAll(/<img\b[^>]+>/g)].map(m => m[0]);
console.log("Total <img> tags in SSR HTML:", imgMatches.length);
imgMatches.forEach((img, i) => {
  console.log(`Image ${i + 1}:`, img.slice(0, 150));
});

// 4. Check Hero Headline and Content
const hasH1 = html.includes("<h1");
console.log("Contains <h1> tag:", hasH1);
if (hasH1) {
  const h1Match = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/);
  console.log("H1 content:", h1Match ? h1Match[1].trim() : "none");
}

// 5. Check Umrah Programmes section
const hasProgrammes = html.includes('id="programmes"');
console.log("Contains #programmes section:", hasProgrammes);

// 6. Check Skeletons / Placeholders in SSR HTML
const pulseMatches = [...html.matchAll(/<div\b[^>]*animate-pulse[^>]*>/g)].map(m => m[0]);
console.log("Total animate-pulse elements in SSR HTML:", pulseMatches.length);
pulseMatches.forEach((p, i) => {
  console.log(`Pulse ${i + 1}:`, p);
});

// 7. Check if LazySections rendered skeletons or content
console.log("Contains 'services' data-section:", html.includes('data-section="services"'));
console.log("Contains 'features' data-section:", html.includes('data-section="features"'));
console.log("Contains 'gallery' data-section:", html.includes('data-section="gallery"'));

// 8. Inspect the exact DOM hierarchy right inside <main>
const mainMatch = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/);
if (mainMatch) {
  console.log("Length of <main> innerHTML:", mainMatch[1].length);
  // Show first 1500 chars of main
  console.log("\n--- First 1500 chars of <main> ---");
  console.log(mainMatch[1].slice(0, 1500));
}
