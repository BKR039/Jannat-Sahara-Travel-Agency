import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Users,
  Phone,
  MessageCircle,
  Mail as MailIcon,
  FileText,
  CalendarCheck,
  Plane,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  EmptyState,
  ErrorState,
  Page,
  Panel,
  SearchInput,
  SkeletonRows,
  relativeDate,
  shortDate,
  useDebounced,
} from "@/components/admin/kit";
import { getCustomer, listCustomers } from "@/lib/admin/command.functions";
import { keySource } from "@/lib/admin/customer-identity";
import { adminDocTitle } from "@/lib/admin/doc-title";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

/**
 * Customer directory.
 *
 * Customers are not a table: they are derived by grouping the agency's records
 * on the shared key in src/lib/admin/customer-identity.ts. The aggregation runs
 * on the server (`listCustomers` / `getCustomer`), behind `requireAdmin` — the
 * browser never receives the full booking, request and message tables just to
 * join them locally.
 */

export const Route = createFileRoute("/admin/customers")({
  ssr: false,
  // `?q=` is what the admin shell's global search navigates with; `?customer=`
  // opens one customer straight from a request (Phase 7.1).
  validateSearch: (s: Record<string, unknown>): { q?: string; customer?: string } => ({
    ...(typeof s.q === "string" && s.q ? { q: s.q } : {}),
    ...(typeof s.customer === "string" && s.customer ? { customer: s.customer } : {}),
  }),
  head: () => ({
    meta: [{ title: adminDocTitle("customers") }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: CustomersPage,
});

interface CustomerRow {
  key: string;
  name: string;
  phone: string | null;
  email: string | null;
  bookings: number;
  requests: number;
  umrahRequests: number;
  lastTrip: string | null;
  lastActivity: string;
  totalSpent: number;
  currency: string;
  status: "customer" | "lead" | "cancelled";
}

const digits = (phone: string | null) => (phone ?? "").replace(/[^\d+]/g, "");

function CustomersPage() {
  const { t } = useTranslation("admin");
  const navigate = useNavigate();
  const { q, customer: openKey } = Route.useSearch();
  const fetchCustomers = useServerFn(listCustomers);

  const [search, setSearch] = useState(q ?? "");
  const debounced = useDebounced(search);

  // The shell's global search lands here with `?q=`; adopt it once.
  useEffect(() => {
    if (q) setSearch(q);
  }, [q]);

  const list = useQuery({
    queryKey: ["admin-customers"] as const,
    queryFn: () => fetchCustomers(),
    staleTime: 60_000,
  });

  const customers = useMemo(() => (list.data ?? []) as CustomerRow[], [list.data]);

  const filtered = useMemo(() => {
    const needle = debounced.trim().toLowerCase();
    if (!needle) return customers;
    return customers.filter((c) =>
      [c.name, c.phone, c.email].some((v) => (v ?? "").toLowerCase().includes(needle)),
    );
  }, [customers, debounced]);

  function exportCsv() {
    if (!filtered.length) return;
    const cols = [
      "name",
      "phone",
      "email",
      "bookings",
      "requests",
      "umrah_requests",
      "last_activity",
    ];
    const csv = [
      cols.join(","),
      ...filtered.map((c) =>
        [
          `"${c.name.replace(/"/g, '""')}"`,
          c.phone ?? "",
          c.email ?? "",
          c.bookings,
          c.requests,
          c.umrahRequests,
          c.lastActivity,
        ].join(","),
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `customers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const open = (key: string | undefined) =>
    navigate({ to: "/admin/customers", search: key ? { q, customer: key } : { q }, replace: true });

  return (
    <Page
      title={t("shell.customers.title")}
      description={t("shell.customers.description")}
      actions={
        <Button variant="outline" size="sm" onClick={exportCsv}>
          <FileText className="me-2 h-4 w-4" /> {t("shell.customers.exportCsv")}
        </Button>
      }
    >
      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder={t("shell.customers.searchPlaceholder")}
        className="max-w-md"
      />

      <Panel className="mt-4" bodyClassName="p-0 sm:p-0">
        {list.isLoading ? (
          <div className="p-4">
            <SkeletonRows rows={6} />
          </div>
        ) : list.isError ? (
          // A failed query must never look like an empty table.
          <ErrorState onRetry={() => list.refetch()} />
        ) : filtered.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={Users}
              title={
                customers.length === 0
                  ? t("shell.customers.emptyTitle")
                  : t("shell.customers.noMatchTitle")
              }
              description={
                customers.length === 0
                  ? t("shell.customers.emptyDescription")
                  : t("shell.customers.noMatchDescription")
              }
            />
          </div>
        ) : (
          <ul className="divide-y divide-border-subtle">
            {filtered.map((c) => (
              <li key={c.key} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
                <button
                  type="button"
                  onClick={() => open(c.key)}
                  className="min-w-0 flex-1 text-start"
                >
                  <p className="truncate text-small font-medium hover:text-primary">{c.name}</p>
                  <p className="truncate text-caption text-muted-foreground" dir="ltr">
                    {[c.phone, c.email].filter(Boolean).join(" · ") || "—"}
                  </p>
                </button>

                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-caption font-semibold",
                    c.status === "customer"
                      ? "bg-primary/10 text-primary"
                      : c.status === "cancelled"
                        ? "bg-surface-sunken text-muted-foreground"
                        : "bg-warning-muted text-warning",
                  )}
                >
                  {t(`shell.customers.status.${c.status}`)}
                </span>

                <span className="hidden text-caption tabular-nums text-muted-foreground sm:inline">
                  {t("shell.customers.counts", { bookings: c.bookings, requests: c.requests })}
                </span>

                {c.umrahRequests > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 text-caption font-medium">
                    <Sparkles className="h-3 w-3" />
                    {t("shell.customers.umrahRequests", { count: c.umrahRequests })}
                  </span>
                )}

                <span className="hidden whitespace-nowrap text-caption text-muted-foreground md:inline">
                  {relativeDate(c.lastActivity)}
                </span>

                <div className="inline-flex gap-1">
                  {c.phone && (
                    <a
                      className="rounded-md p-2 hover:bg-accent"
                      href={`tel:${digits(c.phone)}`}
                      title={t("shell.customers.table.phone")}
                    >
                      <Phone className="h-4 w-4" />
                    </a>
                  )}
                  {c.phone && (
                    <a
                      className="rounded-md p-2 hover:bg-accent"
                      target="_blank"
                      rel="noreferrer"
                      href={`https://wa.me/${digits(c.phone).replace(/^\+/, "")}`}
                      // i18n-audit-ignore: a product name, identical in AR/FR/EN.
                      title="WhatsApp"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </a>
                  )}
                  {c.email && (
                    <a
                      className="rounded-md p-2 hover:bg-accent"
                      href={`mailto:${c.email}`}
                      title={t("shell.customers.table.email")}
                    >
                      <MailIcon className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <CustomerDrawer customerKey={openKey} onClose={() => open(undefined)} />
    </Page>
  );
}

/* ------------------------------------------------------------------ detail */

interface RelatedRow {
  id: string;
  icon: typeof CalendarCheck;
  label: string;
  meta: string;
  status: string;
  createdAt: string;
  requestId?: string;
}

function CustomerDrawer({
  customerKey: key,
  onClose,
}: {
  customerKey: string | undefined;
  onClose: () => void;
}) {
  const { t } = useTranslation("admin");
  const fetchCustomer = useServerFn(getCustomer);

  const detail = useQuery({
    queryKey: ["admin-customer", key] as const,
    queryFn: () => fetchCustomer({ data: { key: key as string } }),
    enabled: !!key,
    staleTime: 30_000,
  });

  const c = detail.data;

  const related = useMemo<RelatedRow[]>(() => {
    if (!c) return [];
    const rows: RelatedRow[] = [];
    for (const b of c.bookingRows ?? []) {
      rows.push({
        id: `b-${b.id}`,
        icon: CalendarCheck,
        label: b.package_title ?? t("shell.customers.related.booking"),
        meta: t("shell.customers.related.travellers", { count: b.people ?? 1 }),
        status: b.status,
        createdAt: b.created_at,
      });
    }
    for (const r of c.customRows ?? []) {
      const nights = (r.makkah_nights ?? 0) + (r.madinah_nights ?? 0);
      const travellers = (r.adults ?? 0) + (r.children ?? 0) + (r.infants ?? 0);
      rows.push({
        id: `u-${r.id}`,
        icon: Sparkles,
        label: r.reference,
        meta: t("shell.customers.related.umrah", { nights, count: travellers }),
        status: r.status,
        createdAt: r.created_at,
        requestId: r.id,
      });
    }
    for (const f of c.flightRows ?? []) {
      rows.push({
        id: `f-${f.id}`,
        icon: Plane,
        label: f.reference,
        meta: `${f.from_airport} → ${f.to_airport}`,
        status: f.status,
        createdAt: f.created_at,
        requestId: f.id,
      });
    }
    for (const m of c.messageRows ?? []) {
      rows.push({
        id: `m-${m.id}`,
        icon: MessageSquare,
        label: m.subject ?? t("shell.customers.related.message"),
        meta: m.message.slice(0, 80),
        status: m.status ?? "new",
        createdAt: m.created_at,
        requestId: m.id,
      });
    }
    return rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [c, t]);

  return (
    <Drawer
      open={!!key}
      onClose={onClose}
      title={c?.name ?? t("shell.customers.title")}
      description={key ? t(`shell.customers.matchedBy.${keySource(key)}`) : undefined}
    >
      {detail.isLoading ? (
        <SkeletonRows rows={5} />
      ) : detail.isError ? (
        <ErrorState onRetry={() => detail.refetch()} />
      ) : !c ? (
        <EmptyState icon={Users} title={t("shell.customers.notFound")} />
      ) : (
        <div className="space-y-5">
          <div className="rounded-card border border-border-subtle bg-surface-sunken/40 p-4">
            <h3 className="text-caption font-bold uppercase tracking-wider text-muted-foreground">
              {t("shell.customers.contact")}
            </h3>
            <p className="mt-2 text-small" dir="ltr">
              {c.phone ?? "—"}
            </p>
            <p className="text-small text-muted-foreground" dir="ltr">
              {c.email ?? "—"}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {c.phone && (
                <Button asChild variant="outline" size="sm">
                  <a href={`tel:${digits(c.phone)}`}>
                    <Phone className="me-2 h-4 w-4" /> {t("shell.customers.table.phone")}
                  </a>
                </Button>
              )}
              {c.email && (
                <Button asChild variant="outline" size="sm">
                  <a href={`mailto:${c.email}`}>
                    <MailIcon className="me-2 h-4 w-4" /> {t("shell.customers.table.email")}
                  </a>
                </Button>
              )}
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-caption font-bold uppercase tracking-wider text-muted-foreground">
              {t("shell.customers.relatedRecords", { count: related.length })}
            </h3>
            {related.length === 0 ? (
              <p className="text-caption text-muted-foreground">{t("shell.customers.noRelated")}</p>
            ) : (
              <ul className="divide-y divide-border-subtle rounded-xl border border-border-subtle">
                {related.map((r) => {
                  const Icon = r.icon;
                  const body = (
                    <>
                      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-small font-medium">{r.label}</span>
                        <span className="block truncate text-caption text-muted-foreground">
                          {r.meta}
                        </span>
                      </span>
                      <span className="whitespace-nowrap text-caption text-muted-foreground">
                        {shortDate(r.createdAt)}
                      </span>
                    </>
                  );
                  return (
                    <li key={r.id}>
                      {r.requestId ? (
                        <Link
                          to="/admin/requests"
                          search={{ request: r.requestId }}
                          className="flex items-center gap-3 px-3 py-2.5 hover:bg-accent"
                        >
                          {body}
                        </Link>
                      ) : (
                        <div className="flex items-center gap-3 px-3 py-2.5">{body}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </Drawer>
  );
}
