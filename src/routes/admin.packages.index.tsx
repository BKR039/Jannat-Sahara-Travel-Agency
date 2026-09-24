import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { adminDocTitle } from "@/lib/admin/doc-title";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { availabilityOf, type BookingSeat } from "@/lib/admin/seat-availability";
import { applyAction, availableActions } from "@/lib/admin/package-publication";
import { deleteVerdict } from "@/lib/admin/package-delete";
import {
  Plus,
  Filter,
  Star,
  Copy,
  Archive,
  Trash2,
  Edit3,
  Eye,
  Hotel as HotelIcon,
  ImageOff,
  Package as PackageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  CATEGORIES,
  STATUSES,
  type PackageRow,
  type PackageCategory,
  type PackageStatus,
} from "@/components/admin/packages/model";
import { useTranslation } from "react-i18next";
import {
  Page,
  Panel,
  EmptyState,
  ErrorState,
  SearchInput,
  SkeletonRows,
  shortDate,
} from "@/components/admin/kit";
import { StatusChip } from "@/components/ds";

export const Route = createFileRoute("/admin/packages/")({
  head: () => ({
    meta: [{ title: adminDocTitle("trips") }],
  }),
  component: PackagesAdminPage,
});

/**
 * Derived seat availability for one row.
 *
 * Capacity is what the agency configured; booked comes from live bookings.
 * A programme with no capacity set shows a dash rather than a guessed number.
 */
function SeatCell({ pkg, bookings }: { pkg: PackageRow; bookings: BookingSeat[] }) {
  const { t } = useTranslation("admin");
  const a = availabilityOf(pkg.id, pkg.total_seats, bookings);

  if (a.state === "unset") {
    return <span className="text-muted-foreground">—</span>;
  }

  const tone =
    a.state === "full" ? "bg-destructive" : a.state === "limited" ? "bg-warning" : "bg-success";

  return (
    <div className="min-w-[120px]">
      <div className="flex items-baseline gap-1.5">
        <span className="font-semibold">{a.booked}</span>
        <span className="text-muted-foreground">/ {a.capacity}</span>
      </div>
      <div
        className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted"
        role="img"
        aria-label={t(`ops.packagesList.availability.${a.state}`)}
      >
        <div
          className={`h-full rounded-full ${tone}`}
          style={{ width: `${Math.round((a.ratio ?? 0) * 100)}%` }}
        />
      </div>
      {/* Text as well as colour, so the state is never carried by hue alone. */}
      <p className="mt-1 text-caption text-muted-foreground">
        {t("ops.packagesList.seatsRemaining", { count: a.remaining ?? 0 })}
      </p>
    </div>
  );
}

