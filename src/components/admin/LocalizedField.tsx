import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/**
 * One content field in all three languages (B-01).
 *
 * The base column holds Arabic; `_fr` and `_en` hold the translations the
 * agency types. Nothing is auto-translated and nothing is copied between
 * languages — an empty translation stays NULL so the public site applies its
 * documented fallback (see `localizeField` in src/lib/localize.ts).
 *
 * The field label is UI text and comes from the admin dictionary; the values
 * are database content and are never translated by the application.
 */

interface Values {
  base: string;
  fr: string;
  en: string;
}

interface Props {
  label: string;
  values: Values;
  onChange: (next: Values) => void;
  rows?: number;
  /** Render the base input LTR (for latin-only fields such as a category key). */
  ltrBase?: boolean;
}

export function LocalizedField({ label, values, onChange, rows, ltrBase }: Props) {
  const { t } = useTranslation("admin");
  const multiline = typeof rows === "number" && rows > 1;

  const field = (key: keyof Values, suffix: string, opts: { dir?: "ltr"; hint?: string } = {}) => (
    <div className="grid gap-1">
      <Label>
        {label} <span className="text-muted-foreground">({suffix})</span>
      </Label>
      {multiline ? (
        <Textarea
          rows={rows}
          dir={opts.dir}
          value={values[key]}
          onChange={(e) => onChange({ ...values, [key]: e.target.value })}
        />
      ) : (
        <Input
          dir={opts.dir}
          value={values[key]}
          onChange={(e) => onChange({ ...values, [key]: e.target.value })}
        />
      )}
      {opts.hint && <p className="text-caption text-muted-foreground">{opts.hint}</p>}
    </div>
  );

  return (
    <div className="grid gap-3 rounded-xl border border-border-subtle bg-surface-sunken/30 p-3">
      {field("base", t("ops.localized.base"), ltrBase ? { dir: "ltr" } : {})}
      {field("fr", t("ops.localized.fr"), { dir: "ltr" })}
      {field("en", t("ops.localized.en"), { dir: "ltr", hint: t("ops.localized.emptyHint") })}
    </div>
  );
}
