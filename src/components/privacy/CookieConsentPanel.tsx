import { useTranslation } from "react-i18next";
import { Cookie, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePrivacyConsent } from "./privacy-context";

export function CookieConsentPanel() {
  const { t } = useTranslation();
  const { isCookiePanelOpen, acceptAll, rejectOptional, openSettings } = usePrivacyConsent();

  if (!isCookiePanelOpen) return null;

  return (
    <aside
      aria-label={t("consent.cookiePanelTitle")}
      role="region"
      className="fixed bottom-3 inset-x-3 sm:inset-x-auto sm:bottom-6 sm:end-6 z-40 w-auto sm:w-[380px] sm:max-w-[400px] rounded-2xl border border-border-subtle/90 bg-surface-raised/95 p-4 sm:p-5 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-5 duration-300 text-start"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Cookie className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-small font-bold text-foreground">{t("consent.cookiePanelTitle")}</h3>
          <p className="mt-1 text-caption leading-relaxed text-muted-foreground">
            {t("consent.cookiePanelDesc")}
          </p>
        </div>
      </div>

      <div className="mt-3.5 flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            size="sm"
            onClick={acceptAll}
          >
            {t("consent.acceptAll")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={rejectOptional}
          >
            {t("consent.rejectOptional")}
          </Button>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={openSettings}
          className="text-muted-foreground hover:text-foreground"
        >
          <SlidersHorizontal className="me-1.5 h-3.5 w-3.5" aria-hidden="true" />
          <span>{t("consent.customize")}</span>
        </Button>
      </div>
    </aside>
  );
}
