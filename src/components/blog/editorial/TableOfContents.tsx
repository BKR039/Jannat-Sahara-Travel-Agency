import React, { useState, useEffect } from "react";
import { ListFilter, ChevronDown, ChevronUp } from "lucide-react";

export interface TocItem {
  id: string;
  title: string;
  level?: number;
}

export const ARTICLE_TOC_ITEMS: TocItem[] = [
  { id: "intro", title: "مقدمة" },
  { id: "before-ihram", title: "قبل الإحرام" },
  { id: "miqats", title: "المواقيت" },
  { id: "ihram-talbiyah", title: "الإحرام والتلبية" },
  { id: "prohibitions", title: "محظورات الإحرام" },
  { id: "permissible", title: "ما يجوز للمحرم" },
  { id: "arrival-makkah", title: "الوصول إلى مكة والمسجد الحرام" },
  { id: "tawaf", title: "طواف العمرة" },
  { id: "after-tawaf", title: "ماذا بعد الطواف؟" },
  { id: "sai", title: "السعي بين الصفا والمروة" },
  { id: "tahallul", title: "آخر أعمال العمرة والتحلل" },
  { id: "duas", title: "أدعية مختارة" },
  { id: "checklist", title: "قائمة مراجعة المعتمر" },
  { id: "conclusion", title: "خاتمة" },
];

export function slugifyHeading(title: string): string {
  const clean = title.trim();
  const known: Record<string, string> = {
    مقدمة: "intro",
    "قبل الإحرام": "before-ihram",
    المواقيت: "miqats",
    "الإحرام والتلبية": "ihram-talbiyah",
    "محظورات الإحرام": "prohibitions",
    "ما يجوز للمحرم": "permissible",
    "الوصول إلى مكة والمسجد الحرام": "arrival-makkah",
    "طواف العمرة": "tawaf",
    "ماذا بعد الطواف؟": "after-tawaf",
    "السعي بين الصفا والمروة": "sai",
    "آخر أعمال العمرة والتحلل": "tahallul",
    "أدعية مختارة": "duas",
    "قائمة مراجعة المعتمر": "checklist",
    خاتمة: "conclusion",
  };
  if (known[clean]) return known[clean];
  return (
    clean
      .toLowerCase()
      .replace(/[^\u0600-\u06FF\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 40) || "section"
  );
}

export function TableOfContents({
  items = ARTICLE_TOC_ITEMS,
  variant = "inline",
  className = "",
}: {
  items?: TocItem[];
  variant?: "inline" | "sticky";
  className?: string;
}) {
  const [activeId, setActiveId] = useState<string>("");
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      {
        rootMargin: "-80px 0% -60% 0%",
        threshold: 0.1,
      },
    );

    items.forEach((item) => {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [items]);

  const scrollTo = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    const target = document.getElementById(id);
    if (target) {
      const offset = 90;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = target.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
      setActiveId(id);
    }
  };

  // Sticky Desktop Rail
  if (variant === "sticky") {
    return (
      <nav
        aria-label="محتويات المقال"
        className={`sticky top-28 max-h-[calc(100vh-140px)] overflow-y-auto p-4 rounded-2xl border border-border-subtle bg-card/90 backdrop-blur shadow-xs ${className}`}
      >
        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-border-subtle/80 text-primary font-bold text-small">
          <ListFilter className="h-4 w-4" aria-hidden />
          <span>محتويات المقال</span>
        </div>

        <ul className="space-y-1 text-[0.875rem]">
          {items.map((item, idx) => {
            const isActive = activeId === item.id;
            return (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  onClick={(e) => scrollTo(item.id, e)}
                  className={`group flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-all ${
                    isActive
                      ? "bg-primary/10 text-primary font-bold"
                      : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                  }`}
                >
                  <span
                    className={`text-[0.7rem] font-mono transition-colors ${
                      isActive ? "text-primary" : "text-muted-foreground/60"
                    }`}
                  >
                    {idx < 9 ? `0${idx + 1}` : idx + 1}
                  </span>
                  <span className="line-clamp-1">{item.title}</span>
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    );
  }

  // Inline Collapsible Card
  return (
    <nav
      aria-label="فهرس المقال"
      className={`my-8 overflow-hidden rounded-card border border-border-subtle bg-surface-raised/60 shadow-xs ${className}`}
    >
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between p-4 md:p-5 text-start transition-colors hover:bg-muted/30"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-2.5 text-primary font-bold text-body">
          <ListFilter className="h-5 w-5" aria-hidden />
          <span>فهرس محتويات المقال</span>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-caption text-primary">
            {items.length} أقسام
          </span>
        </div>
        <span className="text-muted-foreground">
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </button>

      {isExpanded && (
        <div className="border-t border-border-subtle/70 p-4 md:p-5 bg-card/60">
          <div className="grid gap-2 sm:grid-cols-2">
            {items.map((item, idx) => {
              const isActive = activeId === item.id;
              return (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  onClick={(e) => scrollTo(item.id, e)}
                  className={`flex items-center gap-2.5 rounded-lg p-2 text-small transition-colors ${
                    isActive
                      ? "bg-primary/10 text-primary font-bold"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-muted text-[0.7rem] font-bold text-muted-foreground">
                    {idx < 9 ? `0${idx + 1}` : idx + 1}
                  </span>
                  <span className="line-clamp-1">{item.title}</span>
                </a>
              );
            })}
          </div>
        </div>
      )}
    </nav>
  );
}
