import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const BookingInput = z.object({
  packageId: z.string().uuid().nullable().optional(),
  packageTitle: z.string().trim().max(200).optional().nullable(),
  packageCategory: z.string().trim().max(50).optional().nullable(),
  name: z.string().trim().min(1).max(120),
  phone: z.string().trim().min(3).max(30),
  email: z.string().trim().email().max(254).optional().or(z.literal("")).nullable(),
  people: z.number().int().min(1).max(50),
  notes: z.string().trim().max(2000).optional().nullable(),
  passportPath: z.string().trim().max(500).optional().nullable(),
});

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
  passportUrl: string | null;
  input: BookingInput;
}): { html: string; text: string; subject: string } {
  const { id, createdAt, passportUrl, input } = data;
  const rows: Array<[string, string]> = [
    ["Booking ID", id],
    ["Date", createdAt],
    ["Package", input.packageTitle ?? "—"],
    ["Service", input.packageCategory ?? "—"],
    ["Name", input.name],
    ["Phone", input.phone],
    ["Email", input.email ?? "—"],
    ["People", String(input.people)],
    ["Notes", input.notes ?? "—"],
    [
      "Passport",
      passportUrl
        ? `<a href="${escapeHtml(passportUrl)}" style="color:#E8722C;font-weight:600">Download (link expires in 30 min)</a>`
        : "—",
    ],
  ];

  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#f6f7f9;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#0f172a">
  <div style="max-width:640px;margin:0 auto;padding:24px">
    <div style="background:linear-gradient(135deg,#0F3D2E,#E8722C);color:#fff;padding:24px;border-radius:16px 16px 0 0">
      <div style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;opacity:.85">Janat Sahara Travel</div>
      <div style="font-size:22px;font-weight:800;margin-top:6px">New booking request</div>
      <div style="font-size:13px;opacity:.9;margin-top:4px">${escapeHtml(input.packageTitle ?? "General inquiry")}</div>
    </div>
    <div style="background:#fff;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 16px 16px;padding:8px 8px 16px">
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        ${rows
          .map(
            ([k, v], i) => `<tr style="background:${i % 2 ? "#fafafa" : "#fff"}">
          <td style="padding:12px 14px;color:#64748b;width:140px;vertical-align:top;font-weight:600">${escapeHtml(k)}</td>
          <td style="padding:12px 14px;color:#0f172a;vertical-align:top">${k === "Passport" ? v : escapeHtml(v)}</td>
        </tr>`,
          )
          .join("")}
      </table>
    </div>
    <p style="text-align:center;color:#94a3b8;font-size:12px;margin-top:16px">
      Sent automatically by janatsahara.tn — contact the customer directly.
    </p>
  </div>
</body></html>`;

  const text = rows.map(([k, v]) => `${k}: ${v.replace(/<[^>]+>/g, "")}`).join("\n");
  const subject = `New booking — ${input.name} — ${input.packageTitle ?? "General"}`;
  return { html, text, subject };
}

export const submitBooking = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => BookingInput.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row, error } = await supabaseAdmin
      .from("bookings")
      .insert({
        package_id: data.packageId ?? null,
        package_title: data.packageTitle ?? null,
        package_category: data.packageCategory ?? null,
        name: data.name,
        phone: data.phone,
        email: data.email || null,
        people: data.people,
        notes: data.notes ?? null,
        passport_path: data.passportPath ?? null,
        status: "new",
      })
      .select("id, created_at")
      .single();

    if (error || !row) {
      console.error("[booking] insert failed", error);
      throw new Error("Failed to save booking");
    }

    // Best-effort email — never block the user if email fails.
    let emailSent = false;
    try {
      const resendKey = process.env.RESEND_API_KEY;
      const to = process.env.BOOKING_NOTIFICATION_EMAIL;
      const from = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";

      if (resendKey && to) {
        let passportUrl: string | null = null;
        if (data.passportPath) {
          const { data: signed } = await supabaseAdmin.storage
            .from("passports")
            .createSignedUrl(data.passportPath, 60 * 30);
          passportUrl = signed?.signedUrl ?? null;
        }

        const { html, text, subject } = renderEmail({
          id: row.id,
          createdAt: new Date(row.created_at).toISOString(),
          passportUrl,
          input: data,
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
