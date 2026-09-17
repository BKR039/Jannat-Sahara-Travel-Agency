import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { contactInfoQuery, siteSettingsQuery } from "@/lib/queries";
import { useLocalized } from "@/lib/localize";

/**
 * Brand mark.
 *
 * Image, name and tagline all come from what the agency configured:
 * `site_settings.brand_logo_url`, `contact_info.agency_name` and
 * `site_settings.brand_tagline`, with the i18n brand copy behind the text so an
 * empty setting never leaves a blank header.
 *
 * There is deliberately no bundled fallback image. The one that used to sit
 * here was an `@/assets/*.asset.json` pointer into a hosting bucket that no
 * longer exists: it 404'd on every page load and the build plugin preloaded it
 * too, so each visit paid for two failed requests before falling back. Until
 * the agency uploads a real logo under Settings → Brand, the mark is the
 * name + tagline lockup. `onError` keeps that same fallback for a wrong URL
 * typed into Settings.
 */
export function Logo({ className }: { className?: string }) {
  const { t } = useTranslation();
  const { L } = useLocalized();
  const { data: settings } = useQuery(siteSettingsQuery());
  const { data: contact } = useQuery(contactInfoQuery());

  const agencyRow = contact?.find((c) => c.key === "agency_name");
  const name = (agencyRow ? L(agencyRow, "value", "empty") : "") || t("brand.name");
  const tagline = settings?.brandTagline || t("brand.tagline");
  const src = settings?.brandLogoUrl;
  const [broken, setBroken] = useState(false);

  return (
    <div className={`flex min-w-0 items-center gap-3 ${className ?? ""}`}>
      {src && !broken && (
        <img
          src={src}
          alt={name}
          onError={() => setBroken(true)}
          className="h-11 w-11 shrink-0 object-contain"
        />
      )}
      {/* The mark keeps its size; the words give way. Without `min-w-0` the
          text column refuses to shrink below its content and pushes the whole
          header past the viewport on a narrow screen. */}
      <div className="flex min-w-0 flex-col leading-tight">
        {/* One step down on the narrowest screens: at 390 the full Arabic name
            needs about 150px and the header can spare 126, so at `text-body`
            it either truncated or pushed the row past the viewport. `truncate`
            stays as the backstop for a longer name than ours. */}
        <span className="truncate font-display text-small font-bold text-foreground sm:text-body">
          {name}
        </span>
        <span className="truncate text-caption text-muted-foreground">{tagline}</span>
      </div>
    </div>
  );
}
