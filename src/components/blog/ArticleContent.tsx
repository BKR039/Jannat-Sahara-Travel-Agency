import React from "react";
import { MiqatGrid } from "./editorial/MiqatGrid";
import { SaiTimeline } from "./editorial/SaiTimeline";
import { InteractiveChecklist } from "./editorial/InteractiveChecklist";
import { CalloutBox } from "./editorial/CalloutBox";
import { PrayerCard } from "./editorial/PrayerCard";
import { slugifyHeading } from "./editorial/TableOfContents";

interface ArticleContentProps {
  content: string;
  className?: string;
}

/**
 * Helper to render inline markdown elements:
 * - **bold text**
 * - Quranic verses: { ... }
 * - Hadith / quotes: « ... »
 */
export function renderInline(text: string): React.ReactNode {
  // Regex to split on bold, verses, or quotes
  const parts = text.split(/(\*\*.*?\*\*|\{.*?\}|«.*?»)/g);

  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-bold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("{") && part.endsWith("}")) {
      return (
        <span
          key={i}
          className="inline-block rounded-md bg-primary/[0.07] px-1.5 py-0.5 font-bold text-primary dark:bg-primary/[0.12]"
        >
          {part}
        </span>
      );
    }
    if (part.startsWith("«") && part.endsWith("»")) {
      return (
        <span key={i} className="font-bold text-foreground">
          {part}
        </span>
      );
    }
    return part;
  });
}

