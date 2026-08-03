import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check, ChevronDown, Loader2, MapPin, Plus, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { Field, FieldGrid, ImageField, SettingsCard, SettingsSection, TextField } from "./parts";
import { email as emailValidator, numberRange, required, url } from "./useSiteSettings";
import type { Database } from "@/integrations/supabase/types";

type Branch = Database["public"]["Tables"]["branches"]["Row"];

interface Draft {
  name: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  working_hours: string;
  google_maps_url: string;
  image: string;
  latitude: string;
  longitude: string;
  is_active: boolean;
  is_main_branch: boolean;
}

function toDraft(b: Branch): Draft {
  return {
    name: b.name ?? "",
    city: b.city ?? "",
    address: b.address ?? "",
    phone: b.phone ?? "",
    email: b.email ?? "",
    working_hours: b.working_hours ?? "",
    google_maps_url: b.google_maps_url ?? "",
    image: b.image ?? "",
    latitude: String(b.latitude ?? ""),
    longitude: String(b.longitude ?? ""),
    is_active: b.is_active,
    is_main_branch: b.is_main_branch,
  };
}

function validate(d: Draft) {
  return {
    name: required(d.name),
    city: required(d.city),
    address: required(d.address),
    email: emailValidator(d.email),
    google_maps_url: url(d.google_maps_url),
    latitude: numberRange(-90, 90)(d.latitude) ?? required(d.latitude),
    longitude: numberRange(-180, 180)(d.longitude) ?? required(d.longitude),
  };
}

