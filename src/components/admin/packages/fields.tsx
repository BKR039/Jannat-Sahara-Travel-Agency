import { useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  CloudUpload,
  FileText,
  GripVertical,
  Loader2,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/admin/settings/parts";
import { EmptyState, MissingFrBadge, isEmptyFr } from "@/components/admin/ui";
import { uploadMedia } from "@/lib/admin/media";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { ItineraryItem } from "./model";
import { useTranslation } from "react-i18next";

/* -------------------------------- list editor ------------------------------- */

export function ListEditor({
  items,
  onChange,
  placeholder,
  addLabel = "Add item",
  emptyTitle = "Nothing here yet",
  emptyDescription,
}: {
  items: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  addLabel?: string;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  const { t } = useTranslation("admin");
  function set(i: number, v: string) {
    onChange(items.map((it, idx) => (idx === i ? v : it)));
  }
  function move(i: number, dir: -1 | 1) {
    const next = [...items];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j]!, next[i]!];
    onChange(next);
  }

  return (
    <div className="space-y-3">
      {items.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} icon={Plus} />
      ) : (
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li
              key={i}
              className="flex items-center gap-2 rounded-xl border border-border-subtle bg-surface-sunken/40 p-2"
            >
              <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <Input
                value={item}
                placeholder={placeholder}
                onChange={(e) => set(i, e.target.value)}
                className="border-transparent bg-card"
              />
              <div className="flex shrink-0 items-center">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label={t("ops.fields.moveUp")}
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label={t("ops.fields.moveDown")}
                  disabled={i === items.length - 1}
                  onClick={() => move(i, 1)}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label={t("ops.fields.remove")}
                  className="text-destructive"
                  onClick={() => onChange(items.filter((_, idx) => idx !== i))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...items, ""])}>
        <Plus className="me-2 h-4 w-4" /> {addLabel}
      </Button>
    </div>
  );
}

/* --------------------------- paired AR/FR list editor ------------------------ */

