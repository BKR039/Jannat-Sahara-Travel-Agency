import { CABIN_LABELS_AR, type FlightRequestInputType } from "./flight-request.schema";

function escapeHtml(v: string | null | undefined): string {
  if (!v) return "";
  return v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function renderFlightRequestEmail(data: {
  reference: string;
  createdAt: string;
  input: FlightRequestInputType;
}): { html: string; text: string; subject: string } {
  const { reference, createdAt, input } = data;

  const rows: Array<[string, string]> = [
    ["Reference", reference],
    ["Submitted at", createdAt],
    ["Customer", input.name],
    ["Phone", input.phone],
    ["Email", input.email],
    ["Departure (from)", input.fromAirport],
    ["Destination (to)", input.toAirport],
    ["Trip type", input.tripType === "round_trip" ? "Round trip" : "One way"],
    ["Departure date", input.departureDate],
    ["Return date", input.returnDate || "—"],
    [
      "Passengers",
      `${input.adults} adult(s), ${input.children} child(ren), ${input.infants} infant(s)`,
    ],
    ["Cabin class", `${input.cabinClass} (${CABIN_LABELS_AR[input.cabinClass]})`],
    ["Notes", input.notes || "—"],
  ];

  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#f6f7f9;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#0f172a">
  <div style="max-width:680px;margin:0 auto;padding:24px">
    <div style="background:linear-gradient(135deg,#0F3D2E,#EE5A24);color:#fff;padding:24px;border-radius:16px 16px 0 0">
      <div style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;opacity:.85">Janat Sahara Travel</div>
      <div style="font-size:22px;font-weight:800;margin-top:6px">New flight request</div>
      <div style="font-size:13px;opacity:.9;margin-top:4px">${escapeHtml(input.fromAirport)} → ${escapeHtml(input.toAirport)}</div>
    </div>
    <div style="background:#fff;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 16px 16px;padding:8px 8px 16px">
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        ${rows
          .map(
            ([k, v], i) => `<tr style="background:${i % 2 ? "#fafafa" : "#fff"}">
          <td style="padding:12px 14px;color:#64748b;width:170px;vertical-align:top;font-weight:600">${escapeHtml(k)}</td>
          <td style="padding:12px 14px;color:#0f172a;vertical-align:top">${escapeHtml(v)}</td>
        </tr>`,
          )
          .join("")}
      </table>
    </div>
    <p style="text-align:center;color:#94a3b8;font-size:12px;margin-top:16px">
      Prepare the best available fares and contact the customer directly.
    </p>
  </div>
</body></html>`;

  const text = rows.map(([k, v]) => `${k}: ${v}`).join("\n");
  const subject = `New flight request ${reference} — ${input.fromAirport} → ${input.toAirport}`;
  return { html, text, subject };
}
