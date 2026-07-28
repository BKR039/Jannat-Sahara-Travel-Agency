import { useTranslation } from "react-i18next";
import logoAsset from "@/assets/logo.png.asset.json";

export function Logo({ className }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <div className={`flex items-center gap-3 ${className ?? ""}`}>
      <img
        src={logoAsset.url}
        alt={t("brand.name")}
        className="h-11 w-11 object-contain"
      />
      <div className="flex flex-col leading-tight">
        <span className="font-display text-base font-bold text-foreground">
          {t("brand.name")}
        </span>
        <span className="text-[11px] text-muted-foreground">
          {t("brand.tagline")}
        </span>
      </div>
    </div>
  );
}
