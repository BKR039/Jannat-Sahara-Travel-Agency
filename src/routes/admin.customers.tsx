import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, Search, Phone, MessageCircle, Mail as MailIcon, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PageHeader, AdminCard, EmptyState } from "@/components/admin/ui";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/admin/customers")({ component: CustomersPage });

interface Customer {
  key: string;
  name: string;
  phone: string;
  email: string | null;
  package_categories: Set<string>;
  bookings: number;
  last_booking: string;
  status_summary: Record<string, number>;
}

function CustomersPage() {
  const { t } = useTranslation("admin");
  const [search, setSearch] = useState("");

  const raw = useQuery({
    queryKey: ["admin-customers-source"] as const,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("name, phone, email, package_category, status, created_at")
        .order("created_at", { ascending: false })
        .limit(2000);
      if (error) throw error;
      return data;
    },
  });

  const customers = useMemo<Customer[]>(() => {
    const map = new Map<string, Customer>();
    for (const b of raw.data ?? []) {
      const key = (b.phone || b.email || "").toLowerCase().trim();
      if (!key) continue;
      const existing = map.get(key);
      if (existing) {
        existing.bookings++;
        if (b.package_category) existing.package_categories.add(b.package_category);
        existing.status_summary[b.status] = (existing.status_summary[b.status] ?? 0) + 1;
      } else {
        map.set(key, {
          key,
          name: b.name,
          phone: b.phone,
          email: b.email,
          package_categories: new Set(b.package_category ? [b.package_category] : []),
          bookings: 1,
          last_booking: b.created_at,
          status_summary: { [b.status]: 1 },
        });
      }
    }
    let list = Array.from(map.values());
    if (search.trim()) {
      const s = search.toLowerCase().trim();
      list = list.filter((c) => c.name.toLowerCase().includes(s) || c.phone.toLowerCase().includes(s) || (c.email ?? "").toLowerCase().includes(s));
    }
    return list.sort((a, b) => new Date(b.last_booking).getTime() - new Date(a.last_booking).getTime());
  }, [raw.data, search]);

  function exportCsv() {
    if (!customers.length) return;
    const cols = ["name", "phone", "email", "bookings", "last_booking", "categories"];
    const csv =
      cols.join(",") +
      "\n" +
      customers
        .map((c) => [
          `"${c.name.replace(/"/g, '""')}"`,
          c.phone,
          c.email ?? "",
          c.bookings,
          c.last_booking,
          Array.from(c.package_categories).join("|"),
        ].join(","))
        .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `customers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <PageHeader
        title={t("shell.customers.title")}
        description={t("shell.customers.description")}
        actions={<Button variant="outline" size="sm" onClick={exportCsv}><FileText className="me-2 h-4 w-4" /> {t("shell.customers.exportCsv")}</Button>}
      />

      <AdminCard className="mb-4">
        <div className="relative">
          <Search className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={t("shell.customers.searchPlaceholder")} value={search} onChange={(e) => setSearch(e.target.value)} className="ps-9" />
        </div>
      </AdminCard>

      <AdminCard>
        {raw.isLoading ? <p className="text-small text-muted-foreground">{t("shell.customers.loading")}</p> : !customers.length ? (
          <EmptyState title={t("shell.customers.emptyTitle")} icon={Users} />
        ) : (
          <div className="overflow-x-auto -mx-4 sm:-mx-5">
            <table className="w-full text-small">
              <thead><tr className="border-b border-border text-left">
                <th className="px-4 sm:px-5 py-2 font-semibold">{t("shell.customers.table.name")}</th>
                <th className="px-4 py-2 font-semibold">{t("shell.customers.table.phone")}</th>
                <th className="px-4 py-2 font-semibold">{t("shell.customers.table.email")}</th>
                <th className="px-4 py-2 font-semibold">{t("shell.customers.table.bookings")}</th>
                <th className="px-4 py-2 font-semibold">{t("shell.customers.table.categories")}</th>
                <th className="px-4 py-2 font-semibold">{t("shell.customers.table.lastBooking")}</th>
                <th className="px-4 sm:px-5 py-2 font-semibold text-right">{t("shell.customers.table.contact")}</th>
              </tr></thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.key} className="border-b border-border/60 hover:bg-muted/30">
                    <td className="px-4 sm:px-5 py-3 font-medium">{c.name}</td>
                    <td className="px-4 py-3">{c.phone}</td>
                    <td className="px-4 py-3 text-caption text-muted-foreground">{c.email ?? "—"}</td>
                    <td className="px-4 py-3 tabular-nums">{c.bookings}</td>
                    <td className="px-4 py-3 text-caption">{Array.from(c.package_categories).join(", ") || "—"}</td>
                    <td className="px-4 py-3 text-caption text-muted-foreground whitespace-nowrap">{new Date(c.last_booking).toLocaleDateString()}</td>
                    <td className="px-4 sm:px-5 py-3 text-right">
                      <div className="inline-flex gap-1">
                        <a className="p-2 rounded-md hover:bg-accent" href={`tel:${c.phone.replace(/[^\d+]/g, "")}`}><Phone className="h-4 w-4" /></a>
                        <a
                          className="p-2 rounded-md hover:bg-accent"
                          target="_blank"
                          rel="noreferrer"
                          href={`https://wa.me/${c.phone.replace(/[^\d+]/g, "").replace(/^\+/, "")}`}
                        >
                          <MessageCircle className="h-4 w-4" />
                        </a>
                        {c.email && <a className="p-2 rounded-md hover:bg-accent" href={`mailto:${c.email}`}><MailIcon className="h-4 w-4" /></a>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>
    </>
  );
}
