import nodemailer from "nodemailer";
import type { IApplicant } from "../models/Applicant";

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (transporter) return transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    console.warn("SMTP not configured — skipping confirmation emails.");
    return null;
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return transporter;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function buildEmail(applicant: IApplicant) {
  const details: [string, string][] = [
    ["Application Number", applicant.applicationNumber],
    ["Business Sector", applicant.businessSector],
    ["Requested Amount", applicant.requestedAmount],
    ["Preferred Funding Type", applicant.preferredFundingType],
    ["Submitted On", formatDate(applicant.createdAt)],
  ];

  const rowsHtml = details
    .map(
      ([label, value]) =>
        `<tr><td style="padding:8px 0;color:#64748b;font-size:13px;">${label}</td><td style="padding:8px 0;color:#0f172a;font-size:13px;font-weight:600;text-align:right;">${value}</td></tr>`
    )
    .join("");

  const rowsText = details.map(([label, value]) => `${label}: ${value}`).join("\n");

  const html = `
<div style="font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;max-width:520px;margin:0 auto;background:#ffffff;">
  <div style="background:#065f46;padding:24px 32px;">
    <span style="display:inline-block;background:#047857;color:#ffffff;font-weight:700;font-size:13px;padding:6px 10px;border-radius:5px;">KGEF</span>
    <p style="color:#ffffff;font-size:18px;font-weight:700;margin:12px 0 0;">Application Received</p>
  </div>
  <div style="padding:32px;border:1px solid #e2e8f0;border-top:none;">
    <p style="color:#0f172a;font-size:15px;margin:0 0 16px;">Hello ${applicant.fullName},</p>
    <p style="color:#334155;font-size:14px;line-height:1.6;margin:0 0 24px;">
      Thank you for applying to the KGEF Graduate Start-up Capital Fund. We've received your application
      and it is now pending review.
    </p>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:5px;padding:16px 20px;margin-bottom:24px;text-align:center;">
      <p style="color:#166534;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 6px;">Your Application Number</p>
      <p style="color:#065f46;font-size:22px;font-weight:800;margin:0;letter-spacing:0.03em;">${applicant.applicationNumber}</p>
    </div>
    <p style="color:#334155;font-size:14px;line-height:1.6;margin:0 0 16px;">
      Keep this number — you'll need it to track the status of your application.
    </p>
    <table style="width:100%;border-collapse:collapse;border-top:1px solid #e2e8f0;">
      ${rowsHtml}
    </table>
    <p style="color:#64748b;font-size:13px;line-height:1.6;margin:24px 0 0;">
      Our team will review your submission and reach out via this email or the phone number you provided
      with next steps.
    </p>
  </div>
  <div style="padding:20px 32px;text-align:center;">
    <p style="color:#94a3b8;font-size:12px;margin:0;">KGEF Graduate Start-Up Capital Fund — Funded and administered by KASEDA</p>
  </div>
</div>`.trim();

  const text = `Hello ${applicant.fullName},

Thank you for applying to the KGEF Graduate Start-up Capital Fund. We've received your application and it is now pending review.

Your Application Number: ${applicant.applicationNumber}
Keep this number — you'll need it to track the status of your application.

${rowsText}

Our team will review your submission and reach out via this email or the phone number you provided with next steps.

KGEF Graduate Start-Up Capital Fund — Funded and administered by KASEDA`;

  return { html, text };
}

export async function sendApplicationConfirmationEmail(applicant: IApplicant): Promise<void> {
  const client = getTransporter();
  if (!client) return;

  const { html, text } = buildEmail(applicant);

  await client.sendMail({
    from: `"KGEF Graduate Start-Up Capital Fund" <${process.env.SMTP_USER}>`,
    to: applicant.email,
    subject: `Application Received — ${applicant.applicationNumber}`,
    text,
    html,
  });
}
