import React, { useState } from "react";
import { Copy, Check, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface PrayerCardProps {
  title: string;
  prayer: string;
}

export function PrayerCard({ title, prayer }: PrayerCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`${title}:\n${prayer}`);
      setCopied(true);
      toast.success("تم نسخ الدعاء بنجاح");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("تعذر نسخ الدعاء");
    }
  };

  return (
    <div className="group relative my-5 overflow-hidden rounded-card border border-border-subtle bg-card p-5 md:p-6 shadow-xs transition-all duration-base ease-standard hover:border-primary/40 hover:shadow-sm">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between gap-3 border-b border-border-subtle/70 pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
          </span>
          <h4 className="text-body font-bold text-foreground">{title}</h4>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border-subtle bg-surface px-2.5 py-1 text-caption font-medium text-muted-foreground transition-all hover:border-primary hover:text-primary active:scale-95"
          aria-label="نسخ الدعاء"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-primary" />
              <span className="text-primary font-bold">تم النسخ</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span>نسخ الدعاء</span>
            </>
          )}
        </button>
      </div>

      {/* Prayer Text */}
      <blockquote className="relative ps-2 text-[1.125rem] md:text-[1.2rem] leading-[2.1] md:leading-[2.2] font-medium text-foreground/95">
        <p className="select-text">{prayer}</p>
      </blockquote>
    </div>
  );
}
