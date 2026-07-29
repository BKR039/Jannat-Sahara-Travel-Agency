import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Bell, CheckCheck, Trash2, Calendar, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, AdminCard, EmptyState } from "@/components/admin/ui";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/notifications")({ component: NotificationsPage });

function iconFor(kind: string) {
  if (kind === "booking") return Calendar;
  if (kind === "contact") return Mail;
  return Bell;
}

function linkFor(kind: string): string {
  if (kind === "booking") return "/admin/bookings";
  if (kind === "contact") return "/admin/messages";
  return "/admin";
}

function NotificationsPage() {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ["admin-notifications"] as const,
    queryFn: async () => {
      const { data, error } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data;
    },
  });

  function invalidate() { qc.invalidateQueries({ queryKey: ["admin-notifications"] }); qc.invalidateQueries({ queryKey: ["notifications-unread"] }); }

  const markRead = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id); if (error) throw error; },
    onSuccess: invalidate,
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("All marked as read"); invalidate(); },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("notifications").delete().eq("id", id); if (error) throw error; },
    onSuccess: invalidate,
  });

  return (
    <>
      <PageHeader
        title="Notifications"
        description="System events, new leads and messages."
        actions={<Button variant="outline" size="sm" onClick={() => markAllRead.mutate()}><CheckCheck className="me-2 h-4 w-4" /> Mark all read</Button>}
      />
      <AdminCard>
        {list.isLoading ? <p className="text-small text-muted-foreground">Loading…</p> : !list.data?.length ? (
          <EmptyState title="No notifications yet" icon={Bell} />
        ) : (
          <div className="divide-y divide-border -mx-4 sm:-mx-5">
            {list.data.map((n) => {
              const Icon = iconFor(n.kind);
              return (
                <div key={n.id} className={`flex items-start gap-3 px-4 sm:px-5 py-3 ${!n.read_at ? "bg-primary/5" : ""}`}>
                  <div className="mt-0.5 rounded-lg bg-primary/10 p-2 text-primary"><Icon className="h-4 w-4" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="text-small font-medium">{n.title}</p>
                    {n.body && <p className="text-caption text-muted-foreground">{n.body}</p>}
                    <p className="mt-1 text-caption text-muted-foreground">{new Date(n.created_at).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Link to={linkFor(n.kind)} className="text-caption text-primary hover:underline px-2">View</Link>
                    {!n.read_at && <Button size="sm" variant="ghost" onClick={() => markRead.mutate(n.id)}>Mark read</Button>}
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => remove.mutate(n.id)}><Trash2 className="h-4 w-4" /></Button>
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
