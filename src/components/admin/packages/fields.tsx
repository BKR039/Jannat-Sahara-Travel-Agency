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
import { EmptyState } from "@/components/admin/ui";
import { uploadMedia } from "@/lib/admin/media";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { ItineraryItem } from "./model";

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
                  aria-label="Move up"
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label="Move down"
                  disabled={i === items.length - 1}
                  onClick={() => move(i, 1)}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label="Remove"
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

/* ------------------------------ itinerary editor ---------------------------- */

export function ItineraryEditor({
  items,
  onChange,
}: {
  items: ItineraryItem[];
  onChange: (next: ItineraryItem[]) => void;
}) {
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
          title="No itinerary days yet"
          description="Break the journey down day by day so travellers know exactly what to expect."
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
                    aria-label="Move up"
                    disabled={i === 0}
                    onClick={() => move(i, -1)}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label="Move down"
                    disabled={i === items.length - 1}
                    onClick={() => move(i, 1)}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label="Remove day"
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
                  placeholder="Day 1"
                  className="bg-card"
                  onChange={(e) => set(i, { day: e.target.value })}
                />
                <Input
                  value={item.title}
                  placeholder="Arrival in Jeddah"
                  className="bg-card"
                  onChange={(e) => set(i, { title: e.target.value })}
                />
                <Textarea
                  rows={2}
                  value={item.description}
                  placeholder="What happens on this day…"
                  className="bg-card md:col-span-2"
                  onChange={(e) => set(i, { description: e.target.value })}
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
          onChange([...items, { day: `Day ${items.length + 1}`, title: "", description: "" }])
        }
      >
        <Plus className="me-2 h-4 w-4" /> Add day
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
          placeholder="umrah ramadan, omra tunisie…"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add();
            }
          }}
        />
        <Button type="button" variant="outline" onClick={add} disabled={!draft.trim()}>
          Add
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
            placeholder="Or paste an image URL"
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
            Add
          </Button>
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="No gallery images"
          description="Upload the photos travellers will see on the package page."
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
                    aria-label="Move earlier"
                    disabled={i === 0}
                    onClick={() => move(i, -1)}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label="Move later"
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
                  aria-label="Remove image"
                  className="text-destructive"
                  onClick={() => onChange(items.filter((_, idx) => idx !== i))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              {i === 0 && (
                <span className="absolute start-2 top-2 rounded-full bg-primary px-2 py-0.5 text-caption font-semibold text-primary-foreground">
                  Main
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
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function pick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      onChange(await uploadMedia(file, "packages/brochures"));
      toast.success("Brochure uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Field label={label} hint={hint} wide>
      <div className="flex flex-wrap items-center gap-2">
        <Input value={value} placeholder="https://…/brochure.pdf" onChange={(e) => onChange(e.target.value)} />
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
            <FileText className="h-4 w-4" /> Open
          </a>
        )}
      </div>
    </Field>
  );
}
