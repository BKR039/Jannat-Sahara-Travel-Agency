import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2, LogIn, Mail, Lock, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import i18n, { dirFor } from "@/lib/i18n";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/common/Logo";

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>): { next?: string } =>
    typeof s.next === "string" ? { next: s.next } : {},
  head: () => ({
    meta: [
      { title: i18n.t("auth.seoTitle") },
      { name: "description", content: i18n.t("auth.seoDescription") },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AuthPage,
});

const emailSchema = z.string().trim().email();

/** Only same-origin relative paths are allowed as post-login redirects. */
function safeNext(next: string | undefined): string | null {
  if (!next) return null;
  if (!next.startsWith("/") || next.startsWith("//")) return null;
  return next;
}

function AuthPage() {
  const navigate = useNavigate();
  const { t, i18n: i18next } = useTranslation();
  const { next } = Route.useSearch();
  const [tab, setTab] = useState<"login" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      toast.error(t("auth.invalidEmail"));
      return;
    }
    if (password.length < 6) {
      toast.error(t("auth.passwordTooShort"));
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      toast.success(t("auth.welcomeBack"));
      const target = safeNext(next);
      if (target) {
        window.location.href = target;
      } else {
        navigate({ to: "/admin" });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t("auth.signInFailed");
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  async function onForgot(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      toast.error(t("auth.invalidEmail"));
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success(t("auth.resetEmailSent"));
    } catch (err) {
      const message = err instanceof Error ? err.message : t("auth.resetEmailFailed");
      toast.error(message);
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
            <h1 className="text-h3 font-bold tracking-tight">{t("auth.signInTitle")}</h1>
            <p className="mt-1 text-small text-muted-foreground">{t("auth.signInSubtitle")}</p>
          </div>

          <Tabs value={tab} onValueChange={(v) => setTab(v as "login" | "forgot")}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">
                <LogIn className="me-2 h-4 w-4" /> {t("auth.tabSignIn")}
              </TabsTrigger>
              <TabsTrigger value="forgot">
                <KeyRound className="me-2 h-4 w-4" /> {t("auth.tabForgot")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={onLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">{t("auth.email")}</Label>
                  <div className="relative">
                    <Mail className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="ps-9"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">{t("auth.password")}</Label>
                  <div className="relative">
                    <Lock className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="ps-9"
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <LogIn className="me-2 h-4 w-4" />}
                  {t("auth.signIn")}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="forgot">
              <form onSubmit={onForgot} className="space-y-4">
                <p className="text-small text-muted-foreground">
                  {t("auth.forgotHint")}
                </p>
                <div className="space-y-2">
                  <Label htmlFor="fpe">{t("auth.email")}</Label>
                  <div className="relative">
                    <Mail className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="fpe"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="ps-9"
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <KeyRound className="me-2 h-4 w-4" />}
                  {t("auth.sendResetLink")}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <p className="mt-6 text-center text-caption text-muted-foreground">
            <Link to="/" className="hover:text-foreground">← Back to website</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
