import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2, Lock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/common/Logo";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Reset password — Janat Sahara Travel" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
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
    if (password.length < 8) return toast.error("Password must be at least 8 characters");
    if (password !== confirm) return toast.error("Passwords do not match");
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated");
      navigate({ to: "/admin" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update password");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div dir="ltr" className="min-h-screen bg-gradient-to-br from-background via-muted/40 to-accent/20 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center">
          <Logo />
        </Link>
        <div className="rounded-lg border border-border bg-card/80 backdrop-blur shadow-lg p-6 sm:p-8">
          <div className="mb-6 text-center">
            <ShieldCheck className="mx-auto h-8 w-8 text-primary" />
            <h1 className="mt-2 text-h3 font-bold">Set a new password</h1>
            <p className="mt-1 text-small text-muted-foreground">Choose a strong password for your admin account.</p>
          </div>

          {!ready ? (
            <p className="text-center text-small text-muted-foreground">
              Waiting for a valid recovery link… If this page loaded directly, request a fresh link from
              <Link to="/auth" className="text-primary hover:underline"> the sign-in page</Link>.
            </p>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pw">New password</Label>
                <div className="relative">
                  <Lock className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="ps-9" required minLength={8} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pw2">Confirm password</Label>
                <div className="relative">
                  <Lock className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="pw2" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="ps-9" required minLength={8} />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : null}
                Update password
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
