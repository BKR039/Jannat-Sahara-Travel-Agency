import { useState } from "react";
import {
  type AppRole,
  type PermissionKey,
  PERMISSION_GROUPS,
  ROLE_DEFAULT_PERMISSIONS,
} from "@/lib/admin/permissions";
import { Check, ShieldCheck, Sparkles, Sliders } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PermissionMatrixInspectorProps {
  role: AppRole;
  customPermissions: { permission: string; granted: boolean }[];
  editable?: boolean;
  onSaveCustomPermissions?: (
    permissions: { permission: string; granted: boolean }[],
  ) => Promise<void> | void;
  isSaving?: boolean;
}

export function PermissionMatrixInspector({
  role,
  customPermissions,
  editable = false,
  onSaveCustomPermissions,
  isSaving = false,
}: PermissionMatrixInspectorProps) {
  // Local state for pending custom overrides
  const [overrides, setOverrides] = useState<Map<string, boolean>>(() => {
    const map = new Map<string, boolean>();
    for (const cp of customPermissions) {
      map.set(cp.permission, cp.granted);
    }
    return map;
  });

  const [hasChanges, setHasChanges] = useState(false);

  const roleDefaults = new Set<PermissionKey>(ROLE_DEFAULT_PERMISSIONS[role] ?? []);

  function togglePermission(key: PermissionKey) {
    if (!editable) return;
    setOverrides((prev) => {
      const next = new Map(prev);
      const isDefault = roleDefaults.has(key);

      if (next.has(key)) {
        // If it was explicitly overridden, toggling removes or flips the override
        const currentOverride = next.get(key);
        if (currentOverride === !isDefault) {
          // Reset to default
          next.delete(key);
        } else {
          next.set(key, !currentOverride);
        }
      } else {
        // Create an explicit override opposite to default
        next.set(key, !isDefault);
      }
      setHasChanges(true);
      return next;
    });
  }

  function handleReset() {
    const map = new Map<string, boolean>();
    for (const cp of customPermissions) {
      map.set(cp.permission, cp.granted);
    }
    setOverrides(map);
    setHasChanges(false);
  }

  function handleSave() {
    if (!onSaveCustomPermissions) return;
    const array = Array.from(overrides.entries()).map(([permission, granted]) => ({
      permission,
      granted,
    }));
    onSaveCustomPermissions(array);
    setHasChanges(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-small font-bold text-foreground flex items-center gap-1.5">
            <Sliders className="h-4 w-4 text-primary" />
            <span>مصفوفة الصلاحيات</span>
          </h4>
          <p className="text-caption text-muted-foreground">
            توضح الصلاحيات الموروثة من الرتبة والصلاحيات المخصصة لهذا العضو.
          </p>
        </div>
        {editable && hasChanges && (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={handleReset} disabled={isSaving}>
              إلغاء
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              {isSaving ? "جارٍ الحفظ…" : "حفظ التخصيص"}
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {PERMISSION_GROUPS.map((group) => {
          return (
            <div
              key={group.id}
              className="rounded-xl border border-border-subtle bg-card p-3.5 shadow-sm space-y-2.5"
            >
              <div className="flex items-center justify-between border-b border-border/40 pb-2">
                <span className="text-small font-bold text-foreground">{group.labelAr}</span>
                <span className="text-caption text-muted-foreground/80">
                  {group.permissions.length} صلاحيات
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {group.permissions.map((perm) => {
                  const isInherited = roleDefaults.has(perm.key);
                  const isOverridden = overrides.has(perm.key);
                  const overrideVal = overrides.get(perm.key);

                  const isEffective = isOverridden ? overrideVal === true : isInherited;

                  return (
                    <div
                      key={perm.key}
                      onClick={() => editable && togglePermission(perm.key)}
                      className={cn(
                        "flex items-center justify-between rounded-lg border p-2 text-start transition-all",
                        editable ? "cursor-pointer hover:border-primary/50" : "cursor-default",
                        isEffective
                          ? "border-border-subtle bg-surface-sunken/30"
                          : "border-border/40 bg-muted/20 opacity-70",
                      )}
                    >
                      <div className="min-w-0 pr-1">
                        <p className="text-caption font-semibold text-foreground truncate">
                          {perm.labelAr}
                        </p>
                        <p className="text-[11px] text-muted-foreground/70 font-mono" dir="ltr">
                          {perm.key}
                        </p>
                      </div>

                      <div className="shrink-0 flex items-center gap-1.5">
                        {isOverridden ? (
                          overrideVal ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
                              <Sparkles className="h-2.5 w-2.5" />
                              مخصص
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-bold text-destructive">
                              محظور
                            </span>
                          )
                        ) : isInherited ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                            <ShieldCheck className="h-2.5 w-2.5" />
                            موروث
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                            غير ممنوح
                          </span>
                        )}

                        <div
                          className={cn(
                            "grid h-4 w-4 place-items-center rounded border",
                            isEffective
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-muted-foreground/30 bg-background",
                          )}
                        >
                          {isEffective && <Check className="h-3 w-3 stroke-[3]" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
