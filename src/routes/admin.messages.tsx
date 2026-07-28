import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, Trash2, CheckCircle2, MailOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { PageHeader, AdminCard, EmptyState } from "@/components/admin/ui";

export const Route = createFileRoute("/admin/messages")({ component: MessagesPage });

function MessagesPage() {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ["admin-contact-messages"] as const,
    queryFn: async () => {
      const { data, error } = await supabase.from("contact_messages").select("*").order("created_at", { ascending: false }).limit(500);
      if (error) throw error;
      return data;
    },
  });

  function invalidate() { qc.invalidateQueries({ queryKey: ["admin-contact-messages"] }); qc.invalidateQueries({ queryKey: ["admin-dashboard-stats"] }); }

  const setHandled = useMutation({
    mutationFn: async ({ id, handled }: { id: string; handled: boolean }) => {
      const { error } = await supabase.from("contact_messages").update({ handled }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("contact_messages").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Deleted"); invalidate(); },
  });

  return (
    <>
      <PageHeader title="Contact messages" description="Inbound messages from the public contact form." />
      <AdminCard>
        {list.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : !list.data?.length ? (
          <EmptyState title="No messages yet" icon={Mail} />
        ) : (
          <div className="divide-y divide-border -mx-4 sm:-mx-5">
            {list.data.map((m) => (
              <div key={m.id} className={`px-4 sm:px-5 py-4 ${!m.handled ? "bg-primary/5" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{m.name}</p>
                      {!m.handled && <span className="text-[10px] font-bold uppercase text-primary">NEW</span>}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {m.email} {m.phone && `· ${m.phone}`} · {new Date(m.created_at).toLocaleString()}
                    </p>
                    {m.subject && <p className="mt-2 text-sm font-medium">{m.subject}</p>}
                    <p className="mt-1 whitespace-pre-wrap text-sm">{m.message}</p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Button size="sm" variant="outline" onClick={() => setHandled.mutate({ id: m.id, handled: !m.handled })}>
                      {m.handled ? <><MailOpen className="me-2 h-4 w-4" /> Reopen</> : <><CheckCircle2 className="me-2 h-4 w-4" /> Mark handled</>}
                    </Button>
                    <a className="text-xs text-primary hover:underline" href={`mailto:${m.email}`}>Reply by email</a>
                    <AlertDialog>
                      <AlertDialogTrigger asChild><Button size="sm" variant="ghost" className="text-destructive"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Delete message?</AlertDialogTitle><AlertDialogDescription>Cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => remove.mutate(m.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </AdminCard>
    </>
  );
}
