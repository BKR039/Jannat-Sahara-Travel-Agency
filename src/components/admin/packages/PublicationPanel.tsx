import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import {
  applyAction,
  availableActions,
  type PackageStatus,
  type PublicationAction,
} from "@/lib/admin/package-publication";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

/**
 * Publication controls for the editor.
 *
 * The editor previously exposed the raw `package_status` enum in a dropdown,
 * which let an operator select `sold_out` by hand and made "draft" and
 * "archived" look like interchangeable options rather than the outcomes of
 * publishing decisions. This reuses the same `availableActions` /
 * `applyAction` model the programme list uses — one lifecycle, not two — so
 * only the moves that apply to the current state are offered.
 *
 * The status itself is still what gets written; this changes how the operator
 * arrives at it, not what the database stores.
 */
export function PublicationPanel({
  status,
  onChange,
  busy = false,
}: {
  status: PackageStatus;
  onChange: (next: PackageStatus) => void;
  busy?: boolean;
}) {
  const { t } = useTranslation("admin");
  const [pending, setPending] = useState<PublicationAction | null>(null);

  const actions = availableActions(status);

  const tone: Record<string, string> = {
    published: "bg-success-muted text-success",
    draft: "bg-info-muted text-info",
    archived: "bg-muted text-muted-foreground",
    sold_out: "bg-warning-muted text-warning",
  };

  return (
    <div className="rounded-xl border border-border-subtle bg-surface-sunken/40 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-caption uppercase tracking-wide text-muted-foreground">
          {t("ops.editor.publication.current")}
        </span>
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2.5 py-0.5 text-caption font-semibold",
            tone[status] ?? "bg-muted text-muted-foreground",
          )}
        >
          {t(`ops.packagesList.publication.${status}`)}
        </span>
      </div>

      {/* What this state means for a visitor, in words. */}
      <p className="mt-2 text-caption leading-relaxed text-muted-foreground">
        {t(`ops.editor.publication.explain.${status}`)}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {actions.map((action) => (
          <Button
            key={action}
            type="button"
            size="sm"
            variant={action === "publish" || action === "show" ? "default" : "outline"}
            disabled={busy}
            onClick={() => setPending(action)}
          >
            {busy && <Loader2 className="me-2 h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
            {t(`ops.packagesList.action${action.charAt(0).toUpperCase()}${action.slice(1)}`)}
          </Button>
        ))}
        {actions.length === 0 && (
          <p className="text-caption text-muted-foreground">
            {t("ops.editor.publication.noActions")}
          </p>
        )}
      </div>

      <AlertDialog open={pending !== null} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pending && t(`ops.editor.publication.confirm.${pending}.title`)}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pending && t(`ops.editor.publication.confirm.${pending}.body`)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("ops.editor.publication.confirm.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!pending) return;
                // `applyAction` returns null for a move that no longer applies,
                // so a stale dialog is a no-op rather than a wrong write.
                const next = applyAction(status, pending);
                setPending(null);
                if (next) onChange(next);
              }}
            >
              {pending &&
                t(`ops.packagesList.action${pending.charAt(0).toUpperCase()}${pending.slice(1)}`)}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
