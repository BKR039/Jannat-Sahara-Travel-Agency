async function check() {
  const url = "http://localhost:8081/blog/dalil-al-mutamir-omrah-guide-step-by-step";
  const res = await fetch(url);
  const html = await res.text();

  const canonicalMatch = html.match(/<link[^>]+rel=["']canonical["'][^>]*>/i);
  const ogUrlMatch = html.match(/<meta[^>]+property=["']og:url["'][^>]*>/i);
  const ldJsonMatch = html.match(/"mainEntityOfPage":"([^"]+)"/i);

  console.log("CANONICAL TAG:", canonicalMatch ? canonicalMatch[0] : "NOT FOUND");
  console.log("OG:URL TAG:", ogUrlMatch ? ogUrlMatch[0] : "NOT FOUND");
  console.log("JSON-LD mainEntityOfPage:", ldJsonMatch ? ldJsonMatch[1] : "NOT FOUND");

  const expectedCanonical = 'href="https://janatsahara.vercel.app/blog/dalil-al-mutamir-omrah-guide-step-by-step"';
  const expectedOgUrl = 'content="https://janatsahara.vercel.app/blog/dalil-al-mutamir-omrah-guide-step-by-step"';
  const expectedLdJson = "https://janatsahara.vercel.app/blog/dalil-al-mutamir-omrah-guide-step-by-step";

  let ok = true;
  if (!canonicalMatch || !canonicalMatch[0].includes(expectedCanonical)) {
    console.error("FAIL: Canonical tag does not match expected:", expectedCanonical);
    ok = false;
  } else {
    console.log("✓ PASS: Canonical tag has exact production domain!");
  }

  if (!ogUrlMatch || !ogUrlMatch[0].includes(expectedOgUrl)) {
    console.error("FAIL: OG:URL tag does not match expected:", expectedOgUrl);
    ok = false;
  } else {
    console.log("✓ PASS: OG:URL tag has exact production domain!");
  }

  if (!ldJsonMatch || ldJsonMatch[1] !== expectedLdJson) {
    console.error("FAIL: JSON-LD mainEntityOfPage does not match expected:", expectedLdJson);
    ok = false;
  } else {
    console.log("✓ PASS: JSON-LD mainEntityOfPage has exact production domain!");
  }

  if (!ok) process.exit(1);
}

check().catch(e => {
  console.error(e);
  process.exit(1);
});