export function BranchesSection() {
  const qc = useQueryClient();
  const [open, setOpen] = useState<string | null>(null);

  const list = useQuery({
    queryKey: ["admin-branches"] as const,
    queryFn: async () => {
      const { data, error } = await supabase.from("branches").select("*").order("sort_order");
      if (error) throw error;
      return data as Branch[];
    },
  });

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["admin-branches"] });
    qc.invalidateQueries({ queryKey: ["branches"] });
  }

  const create = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("branches")
        .insert({
          name: "New branch",
          city: "Tunis",
          address: "Address to complete",
          latitude: 36.8065,
          longitude: 10.1815,
          sort_order: (list.data?.length ?? 0) + 1,
          is_active: false,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (id) => {
      toast.success("Branch added — complete its details");
      setOpen(id);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (list.isLoading) return <Skeleton className="h-72 w-full rounded-2xl" />;

  const branches = list.data ?? [];

  return (
    <SettingsSection
      title="Branches"
      description="Every office shown on the public map. Edits auto-save per branch."
    >
      <SettingsCard
        title={`${branches.length} branch${branches.length === 1 ? "" : "es"}`}
        description="Only active branches appear on the website."
        actions={
          <Button size="sm" onClick={() => create.mutate()} disabled={create.isPending}>
            {create.isPending ? (
              <Loader2 className="me-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="me-2 h-4 w-4" />
            )}
            Add branch
          </Button>
        }
      >
        {branches.length ? (
          <div className="space-y-3">
            {branches.map((b) => (
              <BranchCard
                key={b.id}
                branch={b}
                expanded={open === b.id}
                onToggle={() => setOpen(open === b.id ? null : b.id)}
                onChanged={invalidate}
              />
            ))}
          </div>
        ) : (
          <p className="text-small text-muted-foreground">
            No branches yet. Add your first office above.
          </p>
        )}
      </SettingsCard>
    </SettingsSection>
  );
}

function BranchCard({
  branch,
  expanded,
  onToggle,
  onChanged,
}: {
  branch: Branch;
  expanded: boolean;
  onToggle: () => void;
  onChanged: () => void;
}) {
  const qc = useQueryClient();
  const remote = useMemo(() => toDraft(branch), [branch]);
  const [draft, setDraft] = useState<Draft>(remote);
  useEffect(() => setDraft(remote), [remote]);

  const errors = validate(draft);
  const hasErrors = Object.values(errors).some(Boolean);
  const dirty = JSON.stringify(draft) !== JSON.stringify(remote);

  const save = useMutation({
    mutationFn: async (d: Draft) => {
      const { error } = await supabase
        .from("branches")
        .update({
          name: d.name.trim(),
          city: d.city.trim(),
          address: d.address.trim(),
          phone: d.phone.trim() || null,
          email: d.email.trim() || null,
          working_hours: d.working_hours.trim() || null,
          google_maps_url: d.google_maps_url.trim() || null,
          image: d.image.trim() || null,
          latitude: Number(d.latitude),
          longitude: Number(d.longitude),
          is_active: d.is_active,
        })
        .eq("id", branch.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-branches"] });
      qc.invalidateQueries({ queryKey: ["branches"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveRef = useRef(save);
  saveRef.current = save;

  useEffect(() => {
    if (!dirty || hasErrors) return;
    const t = setTimeout(() => saveRef.current.mutate(draft), 1200);
    return () => clearTimeout(t);
  }, [draft, dirty, hasErrors]);

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
      toast.success("Main branch updated");
      onChanged();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("branches").delete().eq("id", branch.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Branch deleted");
      onChanged();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function patch(p: Partial<Draft>) {
    setDraft((d) => ({ ...d, ...p }));
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border-subtle bg-card">
      <div className="flex items-center gap-3 px-4 py-3 sm:px-5">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent text-primary">
            <MapPin className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="flex items-center gap-2 text-body font-semibold">
              <span className="truncate">{draft.name || "Untitled branch"}</span>
              {branch.is_main_branch && (
                <span className="rounded-full bg-secondary-muted px-2 py-0.5 text-caption font-medium text-brand-gold">
                  Main
                </span>
              )}
            </span>
            <span className="block truncate text-caption text-muted-foreground">
              {draft.city} · {draft.address || "no address"}
            </span>
          </span>
        </button>
        <span className="flex shrink-0 items-center gap-2">
          <span className="hidden text-caption text-muted-foreground sm:inline">
            {save.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : dirty ? (
              "Unsaved"
            ) : (
              <Check className="h-3.5 w-3.5 text-success" />
            )}
          </span>
          <Switch
            checked={draft.is_active}
            onCheckedChange={(v) => patch({ is_active: v })}
            aria-label="Branch visible on website"
          />
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              expanded && "rotate-180",
            )}
          />
        </span>
      </div>

      {expanded && (
        <div className="border-t border-border-subtle p-4 sm:p-5">
          <FieldGrid>
            <TextField
              label="Branch name"
              error={errors.name}
              value={draft.name}
              onChange={(v) => patch({ name: v })}
            />
            <TextField
              label="City"
              error={errors.city}
              value={draft.city}
              onChange={(v) => patch({ city: v })}
            />
            <Field label="Address" error={errors.address} wide>
              <Textarea
                rows={2}
                value={draft.address}
                onChange={(e) => patch({ address: e.target.value })}
              />
            </Field>
            <TextField
              label="Phone"
              placeholder="+216 71 234 567"
              value={draft.phone}
              onChange={(v) => patch({ phone: v })}
            />
            <TextField
              label="Email"
              error={errors.email}
              value={draft.email}
              onChange={(v) => patch({ email: v })}
            />
            <TextField
              label="Working hours"
              placeholder="Mon – Sat: 9:00 – 18:00"
              value={draft.working_hours}
              onChange={(v) => patch({ working_hours: v })}
            />
            <TextField
              label="Google Maps link"
              error={errors.google_maps_url}
              value={draft.google_maps_url}
              onChange={(v) => patch({ google_maps_url: v })}
            />
            <TextField
              label="Latitude"
              hint="Between -90 and 90."
              error={errors.latitude}
              value={draft.latitude}
              onChange={(v) => patch({ latitude: v })}
            />
            <TextField
              label="Longitude"
              hint="Between -180 and 180."
              error={errors.longitude}
              value={draft.longitude}
              onChange={(v) => patch({ longitude: v })}
            />
            <ImageField
              label="Branch photo"
              hint="Optional. Shown on the branch card."
              folder={`branches/${branch.id}`}
              value={draft.image}
              onChange={(v) => patch({ image: v })}
            />
          </FieldGrid>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle pt-4">
            <Button
              variant="outline"
              size="sm"
              disabled={branch.is_main_branch || setMain.isPending}
              onClick={() => setMain.mutate()}
            >
              <Star className="me-2 h-4 w-4" />
              {branch.is_main_branch ? "Main branch" : "Set as main branch"}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-destructive">
                  <Trash2 className="me-2 h-4 w-4" /> Delete branch
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this branch?</AlertDialogTitle>
                  <AlertDialogDescription>
                    “{draft.name}” will be removed from the website and the map. This cannot be
                    undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => remove.mutate()}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}
    </div>
  );
}
