import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const PassengerInput = z.object({
  type: z.enum(["adult", "child", "infant"]),
  isPrimary: z.boolean().default(false),
  fullName: z.string().trim().min(1).max(120),
  passportNumber: z.string().trim().max(40).optional().nullable(),
  nationality: z.string().trim().max(80).optional().nullable(),
  gender: z.string().trim().max(20).optional().nullable(),
  dateOfBirth: z.string().trim().max(20).optional().nullable(),
  passportExpiry: z.string().trim().max(20).optional().nullable(),
  phone: z.string().trim().max(30).optional().nullable(),
  email: z.string().trim().max(254).optional().nullable(),
  emergencyContact: z.string().trim().max(160).optional().nullable(),
  passportPath: z.string().trim().max(500).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
});

const BookingInput = z.object({
  packageId: z.string().uuid().nullable().optional(),
  packageTitle: z.string().trim().max(200).optional().nullable(),
  packageCategory: z.string().trim().max(50).optional().nullable(),
  adults: z.number().int().min(1).max(30),
  children: z.number().int().min(0).max(30),
  infants: z.number().int().min(0).max(30),
  totalPrice: z.number().min(0).nullable().optional(),
  currency: z.string().trim().max(10).default("TND"),
  communicationPreference: z.string().trim().max(30).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
  passengers: z.array(PassengerInput).min(1).max(60),
});

export type PassengerInput = z.infer<typeof PassengerInput>;
export type BookingInput = z.infer<typeof BookingInput>;

function escapeHtml(v: string | null | undefined): string {
  if (!v) return "";
  return v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderEmail(data: {
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

export const submitBooking = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => BookingInput.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const primary = data.passengers.find((p) => p.isPrimary) ?? data.passengers[0];
    const totalPeople = data.adults + data.children + data.infants;

    if (!primary.phone || !primary.email) {
      throw new Error("Primary passenger must provide phone and email");
    }

    const { data: row, error } = await supabaseAdmin
      .from("bookings")
      .insert({
        package_id: data.packageId ?? null,
        package_title: data.packageTitle ?? null,
        package_category: data.packageCategory ?? null,
        name: primary.fullName,
        phone: primary.phone,
        email: primary.email,
        people: totalPeople,
        adults: data.adults,
        children: data.children,
        infants: data.infants,
        total_price: data.totalPrice ?? null,
        currency: data.currency,
        communication_preference: data.communicationPreference ?? null,
        emergency_contact: primary.emergencyContact ?? null,
        notes: data.notes ?? null,
        passport_path: primary.passportPath ?? null,
        status: "new",
      })
      .select("id, created_at")
      .single();

    if (error || !row) {
      console.error("[booking] insert failed", error);
      throw new Error("Failed to save booking");
    }

    const { error: paxError } = await supabaseAdmin.from("booking_passengers").insert(
      data.passengers.map((p, i) => ({
        booking_id: row.id,
        passenger_type: p.type,
        sort_order: i,
        is_primary: p.isPrimary,
        full_name: p.fullName,
        passport_number: p.passportNumber || null,
        nationality: p.nationality || null,
        gender: p.gender || null,
        date_of_birth: p.dateOfBirth || null,
        passport_expiry: p.passportExpiry || null,
        phone: p.phone || null,
        email: p.email || null,
        emergency_contact: p.emergencyContact || null,
        passport_path: p.passportPath || null,
        notes: p.notes || null,
      })),
    );

    if (paxError) {
      console.error("[booking] passengers insert failed", paxError);
    }

    // Best-effort email — never block the user if email fails.
    let emailSent = false;
    try {
      const resendKey = process.env.RESEND_API_KEY;
      const to = process.env.BOOKING_NOTIFICATION_EMAIL;
      const from = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";

      if (resendKey && to) {
        const passportUrls: Array<string | null> = [];
        for (const p of data.passengers) {
          if (!p.passportPath) {
            passportUrls.push(null);
            continue;
          }
          const { data: signed } = await supabaseAdmin.storage
            .from("passports")
            .createSignedUrl(p.passportPath, 60 * 30);
          passportUrls.push(signed?.signedUrl ?? null);
        }

        const { html, text, subject } = renderEmail({
          id: row.id,
          createdAt: new Date(row.created_at).toISOString(),
          input: data,
          passportUrls,
        });

        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ from, to: [to], subject, html, text }),
        });
        if (!res.ok) {
          const body = await res.text();
          console.error(`[booking] resend failed [${res.status}]: ${body}`);
        } else {
          emailSent = true;
        }
      } else {
        console.warn("[booking] RESEND_API_KEY or BOOKING_NOTIFICATION_EMAIL missing — skipping email");
      }
    } catch (err) {
      console.error("[booking] email error", err);
    }

    return { id: row.id, emailSent };
  });