export function PairedListEditor({
  itemsAr,
  onChangeAr,
  itemsFr,
  onChangeFr,
  placeholderAr,
  placeholderFr,
  addLabel = "Add item",
  emptyTitle = "Nothing here yet",
  emptyDescription,
}: {
  itemsAr: string[];
  onChangeAr: (next: string[]) => void;
  itemsFr: string[];
  onChangeFr: (next: string[]) => void;
  placeholderAr?: string;
  placeholderFr?: string;
  addLabel?: string;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  const { t } = useTranslation("admin");
  const fr = itemsAr.map((_, i) => itemsFr[i] ?? "");

  function setAr(i: number, v: string) {
    onChangeAr(itemsAr.map((it, idx) => (idx === i ? v : it)));
  }
  function setFr(i: number, v: string) {
    onChangeFr(fr.map((it, idx) => (idx === i ? v : it)));
  }
  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= itemsAr.length) return;
    const nextAr = [...itemsAr];
    [nextAr[i], nextAr[j]] = [nextAr[j]!, nextAr[i]!];
    const nextFr = [...fr];
    [nextFr[i], nextFr[j]] = [nextFr[j]!, nextFr[i]!];
    onChangeAr(nextAr);
    onChangeFr(nextFr);
  }
  function remove(i: number) {
    onChangeAr(itemsAr.filter((_, idx) => idx !== i));
    onChangeFr(fr.filter((_, idx) => idx !== i));
  }

  return (
    <div className="space-y-3">
      {itemsAr.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} icon={Plus} />
      ) : (
        <ul className="space-y-2">
          {itemsAr.map((item, i) => (
            <li key={i} className="rounded-xl border border-border-subtle bg-surface-sunken/40 p-2">
              <div className="flex items-start gap-2">
                <GripVertical className="mt-2 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                <div className="grid flex-1 gap-2 sm:grid-cols-2">
                  <Input
                    dir="rtl"
                    value={item}
                    placeholder={placeholderAr}
                    onChange={(e) => setAr(i, e.target.value)}
                    className="border-transparent bg-card"
                  />
                  <div className="relative">
                    <Input
                      dir="ltr"
                      value={fr[i] ?? ""}
                      placeholder={placeholderFr}
                      onChange={(e) => setFr(i, e.target.value)}
                      className="border-transparent bg-card"
                    />
                    {isEmptyFr(fr[i]) && (
                      <MissingFrBadge className="absolute -top-2 end-2 bg-card" />
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={t("ops.fields.moveUp")}
                    disabled={i === 0}
                    onClick={() => move(i, -1)}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={t("ops.fields.moveDown")}
                    disabled={i === itemsAr.length - 1}
                    onClick={() => move(i, 1)}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={t("ops.fields.remove")}
                    className="text-destructive"
                    onClick={() => remove(i)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => {
          onChangeAr([...itemsAr, ""]);
          onChangeFr([...fr, ""]);
        }}
      >
        <Plus className="me-2 h-4 w-4" /> {addLabel}
      </Button>
    </div>
  );
}

/* ------------------------------ itinerary editor ---------------------------- */

export function ItineraryEditor({
  items,
  onChange,
}: {
  items: ItineraryItem[];
  onChange: (next: ItineraryItem[]) => void;
}) {
  const { t } = useTranslation("admin");
  function set(i: number, patch: Partial<ItineraryItem>) {
    onChange(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }
  function move(i: number, dir: -1 | 1) {
    const next = [...items];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j]!, next[i]!];
    onChange(next);
  }

  return (
    <div className="space-y-3">
      {items.length === 0 ? (
        <EmptyState
          title={t("ops.fields.noItineraryTitle")}
          description={t("ops.fields.noItineraryDescription")}
          icon={Plus}
        />
      ) : (
        <ol className="space-y-3">
          {items.map((item, i) => (
            <li key={i} className="rounded-xl border border-border-subtle bg-surface-sunken/40 p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">
                  Day {i + 1}
                </span>
                <div className="flex items-center">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={t("ops.fields.moveUp")}
                    disabled={i === 0}
                    onClick={() => move(i, -1)}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={t("ops.fields.moveDown")}
                    disabled={i === items.length - 1}
                    onClick={() => move(i, 1)}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={t("ops.fields.removeDay")}
                    className="text-destructive"
                    onClick={() => onChange(items.filter((_, idx) => idx !== i))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-[160px_1fr]">
                <Input
                  value={item.day}
                  placeholder={t("ops.fields.dayPlaceholder")}
                  className="bg-card"
                  onChange={(e) => set(i, { day: e.target.value })}
                />
                <Input
                  dir="rtl"
                  value={item.title}
                  placeholder={t("ops.fields.titlePlaceholderAr")}
                  className="bg-card"
                  onChange={(e) => set(i, { title: e.target.value })}
                />
                <Textarea
                  dir="rtl"
                  rows={2}
                  value={item.description}
                  placeholder={t("ops.fields.descriptionPlaceholderAr")}
                  className="bg-card md:col-span-2"
                  onChange={(e) => set(i, { description: e.target.value })}
                />
                <div />
                <div className="relative">
                  <Input
                    dir="ltr"
                    value={item.title_fr}
                    placeholder={t("ops.fields.titlePlaceholderFr")}
                    className="bg-card"
                    onChange={(e) => set(i, { title_fr: e.target.value })}
                  />
                  {isEmptyFr(item.title_fr) && (
                    <MissingFrBadge className="absolute -top-2 end-2 bg-card" />
                  )}
                </div>
                <Textarea
                  dir="ltr"
                  rows={2}
                  value={item.description_fr}
                  placeholder={t("ops.fields.descriptionPlaceholderFr")}
                  className="bg-card md:col-span-2"
                  onChange={(e) => set(i, { description_fr: e.target.value })}
                />
                <div />
                <Input
                  dir="ltr"
                  value={item.title_en}
                  placeholder={t("ops.fields.titlePlaceholderEn")}
                  className="bg-card"
                  onChange={(e) => set(i, { title_en: e.target.value })}
                />
                <Textarea
                  dir="ltr"
                  rows={2}
                  value={item.description_en}
                  placeholder={t("ops.fields.descriptionPlaceholderEn")}
                  className="bg-card md:col-span-2"
                  onChange={(e) => set(i, { description_en: e.target.value })}
                />
              </div>
            </li>
          ))}
        </ol>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          onChange([
            ...items,
            {
              day: `Day ${items.length + 1}`,
              title: "",
              description: "",
              title_en: "",
              description_en: "",
              title_fr: "",
              description_fr: "",
            },
          ])
        }
      >
        <Plus className="me-2 h-4 w-4" />
        {t("ops.fields.addDay")}
      </Button>
    </div>
  );
}

/* ------------------------------ keyword editor ------------------------------ */

export function KeywordEditor({
  items,
  onChange,
}: {
  items: string[];
  onChange: (next: string[]) => void;
}) {
  const { t } = useTranslation("admin");
  const [draft, setDraft] = useState("");
  function add() {
    const parts = draft
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .filter((s) => !items.includes(s));
    if (parts.length) onChange([...items, ...parts]);
    setDraft("");
  }
  return (
    <div className="space-y-3">
      {items.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {items.map((k) => (
            <li
              key={k}
              className="inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-caption font-medium text-primary"
            >
              {k}
              <button
                type="button"
                aria-label={`Remove ${k}`}
                onClick={() => onChange(items.filter((x) => x !== k))}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <Input
          value={draft}
          placeholder={t("ops.fields.keywordPlaceholder")}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add();
            }
          }}
        />
        <Button type="button" variant="outline" onClick={add} disabled={!draft.trim()}>
          {t("ops.fields.add")}
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------ gallery manager ----------------------------- */

export function GalleryManager({
  items,
  onChange,
}: {
  items: string[];
  onChange: (next: string[]) => void;
}) {
  const { t } = useTranslation("admin");
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState("");

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    const uploaded: string[] = [];
    for (const file of Array.from(files)) {
      try {
        uploaded.push(await uploadMedia(file, "packages/gallery"));
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Upload failed");
      }
    }
    setBusy(false);
    if (uploaded.length) {
      onChange([...items, ...uploaded]);
      toast.success(`${uploaded.length} image(s) added`);
    }
  }

  function move(i: number, dir: -1 | 1) {
    const next = [...items];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j]!, next[i]!];
    onChange(next);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => void upload(e.target.files)}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? (
            <Loader2 className="me-2 h-4 w-4 animate-spin" />
          ) : (
            <CloudUpload className="me-2 h-4 w-4" />
          )}
          Upload images
        </Button>
        <div className="flex flex-1 gap-2 min-w-[240px]">
          <Input
            value={url}
            placeholder={t("ops.fields.imageUrlPlaceholder")}
            onChange={(e) => setUrl(e.target.value)}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={!url.trim()}
            onClick={() => {
              onChange([...items, url.trim()]);
              setUrl("");
            }}
          >
            {t("ops.fields.add")}
          </Button>
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title={t("ops.fields.noGalleryTitle")}
          description={t("ops.fields.noGalleryDescription")}
          icon={CloudUpload}
        />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((src, i) => (
            <li
              key={`${src}-${i}`}
              className="group relative overflow-hidden rounded-xl border border-border-subtle bg-surface-sunken/40"
            >
              <img
                src={src}
                alt=""
                loading="lazy"
                className="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              />
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-background/85 p-1 opacity-0 backdrop-blur transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                <div className="flex">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={t("ops.fields.moveEarlier")}
                    disabled={i === 0}
                    onClick={() => move(i, -1)}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={t("ops.fields.moveLater")}
                    disabled={i === items.length - 1}
                    onClick={() => move(i, 1)}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label={t("ops.fields.removeImage")}
                  className="text-destructive"
                  onClick={() => onChange(items.filter((_, idx) => idx !== i))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              {i === 0 && (
                <span className="absolute start-2 top-2 rounded-full bg-primary px-2 py-0.5 text-caption font-semibold text-primary-foreground">
                  {t("ops.fields.mainBadge")}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* -------------------------------- file field -------------------------------- */

export function PdfField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const { t } = useTranslation("admin");
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function pick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      onChange(await uploadMedia(file, "packages/brochures"));
      toast.success(t("ops.fields.brochureUploaded"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Field label={label} hint={hint} wide>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={value}
          placeholder={t("ops.fields.brochurePlaceholder")}
          onChange={(e) => onChange(e.target.value)}
        />
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => void pick(e.target.files?.[0])}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? (
            <Loader2 className="me-2 h-4 w-4 animate-spin" />
          ) : (
            <CloudUpload className="me-2 h-4 w-4" />
          )}
          Upload PDF
        </Button>
        {value && (
          <a
            href={value}
            target="_blank"
            rel="noreferrer"
            className={cn(
              "inline-flex items-center gap-1 text-caption font-medium text-primary hover:underline",
            )}
          >
            <FileText className="h-4 w-4" />
            {t("ops.common.open")}
          </a>
        )}
      </div>
    </Field>
  );
}
