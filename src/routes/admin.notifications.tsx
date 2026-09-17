import { createFileRoute } from "@tanstack/react-router";
import { adminDocTitle } from "@/lib/admin/doc-title";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Bell, CheckCheck, Trash2, Calendar, Mail, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, AdminCard, EmptyState } from "@/components/admin/ui";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ErrorState } from "@/components/admin/kit";

export const Route = createFileRoute("/admin/notifications")({
  head: () => ({
    meta: [{ title: adminDocTitle("notifications") }],
  }),
  component: NotificationsPage,
});

function iconFor(kind: string) {
  if (kind === "booking") return Calendar;
  if (kind === "contact") return Mail;
  if (kind === "custom_package") return Sparkles;
  return Bell;
}

/**
 * Deep-link a notification to the thing it is about (U-08).
 *
 * The row already carries `entity` + `entity_id`, so a custom Umrah request
 * opens directly in the requests inbox instead of dumping the user on the
 * dashboard. Falls back to the list when the id is missing.
 */
function linkFor(n: { kind: string; entity: string | null; entity_id: string | null }): {
  to: string;
  search?: Record<string, string>;
} {
  if (n.kind === "booking") return { to: "/admin/bookings" };
  if (n.kind === "contact") return { to: "/admin/messages" };
  if (n.kind === "custom_package") {
    return n.entity_id
      ? { to: "/admin/requests", search: { request: n.entity_id } }
      : { to: "/admin/requests" };
  }
  return { to: "/admin" };
}

function NotificationsPage() {
  const { t } = useTranslation("admin");
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ["admin-notifications"] as const,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["admin-notifications"] });
    qc.invalidateQueries({ queryKey: ["notifications-unread"] });
  }

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .is("read_at", null);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("shell.notifications.markAllReadSuccess"));
      invalidate();
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notifications").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return (
    <>
      <PageHeader
        title={t("shell.notifications.title")}
        description={t("shell.notifications.description")}
        actions={
          <Button variant="outline" size="sm" onClick={() => markAllRead.mutate()}>
            <CheckCheck className="me-2 h-4 w-4" /> {t("shell.notifications.markAllRead")}
          </Button>
        }
      />
      <AdminCard>
        {list.isLoading ? (
          <p className="text-small text-muted-foreground">{t("shell.notifications.loading")}</p>
        ) : list.isError ? (
          // A failed query must never look like an empty table.
          <ErrorState onRetry={() => list.refetch()} />
        ) : !list.data?.length ? (
          <EmptyState title={t("shell.notifications.emptyTitle")} icon={Bell} />
        ) : (
          <div className="divide-y divide-border -mx-4 sm:-mx-5">
            {list.data.map((n) => {
              const Icon = iconFor(n.kind);
              return (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 px-4 sm:px-5 py-3 ${!n.read_at ? "bg-primary/5" : ""}`}
                >
                  <div className="mt-0.5 rounded-lg bg-primary/10 p-2 text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    {/* The stored title is English text written by a database
                        trigger. The row also carries `kind`, which is stable
                        structured data, so the heading is localized from that
                        and the stored text is only the fallback (A-06). */}
                    <p className="text-small font-medium">
                      {t(`ops.notifications.kinds.${n.kind}`, { defaultValue: n.title })}
                    </p>
                    {n.body && <p className="text-caption text-muted-foreground">{n.body}</p>}
                    <p className="mt-1 text-caption text-muted-foreground">
                      {new Date(n.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Link
                      to={linkFor(n).to as never}
                      search={(linkFor(n).search ?? {}) as never}
                      className="text-caption text-primary hover:underline px-2"
                    >
                      {t("shell.notifications.view")}
                    </Link>
                    {!n.read_at && (
                      <Button size="sm" variant="ghost" onClick={() => markRead.mutate(n.id)}>
                        {t("shell.notifications.markRead")}
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={t("shell.notifications.delete")}
                      className="text-destructive"
                      onClick={() => remove.mutate(n.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </AdminCard>
    </>
  );
}
