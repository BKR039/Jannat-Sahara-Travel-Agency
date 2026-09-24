import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/common/Logo";
import { usePrivacyConsent } from "./privacy-context";
import { NewsletterSignupCard } from "./NewsletterSignupCard";

export function FirstVisitWelcome() {
  const { t } = useTranslation();
  const { isWelcomeOpen, closeWelcome } = usePrivacyConsent();

  return (
    <Dialog open={isWelcomeOpen} onOpenChange={(open) => !open && closeWelcome()}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto rounded-2xl border border-border-subtle bg-surface-raised p-6 shadow-2xl sm:p-7">
        <DialogHeader className="gap-3 text-start">
          <div className="w-fit">
            <Logo />
          </div>
          <div className="mt-1">
            <DialogTitle className="text-h5 font-bold tracking-tight text-foreground">
              {t("consent.welcomeTitle")}
            </DialogTitle>
            <DialogDescription className="mt-1.5 text-small leading-relaxed text-muted-foreground">
              {t("consent.welcomeBody")}
            </DialogDescription>
          </div>
        </DialogHeader>

        {/* Clean inline newsletter section — no nested cards or heavy borders */}
        <div className="my-3 border-t border-border-subtle/50 pt-3.5">
          <NewsletterSignupCard onSuccess={closeWelcome} />
        </div>

        {/* Quiet skip action */}
        <div className="flex items-center justify-center pt-1">
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={closeWelcome}
            className="text-muted-foreground hover:text-foreground"
          >
            {t("consent.skip")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
