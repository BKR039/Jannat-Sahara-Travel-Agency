import { Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/lib/i18n";

const LABELS: Record<SupportedLanguage, string> = {
  ar: "العربية",
  fr: "Français",
};

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const current = (i18n.language?.split("-")[0] as SupportedLanguage) || "ar";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 rounded-full"
          aria-label={t("actions.changeLanguage")}
        >
          <Globe className="h-4 w-4" />
          <span className="text-sm font-medium">{LABELS[current]}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {SUPPORTED_LANGUAGES.map((lng) => (
          <DropdownMenuItem
            key={lng}
            onClick={() => i18n.changeLanguage(lng)}
            className={current === lng ? "font-semibold text-primary" : ""}
          >
            {LABELS[lng]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
