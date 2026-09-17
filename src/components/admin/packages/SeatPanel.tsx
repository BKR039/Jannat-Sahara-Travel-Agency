import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { availabilityOf, type BookingSeat } from "@/lib/admin/seat-availability";
import { cn } from "@/lib/utils";

/**
 * Derived seat availability for the programme being edited.
 *
 * Capacity is the operator's number; booked comes from the `bookings` table and
 * is never editable here. The editor used to expose an "available seats" input
 * and infer bookings by subtracting it from capacity, which produced a figure
 * that disagreed with the actual bookings as soon as one was taken.
 *
 * One query per editor, not per field.
 */
export function SeatPanel({
  packageId,
  totalSeats,
}: {
  packageId: string | null | undefined;
  totalSeats: string;
}) {
  const { t } = useTranslation("admin");

  const q = useQuery({
    queryKey: ["admin-package-seats", packageId] as const,
    enabled: Boolean(packageId) && packageId !== "new",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("package_id, people, status")
        .eq("package_id", packageId as string);
      if (error) throw error;
      return (data ?? []) as BookingSeat[];
    },
    staleTime: 60_000,
  });

  const parsed = totalSeats.trim() === "" ? null : Number(totalSeats);
  const a = availabilityOf(packageId ?? "", Number.isFinite(parsed) ? parsed : null, q.data ?? []);

  if (a.state === "unset") {
    return (
      <div className="mt-4 rounded-xl border border-border-subtle bg-surface-sunken/40 p-4">
        <p className="text-small font-medium">{t("ops.editor.availability.capacityUnset")}</p>
        <p className="mt-1 text-caption text-muted-foreground">
          {t("ops.editor.availability.capacityUnsetHint")}
        </p>
      </div>
    );
  }

  const oversold = a.booked > (a.capacity ?? 0);
  const tone =
    a.state === "full" ? "bg-destructive" : a.state === "limited" ? "bg-warning" : "bg-success";

  return (
    <div className="mt-4 rounded-xl border border-border-subtle bg-surface-sunken/40 p-4">
      <dl className="grid grid-cols-3 gap-4">
        {[
          { key: "capacity", label: t("ops.editor.availability.capacity"), value: a.capacity },
          { key: "booked", label: t("ops.editor.availability.booked"), value: a.booked },
          { key: "remaining", label: t("ops.editor.availability.remaining"), value: a.remaining },
        ].map((f) => (
          <div key={f.key}>
            <dt className="text-caption uppercase tracking-wide text-muted-foreground">
              {f.label}
            </dt>
            <dd className="mt-0.5 text-h5 font-bold tabular-nums">{f.value}</dd>
          </div>
        ))}
      </dl>

      <div
        className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted"
        role="img"
        aria-label={t(`ops.packagesList.availability.${a.state}`)}
      >
        <div
          className={cn("h-full rounded-full", tone)}
          style={{ width: `${Math.round((a.ratio ?? 0) * 100)}%` }}
        />
      </div>

      {/* State as words as well as colour. */}
      <p className="mt-2 text-caption font-medium">
        {t(`ops.packagesList.availability.${a.state}`)}
      </p>

      {/* The real booked figure is never hidden or clamped away. */}
      {oversold && (
        <p
          role="alert"
          className="mt-3 flex items-start gap-2 rounded-lg bg-warning-muted p-3 text-caption font-medium"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {t("ops.editor.availability.oversold", { booked: a.booked, capacity: a.capacity })}
        </p>
      )}
    </div>
  );
}
