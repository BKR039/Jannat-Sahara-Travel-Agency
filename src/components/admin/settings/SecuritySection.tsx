import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { ShieldCheck, ShieldAlert, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { listAdmins } from "@/lib/admin/admin.functions";
import { useAdmin } from "@/components/admin/context";
import { AutoSaveBar, SettingsCard, SettingsSection, SwitchField, TextField } from "./parts";
import { numberRange, useSiteSettings, type SettingSpec } from "./useSiteSettings";

const SPECS: SettingSpec[] = [
  { key: "security_require_2fa", label: "Require 2FA" },
  { key: "security_session_hours", label: "Session length", validate: numberRange(1, 720) },
  { key: "security_audit_logging", label: "Audit logging" },
];

export function SecuritySection() {
  const s = useSiteSettings("security", SPECS);
  const { isSuperAdmin } = useAdmin();
  const list = useServerFn(listAdmins);
  const admins = useQuery({ queryKey: ["admin-admins"] as const, queryFn: () => list() });

  if (s.loading) return <Skeleton className="h-64 w-full rounded-2xl" />;

  return (
    <SettingsSection
      title="Security"
      description="Access policies for your dashboard team. Only super admins can change these."
    >
      <SettingsCard
        title="Team access"
        description="Everyone who can sign in to the admin dashboard."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/admins">
              Manage admins <ArrowUpRight className="ms-2 h-4 w-4" />
            </Link>
          </Button>
        }
      >
        {admins.isLoading ? (
          <Skeleton className="h-20 w-full rounded-xl" />
        ) : admins.data?.length ? (
          <ul className="grid gap-3 sm:grid-cols-2">
            {admins.data.map((a) => (
              <li
                key={a.id}
                className="flex items-center gap-3 rounded-xl border border-border-subtle bg-surface-sunken/40 px-4 py-3"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent text-primary">
                  {a.roles.includes("super_admin") ? (
                    <ShieldCheck className="h-4 w-4" />
                  ) : (
                    <ShieldAlert className="h-4 w-4" />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-small font-medium">
                    {a.email ?? "Unknown user"}
                  </span>
                  <span className="block text-caption capitalize text-muted-foreground">
                    {a.roles.map((r) => r.replace("_", " ")).join(", ") || "no role"}
                  </span>
                </span>
              </li>
            ))}
          </ul>

        ) : (
          <p className="text-small text-muted-foreground">No dashboard users yet.</p>
        )}
      </SettingsCard>

      <SettingsCard title="Access policy" description="Applies to every dashboard user.">
        <div className="grid gap-3">
          <SwitchField
            label="Require two-factor authentication"
            hint="Admins must confirm a second factor before reaching the dashboard."
            checked={s.bool("security_require_2fa")}
            onChange={(v) => s.setBool("security_require_2fa", v)}
            disabled={!isSuperAdmin}
          />
          <SwitchField
            label="Keep an audit log of admin actions"
            hint="Records who changed what, and when."
            checked={s.bool("security_audit_logging")}
            onChange={(v) => s.setBool("security_audit_logging", v)}
            disabled={!isSuperAdmin}
          />
        </div>
        <div className="mt-5">
          <TextField
            label="Session length (hours)"
            hint="Admins are signed out after this period of inactivity. 1–720."
            type="number"
            error={s.errors.security_session_hours}
            value={s.form.security_session_hours ?? ""}
            onChange={(v) => s.set("security_session_hours", v)}
          />
        </div>
        {!isSuperAdmin && (
          <p className="mt-4 rounded-xl bg-surface-sunken/60 px-4 py-3 text-caption text-muted-foreground">
            Only a super admin can change access policies.
          </p>
        )}
      </SettingsCard>

      <AutoSaveBar
        dirty={s.dirty}
        saving={s.saving}
        hasErrors={s.hasErrors}
        lastSaved={s.lastSaved}
        onSave={s.saveNow}
        onDiscard={s.discard}
      />
    </SettingsSection>
  );
}
