import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useServerFn } from "@tanstack/react-start";
import { archiveLead, type LeadRow } from "@/lib/leads/leads.functions";
import { toast } from "sonner";
import { Archive, Loader2, Info } from "lucide-react";

interface ArchiveLeadDialogProps {
  lead: LeadRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLeadArchived: () => void;
  isRtl?: boolean;
}

export function ArchiveLeadDialog({
  lead,
  open,
  onOpenChange,
  onLeadArchived,
  isRtl = true,
}: ArchiveLeadDialogProps) {
  const archiveLeadFn = useServerFn(archiveLead);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleArchive = async () => {
    if (!lead) return;
    setLoading(true);
    try {
      await archiveLeadFn({
        data: {
          leadId: lead.id,
          reason: reason.trim() || undefined,
        },
      });

      toast.success(isRtl ? "تمت أرشفة الـ Lead بنجاح" : "Lead archivé avec succès");
      onOpenChange(false);
      onLeadArchived();
    } catch (err: any) {
      console.error("archive lead error", err);
      toast.error(err?.message || (isRtl ? "تعذر أرشفة الـ Lead" : "Erreur lors de l'archivage"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl p-6">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
              <Archive className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-foreground">
                {isRtl ? "أرشفة Lead" : "Archiver le lead"}
              </DialogTitle>
              <p className="text-caption text-muted-foreground mt-0.5">
                {lead?.full_name} ({lead?.reference})
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-3">
          <div className="p-3.5 rounded-xl bg-muted/60 border border-border/70 flex items-start gap-2.5 text-small text-muted-foreground">
            <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p>
              {isRtl
                ? "سيتم إخفاء هذا الـLead من القائمة النشطة في مركز المبيعات، ويمكنك استرجاعه إلى العمليات في أي وقت من خلال فلتر الأرشيف."
                : "Ce lead sera masqué du pipeline actif et pourra être restauré à tout moment depuis les archives."}
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-caption font-semibold text-foreground">
              {isRtl ? "سبب الأرشفة (اختياري)" : "Motif d'archivage (optionnel)"}
            </label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={isRtl ? "مثال: تم إرجاء السفر للموسم القادم" : "Ex: voyage reporté..."}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {isRtl ? "إلغاء" : "Annuler"}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleArchive}
            disabled={loading}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin me-2" />}
            <span>{isRtl ? "تأكيد الأرشفة" : "Confirmer"}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
