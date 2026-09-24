import React, { useState, useEffect } from "react";
import { Check, RotateCcw, ListChecks } from "lucide-react";

export interface ChecklistItem {
  id: string;
  stage: string;
  details: string;
}

export const DEFAULT_CHECKLIST: ChecklistItem[] = [
  {
    id: "before-ihram",
    stage: "قبل الإحرام",
    details:
      "تقليم الأظافر، إزالة الشعر، الاغتسال، تطيب الرجل في بدنه لا ثوبه، وخلع الملابس المخيطة للرجل.",
  },
  {
    id: "miqat-talbiyah",
    stage: "الميقات والتلبية",
    details:
      "عقد النية («لبيك اللهم عمرة»)، والتلبية بـ «لبيك اللهم لبيك...» حتى الشروع في الطواف.",
  },
  {
    id: "tawaf",
    stage: "الطواف (7 أشواط)",
    details:
      "كشف الكتف الأيمن للرجل، البدء من الحجر الأسود، الرمل في الأشواط الثلاثة الأولى، دعاء {ربنا آتنا...} بين الركنين.",
  },
  {
    id: "after-tawaf",
    stage: "بعد الطواف",
    details:
      "تغطية الكتف الأيمن، صلاة ركعتين خلف مقام إبراهيم (أو في أي مكان بالحرم) بسورتي الكافرون والإخلاص.",
  },
  {
    id: "sai",
    stage: "السعي (7 أشواط)",
    details:
      "البدء بالصفا {إن الصفا والمروة...}، الذكر والتكبير، الركض بين العلمين الأخضرين للرجال فقط، والختام بالمروة.",
  },
  {
    id: "tahallul",
    stage: "التحلل",
    details: "حلق الرأس أو تقصيره شاملاً للرجل (والحلق أفضل)، وتقصير قدر أنملة للمرأة.",
  },
];

const STORAGE_KEY = "janat_sahara_umrah_checklist_progress";

export function InteractiveChecklist({ items = DEFAULT_CHECKLIST }: { items?: ChecklistItem[] }) {
  const [checkedIds, setCheckedIds] = useState<Record<string, boolean>>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setCheckedIds(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
    setMounted(true);
  }, []);

  const toggle = (id: string) => {
    setCheckedIds((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore localStorage errors
      }
      return next;
    });
  };

  const reset = () => {
    setCheckedIds({});
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore localStorage errors
    }
  };

  const completedCount = items.filter((item) => checkedIds[item.id]).length;
  const progressPercent = Math.round((completedCount / items.length) * 100);

  return (
    <div className="my-8 overflow-hidden rounded-card border border-border-subtle bg-card shadow-xs">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border-subtle bg-surface-raised/60 p-5 md:p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ListChecks className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <h3 className="text-h4 font-bold text-foreground">قائمة مراجعة المعتمر</h3>
            <p className="text-caption text-muted-foreground">
              يمكنك تعليم الخطوات المنجزة لحفظ تقدمك أثناء أداء النسك
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-caption font-semibold text-muted-foreground">
            {completedCount} من {items.length} منجزة
          </span>
          {completedCount > 0 && (
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-caption text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              title="إعادة ضبط القائمة"
            >
              <RotateCcw className="h-3 w-3" />
              <span>إعادة ضبط</span>
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-1.5 w-full bg-muted">
        <div
          className="h-full bg-primary transition-all duration-300 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* List */}
      <div className="divide-y divide-border-subtle/70">
        {items.map((item, idx) => {
          const isDone = mounted && Boolean(checkedIds[item.id]);
          return (
            <div
              key={item.id}
              onClick={() => toggle(item.id)}
              className={`flex cursor-pointer items-start gap-4 p-4 md:p-5 transition-colors ${
                isDone ? "bg-primary/[0.03]" : "hover:bg-muted/30"
              }`}
            >
              {/* Checkbox */}
              <button
                type="button"
                role="checkbox"
                aria-checked={isDone}
                onClick={(e) => {
                  e.stopPropagation();
                  toggle(item.id);
                }}
                className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border transition-all ${
                  isDone
                    ? "border-primary bg-primary text-primary-foreground shadow-xs"
                    : "border-border-strong bg-surface hover:border-primary"
                }`}
              >
                {isDone && <Check className="h-4 w-4 stroke-[2.5]" />}
              </button>

              {/* Text content */}
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-caption font-bold text-primary">0{idx + 1}</span>
                  <h4
                    className={`text-body font-bold transition-all ${
                      isDone ? "line-through text-muted-foreground" : "text-foreground"
                    }`}
                  >
                    {item.stage}
                  </h4>
                </div>
                <p
                  className={`text-small leading-relaxed transition-all ${
                    isDone ? "text-muted-foreground/70" : "text-muted-foreground"
                  }`}
                >
                  {item.details}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
