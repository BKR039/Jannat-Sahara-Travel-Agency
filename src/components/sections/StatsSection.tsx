import { useQuery } from "@tanstack/react-query";
import { statsQuery } from "@/lib/queries";
import { DynamicIcon } from "@/components/common/DynamicIcon";

export function StatsSection() {
  const { data } = useQuery(statsQuery());
  if (!data || data.length === 0) return null;
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 md:px-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {data.map((s) => (
          <div
            key={s.id}
            className="group flex flex-col items-center gap-3 rounded-2xl border border-border bg-gradient-to-b from-card to-card/50 p-6 text-center shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
          >
            <div className="rounded-2xl bg-primary/10 p-3 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
              <DynamicIcon name={s.icon} className="h-6 w-6" />
            </div>
            <div className="text-3xl font-extrabold text-foreground md:text-4xl">{s.value}</div>
            <div className="text-sm text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
