import i18n from "@/lib/i18n";

/**
 * Localized browser-tab title for an admin route.
 *
 * Route `head()` runs outside React, so it uses the shared i18next instance
 * directly rather than the hook — the same pattern the public routes use for
 * their `seo.*` titles.
 */
export function adminDocTitle(section: string): string {
  return i18n.t("shell.documentTitle", {
    ns: "admin",
    section: i18n.t(`shell.docSections.${section}`, { ns: "admin", defaultValue: section }),
  });
}
