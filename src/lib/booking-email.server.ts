import type { BookingInput } from "./booking.schema";

function escapeHtml(v: string | null | undefined): string {
  if (!v) return "";
  return v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const LANGUAGE_NAMES: Record<string, string> = {
  ar: "Arabic (العربية)",
  fr: "French (Français)",
  en: "English",
};

export function renderEmail(data: {
  id: string;
  createdAt: string;
  input: BookingInput;
  passportUrls: Array<string | null>;
}): { html: string; text: string; subject: string } {
  const { id, createdAt, input, passportUrls } = data;
  const primary = input.passengers.find((p) => p.isPrimary) ?? input.passengers[0];

  const rows: Array<[string, string]> = [
    ["Booking ID", id],
    ["Date", createdAt],
    ["Package", input.packageTitle ?? "—"],
    ["Service", input.packageCategory ?? "—"],
    ["Primary contact", primary?.fullName ?? "—"],
    ["Phone", primary?.phone ?? "—"],
    ["Email", primary?.email ?? "—"],
    ["Preferred contact", input.communicationPreference ?? "—"],
    ["Emergency contact", primary?.emergencyContact ?? "—"],
    [
      "Travellers",
      `${input.adults} adult(s), ${input.children} child(ren), ${input.infants} infant(s)`,
    ],
    [
      "Total price",
      input.totalPrice != null ? `${input.totalPrice} ${input.currency}` : "—",
    ],
    ["Notes", input.notes ?? "—"],
    ["Customer language", LANGUAGE_NAMES[input.locale ?? "ar"] ?? "Arabic (العربية)"],
  ];

  const passengerCards = input.passengers
    .map((p, i) => {
      const url = passportUrls[i];
      const lines: Array<[string, string]> = [
        ["Type", p.type],
        ["Passport no.", p.passportNumber ?? "—"],
        ["Nationality", p.nationality ?? "—"],
        ["Gender", p.gender ?? "—"],
        ["Date of birth", p.dateOfBirth ?? "—"],
        ["Passport expiry", p.passportExpiry ?? "—"],
        ["Notes", p.notes ?? "—"],
      ];
      return `<div style="border:1px solid #e5e7eb;border-radius:12px;padding:14px;margin:10px 0">
  <div style="font-weight:800;font-size:15px;color:#0f172a">${escapeHtml(p.fullName)}${p.isPrimary ? ' <span style="color:#EE5A24;font-size:12px">(primary)</span>' : ""}</div>
  <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px">
    ${lines
      .map(
        ([k, v]) =>
          `<tr><td style="padding:4px 0;color:#64748b;width:130px">${escapeHtml(k)}</td><td style="padding:4px 0;color:#0f172a">${escapeHtml(v)}</td></tr>`,
      )
      .join("")}
    <tr><td style="padding:4px 0;color:#64748b">Passport file</td><td style="padding:4px 0">${
      url
        ? `<a href="${escapeHtml(url)}" style="color:#EE5A24;font-weight:600">Download (expires in 30 min)</a>`
        : "—"
    }</td></tr>
  </table>
</div>`;
    })
    .join("");

  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#f6f7f9;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#0f172a">
  <div style="max-width:680px;margin:0 auto;padding:24px">
    <div style="background:linear-gradient(135deg,#0F3D2E,#EE5A24);color:#fff;padding:24px;border-radius:16px 16px 0 0">
      <div style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;opacity:.85">Janat Sahara Travel</div>
      <div style="font-size:22px;font-weight:800;margin-top:6px">New booking request</div>
      <div style="font-size:13px;opacity:.9;margin-top:4px">${escapeHtml(input.packageTitle ?? "General inquiry")}</div>
    </div>
    <div style="background:#fff;border:1px solid #e5e7eb;border-top:0;padding:8px 8px 16px">
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        ${rows
          .map(
            ([k, v], i) => `<tr style="background:${i % 2 ? "#fafafa" : "#fff"}">
          <td style="padding:12px 14px;color:#64748b;width:160px;vertical-align:top;font-weight:600">${escapeHtml(k)}</td>
          <td style="padding:12px 14px;color:#0f172a;vertical-align:top">${escapeHtml(v)}</td>
        </tr>`,
          )
          .join("")}
      </table>
    </div>
    <div style="background:#fff;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 16px 16px;padding:8px 16px 16px">
      <div style="font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:#64748b;margin:12px 0 4px">Passengers</div>
      ${passengerCards}
    </div>
    <p style="text-align:center;color:#94a3b8;font-size:12px;margin-top:16px">
      Sent automatically by janatsahara.tn — contact the customer directly.
    </p>
  </div>
</body></html>`;

  const text = [
    ...rows.map(([k, v]) => `${k}: ${v}`),
    "",
    ...input.passengers.map(
      (p, i) =>
        `- ${p.fullName} (${p.type})${p.isPrimary ? " [primary]" : ""} | passport ${p.passportNumber ?? "—"} | file ${passportUrls[i] ?? "—"}`,
    ),
  ].join("\n");

  const subject = `New booking — ${primary?.fullName ?? "Customer"} — ${input.packageTitle ?? "General"}`;
  return { html, text, subject };
}

