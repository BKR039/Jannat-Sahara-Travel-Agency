import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Validator } from "./useSiteSettings";

export interface ContactFieldSpec {
  key: string;
  label: string;
  icon: string;
  hint?: string;
  placeholder?: string;
  wide?: boolean;
  multiline?: boolean;
  sort_order: number;
  validate?: Validator;
}

interface Row {
  id: string;
  key: string;
  label: string | null;
  value: string;
  icon: string | null;
  sort_order: number | null;
}

const AUTOSAVE_DELAY = 1200;

/**
 * Maps the flat contact_info key/value table onto a friendly, typed form model
 * with validation and debounced auto-save.
 */
export function useContactSettings(specs: ContactFieldSpec[]) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["admin-contact-info"] as const,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_info")
        .select("id,key,label,value,icon,sort_order")
        .order("sort_order");
      if (error) throw error;
      return data as Row[];
    },
  });

  const specKeys = useMemo(() => specs.map((s) => s.key).join("|"), [specs]);

  const remote = useMemo(() => {
    const map: Record<string, string> = {};
    for (const s of specs) map[s.key] = "";
    for (const r of query.data ?? []) if (r.key in map) map[r.key] = r.value ?? "";
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data, specKeys]);

  const [form, setForm] = useState<Record<string, string>>(remote);
  useEffect(() => setForm(remote), [remote]);

  const errors = useMemo(() => {
    const out: Record<string, string | null> = {};
    for (const s of specs) out[s.key] = s.validate ? s.validate(form[s.key] ?? "") : null;
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, specKeys]);

  const hasErrors = Object.values(errors).some(Boolean);
  const dirty = specs.some((s) => (form[s.key] ?? "") !== (remote[s.key] ?? ""));
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const save = useMutation({
    mutationFn: async (values: Record<string, string>) => {
      const rows = query.data ?? [];
      for (const spec of specs) {
        const next = (values[spec.key] ?? "").trim();
        if (next === (remote[spec.key] ?? "").trim()) continue;
        const existing = rows.find((r) => r.key === spec.key);
        if (existing) {
          if (!next) {
            const { error } = await supabase.from("contact_info").delete().eq("id", existing.id);
            if (error) throw error;
          } else {
            const { error } = await supabase
              .from("contact_info")
              .update({
                value: next,
                label: existing.label ?? spec.label,
                icon: existing.icon ?? spec.icon,
              })
              .eq("id", existing.id);
            if (error) throw error;
          }
        } else if (next) {
          const { error } = await supabase.from("contact_info").insert({
            key: spec.key,
            label: spec.label,
            value: next,
            icon: spec.icon,
            sort_order: spec.sort_order,
          });
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      setLastSaved(new Date());
      qc.invalidateQueries({ queryKey: ["admin-contact-info"] });
      qc.invalidateQueries({ queryKey: ["contact_info"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveRef = useRef(save);
  saveRef.current = save;

  useEffect(() => {
    if (!dirty || hasErrors || query.isLoading) return;
    const t = setTimeout(() => saveRef.current.mutate(form), AUTOSAVE_DELAY);
    return () => clearTimeout(t);
  }, [form, dirty, hasErrors, query.isLoading]);

  const set = useCallback((key: string, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
  }, []);

  return {
    loading: query.isLoading,
    form,
    set,
    errors,
    hasErrors,
    dirty,
    saving: save.isPending,
    lastSaved,
    saveNow: () => save.mutate(form),
    discard: () => setForm(remote),
    save,
  };
}
