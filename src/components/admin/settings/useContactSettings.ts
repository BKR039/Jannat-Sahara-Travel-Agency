import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ContactFieldSpec {
  key: string;
  label: string;
  icon: string;
  hint?: string;
  placeholder?: string;
  wide?: boolean;
  multiline?: boolean;
  sort_order: number;
}

interface Row {
  id: string;
  key: string;
  label: string | null;
  value: string;
  icon: string | null;
  sort_order: number | null;
}

/**
 * Maps the flat contact_info key/value table onto a friendly, typed form model.
 * Storage stays exactly as before — only the editing experience changes.
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

  const remote = useMemo(() => {
    const map: Record<string, string> = {};
    for (const s of specs) map[s.key] = "";
    for (const r of query.data ?? []) map[r.key] = r.value ?? "";
    return map;
  }, [query.data, specs]);

  const [form, setForm] = useState<Record<string, string>>(remote);
  useEffect(() => setForm(remote), [remote]);

  const dirty = specs.some((s) => (form[s.key] ?? "") !== (remote[s.key] ?? ""));

  const save = useMutation({
    mutationFn: async () => {
      const rows = query.data ?? [];
      for (const spec of specs) {
        const next = (form[spec.key] ?? "").trim();
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
      toast.success("Settings saved");
      qc.invalidateQueries({ queryKey: ["admin-contact-info"] });
      qc.invalidateQueries({ queryKey: ["contact_info"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    loading: query.isLoading,
    form,
    set: (key: string, value: string) => setForm((f) => ({ ...f, [key]: value })),
    dirty,
    discard: () => setForm(remote),
    save,
  };
}
