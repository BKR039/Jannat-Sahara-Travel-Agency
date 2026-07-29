import { useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { Loader2, Upload, FileCheck2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { submitBooking } from "@/lib/booking.functions";

interface Props {
  packageId: string | null;
  packageTitle: string;
  packageCategory: string;
  trigger: ReactNode;
}

const MAX_PASSPORT_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

function randomId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function BookingDialog({ packageId, packageTitle, packageCategory, trigger }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const submit = useServerFn(submitBooking);

  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    people: 1,
    notes: "",
  });

  function reset() {
    setForm({ name: "", phone: "", email: "", people: 1, notes: "" });
    setFile(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    if (!form.name.trim() || !form.phone.trim()) {
      toast.error(t("booking.errors.required"));
      return;
    }

    if (file) {
      if (file.size > MAX_PASSPORT_BYTES) {
        toast.error(t("booking.errors.tooLarge"));
        return;
      }
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error(t("booking.errors.badType"));
        return;
      }
    }

    setSubmitting(true);
    try {
      let passportPath: string | null = null;

      if (file) {
        const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin";
        const safeExt = ext?.replace(/[^a-z0-9]/gi, "").slice(0, 8) || "bin";
        const path = `bookings/${randomId()}/passport.${safeExt}`;
        const { error: upErr } = await supabase.storage
          .from("passports")
          .upload(path, file, { contentType: file.type, upsert: false });
        if (upErr) {
          console.error(upErr);
          toast.error(t("booking.errors.upload"));
          setSubmitting(false);
          return;
        }
        passportPath = path;
      }

      const result = await submit({
        data: {
          packageId,
          packageTitle,
          packageCategory,
          name: form.name.trim(),
          phone: form.phone.trim(),
          email: form.email.trim() || null,
          people: Number(form.people) || 1,
          notes: form.notes.trim() || null,
          passportPath,
        },
      });

      reset();
      setOpen(false);
      navigate({ to: "/booking-success", search: { id: result.id } });
    } catch (err) {
      console.error(err);
      toast.error(t("booking.errors.generic"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("booking.title")}</DialogTitle>
          <DialogDescription>
            {t("booking.subtitle", { pkg: packageTitle })}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="b-name">{t("booking.fields.name")} *</Label>
            <Input
              id="b-name"
              required
              maxLength={120}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="b-phone">{t("booking.fields.phone")} *</Label>
              <Input
                id="b-phone"
                required
                type="tel"
                inputMode="tel"
                maxLength={30}
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="b-email">{t("booking.fields.email")}</Label>
              <Input
                id="b-email"
                type="email"
                maxLength={254}
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="b-people">{t("booking.fields.people")} *</Label>
            <Input
              id="b-people"
              type="number"
              min={1}
              max={50}
              required
              value={form.people}
              onChange={(e) =>
                setForm((f) => ({ ...f, people: Math.max(1, Math.min(50, Number(e.target.value) || 1)) }))
              }
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="b-notes">{t("booking.fields.notes")}</Label>
            <Textarea
              id="b-notes"
              rows={3}
              maxLength={2000}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="b-passport">{t("booking.fields.passport")}</Label>
            <label
              htmlFor="b-passport"
              className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-border bg-muted/40 px-4 py-3 text-sm transition-all duration-[220ms] ease-standard hover:bg-muted"
            >
              {file ? (
                <>
                  <FileCheck2 className="h-5 w-5 text-primary" />
                  <span className="truncate">{file.name}</span>
                </>
              ) : (
                <>
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <span className="text-muted-foreground">{t("booking.fields.passportHint")}</span>
                </>
              )}
              <input
                id="b-passport"
                type="file"
                className="sr-only"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={submitting}
            >
              {t("booking.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {submitting ? (
                <>
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                  {t("booking.submitting")}
                </>
              ) : (
                t("booking.submit")
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