function PackagesAdminPage() {
  const { t } = useTranslation("admin");
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [availability, setAvailability] = useState<string>("all");
  const [pendingFeaturedId, setPendingFeaturedId] = useState<string | null>(null);

  const list = useQuery({
    queryKey: ["admin-packages", { search, cat, status }] as const,
    queryFn: async () => {
      let q = supabase
        .from("packages")
        .select("*")
        .is("archived_at", null)
        .order("sort_order")
        .order("created_at", { ascending: false });
      if (cat !== "all") q = q.eq("category", cat as PackageCategory);
      if (status !== "all") q = q.eq("status", status as PackageStatus);
      if (search.trim()) {
        const s = `%${search.trim()}%`;
        q = q.or(`title.ilike.${s},slug.ilike.${s},destination.ilike.${s},country.ilike.${s}`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data as PackageRow[];
    },
  });

  /*
   * Seat rows for every programme on screen. One query, not one per row: the
   * seat figures shown in the list are derived from real bookings rather than
   * from the hand-maintained `seats` column, which drifts as soon as a booking
   * is taken without someone also editing the programme.
   */
  const seatRows = useQuery({
    queryKey: ["admin-package-bookings"] as const,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("package_id, people, status")
        .not("package_id", "is", null);
      if (error) throw error;
      return (data ?? []) as BookingSeat[];
    },
    staleTime: 60_000,
  });

  /*
   * Availability is derived from bookings, so it cannot be expressed as a
   * database filter on `packages`. It narrows the rows already fetched — no
   * extra round trip, and the counts stay consistent with the seat column.
   */
  const rows = useMemo(() => {
    const all = list.data ?? [];
    if (availability === "all") return all;
    const bookings = seatRows.data ?? [];
    return all.filter((p) => availabilityOf(p.id, p.total_seats, bookings).state === availability);
  }, [list.data, seatRows.data, availability]);

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["admin-packages"] });
    qc.invalidateQueries({ queryKey: ["packages"] });
    qc.invalidateQueries({ queryKey: ["admin-dashboard-stats"] });
  }

  /**
   * Duplicate a programme.
   *
   * Reusable content is copied — names, description, destination, images,
   * pricing, capacity. Operational state is deliberately NOT: a copy inherited
   * the original's departure and return dates and its remaining-seat count, so
   * duplicating a half-sold trip produced a new programme that looked half-sold
   * before it existed. Those are reset so the copy starts clean, and the new
   * row opens in the editor rather than leaving the operator to find it.
   */
  const duplicate = useMutation({
    mutationFn: async (pkg: PackageRow) => {
      const { id, created_at, updated_at, ...copy } = pkg;
      const { data, error } = await supabase
        .from("packages")
        .insert({
          ...copy,
          slug: `${copy.slug}-copy-${Math.random().toString(36).slice(2, 6)}`,
          title: `${copy.title} (copy)`,
          // Never inherit the original's schedule or booking state.
          departure_date: null,
          return_date: null,
          seats: copy.total_seats ?? null,
          // A duplicate is always a draft, never featured.
          status: "draft",
          featured: false,
        })
        .select("id, title")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (created) => {
      toast.success(t("ops.packagesList.toastDuplicated", { title: created.title }));
      invalidate();
      // Open the copy so the operator can set its dates straight away.
      navigate({ to: "/admin/packages/$id", params: { id: created.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleFeatured = useMutation({
    mutationFn: async ({ id, featured }: { id: string; featured: boolean }) => {
      const { error } = await supabase.from("packages").update({ featured }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
    onError: (e: Error) => toast.error(e.message || "فشل تحديث تمييز الرحلة"),
    onSettled: () => setPendingFeaturedId(null),
  });

  const changeStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: PackageStatus }) => {
      const { error } = await supabase.from("packages").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("ops.packagesList.toastStatusUpdated"));
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const archivePackage = useMutation({
    mutationFn: async (id: string) => {
      const { archiveRecordFn } = await import("@/lib/admin/archive.functions");
      await archiveRecordFn({
        data: {
          entityType: "trip",
          subType: "package",
          id,
          reason: "أرشفة من إدارة الباقات",
        },
      });
    },
    onSuccess: () => {
      toast.success("تم نقل الرحلة إلى الأرشيف بنجاح");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered =
    search.trim() !== "" || cat !== "all" || status !== "all" || availability !== "all";

  return (
    <Page
      title={t("ops.packagesList.title")}
      description={t("ops.packagesList.description")}
      actions={
        <Button asChild>
          <Link to="/admin/packages/$id" params={{ id: "new" }}>
            <Plus className="me-2 h-4 w-4" />
            {t("ops.packagesList.newPackage")}
          </Link>
        </Button>
      }
    >
      {/*
       * One filter surface rather than a loose row of controls: search takes
       * the width it needs, the three narrowing controls sit together behind a
       * single label, and every control is the shared field height so the row
       * reads as one instrument.
       */}
      <Panel className="mb-4" bodyClassName="p-3 sm:p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder={t("ops.packagesList.searchPlaceholder")}
            className="md:min-w-[240px] md:flex-1"
          />
          <div className="flex flex-wrap items-center gap-2">
            <span className="hidden items-center gap-1.5 text-caption text-muted-foreground sm:inline-flex">
              <Filter className="h-3.5 w-3.5" aria-hidden />
              {t("ops.packagesList.filtersLabel")}
            </span>
            <Select value={availability} onValueChange={setAvailability}>
              <SelectTrigger
                className="w-[calc(50%-0.25rem)] sm:w-[150px]"
                aria-label={t("ops.packagesList.availabilityFilter")}
              >
                <SelectValue placeholder={t("ops.packagesList.availabilityFilter")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("ops.packagesList.availabilityAll")}</SelectItem>
                {(["available", "limited", "full", "unset"] as const).map((a) => (
                  <SelectItem key={a} value={a}>
                    {t(`ops.packagesList.availability.${a}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={cat} onValueChange={setCat}>
              <SelectTrigger
                className="w-[calc(50%-0.25rem)] sm:w-[150px]"
                aria-label={t("ops.packagesList.categoryPlaceholder")}
              >
                <SelectValue placeholder={t("ops.packagesList.categoryPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("ops.packagesList.allCategories")}</SelectItem>
                {/* Translated label, never the database enum: an Arabic
                    operator was choosing between `umrah` and `trip`. */}
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {t(`ops.categories.${c}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger
                className="w-full sm:w-[150px]"
                aria-label={t("ops.packagesList.statusPlaceholder")}
              >
                <SelectValue placeholder={t("ops.packagesList.statusPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("ops.packagesList.allStatuses")}</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {t(`ops.packagesList.publication.${s}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Panel>

      <Panel
        title={t("ops.packagesList.listPanelTitle")}
        description={
          list.isSuccess ? t("ops.packagesList.resultCount", { count: rows.length }) : undefined
        }
        bodyClassName="p-0 sm:p-0"
      >
        {list.isLoading ? (
          <div className="p-4 sm:p-5">
            <SkeletonRows rows={5} />
          </div>
        ) : list.isError ? (
          // A failed query must never look like an empty table.
          <div className="p-4 sm:p-5">
            <ErrorState onRetry={() => list.refetch()} />
          </div>
        ) : rows.length === 0 ? (
          <div className="p-4 sm:p-5">
            {/*
             * "Nothing matches these filters" and "there are no programmes
             * yet" are different situations, and offering "create your first
             * programme" to someone who has fifty of them behind an active
             * filter reads as a bug.
             */}
            {filtered ? (
              <EmptyState
                title={t("ops.packagesList.noMatchTitle")}
                description={t("ops.packagesList.noMatchDescription")}
                icon={PackageIcon}
                action={
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSearch("");
                      setCat("all");
                      setStatus("all");
                      setAvailability("all");
                    }}
                  >
                    {t("ops.packagesList.clearFilters")}
                  </Button>
                }
              />
            ) : (
              <EmptyState
                title={t("ops.packagesList.emptyTitle")}
                description={t("ops.packagesList.emptyDescription")}
                icon={PackageIcon}
                action={
                  <Button asChild size="sm">
                    <Link to="/admin/packages/$id" params={{ id: "new" }}>
                      <Plus className="me-2 h-4 w-4" />
                      {t("ops.packagesList.newPackage")}
                    </Link>
                  </Button>
                }
              />
            )}
          </div>
        ) : (
          <>
            {/*
             * The table is desktop-only. At 390 it rendered 921px wide inside a
             * 356px scroller, so an operator had to drag sideways to reach the
             * state or the actions. The card list below carries the same
             * information and the same handlers — it is a second layout, not a
             * second implementation.
             */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-small">
                <thead>
                  {/* Column names are labels, not content: caption weight and
                      a sunken band, so the eye lands on the rows. */}
                  <tr className="border-b border-border-subtle bg-surface-sunken/50 text-start text-caption uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 sm:px-5 py-2.5 font-semibold">
                      {t("ops.packagesList.table.title")}
                    </th>
                    <th className="px-4 py-2.5 font-semibold">
                      {t("ops.packagesList.categoryPlaceholder")}
                    </th>
                    <th className="px-4 py-2.5 font-semibold">
                      {t("ops.packagesList.table.destination")}
                    </th>
                    <th className="px-4 py-2.5 font-semibold">الفنادق</th>
                    <th className="px-4 py-2.5 font-semibold">
                      {t("ops.packagesList.table.price")}
                    </th>
                    <th className="px-4 py-2.5 font-semibold">
                      {t("ops.packagesList.table.seats")}
                    </th>
                    <th className="px-4 py-2.5 font-semibold">
                      {t("ops.packagesList.statusPlaceholder")}
                    </th>
                    <th className="px-4 py-2.5 font-semibold">
                      {t("ops.packagesList.table.featured")}
                    </th>
                    <th className="px-4 sm:px-5 py-2.5 font-semibold text-end">
                      {t("ops.packagesList.table.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((p) => {
                    const dateSummary = [
                      p.departure_date ? shortDate(p.departure_date) : null,
                      p.return_date ? shortDate(p.return_date) : null,
                    ]
                      .filter(Boolean)
                      .join(" → ");

                    return (
                      <tr
                        key={p.id}
                        className="cursor-pointer border-b border-border-subtle last:border-0 transition-colors hover:bg-accent/40"
                        onClick={() =>
                          navigate({ to: "/admin/packages/$id", params: { id: p.id } })
                        }
                      >
                        <td className="px-4 sm:px-5 py-3">
                          <div className="flex items-center gap-3">
                            <PackageThumb pkg={p} />
                            <div className="min-w-0">
                              <div className="truncate font-medium">{p.title}</div>
                              <div className="truncate text-caption text-muted-foreground">
                                {dateSummary || t("ops.packagesList.noDeparture")}
                                {p.flight_route && ` • ${p.flight_route}`}
                                {p.notes && p.notes !== "-" && ` (${p.notes})`}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <StatusChip value={p.category} vocab="category" />
                        </td>
                        <td className="px-4 py-3">{p.destination ?? "—"}</td>
                        <td className="px-4 py-3 text-caption text-muted-foreground max-w-[170px]">
                          {p.hotel ? (
                            <span
                              className="line-clamp-2 text-foreground/80 font-medium"
                              title={p.hotel}
                            >
                              {p.hotel}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="ds-metric">
                            <span className="ds-metric-value">{p.price}</span>
                            <span className="ds-metric-unit">{p.currency}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3 tabular-nums">
                          <SeatCell pkg={p} bookings={seatRows.data ?? []} />
                        </td>
                        <td className="px-4 py-3">
                          <StatusChip value={p.status} vocab="publication" />
                        </td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            disabled={toggleFeatured.isPending && pendingFeaturedId === p.id}
                            onClick={() => {
                              setPendingFeaturedId(p.id);
                              toggleFeatured.mutate({ id: p.id, featured: !p.featured });
                            }}
                            title={t("ops.packagesList.toggleFeatured")}
                            aria-label={t("ops.packagesList.toggleFeatured")}
                            className="p-1 rounded hover:bg-muted/50 transition-colors disabled:opacity-50"
                          >
                            <Star
                              className={`h-4 w-4 ${p.featured ? "fill-primary text-primary" : "text-muted-foreground"}`}
                            />
                          </button>
                        </td>
                        <td
                          className="px-4 sm:px-5 py-3 text-end"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="inline-flex items-center gap-1">
                            {p.slug && (
                              <Button
                                size="icon"
                                variant="ghost"
                                title="معاينة في الموقع العام"
                                aria-label="معاينة في الموقع العام"
                                asChild
                              >
                                <a
                                  href={`/packages/${p.slug}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <Eye className="h-4 w-4" />
                                </a>
                              </Button>
                            )}
                            {availableActions(p.status).map((action) => (
                              <Button
                                key={action}
                                size="xs"
                                variant="outline"
                                onClick={() => {
                                  const next = applyAction(p.status, action);
                                  if (next) changeStatus.mutate({ id: p.id, status: next });
                                }}
                              >
                                {t(
                                  `ops.packagesList.action${action.charAt(0).toUpperCase()}${action.slice(1)}`,
                                )}
                              </Button>
                            ))}
                            <Button
                              size="icon"
                              variant="ghost"
                              title={t("ops.packagesList.edit")}
                              aria-label={t("ops.packagesList.edit")}
                              asChild
                            >
                              <Link to="/admin/packages/$id" params={{ id: p.id }}>
                                <Edit3 className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              title={t("ops.packagesList.duplicate")}
                              aria-label={t("ops.packagesList.duplicate")}
                              onClick={() => duplicate.mutate(p)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="text-muted-foreground hover:text-foreground"
                                  title="أرشفة البرنامج"
                                  aria-label="أرشفة البرنامج"
                                >
                                  <Archive className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    أرشفة البرنامج السياحي
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    هل تريد نقل «{p.title}» إلى الأرشيف؟ سيتم إخفاؤه من قوائم التشغيل الحالية مع الاحتفاظ بكافة بياناته وحجوزاته التاريخية، ويمكنك استرجاعه في أي وقت من قسم الأرشيف.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>
                                    إلغاء
                                  </AlertDialogCancel>
                                  <AlertDialogAction onClick={() => archivePackage.mutate(p.id)}>
                                    نقل إلى الأرشيف
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ---------------------------- mobile cards ---------------------------- */}
            <ul className="flex flex-col gap-[var(--space-3)] p-4 md:hidden">
              {rows.map((p) => (
                <li
                  key={p.id}
                  className="rounded-card border border-border-subtle bg-card p-[var(--space-4)]"
                >
                  <button
                    type="button"
                    onClick={() => navigate({ to: "/admin/packages/$id", params: { id: p.id } })}
                    className="w-full text-start"
                  >
                    <div className="flex items-start gap-3">
                      <PackageThumb pkg={p} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-foreground">{p.title}</p>
                        <p className="truncate text-caption text-muted-foreground">
                          {p.departure_date
                            ? shortDate(p.departure_date)
                            : t("ops.packagesList.noDeparture")}
                        </p>
                      </div>
                      <StatusChip value={p.status} vocab="publication" />
                    </div>
                  </button>

                  <dl className="mt-[var(--space-3)] grid grid-cols-2 gap-[var(--space-3)]">
                    <div className="min-w-0">
                      <dt className="text-caption uppercase tracking-wide text-muted-foreground">
                        {t("ops.packagesList.table.category")}
                      </dt>
                      <dd className="mt-1">
                        <StatusChip value={p.category} vocab="category" />
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-caption uppercase tracking-wide text-muted-foreground">
                        {t("ops.packagesList.table.price")}
                      </dt>
                      <dd className="mt-1">
                        <span className="ds-metric">
                          <span className="ds-metric-value">{p.price}</span>
                          <span className="ds-metric-unit">{p.currency}</span>
                        </span>
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-caption uppercase tracking-wide text-muted-foreground">
                        {t("ops.packagesList.table.destination")}
                      </dt>
                      <dd className="mt-1 truncate text-small">{p.destination ?? "—"}</dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-caption uppercase tracking-wide text-muted-foreground">
                        {t("ops.packagesList.table.seats")}
                      </dt>
                      <dd className="mt-1 text-small">
                        <SeatCell pkg={p} bookings={seatRows.data ?? []} />
                      </dd>
                    </div>
                    {p.hotel && (
                      <div className="col-span-2 min-w-0 border-t border-border-subtle/60 pt-2">
                        <dt className="text-caption uppercase tracking-wide text-muted-foreground">
                          الفنادق
                        </dt>
                        <dd className="mt-1 text-small font-medium text-foreground line-clamp-1">
                          {p.hotel}
                        </dd>
                      </div>
                    )}
                  </dl>

                  {/* Publication moves stay words, and stay separate from state. */}
                  <div className="mt-[var(--space-4)] flex flex-wrap items-center gap-[var(--space-2)] border-t border-border-subtle pt-[var(--space-3)]">
                    {availableActions(p.status).map((action) => (
                      <Button
                        key={action}
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const next = applyAction(p.status, action);
                          if (next) changeStatus.mutate({ id: p.id, status: next });
                        }}
                      >
                        {t(
                          `ops.packagesList.action${action.charAt(0).toUpperCase()}${action.slice(1)}`,
                        )}
                      </Button>
                    ))}
                    {p.slug && (
                      <Button size="sm" variant="ghost" asChild>
                        <a href={`/packages/${p.slug}`} target="_blank" rel="noopener noreferrer">
                          <Eye className="me-1 h-3.5 w-3.5" /> معاينة
                        </a>
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" asChild className="ms-auto">
                      <Link to="/admin/packages/$id" params={{ id: p.id }}>
                        {t("ops.packagesList.edit")}
                      </Link>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </Panel>
    </Page>
  );
}

/**
 * Cover thumbnail for a programme row.
 */
function PackageThumb({ pkg }: { pkg: PackageRow }) {
  if (!pkg.cover) {
    return (
      <span className="grid h-11 w-16 shrink-0 place-items-center rounded-lg border border-border-subtle bg-surface-sunken/60 text-muted-foreground">
        <ImageOff className="h-4 w-4" aria-hidden />
      </span>
    );
  }
  return (
    <img
      src={pkg.cover}
      alt=""
      loading="lazy"
      className="h-11 w-16 shrink-0 rounded-lg border border-border-subtle object-cover"
    />
  );
}
