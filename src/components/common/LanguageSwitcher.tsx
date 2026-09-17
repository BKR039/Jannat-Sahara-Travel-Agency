import { Check, Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SUPPORTED_LANGUAGES, normalizeLang, type SupportedLanguage } from "@/lib/i18n";

// i18n-audit-ignore: a language switcher must name each language in that
// language, so these literals are correct and must not be translated.
const LABELS: Record<SupportedLanguage, string> = {
  ar: "العربية",
  fr: "Français",
  en: "English",
};

// i18n-audit-ignore: short codes shown in each language's own script.
const SHORT: Record<SupportedLanguage, string> = {
  ar: "ع",
  fr: "FR",
  en: "EN",
};

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const current = normalizeLang(i18n.language);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="min-h-11 gap-2 rounded-full"
          aria-label={t("actions.changeLanguage")}
        >
          <Globe className="h-4 w-4" />
          <span className="text-small font-medium">
            <span className="hidden sm:inline">{LABELS[current]}</span>
            <span className="sm:hidden">{SHORT[current]}</span>
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {SUPPORTED_LANGUAGES.map((lng) => (
          <DropdownMenuItem
            key={lng}
            onClick={() => i18n.changeLanguage(lng)}
            className={`gap-2 ${current === lng ? "font-semibold text-primary" : ""}`}
          >
            <Check className={`h-3.5 w-3.5 ${current === lng ? "opacity-100" : "opacity-0"}`} />
            {LABELS[lng]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
