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
  /**
   * Field whose value is prose the agency may want translated (address,
   * working hours, agency name). Phone numbers, emails and URLs are
   * language-neutral and must NOT be marked localized.
   */
  localized?: boolean;
}

/** Form key for a translation of `key`, e.g. `address@fr`. */
export const localeKey = (key: string, lang: "fr" | "en") => `${key}@${lang}`;

interface Row {
  id: string;
  key: string;
  label: string | null;
  value: string;
  value_fr: string | null;
  value_en: string | null;
  icon: string | null;
  sort_order: number | null;
}

/**
 * Maps the flat contact_info key/value table onto a friendly, typed form model
 * with validation and an explicit save.
 *
 * Saving is explicit — never on a timer. See `useSiteSettings` for why: these
 * rows are the phone numbers and addresses the public site prints, and a
 * debounced write published every half-typed one of them. Clearing a field also
 * deletes its row, so the timer could delete a contact channel mid-edit.
 */
export function useContactSettings(specs: ContactFieldSpec[]) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["admin-contact-info"] as const,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_info")
        .select("id,key,label,value,value_fr,value_en,icon,sort_order")
        .order("sort_order");
      if (error) throw error;
      return data as Row[];
    },
  });

  const specKeys = useMemo(() => specs.map((s) => s.key).join("|"), [specs]);

  const remote = useMemo(() => {
    const map: Record<string, string> = {};
    for (const s of specs) {
      map[s.key] = "";
      if (s.localized) {
        map[localeKey(s.key, "fr")] = "";
        map[localeKey(s.key, "en")] = "";
      }
    }
    for (const r of query.data ?? []) {
      if (!(r.key in map)) continue;
      map[r.key] = r.value ?? "";
      if (localeKey(r.key, "fr") in map) map[localeKey(r.key, "fr")] = r.value_fr ?? "";
      if (localeKey(r.key, "en") in map) map[localeKey(r.key, "en")] = r.value_en ?? "";
    }
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
  const dirty = Object.keys(remote).some((k) => (form[k] ?? "") !== (remote[k] ?? ""));
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const save = useMutation({
    mutationFn: async (values: Record<string, string>) => {
      const rows = query.data ?? [];
      for (const spec of specs) {
        const next = (values[spec.key] ?? "").trim();
        // Empty translations stay NULL so the documented public fallback applies.
        const fr = spec.localized ? (values[localeKey(spec.key, "fr")] ?? "").trim() || null : null;
        const en = spec.localized ? (values[localeKey(spec.key, "en")] ?? "").trim() || null : null;
        const changed =
          next !== (remote[spec.key] ?? "").trim() ||
          (spec.localized &&
            ((fr ?? "") !== (remote[localeKey(spec.key, "fr")] ?? "").trim() ||
              (en ?? "") !== (remote[localeKey(spec.key, "en")] ?? "").trim()));
        if (!changed) continue;
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
                ...(spec.localized ? { value_fr: fr, value_en: en } : {}),
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
            ...(spec.localized ? { value_fr: fr, value_en: en } : {}),
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
