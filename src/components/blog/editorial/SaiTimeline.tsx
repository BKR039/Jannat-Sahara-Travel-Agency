import React from "react";
import { ArrowLeft, Flag } from "lucide-react";

export interface SaiCircuit {
  circuitNumber: number;
  from: string;
  to: string;
  isEnd?: boolean;
}

const CIRCUITS: SaiCircuit[] = [
  { circuitNumber: 1, from: "الصفا", to: "المروة" },
  { circuitNumber: 2, from: "المروة", to: "الصفا" },
  { circuitNumber: 3, from: "الصفا", to: "المروة" },
  { circuitNumber: 4, from: "المروة", to: "الصفا" },
  { circuitNumber: 5, from: "الصفا", to: "المروة" },
  { circuitNumber: 6, from: "المروة", to: "الصفا" },
  { circuitNumber: 7, from: "الصفا", to: "المروة", isEnd: true },
];

export function SaiTimeline({ circuits = CIRCUITS }: { circuits?: SaiCircuit[] }) {
  return (
    <div className="my-8 rounded-card border border-border-subtle bg-surface-raised/40 p-5 md:p-6 shadow-xs">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-border-subtle pb-3">
        <h4 className="text-h4 font-bold text-foreground">
          مسار الأشواط السبعة (بين الصفا والمروة)
        </h4>
        <span className="text-caption text-muted-foreground">الذهاب شوط والرجوع شوط آخر</span>
      </div>

      {/* Grid of circuits */}
      <div className="grid gap-2.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7">
        {circuits.map((c) => (
          <div
            key={c.circuitNumber}
            className={`relative flex flex-col items-center justify-between rounded-xl border p-3 text-center transition-all ${
              c.isEnd
                ? "border-primary/50 bg-primary/5 shadow-xs"
                : "border-border-subtle bg-card hover:border-primary/30"
            }`}
          >
            {/* Shawt badge */}
            <span
              className={`mb-2 inline-flex h-6 w-6 items-center justify-center rounded-full text-[0.75rem] font-bold ${
                c.isEnd ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {c.circuitNumber}
            </span>

            {/* From -> To */}
            <div className="flex flex-col items-center gap-1">
              <span className="font-bold text-small text-foreground">{c.from}</span>
              <ArrowLeft className="h-3.5 w-3.5 text-primary rtl:rotate-0 rotate-180 my-0.5" />
              <span className="font-bold text-small text-foreground">{c.to}</span>
            </div>

            {c.isEnd && (
              <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[0.6875rem] font-semibold text-primary">
                <Flag className="h-3 w-3" />
                ختام السعي
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Notes footer */}
      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg bg-muted/40 p-3 text-caption text-muted-foreground">
        <span className="font-semibold text-foreground">تنبيه مهم:</span>
        <span>
          الركض الخفيف (الهرولة) يكون فقط بين العَلَمين الأخضرين وهو سنّة خاصة بالرجال دون النساء.
        </span>
      </div>
    </div>
  );
}
