import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { Check, CircleDot, FileText, History, Send } from "lucide-react";
import { getRequestActivity } from "@/lib/admin/command.functions";
import { activityLabelKey, type ActivityEvent } from "@/lib/admin/activity";
import { statusLabelKey, type RequestKind } from "@/lib/admin/request-status";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/admin/kit";
import { useLocalized } from "@/lib/localize";
import { cn } from "@/lib/utils";

/**
 * Operational history for one request (Phase 7.5).
 *
 * Every entry is a real `audit_logs` row, apart from the opening "request
 * created" event which comes from the request's own timestamp. Nothing is
 * invented to fill the list: with no history the panel says so.
 */

const ICONS: Record<string, typeof CircleDot> = {
  requestCreated: FileText,
  statusChanged: CircleDot,
  offerUpdated: FileText,
  offerSent: Send,
};

function iconFor(event: string) {
  return ICONS[event] ?? CircleDot;
}

export function RequestActivity({ requestId, kind }: { requestId: string; kind: RequestKind }) {
  const { t } = useTranslation("admin");
  const { longDate } = useLocalized();
  const fetchActivity = useServerFn(getRequestActivity);
  const [limit, setLimit] = useState(20);

  const q = useQuery({
    queryKey: ["admin-request-activity", requestId, limit] as const,
    queryFn: () => fetchActivity({ data: { id: requestId, kind, limit } }),
    staleTime: 30_000,
  });

  return (
    <section
      aria-labelledby={`activity-${requestId}`}
      className="rounded-card border border-border-subtle bg-surface-sunken/40 p-4"
    >
      <h3
        id={`activity-${requestId}`}
        className="text-caption font-bold uppercase tracking-wider text-muted-foreground"
      >
        {t("ops.activity.title")}
      </h3>

      {q.isLoading ? (
        <div className="mt-3 space-y-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-7 w-7 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-2/5" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : q.isError ? (
        <div className="mt-3">
          <p className="text-small text-destructive">{t("ops.activity.errorTitle")}</p>
          <Button size="sm" variant="outline" className="mt-2" onClick={() => q.refetch()}>
            {t("ops.activity.retry")}
          </Button>
        </div>
      ) : (q.data?.events.length ?? 0) === 0 ? (
        <p className="mt-3 flex items-center gap-2 text-small text-muted-foreground">
          <History className="h-4 w-4 shrink-0" aria-hidden />
          {t("ops.activity.empty")}
        </p>
      ) : (
        <>
          <ol className="mt-3 space-y-0">
            {(q.data?.events ?? []).map((e, index, all) => (
              <TimelineRow
                key={e.id}
                event={e}
                last={index === all.length - 1}
                formatDate={longDate}
              />
            ))}
          </ol>

          {q.data?.hasMore && (
            <Button
              size="sm"
              variant="outline"
              className="mt-3"
              disabled={q.isFetching}
              onClick={() => setLimit((n) => n + 20)}
            >
              {q.isFetching ? t("ops.activity.loading") : t("ops.activity.loadMore")}
            </Button>
          )}
        </>
      )}
    </section>
  );
}

function TimelineRow({
  event,
  last,
  formatDate,
}: {
  event: ActivityEvent;
  last: boolean;
  formatDate: (v: string) => string;
}) {
  const { t } = useTranslation("admin");
  const Icon = iconFor(event.event);
  const isDone = event.event === "offerSent";

  // The actor is a person when the audit row named one, otherwise the system.
  const actor =
    event.actorKind === "user"
      ? (event.actorLabel ?? t("ops.activity.actorAdmin"))
      : t("ops.activity.actorSystem");

  const time = new Date(event.at);
  const clock = Number.isNaN(time.getTime())
    ? ""
    : `${String(time.getHours()).padStart(2, "0")}:${String(time.getMinutes()).padStart(2, "0")}`;

  return (
    <li className="flex gap-3">
      {/* Icon rail. The connector is decorative; meaning lives in the text. */}
      <div className="flex flex-col items-center">
        <span
          className={cn(
            "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border",
            isDone
              ? "border-primary/30 bg-primary/10 text-primary"
              : "border-border-subtle bg-card text-muted-foreground",
          )}
        >
          {isDone ? (
            <Check className="h-3.5 w-3.5" aria-hidden />
          ) : (
            <Icon className="h-3.5 w-3.5" aria-hidden />
          )}
        </span>
        {!last && <span aria-hidden className="w-px flex-1 bg-border-subtle" />}
      </div>

      <div className={cn("min-w-0 flex-1", last ? "pb-0" : "pb-4")}>
        <p className="break-words text-small font-medium">{t(activityLabelKey(event.event))}</p>

        <p className="break-words text-caption text-muted-foreground">
          <span className="break-all">{actor}</span>
          {clock && <> · {clock}</>}
          <> · {formatDate(event.at)}</>
        </p>

        {event.from && event.to && (
          <p className="mt-0.5 break-words text-caption">
            {t("ops.activity.transition", {
              from: t(statusLabelKey(event.from)),
              to: t(statusLabelKey(event.to)),
            })}
          </p>
        )}

        {event.detail && (
          <p className="mt-0.5 break-words text-caption tabular-nums text-muted-foreground">
            {event.detail}
          </p>
        )}
      </div>
    </li>
  );
}
