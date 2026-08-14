import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Mail,
  MapPin,
  MoreHorizontal,
  Phone,
  Plus,
  Star,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Field, FieldGrid, ImageField, SettingsCard, SettingsSection, TextField } from "./parts";
import type { Database } from "@/integrations/supabase/types";

type Branch = Database["public"]["Tables"]["branches"]["Row"];

/* --------------------------------- drafts --------------------------------- */

interface Draft {
  name: string;
  name_fr: string;
  city: string;
  city_fr: string;
  address: string;
  address_fr: string;
  phone: string;
  email: string;
  working_hours: string;
  working_hours_fr: string;
  google_maps_url: string;
  image: string;
  latitude: string;
  longitude: string;
  is_active: boolean;
  is_main_branch: boolean;
}

const EMPTY: Draft = {
  name: "",
  name_fr: "",
  city: "",
  city_fr: "",
  address: "",
  address_fr: "",
  phone: "",
  email: "",
  working_hours: "",
  working_hours_fr: "",
  google_maps_url: "",
  image: "",
  latitude: "36.8065",
  longitude: "10.1815",
  is_active: true,
  is_main_branch: false,
};

function toDraft(b: Branch): Draft {
  return {
    name: b.name ?? "",
    name_fr: b.name_fr ?? "",
    city: b.city ?? "",
    city_fr: b.city_fr ?? "",
    address: b.address ?? "",
    address_fr: b.address_fr ?? "",
    phone: b.phone ?? "",
    email: b.email ?? "",
    working_hours: b.working_hours ?? "",
    working_hours_fr: b.working_hours_fr ?? "",
    google_maps_url: b.google_maps_url ?? "",
    image: b.image ?? "",
    latitude: String(b.latitude ?? ""),
    longitude: String(b.longitude ?? ""),
    is_active: b.is_active,
    is_main_branch: b.is_main_branch,
  };
}

function toRow(d: Draft) {
  return {
    name: d.name.trim(),
    name_fr: d.name_fr.trim() || null,
    city: d.city.trim(),
    city_fr: d.city_fr.trim() || null,
    address: d.address.trim(),
    address_fr: d.address_fr.trim() || null,
    phone: d.phone.trim() || null,
    email: d.email.trim() || null,
    working_hours: d.working_hours.trim() || null,
    working_hours_fr: d.working_hours_fr.trim() || null,
    google_maps_url: d.google_maps_url.trim() || null,
    image: d.image.trim() || null,
    latitude: Number(d.latitude),
    longitude: Number(d.longitude),
    is_active: d.is_active,
  };
}

type Errors = Partial<Record<keyof Draft, string>>;

function validate(d: Draft, e: (k: string) => string): Errors {
  const out: Errors = {};
  if (!d.name.trim()) out.name = e("required");
  if (!d.city.trim()) out.city = e("required");
  if (!d.address.trim()) out.address = e("required");
  if (d.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email.trim())) out.email = e("email");
  if (d.phone.trim() && !/^[+\d][\d\s()-]{5,}$/.test(d.phone.trim())) out.phone = e("phone");
  if (d.google_maps_url.trim() && !/^https?:\/\/.+/.test(d.google_maps_url.trim()))
    out.google_maps_url = e("url");
  const lat = Number(d.latitude);
  if (!d.latitude.trim() || Number.isNaN(lat) || lat < -90 || lat > 90) out.latitude = e("lat");
  const lng = Number(d.longitude);
  if (!d.longitude.trim() || Number.isNaN(lng) || lng < -180 || lng > 180) out.longitude = e("lng");
  return out;
}

/* ------------------------------ shared hooks ------------------------------ */

function useInvalidate() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["admin-branches"] });
    qc.invalidateQueries({ queryKey: ["branches"] });
  };
}

function useBranches() {
  return useQuery({
    queryKey: ["admin-branches"] as const,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("branches")
        .select("*")
        .order("is_main_branch", { ascending: false })
        .order("sort_order");
      if (error) throw error;
      return data as Branch[];
    },
  });
}

/* ------------------------------- entry point ------------------------------ */

