import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2, Lock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import i18n, { dirFor } from "@/lib/i18n";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/common/Logo";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: i18n.t("auth.newPasswordTitle") + " — Janat Sahara Travel" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const { t, i18n: i18next } = useTranslation();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    // If already in recovery hash, session is auto-established
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (password.length < 8) return toast.error(t("auth.passwordMin8"));
    if (password !== confirm) return toast.error(t("auth.passwordsMismatch"));
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success(t("auth.passwordUpdated"));
      navigate({ to: "/admin" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("auth.passwordUpdateFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div dir={dirFor(i18next.language)} className="min-h-screen bg-gradient-to-br from-background via-muted/40 to-accent/20 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center">
          <Logo />
        </Link>
        <div className="rounded-lg border border-border bg-card/80 backdrop-blur shadow-lg p-6 sm:p-8">
          <div className="mb-6 text-center">
            <ShieldCheck className="mx-auto h-8 w-8 text-primary" />
            <h1 className="mt-2 text-h3 font-bold">{t("auth.newPasswordTitle")}</h1>
            <p className="mt-1 text-small text-muted-foreground">{t("auth.newPasswordSubtitle")}</p>
          </div>

          {!ready ? (
            <p className="text-center text-small text-muted-foreground">
              {t("auth.waitingLink")}{" "}
              <Link to="/auth" className="text-primary hover:underline">{t("auth.signInPageLink")}</Link>.
            </p>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pw">{t("auth.newPassword")}</Label>
                <div className="relative">
                  <Lock className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="ps-9" required minLength={8} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pw2">{t("auth.confirmPassword")}</Label>
                <div className="relative">
                  <Lock className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="pw2" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="ps-9" required minLength={8} />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : null}
                {t("auth.updatePassword")}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
