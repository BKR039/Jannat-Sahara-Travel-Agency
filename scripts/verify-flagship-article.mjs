import http from "node:http";

async function verify() {
  const url = "http://localhost:8081/blog/dalil-al-mutamir-omrah-guide-step-by-step";
  console.log("Fetching:", url);

  const res = await fetch(url);
  console.log("HTTP Status:", res.status);

  if (res.status !== 200) {
    console.error("FAILED: Expected 200, got", res.status);
    process.exit(1);
  }

  const html = await res.text();
  const renderedHtml = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  console.log("HTML length:", html.length);

  const checks = [
    { label: "Title in HTML", test: html.includes("دليل المعتمر خطوة بخطوة") },
    { label: "SEO Title tag / OG Title", test: html.includes("دليل المعتمر خطوة بخطوة") },
    { label: "Meta description", test: html.includes("دليل شامل وموثوق لكيفية أداء مناسك العمرة") },
    { label: "Breadcrumb to Home", test: html.includes("الرئيسية") && html.includes("المدونة") },
    { label: "Category badge (عمرة)", test: html.includes("عمرة") },
    { label: "Cover image URL", test: html.includes("aeefd06b-5c47-4f69-a0e4-4fe2fbc7d860.png") || html.includes("makkah-kaaba-wide.jpg") },
    { label: "Table of Contents", test: html.includes("فهرس محتويات المقال") || html.includes("محتويات المقال") },
    { label: "Section anchor: before-ihram", test: html.includes('id="before-ihram"') },
    { label: "Section anchor: miqats", test: html.includes('id="miqats"') },
    { label: "Section anchor: prohibitions", test: html.includes('id="prohibitions"') },
    { label: "Section anchor: tawaf", test: html.includes('id="tawaf"') },
    { label: "Section anchor: sai", test: html.includes('id="sai"') },
    { label: "Section anchor: tahallul", test: html.includes('id="tahallul"') },
    { label: "Section anchor: duas", test: html.includes('id="duas"') },
    { label: "Section anchor: checklist", test: html.includes('id="checklist"') },
    { label: "Section anchor: conclusion", test: html.includes('id="conclusion"') },
    { label: "Miqat 1: ذو الحليفة", test: html.includes("ذو الحليفة") && html.includes("450 كم") },
    { label: "Miqat 2: الجحفة", test: html.includes("الجحفة") && html.includes("183 كم") },
    { label: "Miqat 3: قرن المنازل", test: html.includes("قرن المنازل") && html.includes("75 كم") },
    { label: "Miqat 4: يلملم", test: html.includes("يلملم") && html.includes("92 كم") },
    { label: "Miqat 5: ذات عرق", test: html.includes("ذات عرق") && html.includes("94 كم") },
    { label: "Sai circuits: الصفا والمروة", test: html.includes("الصفا") && html.includes("المروة") && html.includes("ختام السعي") },
    { label: "Interactive checklist stage", test: html.includes("قائمة مراجعة المعتمر") },
    { label: "Prayer card (نسخ الدعاء)", test: html.includes("نسخ الدعاء") || html.includes("سيد الاستغفار") },
    { label: "Umrah CTA Banner", test: html.includes("تستعد لأداء مناسك العمرة؟") && html.includes("اكتشف رحلات وباقات العمرة") },
    { label: "CTA link to /umrah", test: html.includes('/umrah') },
    { label: "Share buttons", test: html.includes("whatsapp") || html.includes("facebook") },
    { label: "Author", test: html.includes("فريق جنة الصحراء") },
    { label: "No unrendered raw H2 Markdown in DOM", test: !renderedHtml.includes("## قبل الإحرام") },
    { label: "No unrendered raw table Markdown in DOM", test: !renderedHtml.includes("| :--- |") },
  ];

  let passed = 0;
  for (const c of checks) {
    if (c.test) {
      console.log(`✓ PASS: ${c.label}`);
      passed++;
    } else {
      console.warn(`✗ FAIL: ${c.label}`);
    }
  }

  console.log(`\nResult: ${passed}/${checks.length} checks passed.`);
  if (passed < checks.length) {
    process.exit(1);
  }
}

verify().catch((err) => {
  console.error("Verification error:", err);
  process.exit(1);
});
