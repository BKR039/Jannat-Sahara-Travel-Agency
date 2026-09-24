import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CheckSquare,
  X,
  RefreshCw,
  UserCheck,
  Archive,
  Trash2,
  Download,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { LeadStatus } from "@/lib/leads/leads.schema";

interface BulkActionBarProps {
  selectedCount: number;
  assignees?: Array<{ id: string; name: string; email: string }>;
  onClearSelection: () => void;
  onChangeStatus: (status: LeadStatus) => void;
  onAssign: (assigneeId: string) => void;
  onArchive: () => void;
  onDelete: () => void;
  onExport: () => void;
  canDelete?: boolean;
  isRtl?: boolean;
}

export function BulkActionBar({
  selectedCount,
  assignees = [],
  onClearSelection,
  onChangeStatus,
  onAssign,
  onArchive,
  onDelete,
  onExport,
  canDelete = true,
  isRtl = true,
}: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 start-1/2 -translate-x-1/2 z-40 max-w-2xl w-[92%] sm:w-auto animate-in fade-in slide-in-from-bottom-4 duration-200">
      <div className="bg-zinc-900/95 text-white dark:bg-zinc-900/95 dark:text-zinc-100 backdrop-blur-md px-4 py-3 rounded-2xl shadow-2xl border border-white/10 flex flex-wrap items-center justify-between sm:justify-start gap-2.5 sm:gap-3">
        {/* Count Badge & Clear */}
        <div className="flex items-center gap-2 pe-2 border-e border-white/15">
          <div className="w-7 h-7 rounded-lg bg-primary text-primary-foreground font-bold font-mono text-small flex items-center justify-center">
            {selectedCount}
          </div>
          <span className="text-small font-semibold whitespace-nowrap">
            {isRtl ? "محددة" : "sélectionnés"}
          </span>
          <button
            type="button"
            onClick={onClearSelection}
            className="text-white/60 hover:text-white transition-colors p-1 rounded-md cursor-pointer"
            title={isRtl ? "إلغاء التحديد" : "Désélectionner"}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center flex-wrap gap-1.5 sm:gap-2">
          {/* Change Status Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                size="xs"
                variant="ghost"
                className="text-white hover:text-white"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{isRtl ? "تغيير الحالة" : "Statut"}</span>
                <ChevronDown className="w-3 h-3 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-44">
              <DropdownMenuLabel className="text-caption text-muted-foreground">
                {isRtl ? "اختر الحالة الجديدة" : "Nouveau statut"}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onChangeStatus("new")} className="cursor-pointer">
                {isRtl ? "جديدة (New)" : "Nouveau"}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onChangeStatus("contacted")}
                className="cursor-pointer"
              >
                {isRtl ? "تم التواصل (Contacted)" : "Contacté"}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onChangeStatus("qualified")}
                className="cursor-pointer"
              >
                {isRtl ? "مؤهل (Qualified)" : "Qualifié"}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onChangeStatus("offer_sent")}
                className="cursor-pointer"
              >
                {isRtl ? "عرض مرسل (Offer Sent)" : "Offre envoyée"}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onChangeStatus("follow_up")}
                className="cursor-pointer"
              >
                {isRtl ? "متابعة (Follow-up)" : "Relance"}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onChangeStatus("confirmed")}
                className="cursor-pointer text-emerald-600 font-bold"
              >
                {isRtl ? "مؤكد (Confirmed)" : "Confirmé"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onChangeStatus("lost")}
                className="cursor-pointer text-destructive"
              >
                {isRtl ? "ملغي / غير مهتم (Lost)" : "Perdu"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Assign Team Member Dropdown */}
          {assignees.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  size="xs"
                  variant="ghost"
                  className="text-white hover:text-white"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>{isRtl ? "تعيين مسؤول" : "Assigner"}</span>
                  <ChevronDown className="w-3 h-3 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-48">
                <DropdownMenuLabel className="text-caption text-muted-foreground">
                  {isRtl ? "اختر المسؤول" : "Assigner à"}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {assignees.map((a) => (
                  <DropdownMenuItem
                    key={a.id}
                    onClick={() => onAssign(a.id)}
                    className="cursor-pointer text-small"
                  >
                    {a.name || a.email}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Export Selected to CSV */}
          <Button
            type="button"
            size="xs"
            variant="ghost"
            onClick={onExport}
            className="text-white hover:text-white"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isRtl ? "تصدير" : "Exporter"}</span>
          </Button>

          {/* Archive Selected */}
          <Button
            type="button"
            size="xs"
            variant="ghost"
            onClick={onArchive}
            className="text-amber-400 hover:text-amber-300"
          >
            <Archive className="w-3.5 h-3.5" />
            <span>{isRtl ? "أرشفة" : "Archiver"}</span>
          </Button>

          {/* Delete Selected (Protected) */}
          {canDelete && (
            <Button
              type="button"
              size="xs"
              variant="destructive"
              onClick={onDelete}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isRtl ? "حذف" : "Supprimer"}</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