export function BranchesSection() {
  const { t } = useTranslation();
  const tb = (k: string) => t(`adminBranches.${k}`);
  const list = useBranches();
  const invalidate = useInvalidate();
  const [view, setView] = useState<{ mode: "list" } | { mode: "edit"; id: string } | { mode: "new" }>(
    { mode: "list" },
  );

  if (view.mode !== "list") {
    const branch = view.mode === "edit" ? list.data?.find((b) => b.id === view.id) ?? null : null;
    if (view.mode === "edit" && !branch) {
      return <Skeleton className="h-72 w-full rounded-2xl" />;
    }
    return (
      <BranchEditor
        branch={branch}
        nextSort={(list.data?.length ?? 0) + 1}
        onDone={() => {
          invalidate();
          setView({ mode: "list" });
        }}
        onCancel={() => setView({ mode: "list" })}
      />
    );
  }

  if (list.isLoading) return <Skeleton className="h-72 w-full rounded-2xl" />;

  const branches = list.data ?? [];

  return (
    <SettingsSection>
      <SettingsCard
        title={`${branches.length} ${tb("count")}`}
        description={tb("hints.business")}
        actions={
          <Button size="sm" onClick={() => setView({ mode: "new" })}>
            <Plus className="me-2 h-4 w-4" />
            {tb("add")}
          </Button>
        }
      >
        {branches.length ? (
          <div className="space-y-3">
            {branches.map((b) => (
              <BranchRow key={b.id} branch={b} onEdit={() => setView({ mode: "edit", id: b.id })} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary">
              <MapPin className="h-5 w-5" />
            </span>
            <p className="text-small text-muted-foreground">{tb("empty")}</p>
            <Button size="sm" onClick={() => setView({ mode: "new" })}>
              <Plus className="me-2 h-4 w-4" />
              {tb("add")}
            </Button>
          </div>
        )}
      </SettingsCard>
    </SettingsSection>
  );
}

/* --------------------------------- list row -------------------------------- */

function BranchRow({ branch, onEdit }: { branch: Branch; onEdit: () => void }) {
  const { t, i18n } = useTranslation();
  const tb = (k: string) => t(`adminBranches.${k}`);
  const fr = i18n.language.startsWith("fr");
  const invalidate = useInvalidate();
  const [confirm, setConfirm] = useState<"main" | "delete" | null>(null);

  const pick = (base: string | null, alt: string | null) => (fr ? alt || base || "" : base || "");
  const name = pick(branch.name, branch.name_fr) || tb("untitled");
  const city = pick(branch.city, branch.city_fr);
  const address = pick(branch.address, branch.address_fr) || tb("noAddress");

  const toggle = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("branches")
        .update({ is_active: !branch.is_active })
        .eq("id", branch.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(tb(branch.is_active ? "toast.deactivated" : "toast.activated"));
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setMain = useMutation({
    mutationFn: async () => {
      const { error: e1 } = await supabase
        .from("branches")
        .update({ is_main_branch: false })
        .neq("id", branch.id);
      if (e1) throw e1;
      const { error: e2 } = await supabase
        .from("branches")
        .update({ is_main_branch: true })
        .eq("id", branch.id);
      if (e2) throw e2;
    },
    onSuccess: () => {
      toast.success(tb("toast.mainUpdated"));
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("branches").delete().eq("id", branch.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(tb("toast.deleted"));
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="rounded-2xl border border-border-subtle bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          {branch.is_main_branch ? <Star className="h-4 w-4 fill-current" /> : <MapPin className="h-4 w-4" />}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="min-w-0 break-words text-small font-semibold text-foreground">{name}</h4>
            {branch.is_main_branch && (
              <span className="rounded-full bg-secondary-muted px-2 py-0.5 text-caption font-medium text-brand-gold">
                {tb("main")}
              </span>
            )}
            <span
              className={cn(
                "inline-flex items-center gap-1.5 text-caption font-medium",
                branch.is_active ? "text-success" : "text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  branch.is_active ? "bg-success" : "bg-muted-foreground/50",
                )}
              />
              {tb(branch.is_active ? "active" : "inactive")}
            </span>
          </div>

          <p className="mt-1 break-words text-caption leading-relaxed text-muted-foreground">
            {city ? `${city} · ` : ""}
            {address}
          </p>

          {(branch.phone || branch.email) && (
            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-caption text-muted-foreground">
              {branch.phone && (
                <span className="inline-flex items-center gap-1.5" dir="ltr">
                  <Phone className="h-3.5 w-3.5" />
                  {branch.phone}
                </span>
              )}
              {branch.email && (
                <span className="inline-flex items-center gap-1.5 break-all" dir="ltr">
                  <Mail className="h-3.5 w-3.5" />
                  {branch.email}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button size="sm" variant="outline" onClick={onEdit}>
            {tb("edit")}
          </Button>
          <Switch
            checked={branch.is_active}
            disabled={toggle.isPending}
            onCheckedChange={() => toggle.mutate()}
            aria-label={tb(branch.is_active ? "deactivate" : "activate")}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" aria-label={tb("more")}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                disabled={branch.is_main_branch}
                onSelect={() => setConfirm("main")}
              >
                <Star className="me-2 h-4 w-4" />
                {tb("setMain")}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => toggle.mutate()}>
                <Check className="me-2 h-4 w-4" />
                {tb(branch.is_active ? "deactivate" : "activate")}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={() => setConfirm("delete")}
              >
                <Trash2 className="me-2 h-4 w-4" />
                {tb("delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <AlertDialog open={confirm !== null} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {tb(confirm === "delete" ? "deleteTitle" : "setMainTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {tb(confirm === "delete" ? "deleteDesc" : "setMainDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tb("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className={confirm === "delete" ? "bg-destructive text-destructive-foreground" : ""}
              onClick={() => (confirm === "delete" ? remove.mutate() : setMain.mutate())}
            >
              {tb(confirm === "delete" ? "delete" : "confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* --------------------------------- editor --------------------------------- */

function BranchEditor({
  branch,
  nextSort,
  onDone,
  onCancel,
}: {
  branch: Branch | null;
  nextSort: number;
  onDone: () => void;
  onCancel: () => void;
}) {
  const { t, i18n } = useTranslation();
  const tb = (k: string) => t(`adminBranches.${k}`);
  const fr = i18n.language.startsWith("fr");
  const remote = useMemo(() => (branch ? toDraft(branch) : EMPTY), [branch]);
  const [draft, setDraft] = useState<Draft>(remote);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const [mainConfirm, setMainConfirm] = useState(false);

  const errors = validate(draft, (k) => tb(`errors.${k}`));
  const dirty = JSON.stringify(draft) !== JSON.stringify(remote);
  const err = (k: keyof Draft) => (submitted || touched[k] ? errors[k] ?? null : null);

  function patch(p: Partial<Draft>) {
    setDraft((d) => ({ ...d, ...p }));
    setTouched((s) => ({ ...s, ...Object.fromEntries(Object.keys(p).map((k) => [k, true])) }));
  }

  const save = useMutation({
    mutationFn: async () => {
      const row = toRow(draft);
      let id = branch?.id ?? null;
      if (id) {
        const { error } = await supabase.from("branches").update(row).eq("id", id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("branches")
          .insert({ ...row, sort_order: nextSort })
          .select("id")
          .single();
        if (error) throw error;
        id = data.id as string;
      }
      // Main-branch flag is exclusive: clear it everywhere else first.
      if (draft.is_main_branch) {
        const { error: e1 } = await supabase
          .from("branches")
          .update({ is_main_branch: false })
          .neq("id", id);
        if (e1) throw e1;
      }
      const { error: e2 } = await supabase
        .from("branches")
        .update({ is_main_branch: draft.is_main_branch })
        .eq("id", id);
      if (e2) throw e2;
    },
    onSuccess: () => {
      toast.success(tb(branch ? "saved" : "toast.created"));
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function submit() {
    setSubmitted(true);
    if (Object.keys(errors).length) return;
    save.mutate();
  }

  const heading = branch
    ? (fr ? branch.name_fr || branch.name : branch.name) || tb("untitled")
    : tb("newTitle");

  return (
    <SettingsSection>
      <div>
        <button
          type="button"
          onClick={onCancel}
          className="mb-4 inline-flex items-center gap-1.5 text-caption font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5 ltr:inline rtl:hidden" />
          <ArrowRight className="h-3.5 w-3.5 ltr:hidden rtl:inline" />
          {tb("back")}
        </button>
        <h2 className="text-h6 font-bold tracking-tight text-foreground">
          {branch ? tb("editTitle") : tb("newTitle")}
        </h2>
        <p className="mt-1 break-words text-small text-muted-foreground">{heading}</p>
      </div>

      <SettingsCard title={tb("groups.info")}>
        <FieldGrid>
          <TextField
            label={tb("fields.name")}
            error={err("name")}
            value={draft.name}
            onChange={(v) => patch({ name: v })}
          />
          <TextField
            label={tb("fields.city")}
            error={err("city")}
            value={draft.city}
            onChange={(v) => patch({ city: v })}
          />
        </FieldGrid>
      </SettingsCard>

      <SettingsCard title={tb("groups.contact")}>
        <FieldGrid>
          <TextField
            label={tb("fields.phone")}
            placeholder="+216 71 234 567"
            error={err("phone")}
            value={draft.phone}
            onChange={(v) => patch({ phone: v })}
          />
          <TextField
            label={tb("fields.email")}
            type="email"
            error={err("email")}
            value={draft.email}
            onChange={(v) => patch({ email: v })}
          />
        </FieldGrid>
      </SettingsCard>

      <SettingsCard title={tb("groups.location")} description={tb("hints.location")}>
        <FieldGrid>
          <Field label={tb("fields.address")} error={err("address")} wide>
            {(id) => (
              <Textarea
                id={id}
                rows={2}
                value={draft.address}
                onChange={(e) => patch({ address: e.target.value })}
              />
            )}
          </Field>
          <TextField
            label={tb("fields.maps")}
            wide
            placeholder="https://maps.google.com/…"
            error={err("google_maps_url")}
            value={draft.google_maps_url}
            onChange={(v) => patch({ google_maps_url: v })}
          />
          <TextField
            label={tb("fields.lat")}
            error={err("latitude")}
            value={draft.latitude}
            onChange={(v) => patch({ latitude: v })}
          />
          <TextField
            label={tb("fields.lng")}
            error={err("longitude")}
            value={draft.longitude}
            onChange={(v) => patch({ longitude: v })}
          />
        </FieldGrid>
      </SettingsCard>

      <SettingsCard title={tb("groups.business")} description={tb("hints.business")}>
        <div className="space-y-5">
          <FieldGrid>
            <TextField
              label={tb("fields.hours")}
              wide
              placeholder="Lun – Sam : 09:00 – 18:00"
              value={draft.working_hours}
              onChange={(v) => patch({ working_hours: v })}
            />
          </FieldGrid>

          <ToggleRow
            label={tb("fields.mainBranch")}
            checked={draft.is_main_branch}
            onChange={(v) => {
              if (v && !draft.is_main_branch) setMainConfirm(true);
              else patch({ is_main_branch: false });
            }}
          />
          <ToggleRow
            label={tb("fields.active")}
            checked={draft.is_active}
            onChange={(v) => patch({ is_active: v })}
          />

          <ImageField
            label={tb("fields.photo")}
            folder={`branches/${branch?.id ?? "new"}`}
            value={draft.image}
            onChange={(v) => patch({ image: v })}
          />
        </div>
      </SettingsCard>

      <SettingsCard title={tb("groups.translation")} description={tb("hints.translation")}>
        <FieldGrid>
          <TextField
            label={tb("fields.name")}
            value={draft.name_fr}
            onChange={(v) => patch({ name_fr: v })}
          />
          <TextField
            label={tb("fields.city")}
            value={draft.city_fr}
            onChange={(v) => patch({ city_fr: v })}
          />
          <Field label={tb("fields.address")} wide>
            {(id) => (
              <Textarea
                id={id}
                rows={2}
                value={draft.address_fr}
                onChange={(e) => patch({ address_fr: e.target.value })}
              />
            )}
          </Field>
          <TextField
            label={tb("fields.hours")}
            wide
            value={draft.working_hours_fr}
            onChange={(v) => patch({ working_hours_fr: v })}
          />
        </FieldGrid>
      </SettingsCard>

      <div className="sticky bottom-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border-subtle bg-card/95 px-4 py-3 shadow-[0_4px_16px_0_hsl(0_0%_0%/0.06)] backdrop-blur">
        <span className="text-caption text-muted-foreground">
          {save.isPending ? (
            <span className="inline-flex items-center gap-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {tb("saving")}
            </span>
          ) : dirty || !branch ? (
            tb("unsaved")
          ) : (
            <span className="inline-flex items-center gap-1.5 text-success">
              <Check className="h-3.5 w-3.5" />
              {tb("saved")}
            </span>
          )}
        </span>
        <span className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={save.isPending}>
            {tb("cancel")}
          </Button>
          <Button
            size="sm"
            onClick={submit}
            disabled={save.isPending || (!dirty && !!branch)}
          >
            {tb("save")}
          </Button>
        </span>
      </div>

      <AlertDialog open={mainConfirm} onOpenChange={setMainConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tb("setMainTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{tb("setMainDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tb("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => patch({ is_main_branch: true })}>
              {tb("confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SettingsSection>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border-subtle px-4 py-3">
      <span className="text-small font-medium text-foreground">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </div>
  );
}
