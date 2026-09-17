/**
 * Agency brand colours applied to the live design tokens.
 *
 * `src/styles.css` declares `--brand-primary` / `--brand-secondary` under a
 * comment marking them "Brand semantic (themable)", and every Tailwind colour
 * the site uses resolves through them (`--color-primary`, `--color-secondary`,
 * gradients, focus rings). Overriding just those tokens re-themes the site
 * without touching the design system itself.
 *
 * The derived shades (hover / active / muted / glow) are computed with
 * `color-mix()` so a custom colour keeps a coherent ramp instead of pairing a
 * new base with the stock orange hovers.
 *
 * Only `#rgb` / `#rrggbb` is accepted — the same rule the admin's `hexColor`
 * validator enforces — so a stored value can never inject arbitrary CSS.
 */

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** Returns the colour when it is a safe hex literal, else null. */
export function safeHexColor(value: string | null | undefined): string | null {
  const raw = (value ?? "").trim();
  return HEX.test(raw) ? raw : null;
}

/**
 * CSS custom-property declarations for the configured brand colours.
 * Returns "" when nothing valid is configured, so the stylesheet defaults win.
 */
export function brandThemeCss(
  primary: string | null | undefined,
  secondary: string | null | undefined,
): string {
  const p = safeHexColor(primary);
  const s = safeHexColor(secondary);
  if (!p && !s) return "";

  const lines: string[] = [];

  if (p) {
    lines.push(
      `--brand-primary:${p}`,
      // Darker on hover / active, lighter for muted surfaces and glows.
      `--brand-primary-hover:color-mix(in oklab, ${p} 88%, black)`,
      `--brand-primary-active:color-mix(in oklab, ${p} 76%, black)`,
      `--brand-primary-muted:color-mix(in oklab, ${p} 14%, white)`,
      `--brand-primary-glow:color-mix(in oklab, ${p} 78%, white)`,
      // Focus ring and inline links follow the primary colour.
      `--border-focus:${p}`,
      `--text-link:color-mix(in oklab, ${p} 88%, black)`,
      `--state-hover:color-mix(in oklab, ${p} 6%, transparent)`,
      `--state-active:color-mix(in oklab, ${p} 12%, transparent)`,
      `--state-selected:color-mix(in oklab, ${p} 8%, white)`,
    );
  }

  if (s) {
    lines.push(
      `--brand-secondary:${s}`,
      `--brand-secondary-hover:color-mix(in oklab, ${s} 88%, black)`,
      `--brand-secondary-muted:color-mix(in oklab, ${s} 14%, white)`,
    );
  }

  return `:root{${lines.join(";")}}`;
}