export function ArticleContent({ content, className = "" }: ArticleContentProps) {
  if (!content) return null;

  // Split into raw blocks by 2 or more linebreaks
  const rawBlocks = content
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);

  let h2Count = 0;

  return (
    <div
      className={`space-y-7 text-[1.125rem] md:text-[1.1875rem] leading-[2.0] md:leading-[2.1] text-foreground/90 font-normal ${className}`}
    >
      {rawBlocks.map((block, index) => {
        // --- 1. Headings: H2 ---
        if (block.startsWith("## ")) {
          h2Count++;
          const headingText = block.replace(/^##\s+/, "").trim();
          const anchorId = slugifyHeading(headingText);
          const badgeNum = h2Count < 10 ? `0${h2Count}` : h2Count;

          return (
            <div key={index} id={anchorId} className="group scroll-mt-28 pt-8 pb-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-caption font-bold text-primary">
                  {badgeNum}
                </span>
                <span className="h-px flex-1 bg-border-subtle" aria-hidden />
              </div>
              <h2 className="text-[clamp(1.5rem,1.3rem+1vw,2.15rem)] font-extrabold text-foreground leading-[1.35] tracking-normal">
                {headingText}
              </h2>
            </div>
          );
        }

        // --- 2. Headings: H3 ---
        if (block.startsWith("### ")) {
          const headingText = block.replace(/^###\s+/, "").trim();

          // Special treatment for "أخطاء شائعة"
          if (headingText.includes("أخطاء شائعة")) {
            return (
              <div key={index} className="pt-6 pb-1">
                <h3 className="text-h4 font-bold text-amber-600 dark:text-amber-400 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  {headingText}
                </h3>
              </div>
            );
          }

          return (
            <h3
              key={index}
              className="mt-6 mb-2 text-h4 font-bold text-foreground leading-snug tracking-normal pt-2"
            >
              {headingText}
            </h3>
          );
        }

        // --- 3. Markdown Tables (Checklist or generic table) ---
        if (block.startsWith("|") && block.includes("\n|")) {
          // Check if this is the Umrah checklist table
          if (block.includes("المرحلة") && block.includes("الخطوات الأساسية")) {
            return <InteractiveChecklist key={index} />;
          }

          // Generic Markdown table parser
          const lines = block.split("\n").filter((l) => l.trim().startsWith("|"));
          if (lines.length >= 2) {
            const headerCells = lines[0]
              .split("|")
              .map((c) => c.trim())
              .filter(Boolean);
            const bodyLines = lines.slice(2); // skip separator row

            return (
              <div
                key={index}
                className="my-6 overflow-x-auto rounded-card border border-border-subtle shadow-xs"
              >
                <table className="w-full text-start border-collapse">
                  <thead>
                    <tr className="bg-surface-raised border-b border-border-subtle">
                      {headerCells.map((h, hIdx) => (
                        <th
                          key={hIdx}
                          className="px-4 py-3 text-start text-small font-bold text-foreground"
                        >
                          {renderInline(h)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {bodyLines.map((row, rIdx) => {
                      const cells = row
                        .split("|")
                        .map((c) => c.trim())
                        .filter(Boolean);
                      return (
                        <tr key={rIdx} className="hover:bg-muted/30 transition-colors">
                          {cells.map((cell, cIdx) => (
                            <td
                              key={cIdx}
                              className="px-4 py-3.5 text-small leading-relaxed text-foreground/90 align-top"
                            >
                              {renderInline(cell)}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          }
        }

        // --- 4. Miqat Section Detection ---
        if (block.includes("ذو الحليفة") && block.includes("الجحفة") && block.includes("يلملم")) {
          return <MiqatGrid key={index} />;
        }

        // --- 5. Sa'i Circuits Detection ---
        if (block.includes("الشوط 1:") && block.includes("الشوط 7:")) {
          return <SaiTimeline key={index} />;
        }

        // --- 6. Supplications ("أدعية مختارة") Pattern ---
        // Pattern: * **دعاء...:** \n > «...»
        if (block.startsWith("* **دعاء") || block.startsWith("* **سيد الاستغفار")) {
          const lines = block
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean);
          const titleLine = lines[0] || "";
          const titleClean = titleLine.replace(/^[*-\s]+|\*+|:+$/g, "").trim();
          const prayerLines = lines.slice(1).join(" ").replace(/^>\s*/, "").trim();

          if (prayerLines) {
            return <PrayerCard key={index} title={titleClean} prayer={prayerLines} />;
          }
        }

        // --- 7. Blockquote / Spiritual Quote ---
        if (block.startsWith(">")) {
          const quoteLines = block
            .split("\n")
            .map((line) => line.replace(/^>\s*/, "").trim())
            .join(" ");

          const isTalbiyah = quoteLines.includes("لَبَّيْكَ");

          return (
            <div
              key={index}
              className={`my-8 relative rounded-2xl border p-6 md:p-8 text-center transition-all ${
                isTalbiyah
                  ? "border-primary/40 bg-gradient-to-br from-primary/[0.08] to-amber-500/[0.04] shadow-xs"
                  : "border-border-subtle bg-surface-raised/70 shadow-xs"
              }`}
            >
              <blockquote className="text-[1.25rem] md:text-[1.4rem] font-bold leading-[2.1] text-foreground font-serif select-text">
                {quoteLines}
              </blockquote>
            </div>
          );
        }

        // --- 8. Callouts (تنبيه, نصيحة, معلومة مهمة, أخطاء شائعة) ---
        const calloutMatch = block.match(
          /^(نصيحة|معلومة مهمة|تنبيه|أخطاء شائعة|Conseil|Note|Tip|Important)\s*:\s*(.*)/is,
        );
        if (calloutMatch) {
          const label = calloutMatch[1];
          const rest = calloutMatch[2];
          const variant = label.includes("تنبيه") || label.includes("أخطاء") ? "caution" : "info";
          return (
            <CalloutBox key={index} title={label} variant={variant}>
              <p>{renderInline(rest)}</p>
            </CalloutBox>
          );
        }

        // --- 9. Numbered Step Cards (e.g. 1. **عنوان:** شرح) ---
        const lines = block
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean);

        const isNumberedStepList =
          lines.length >= 2 && lines.every((l) => /^\d+\.\s+\*\*.*?\*\*/.test(l));

        if (isNumberedStepList) {
          return (
            <div key={index} className="my-6 space-y-3.5">
              {lines.map((line, liIdx) => {
                const match = line.match(/^(\d+)\.\s+\*\*(.*?)\*\*[:\s]*(.*)$/);
                if (match) {
                  const num = match[1];
                  const stepTitle = match[2];
                  const stepDesc = match[3];
                  return (
                    <div
                      key={liIdx}
                      className="group flex items-start gap-4 rounded-card border border-border-subtle bg-card p-4 md:p-5 shadow-xs transition-all duration-base hover:border-primary/40 hover:-translate-y-0.5"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-small font-bold text-primary">
                        {parseInt(num, 10) < 10 ? `0${num}` : num}
                      </span>
                      <div className="flex-1 space-y-1">
                        <h4 className="text-body font-bold text-foreground transition-colors group-hover:text-primary">
                          {stepTitle}
                        </h4>
                        {stepDesc && (
                          <p className="text-small leading-relaxed text-muted-foreground">
                            {renderInline(stepDesc)}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                }
                return (
                  <p key={liIdx} className="text-small leading-relaxed">
                    {renderInline(line)}
                  </p>
                );
              })}
            </div>
          );
        }

        // Standard Numbered lists
        const isStandardNumList = lines.length > 1 && lines.every((l) => /^\d+\.\s+/.test(l));
        if (isStandardNumList) {
          return (
            <ol
              key={index}
              className="my-6 list-decimal ps-6 space-y-2.5 text-foreground/90 marker:font-bold marker:text-primary"
            >
              {lines.map((line, liIdx) => (
                <li key={liIdx} className="leading-relaxed">
                  {renderInline(line.replace(/^\d+\.\s+/, ""))}
                </li>
              ))}
            </ol>
          );
        }

        // --- 10. Bulleted Lists ---
        const isBulletList = lines.length > 1 && lines.every((l) => /^[-*]\s+/.test(l));
        if (isBulletList) {
          // Check if bullet items have strong titles (e.g. * **Title:** description)
          const hasTitles = lines.every((l) => /^[-*]\s+\*\*.*?\*\*/.test(l));
          if (hasTitles) {
            return (
              <div key={index} className="my-6 space-y-3">
                {lines.map((line, liIdx) => {
                  const clean = line.replace(/^[-*]\s+/, "");
                  return (
                    <div
                      key={liIdx}
                      className="flex items-start gap-3 rounded-xl border border-border-subtle/80 bg-surface-raised/40 p-3.5 md:p-4 transition-colors hover:bg-surface-raised/80"
                    >
                      <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />
                      <div className="flex-1 text-small md:text-body leading-relaxed">
                        {renderInline(clean)}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          }

          return (
            <ul key={index} className="my-6 space-y-2.5 ps-5 text-foreground/90">
              {lines.map((line, liIdx) => (
                <li key={liIdx} className="relative flex items-start gap-2.5 leading-relaxed">
                  <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
                  <span>{renderInline(line.replace(/^[-*]\s+/, ""))}</span>
                </li>
              ))}
            </ul>
          );
        }

        // --- 11. Standard Paragraph ---
        return (
          <p key={index} className="leading-[2.0] md:leading-[2.1] text-foreground/90 break-words">
            {renderInline(block)}
          </p>
        );
      })}
    </div>
  );
}
