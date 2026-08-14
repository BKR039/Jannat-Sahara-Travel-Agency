import { memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { statsQuery } from "@/lib/queries";
import { DynamicIcon } from "@/components/common/DynamicIcon";
import { useLocalized } from "@/lib/localize";

function StatsSectionBase() {
  const { data } = useQuery(statsQuery());
  const { L } = useLocalized();
  if (!data || data.length === 0) return null;
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 md:px-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {data.map((s) => (
          <div
            key={s.id}
            className="group flex flex-col items-center gap-3 rounded-[var(--radius-card)] border border-border-subtle bg-gradient-to-b from-card to-card/50 p-6 text-center shadow-sm transition-all duration-base ease-standard hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"
          >
            <div className="inline-flex items-center justify-center rounded-lg bg-primary/10 p-3 text-primary transition-colors duration-base group-hover:bg-primary group-hover:text-primary-foreground">
              <DynamicIcon name={s.icon} className="h-6 w-6 shrink-0" />
            </div>
            <div className="text-h2 font-extrabold text-foreground">{s.value}</div>
            <div className="text-small text-muted-foreground">{L(s, "label", "base")}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

export const StatsSection = memo(StatsSectionBase);
