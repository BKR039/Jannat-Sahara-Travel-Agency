import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import i18n from "@/lib/i18n";

/** Validation copy comes from the admin dictionary, resolved at call time. */
const tv = (key: string, options?: Record<string, unknown>) =>
  i18n.t(`content.settings.validation.${key}`, { ns: "admin", ...options });

export type Validator = (value: string) => string | null;

export interface SettingSpec {
  key: string;
  label: string;
  hint?: string;
  placeholder?: string;
  validate?: Validator;
}

/* --------------------------------- validators -------------------------------- */

export const required: Validator = (v) => (v.trim() ? null : tv("required"));

export const url: Validator = (v) =>
  !v.trim() || /^https?:\/\/\S+$/i.test(v.trim()) ? null : tv("url");

export const email: Validator = (v) =>
  !v.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? null : tv("email");

export const emailList: Validator = (v) => {
  if (!v.trim()) return null;
  const bad = v
    .split(/[,;]/)
    .map((p) => p.trim())
    .filter(Boolean)
    .find((p) => email(p) !== null);
  return bad ? tv("emailListInvalid", { value: bad }) : null;
};

export const hexColor: Validator = (v) =>
  !v.trim() || /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v.trim()) ? null : tv("hexColor");

export function maxLen(n: number): Validator {
  return (v) => (v.length <= n ? null : tv("maxLen", { max: n, count: v.length }));
}

export function numberRange(min: number, max: number): Validator {
  return (v) => {
    if (!v.trim()) return null;
    const n = Number(v);
    if (!Number.isFinite(n)) return tv("numberInvalid");
    return n >= min && n <= max ? null : tv("numberRange", { min, max });
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

/**
 * Generic settings-group editor over the flat `site_settings` key/value store.
 * Provides validation, dirty tracking and an explicit save.
 *
 * Saving is explicit — never on a timer.
 *
 * This hook used to write 1.2s after any keystroke, which is the same defect
 * that was removed from the programme editor and it landed harder here: this
 * store feeds the live public site. Typing a new phone number published every
 * intermediate prefix; editing the brand colour repainted the running site
 * mid-keystroke; and "Discard" was a lie, because the value had already been
 * written. The operator now decides when a setting goes live.
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
    // i18n.language keeps already-shown errors in sync after a language switch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, specKeys, i18n.language]);

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
