import type { CustomPackageRequestInputType } from "./umrah-builder.schema";

/** Owner notification email for a custom Umrah package request (English, internal). */
export function renderCustomPackageEmail(args: {
  reference: string;
  createdAt: string;
  input: CustomPackageRequestInputType;
  makkahHotelName?: string | null;
  madinahHotelName?: string | null;
}): { subject: string; html: string; text: string } {
  const { reference, createdAt, input } = args;
  const nights = (input.makkahNights ?? 0) + (input.madinahNights ?? 0);

  const rows: Array<[string, string]> = [
    ["Reference", reference],
    ["Received", new Date(createdAt).toUTCString()],
    ["Customer", input.name],
    ["Phone", input.phone],
    ["Email", input.email || "—"],
    ["WhatsApp", input.whatsapp || "—"],
    ["Preferred contact", input.contactPreference || "—"],
    ["Language", (input.locale ?? "ar").toUpperCase()],
    ["Departure date", input.departureDate],
    ["Return date", input.returnDate],
    [
      "Flights",
      input.airportFlexible
        ? "Flexible — needs advice"
        : `${input.departureAirport || "—"} → ${input.returnAirport || "—"}`,
    ],
    [
      "Makkah",
      `${input.makkahNights} night(s) · ${
        args.makkahHotelName || input.makkahHotelName || `area: ${input.makkahArea || "—"}`
      }${input.makkahPreference ? ` · budget: ${input.makkahPreference}` : ""}`,
    ],
    [
      "Madinah",
      `${input.madinahNights} night(s) · ${
        args.madinahHotelName || input.madinahHotelName || `area: ${input.madinahArea || "—"}`
      }${input.madinahPreference ? ` · budget: ${input.madinahPreference}` : ""}`,
    ],
    ["Total nights", String(nights)],
    [
      "Travellers",
      `${input.adults} adult(s), ${input.children} child(ren), ${input.infants} infant(s)`,
    ],
    ["Room preference", input.roomType || "—"],
    ["Notes", input.notes || "—"],
  ];

  const esc = (v: string) =>
    v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const html = `<!doctype html><html><body style="margin:0;background:#f6f3ee;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:#1d2433">
  <div style="max-width:640px;margin:0 auto;padding:24px">
    <div style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 10px 30px rgba(29,36,51,.08)">
      <div style="background:#ee5a24;padding:22px 26px;color:#fff">
        <p style="margin:0;font-size:13px;letter-spacing:.08em;text-transform:uppercase;opacity:.9">Janat Sahara Voyages</p>
        <h1 style="margin:6px 0 0;font-size:20px">Custom Umrah package request</h1>
        <p style="margin:6px 0 0;font-size:14px;opacity:.9">${esc(reference)}</p>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        ${rows
          .map(
            ([k, v], i) => `<tr style="background:${i % 2 ? "#faf8f5" : "#fff"}">
              <td style="padding:11px 26px;color:#6b7280;width:38%">${esc(k)}</td>
              <td style="padding:11px 26px;font-weight:600">${esc(v)}</td>
            </tr>`,
          )
          .join("")}
      </table>
      <div style="padding:18px 26px;font-size:13px;color:#6b7280">
        Review this request in the admin dashboard → Custom packages, then prepare the personalised offer.
      </div>
    </div>
  </div></body></html>`;

  const text = rows.map(([k, v]) => `${k}: ${v}`).join("\n");

  return {
    subject: `New custom Umrah request ${reference} — ${input.name}`,
    html,
    text,
  };
}
