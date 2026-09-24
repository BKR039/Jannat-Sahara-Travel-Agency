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
import { deleteLead, type LeadRow } from "@/lib/leads/leads.functions";
import { toast } from "sonner";
import { Trash2, AlertTriangle, ShieldCheck, Loader2 } from "lucide-react";

interface DeleteLeadDialogProps {
  lead: LeadRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLeadDeleted: () => void;
  isRtl?: boolean;
}

export function DeleteLeadDialog({
  lead,
  open,
  onOpenChange,
  onLeadDeleted,
  isRtl = true,
}: DeleteLeadDialogProps) {
  const deleteLeadFn = useServerFn(deleteLead);
  const [confirmationInput, setConfirmationInput] = useState("");
  const [loading, setLoading] = useState(false);

  const CONFIRM_KEYWORD = isRtl ? "حذف" : "SUPPRIMER";
  const isConfirmed = confirmationInput.trim().toUpperCase() === CONFIRM_KEYWORD;

  const handleDelete = async () => {
    if (!lead || !isConfirmed) return;
    setLoading(true);
    try {
      const res = await deleteLeadFn({
        data: { leadId: lead.id },
      });

      toast.success(res.message);
      setConfirmationInput("");
      onOpenChange(false);
      onLeadDeleted();
    } catch (err: any) {
      console.error("delete lead error", err);
      toast.error(err?.message || (isRtl ? "تعذر حذف الـ Lead" : "Erreur de suppression"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!val) setConfirmationInput("");
        onOpenChange(val);
      }}
    >
      <DialogContent className="max-w-md rounded-2xl p-6 border-red-500/30">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-600 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-foreground">
                {isRtl ? "حذف Lead نهائيًا" : "Suppression définitive du lead"}
              </DialogTitle>
              <p className="text-caption text-muted-foreground mt-0.5">
                {lead?.full_name} ({lead?.reference})
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-3">
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-small text-red-700 dark:text-red-300 space-y-1.5">
            <p className="font-bold">{isRtl ? "تنبيه هام:" : "Attention :"}</p>
            <p className="text-caption leading-relaxed">
              {isRtl
                ? "سيتم حذف سجل الـLead نهائيًا من قاعدة البيانات ولا يمكن التراجع عن هذا الإجراء. إذا كنت ترغب في إخفائه فقط مع الاحتفاظ بتاريخه، استخدم خيار «الأرشفة» بدلاً من ذلك."
                : "Cette action supprimera définitivement le lead. Si vous souhaitez simplement le masquer, utilisez plutôt l'archivage."}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-muted/60 border border-border/70 flex items-start gap-2.5 text-caption text-muted-foreground">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <p>
              {isRtl
                ? "حماية هوية العميل: في حال كان العميل يمتلك حجوزات، مدفوعات، أقساط، أو طلبات أخرى، فلن يتم مسح ملف العميل وسيبقى سجله المالي محميًا بالكامل."
                : "Protection de l'identité : les réservations et transactions financières existantes du client ne seront en aucun cas supprimées."}
            </p>
          </div>

          <div className="space-y-2 pt-1">
            <label className="text-caption font-semibold text-foreground">
              {isRtl ? (
                <span>
                  للتأكيد، يرجى كتابة كلمة <strong className="text-red-600">حذف</strong> أدناه:
                </span>
              ) : (
                <span>
                  Pour confirmer, tapez <strong className="text-red-600">SUPPRIMER</strong>{" "}
                  ci-dessous :
                </span>
              )}
            </label>
            <Input
              value={confirmationInput}
              onChange={(e) => setConfirmationInput(e.target.value)}
              placeholder={CONFIRM_KEYWORD}
              className="text-center font-bold"
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
            onClick={handleDelete}
            disabled={!isConfirmed || loading}
            variant="destructive"
            className="min-w-[120px]"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin me-2" />}
            <span>{isRtl ? "حذف نهائي" : "Supprimer"}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
