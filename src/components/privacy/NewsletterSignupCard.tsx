import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { subscribeNewsletter } from "@/lib/public.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SupportedLanguage } from "@/lib/i18n";

type NewsletterStatus = "idle" | "loading" | "success" | "duplicate" | "error";

interface NewsletterSignupCardProps {
  onSuccess?: () => void;
}

export function NewsletterSignupCard({ onSuccess }: NewsletterSignupCardProps) {
  const { t, i18n } = useTranslation();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<NewsletterStatus>("idle");
  const subscribe = useServerFn(subscribeNewsletter);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up any pending auto-close timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail) return;

    setStatus("loading");
    try {
      const res = await subscribe({
        data: {
          email: cleanEmail,
          locale: (i18n.language || "ar") as SupportedLanguage,
        },
      });

      if (res.duplicate) {
        setStatus("duplicate");
      } else {
        setStatus("success");
        setEmail("");

        // Auto-close welcome modal after a comfortable confirmation delay (~1.8s)
        if (onSuccess) {
          if (timerRef.current) {
            clearTimeout(timerRef.current);
          }
          timerRef.current = setTimeout(() => {
            onSuccess();
          }, 1800);
        }
      }
    } catch (err) {
      console.error("[newsletter-signup] Subscription error", err);
      setStatus("error");
    }
  };

  return (
    <div className="w-full text-start">
      <div className="flex items-center justify-between gap-2">
        <label
          htmlFor="welcome-newsletter-email"
          className="text-small font-medium text-foreground"
        >
          {t("consent.newsletterPrompt")}
        </label>
        <span className="rounded-full bg-accent/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
          {t("consent.optional")}
        </span>
      </div>

      {status === "success" ? (
        <div
          role="status"
          aria-live="polite"
          className="mt-2.5 flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-caption font-medium text-emerald-700 dark:text-emerald-300 animate-in fade-in duration-200"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>{t("consent.newsletterSuccess")}</span>
        </div>
      ) : status === "duplicate" ? (
        <div
          role="status"
          aria-live="polite"
          className="mt-2.5 flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-caption font-medium text-amber-700 dark:text-amber-300 animate-in fade-in duration-200"
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>{t("consent.newsletterDuplicate")}</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-2.5 flex flex-col gap-2 sm:flex-row">
          <Input
            id="welcome-newsletter-email"
            type="email"
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (status === "error") setStatus("idle");
            }}
            placeholder={t("consent.emailPlaceholder")}
            aria-label={t("consent.emailPlaceholder")}
            autoComplete="email"
            className="h-10 flex-1 text-small"
          />
          <Button
            type="submit"
            size="default"
            disabled={status === "loading" || !email.trim()}
            className="shrink-0"
          >
            {status === "loading" ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{t("consent.subscribing")}</span>
              </span>
            ) : (
              t("consent.subscribe")
            )}
          </Button>
        </form>
      )}

      {status === "error" && (
        <p
          role="alert"
          aria-live="assertive"
          className="mt-1.5 text-caption text-destructive animate-in fade-in duration-200"
        >
          {t("consent.newsletterError")}
        </p>
      )}
    </div>
  );
}
