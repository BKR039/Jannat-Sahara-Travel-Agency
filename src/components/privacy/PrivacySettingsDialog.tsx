import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ShieldCheck, Lock, Megaphone, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { usePrivacyConsent } from "./privacy-context";

export function PrivacySettingsDialog() {
  const { t } = useTranslation();
  const {
    consent,
    isSettingsOpen,
    closeSettings,
    saveCustomPreferences,
    acceptAll,
    rejectOptional,
  } = usePrivacyConsent();

  const [marketing, setMarketing] = useState(false);

  // Sync state whenever dialog opens with current stored consent
  useEffect(() => {
    if (isSettingsOpen) {
      setMarketing(Boolean(consent?.marketing));
    }
  }, [isSettingsOpen, consent]);

  const handleSave = () => {
    saveCustomPreferences({ analytics: false, marketing });
  };

  return (
    <Dialog open={isSettingsOpen} onOpenChange={(open) => !open && closeSettings()}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto p-5 sm:p-7">
        <DialogHeader className="gap-2 text-start">
          <div className="flex items-center gap-2 text-primary font-bold">
            <ShieldCheck className="h-5 w-5" />
            <DialogTitle className="text-h5 font-bold tracking-tight text-foreground">
              {t("consent.settingsTitle")}
            </DialogTitle>
          </div>
          <DialogDescription className="text-small text-muted-foreground leading-relaxed">
            {t("consent.settingsSubtitle")} {t("consent.settingsNotice")}
          </DialogDescription>
        </DialogHeader>

        {/* Categories list: strictly reflects real trackers in the codebase */}
        <div className="my-3 flex flex-col gap-3">
          {/* 1. Strictly Necessary */}
          <div className="flex flex-col gap-2 rounded-xl border border-border-subtle bg-surface-sunken/40 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 font-bold text-foreground text-small">
                <Lock className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>{t("consent.necessaryTitle")}</span>
              </div>
              <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-caption font-semibold text-emerald-700 dark:text-emerald-300">
                {t("consent.necessaryBadge")}
              </span>
            </div>
            <p className="text-caption text-muted-foreground leading-relaxed">
              {t("consent.necessaryDesc")}
            </p>
          </div>

          {/* 2. Marketing (Meta Pixel) */}
          <div className="flex flex-col gap-2 rounded-xl border border-border-subtle bg-surface-sunken/40 p-4 transition-colors hover:border-border">
            <div className="flex items-center justify-between gap-3">
              <label
                htmlFor="marketing-switch"
                className="flex items-center gap-2.5 font-bold text-foreground text-small cursor-pointer"
              >
                <Megaphone className="h-4 w-4 text-secondary" />
                <span>{t("consent.marketingTitle")}</span>
              </label>
              <div className="flex items-center gap-2">
                <span className="text-caption font-medium text-muted-foreground">
                  {marketing ? t("consent.enabled") : t("consent.disabled")}
                </span>
                <Switch
                  id="marketing-switch"
                  checked={marketing}
                  onCheckedChange={setMarketing}
                  aria-label={t("consent.marketingTitle")}
                />
              </div>
            </div>
            <p className="text-caption text-muted-foreground leading-relaxed">
              {t("consent.marketingDesc")}
            </p>
          </div>
        </div>

        {/* Dialog Actions */}
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={rejectOptional}
          >
            {t("consent.rejectOptional")}
          </Button>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={acceptAll}
            >
              {t("consent.acceptAll")}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
            >
              <Check className="h-4 w-4 shrink-0" />
              <span>{t("consent.savePreferences")}</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
