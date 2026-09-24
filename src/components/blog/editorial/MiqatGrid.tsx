import React from "react";
import { Compass, MapPin } from "lucide-react";

export interface MiqatItem {
  name: string;
  modernName?: string;
  people: string;
  distance: string;
}

export const MIQAT_DATA: MiqatItem[] = [
  {
    name: "ذو الحليفة",
    modernName: "أبيار علي",
    people: "ميقات أهل المدينة المنورة ومن جاء عن طريقهم",
    distance: "450 كم عن مكة",
  },
  {
    name: "الجحفة",
    modernName: "رابغ",
    people: "ميقات أهل الشام والمغرب ومصر ومن جاء عن طريقهم",
    distance: "183 كم عن مكة",
  },
  {
    name: "قرن المنازل",
    modernName: "السيل الكبير",
    people: "ميقات أهل نجد ومن جاء عن طريقهم",
    distance: "75 كم عن مكة",
  },
  {
    name: "يلملم",
    modernName: "السعدية",
    people: "ميقات أهل اليمن ومن جاء عن طريقهم",
    distance: "92 كم عن مكة",
  },
  {
    name: "ذات عرق",
    people: "ميقات أهل العراق ومن جاء عن طريقهم",
    distance: "94 كم عن مكة",
  },
];

export function MiqatGrid({ items = MIQAT_DATA }: { items?: MiqatItem[] }) {
  return (
    <div className="my-8 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((m, idx) => (
          <article
            key={m.name}
            className="group relative flex flex-col justify-between rounded-card border border-border-subtle bg-card p-5 shadow-xs transition-all duration-base ease-standard hover:border-primary/40 hover:-translate-y-0.5 hover:shadow-sm"
          >
            {/* Header: Name + Distance */}
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-caption font-bold text-primary">
                    0{idx + 1}
                  </span>
                  <h4 className="text-h4 font-bold text-foreground transition-colors group-hover:text-primary">
                    {m.name}
                  </h4>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-surface-raised border border-border-subtle px-2.5 py-0.5 text-[0.75rem] font-semibold text-primary">
                  <MapPin className="h-3 w-3" aria-hidden />
                  {m.distance}
                </span>
              </div>

              {m.modernName && (
                <div className="inline-block rounded-md bg-muted/60 px-2 py-0.5 text-[0.75rem] font-medium text-muted-foreground">
                  يُعرف اليوم: <span className="font-semibold text-foreground">{m.modernName}</span>
                </div>
              )}
            </div>

            {/* People */}
            <p className="mt-3 border-t border-border-subtle/70 pt-3 text-small leading-relaxed text-muted-foreground">
              {m.people}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}
