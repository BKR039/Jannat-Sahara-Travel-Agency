import i18n from "@/lib/i18n";

/**
 * Customer-facing offer email for a custom Umrah request.
 *
 * Rendered in the language the visitor used when submitting, through the same
 * i18next instance the site uses (explicit `lng`, no React hook needed).
 *
 * Nothing is invented: every value comes from what the agency typed into the
 * offer form. Amount and currency are shown only when the agency entered them,
 * and the copy is explicit that this is a proposal to confirm, not a booking.
 */

export interface OfferEmailInput {
  reference: string;
  customerName: string;
  locale: string;
  departureDate: string | null;
  returnDate: string | null;
  adults: number;
  children: number;
  infants: number;
  proposedHotels: string | null;
  proposedFlights: string | null;
  offerAmount: number | null;
  offerCurrency: string;
  offerNotes: string | null;
}

const esc = (v: string) =>
  v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Preserve author line breaks in HTML without allowing markup through. */
const escMultiline = (v: string) => esc(v).replace(/\r?\n/g, "<br />");

export function renderOfferEmail(input: OfferEmailInput): {
  subject: string;
  html: string;
  text: string;
} {
  const lng = ["ar", "fr", "en"].includes(input.locale) ? input.locale : "ar";
  const t = (key: string, options: Record<string, unknown> = {}) =>
    i18n.t(`offerEmail.${key}`, { lng, ...options });

  const rtl = lng === "ar";
  const travellers = [
    t("adults", { count: input.adults }),
    input.children ? t("children", { count: input.children }) : "",
    input.infants ? t("infants", { count: input.infants }) : "",
  ]
    .filter(Boolean)
    .join(" · ");

  const dates =
    input.departureDate && input.returnDate
      ? `${input.departureDate} → ${input.returnDate}`
      : (input.departureDate ?? "—");

  const rows: Array<[string, string]> = [
    [t("referenceLabel"), input.reference],
    [t("datesLabel"), dates],
    [t("travellersLabel"), travellers],
  ];
  if (input.proposedHotels?.trim()) rows.push([t("hotelsLabel"), input.proposedHotels.trim()]);
  if (input.proposedFlights?.trim()) rows.push([t("flightsLabel"), input.proposedFlights.trim()]);
  if (input.offerAmount != null) {
    rows.push([t("amountLabel"), `${input.offerAmount} ${input.offerCurrency}`]);
  }

  const html = `<!doctype html><html lang="${lng}" dir="${rtl ? "rtl" : "ltr"}"><body style="margin:0;background:#f6f3ee;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:#1d2433">
  <div style="max-width:640px;margin:0 auto;padding:24px">
    <div style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 10px 30px rgba(29,36,51,.08)">
      <div style="background:#ee5a24;padding:22px 26px;color:#fff">
        <p style="margin:0;font-size:13px;letter-spacing:.08em;text-transform:uppercase;opacity:.9">${esc(t("agency"))}</p>
        <h1 style="margin:6px 0 0;font-size:20px">${esc(t("title"))}</h1>
      </div>
      <div style="padding:22px 26px 6px">
        <p style="margin:0 0 12px;font-size:15px">${esc(t("greeting", { name: input.customerName }))}</p>
        <p style="margin:0 0 4px;font-size:14px;color:#4b5563">${esc(t("intro"))}</p>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        ${rows
          .map(
            ([k, v], i) => `<tr style="background:${i % 2 ? "#faf8f5" : "#fff"}">
              <td style="padding:11px 26px;color:#6b7280;width:38%">${esc(k)}</td>
              <td style="padding:11px 26px;font-weight:600">${escMultiline(v)}</td>
            </tr>`,
          )
          .join("")}
      </table>
      ${
        input.offerNotes?.trim()
          ? `<div style="padding:18px 26px 0"><p style="margin:0 0 6px;font-size:13px;color:#6b7280">${esc(t("notesLabel"))}</p><p style="margin:0;font-size:14px">${escMultiline(input.offerNotes.trim())}</p></div>`
          : ""
      }
      <div style="padding:20px 26px 24px;font-size:13px;color:#6b7280">
        ${esc(t("closing"))}
      </div>
    </div>
  </div></body></html>`;

  const text = [
    t("greeting", { name: input.customerName }),
    "",
    t("intro"),
    "",
    ...rows.map(([k, v]) => `${k}: ${v}`),
    input.offerNotes?.trim() ? `\n${t("notesLabel")}: ${input.offerNotes.trim()}` : "",
    "",
    t("closing"),
  ]
    .filter((line) => line !== undefined)
    .join("\n");

  return { subject: t("subject", { reference: input.reference }), html, text };
}
