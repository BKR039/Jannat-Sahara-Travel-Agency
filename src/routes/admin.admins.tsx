import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { adminDocTitle } from "@/lib/admin/doc-title";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Trash2, ShieldCheck, ShieldAlert, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { PageHeader, AdminCard, EmptyState } from "@/components/admin/ui";
import { listAdmins, inviteAdmin, removeUserRole } from "@/lib/admin/admin.functions";
import { useAdmin } from "@/components/admin/context";
import { useTranslation } from "react-i18next";
import { ErrorState } from "@/components/admin/kit";

export const Route = createFileRoute("/admin/admins")({
  head: () => ({
    meta: [{ title: adminDocTitle("team") }],
  }),
  component: AdminsPage,
});

function AdminsPage() {
  const { t } = useTranslation("admin");
  const { isSuperAdmin } = useAdmin();
  const qc = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "staff">("admin");

  const list = useServerFn(listAdmins);
  const invite = useServerFn(inviteAdmin);
  const removeRole = useServerFn(removeUserRole);

  const admins = useQuery({
    queryKey: ["admin-admins"] as const,
    queryFn: () => list(),
  });

  const inviteMut = useMutation({
    mutationFn: () => invite({ data: { email: email.trim(), role } }),
    onSuccess: () => {
      toast.success(t("content.admins.toasts.invitationSent"));
      setInviteOpen(false);
      setEmail("");
      setRole("admin");
      qc.invalidateQueries({ queryKey: ["admin-admins"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeMut = useMutation({
    mutationFn: (args: { userId: string; role: "super_admin" | "admin" | "staff" }) =>
      removeRole({ data: args }),
    onSuccess: () => {
      toast.success(t("content.admins.toasts.roleRemoved"));
      qc.invalidateQueries({ queryKey: ["admin-admins"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!isSuperAdmin) {
    return (
      <>
        <PageHeader title={t("content.admins.pageTitle")} />
        <EmptyState
          title={t("content.admins.superAdminOnlyTitle")}
          description={t("content.admins.superAdminOnlyDescription")}
          icon={ShieldAlert}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={t("content.admins.pageTitle")}
        description={t("content.admins.pageDescription")}
        actions={
          <Button onClick={() => setInviteOpen(true)}>
            <Plus className="me-2 h-4 w-4" />
            {t("content.admins.inviteAdmin")}
          </Button>
        }
      />
      <AdminCard>
        {admins.isLoading ? (
          <p className="text-small text-muted-foreground">{t("content.admins.loading")}</p>
        ) : admins.isError ? (
          // A failed query must never look like an empty table.
          <ErrorState onRetry={() => admins.refetch()} />
        ) : !admins.data?.length ? (
          <EmptyState title={t("content.admins.empty")} icon={User} />
        ) : (
          <div className="overflow-x-auto -mx-4 sm:-mx-5">
            <table className="w-full text-small">
              <thead>
                <tr className="border-b border-border text-start">
                  <th className="px-4 sm:px-5 py-2 font-semibold">
                    {t("content.admins.table.email")}
                  </th>
                  <th className="px-4 py-2 font-semibold">{t("content.admins.table.roles")}</th>
                  <th className="px-4 py-2 font-semibold">
                    {t("content.admins.table.lastSignIn")}
                  </th>
                  <th className="px-4 sm:px-5 py-2 font-semibold text-end">
                    {t("content.admins.table.actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {admins.data.map((u) => (
                  <tr key={u.id} className="border-b border-border/60">
                    <td className="px-4 sm:px-5 py-3">
                      <div className="flex items-center gap-2">
                        {u.roles.includes("super_admin") ? (
                          <ShieldCheck className="h-4 w-4 text-primary" />
                        ) : (
                          <User className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="font-medium">{u.email ?? u.id}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {u.roles.map((r) => (
                          <span
                            key={r}
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-caption font-bold uppercase ${r === "super_admin" ? "bg-primary/15 text-primary" : r === "admin" ? "bg-emerald-500/10 text-success" : "bg-muted text-muted-foreground"}`}
                          >
                            {r}
                            {r !== "super_admin" && (
                              <button
                                title={t("content.admins.removeRole")}
                                onClick={() => removeMut.mutate({ userId: u.id, role: r })}
                              >
                                ×
                              </button>
                            )}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-caption text-muted-foreground">
                      {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString() : "—"}
                    </td>
                    <td className="px-4 sm:px-5 py-3 text-end">
                      {!u.roles.includes("super_admin") && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="icon" variant="ghost" className="text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                {t("content.admins.removeAllAccessTitle")}
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                {u.email} will lose all admin/staff roles. The auth account is not
                                deleted.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t("ops.common.cancel")}</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() =>
                                  Promise.all(
                                    u.roles.map((r) =>
                                      removeMut.mutateAsync({ userId: u.id, role: r }),
                                    ),
                                  )
                                }
                              >
                                {t("content.admins.removeAccess")}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("content.admins.inviteAdmin")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1">
              <Label>{t("content.admins.table.email")}</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("content.admins.emailPlaceholder")}
              />
            </div>
            <div className="grid gap-1">
              <Label>{t("content.admins.roleLabel")}</Label>
              <Select value={role} onValueChange={(v) => setRole(v as "admin" | "staff")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">{t("content.admins.roleAdmin")}</SelectItem>
                  <SelectItem value="staff">{t("content.admins.roleStaff")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-caption text-muted-foreground">{t("content.admins.inviteHint")}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>
              {t("ops.common.cancel")}
            </Button>
            <Button onClick={() => inviteMut.mutate()} disabled={inviteMut.isPending || !email}>
              {t("content.admins.sendInvite")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
