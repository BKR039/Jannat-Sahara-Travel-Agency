import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type Validator = (value: string) => string | null;

export interface SettingSpec {
  key: string;
  label: string;
  hint?: string;
  placeholder?: string;
  validate?: Validator;
}

/* --------------------------------- validators -------------------------------- */

export const required: Validator = (v) => (v.trim() ? null : "This field is required");

export const url: Validator = (v) =>
  !v.trim() || /^https?:\/\/\S+$/i.test(v.trim()) ? null : "Enter a full link starting with https://";

export const email: Validator = (v) =>
  !v.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? null : "Enter a valid email address";

export const emailList: Validator = (v) => {
  if (!v.trim()) return null;
  const bad = v
    .split(/[,;]/)
    .map((p) => p.trim())
    .filter(Boolean)
    .find((p) => email(p) !== null);
  return bad ? `“${bad}” is not a valid email address` : null;
};

export const hexColor: Validator = (v) =>
  !v.trim() || /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v.trim()) ? null : "Use a hex value like #EE5A24";

export function maxLen(n: number): Validator {
  return (v) => (v.length <= n ? null : `Keep this under ${n} characters (${v.length} now)`);
}

export function numberRange(min: number, max: number): Validator {
  return (v) => {
    if (!v.trim()) return null;
    const n = Number(v);
    if (!Number.isFinite(n)) return "Enter a number";
    return n >= min && n <= max ? null : `Enter a number between ${min} and ${max}`;
  };
}

export function combine(...validators: Validator[]): Validator {
  return (v) => {
    for (const fn of validators) {
      const e = fn(v);
      if (e) return e;
    }
    return null;
  };
}

/* ----------------------------------- hook ----------------------------------- */

interface Row {
  id: string;
  key: string;
  value: string;
  group_name: string;
}

const AUTOSAVE_DELAY = 1200;

/**
 * Generic settings-group editor over the flat `site_settings` key/value store.
 * Provides validation, dirty tracking and debounced auto-save.
 */
export function useSiteSettings(group: string, specs: SettingSpec[]) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["admin-site-settings", group] as const,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("id,key,value,group_name")
        .eq("group_name", group);
      if (error) throw error;
      return data as Row[];
    },
  });

  const specKeys = useMemo(() => specs.map((s) => s.key).join("|"), [specs]);

  const remote = useMemo(() => {
    const map: Record<string, string> = {};
    for (const s of specs) map[s.key] = "";
    for (const r of query.data ?? []) map[r.key] = r.value ?? "";
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
      const changed = specs.filter((s) => (values[s.key] ?? "") !== (remote[s.key] ?? ""));
      if (!changed.length) return;
      const { error } = await supabase.from("site_settings").upsert(
        changed.map((s) => ({
          key: s.key,
          value: (values[s.key] ?? "").trim(),
          group_name: group,
        })),
        { onConflict: "key" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      setLastSaved(new Date());
      qc.invalidateQueries({ queryKey: ["admin-site-settings", group] });
      qc.invalidateQueries({ queryKey: ["site_settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveRef = useRef(save);
  saveRef.current = save;

  // Debounced auto-save — only when the form is valid.
  useEffect(() => {
    if (!dirty || hasErrors || query.isLoading) return;
    const t = setTimeout(() => saveRef.current.mutate(form), AUTOSAVE_DELAY);
    return () => clearTimeout(t);
  }, [form, dirty, hasErrors, query.isLoading]);

  const set = useCallback((key: string, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
  }, []);

  const bool = useCallback((key: string) => (form[key] ?? "") === "true", [form]);
  const setBool = useCallback((key: string, v: boolean) => set(key, v ? "true" : "false"), [set]);

  return {
    loading: query.isLoading,
    form,
    set,
    bool,
    setBool,
    errors,
    hasErrors,
    dirty,
    saving: save.isPending,
    lastSaved,
    saveNow: () => save.mutate(form),
    discard: () => setForm(remote),
  };
}

export type SiteSettingsForm = ReturnType<typeof useSiteSettings>;
