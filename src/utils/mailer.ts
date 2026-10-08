import nodemailer from "nodemailer";
import type { IApplicant } from "../models/Applicant";

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (transporter) return transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    console.warn("SMTP not configured, skipping confirmation emails.");
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

/** Visible From address. Prefer SMTP_FROM (the mailbox configured on Vercel) over the auth user. */
function getFromAddress(): string {
  const address = (process.env.SMTP_FROM || process.env.SMTP_USER || "").trim();
  return `"KGEF Graduate Start-Up Capital Fund" <${address}>`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function buildEmail(applicant: IApplicant) {
  const sections: [string, [string, string][]][] = [
    [
      "Personal & Contact",
      [
        ["Full Name", applicant.fullName],
        ["Gender", applicant.gender],
        ["Date of Birth", formatDate(applicant.dateOfBirth)],
        ["Phone", applicant.phone],
        ["Email", applicant.email],
        ["Address", applicant.address],
        ["Local Government of Origin", applicant.lgaOfOrigin],
      ],
    ],
    [
      "Education",
      [
        ["Institution", applicant.institution],
        ["Program", applicant.program],
        ["Graduation Year", String(applicant.graduationYear)],
        ["Educational Qualification", applicant.educationalQualification],
        ["Grade", applicant.grade],
      ],
    ],
    [
      "Identification",
      [
        ["NIN", applicant.nin],
        ["BVN", applicant.bvn],
        ["TIN", applicant.tin],
        ...(applicant.cacCertificateNumber
          ? ([["CAC Certificate Number", applicant.cacCertificateNumber]] as [string, string][])
          : []),
      ],
    ],
    [
      "Business",
      [
        ["Business Sector", applicant.businessSector],
        ["Business Stage", applicant.businessStage],
        ["Legal Structure", applicant.legalStructure],
      ],
    ],
    [
      "Funding Request",
      [
        ["Requested Amount", applicant.requestedAmount],
        ["Funding Type", "Interest-Free Loan"],
        ["Disbursement Preference", applicant.disbursementPreference],
      ],
    ],
    [
      "Guarantor",
      [
        ["Guarantor Type", applicant.guarantorType],
        ["Guarantor Relationship", applicant.guarantorRelationship],
      ],
    ],
    ["Submission", [["Submitted On", formatDate(applicant.createdAt)]]],
  ];

  const rowsHtml = sections
    .map(
      ([sectionTitle, rows]) =>
        `<tr><td colspan="2" style="padding:16px 0 6px;color:#065f46;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">${sectionTitle}</td></tr>` +
        rows
          .map(
            ([label, value]) =>
              `<tr><td style="padding:6px 0;color:#64748b;font-size:13px;">${label}</td><td style="padding:6px 0;color:#0f172a;font-size:13px;font-weight:600;text-align:right;">${value}</td></tr>`
          )
          .join("")
    )
    .join("");

  const rowsText = sections
    .map(
      ([sectionTitle, rows]) =>
        `${sectionTitle}\n${rows.map(([label, value]) => `  ${label}: ${value}`).join("\n")}`
    )
    .join("\n\n");

  const html = `
<div style="font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;max-width:520px;margin:0 auto;background:#ffffff;">
  <div style="background:#065f46;padding:24px 32px;">
    <span style="display:inline-block;background:#047857;color:#ffffff;font-weight:700;font-size:13px;padding:6px 10px;border-radius:5px;">KGEF</span>
    <p style="color:#ffffff;font-size:18px;font-weight:700;margin:12px 0 0;">Application Received</p>
  </div>
  <div style="padding:32px;border:1px solid #e2e8f0;border-top:none;">
    <p style="color:#0f172a;font-size:15px;margin:0 0 16px;">Hello ${applicant.fullName?.trim() || "Applicant"},</p>
    <p style="color:#334155;font-size:14px;line-height:1.6;margin:0 0 24px;">
      Thank you for applying to the KGEF Graduate Start-up Capital Fund. We've received your application
      and it is now pending review.
    </p>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:5px;padding:16px 20px;margin-bottom:24px;text-align:center;">
      <p style="color:#166534;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 6px;">Your Application Number</p>
      <p style="color:#065f46;font-size:22px;font-weight:800;margin:0;letter-spacing:0.03em;">${applicant.applicationNumber}</p>
    </div>
    <p style="color:#334155;font-size:14px;line-height:1.6;margin:0 0 16px;">
      Keep this number. You'll need it to track the status of your application.
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
    <p style="color:#94a3b8;font-size:12px;margin:0;">KGEF Graduate Start-Up Capital Fund, funded and administered by KASEDA</p>
  </div>
</div>`.trim();

  const text = `Hello ${applicant.fullName?.trim() || "Applicant"},

Thank you for applying to the KGEF Graduate Start-up Capital Fund. We've received your application and it is now pending review.

Your Application Number: ${applicant.applicationNumber}
Keep this number. You'll need it to track the status of your application.

${rowsText}

Our team will review your submission and reach out via this email or the phone number you provided with next steps.

KGEF Graduate Start-Up Capital Fund, funded and administered by KASEDA`;

  return { html, text };
}

export async function sendApplicationConfirmationEmail(applicant: IApplicant): Promise<void> {
  const client = getTransporter();
  if (!client) return;

  const { html, text } = buildEmail(applicant);

  await client.sendMail({
    from: getFromAddress(),
    to: applicant.email,
    subject: `Application Received: ${applicant.applicationNumber}`,
    text,
    html,
  });
}

export async function sendOtpEmail(params: {
  email: string;
  fullName: string;
  applicationNumber: string;
  code: string;
}): Promise<void> {
  const client = getTransporter();
  if (!client) {
    throw new Error("Email service is not configured, cannot send verification code.");
  }

  const greetingName = params.fullName?.trim() || "Applicant";

  const html = `
<div style="font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;max-width:480px;margin:0 auto;background:#ffffff;">
  <div style="background:#065f46;padding:24px 32px;">
    <span style="display:inline-block;background:#047857;color:#ffffff;font-weight:700;font-size:13px;padding:6px 10px;border-radius:5px;">KGEF</span>
    <p style="color:#ffffff;font-size:18px;font-weight:700;margin:12px 0 0;">Your Verification Code</p>
  </div>
  <div style="padding:32px;border:1px solid #e2e8f0;border-top:none;">
    <p style="color:#0f172a;font-size:15px;margin:0 0 16px;">Hello ${greetingName},</p>
    <p style="color:#334155;font-size:14px;line-height:1.6;margin:0 0 24px;">
      Use the code below to access the status of application <strong>${params.applicationNumber}</strong>.
      This code expires in 10 minutes.
    </p>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:5px;padding:20px;margin-bottom:24px;text-align:center;">
      <p style="color:#065f46;font-size:32px;font-weight:800;margin:0;letter-spacing:0.2em;">${params.code}</p>
    </div>
    <p style="color:#64748b;font-size:13px;line-height:1.6;margin:0;">
      If you didn't request this code, you can safely ignore this email.
    </p>
  </div>
  <div style="padding:20px 32px;text-align:center;">
    <p style="color:#94a3b8;font-size:12px;margin:0;">KGEF Graduate Start-Up Capital Fund, funded and administered by KASEDA</p>
  </div>
</div>`.trim();

  const text = `Hello ${greetingName},

Use the code below to access the status of application ${params.applicationNumber}. This code expires in 10 minutes.

${params.code}

If you didn't request this code, you can safely ignore this email.

KGEF Graduate Start-Up Capital Fund, funded and administered by KASEDA`;

  await client.sendMail({
    from: getFromAddress(),
    to: params.email,
    subject: `Your KGEF verification code: ${params.code}`,
    text,
    html,
  });
}

function getPublicSiteUrl(): string {
  const fromEnv = process.env.CLIENT_ORIGIN?.split(",")[0]?.trim();
  return (fromEnv || "https://kgef.kasedaktsg.com").replace(/\/$/, "");
}

/**
 * Sent when an applicant is moved to under_review but their CAC Status
 * Report is still missing. Kept close to the OTP / confirmation template
 * on purpose — Namecheap's outbound filter (Jellyfish) discards mail that
 * looks like phishing ("Action needed", cold URLs, sparse test bodies).
 */
export async function sendMissingStatusReportEmail(params: {
  email: string;
  fullName: string;
  applicationNumber: string;
}): Promise<void> {
  const client = getTransporter();
  if (!client) {
    console.warn("SMTP not configured, skipping missing-status-report email.");
    return;
  }

  const greetingName = params.fullName?.trim() || "Applicant";
  const trackUrl = getPublicSiteUrl();

  const html = `
<div style="font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;max-width:480px;margin:0 auto;background:#ffffff;">
  <div style="background:#065f46;padding:24px 32px;">
    <span style="display:inline-block;background:#047857;color:#ffffff;font-weight:700;font-size:13px;padding:6px 10px;border-radius:5px;">KGEF</span>
    <p style="color:#ffffff;font-size:18px;font-weight:700;margin:12px 0 0;">Document Update for Your Application</p>
  </div>
  <div style="padding:32px;border:1px solid #e2e8f0;border-top:none;">
    <p style="color:#0f172a;font-size:15px;margin:0 0 16px;">Hello ${greetingName},</p>
    <p style="color:#334155;font-size:14px;line-height:1.6;margin:0 0 16px;">
      Your application <strong>${params.applicationNumber}</strong> is now under review.
      To complete your file, please upload your <strong>CAC Status Report</strong>.
    </p>
    <p style="color:#334155;font-size:14px;line-height:1.6;margin:0 0 20px;">
      Use the link below, enter your application number under Track Your Application,
      verify with the code we email you, then upload the status report from your
      dashboard. Each upload saves immediately.
    </p>
    <p style="text-align:center;margin:0 0 20px;">
      <a href="${trackUrl}" style="display:inline-block;background:#065f46;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:12px 20px;border-radius:5px;">
        Upload your CAC Status Report
      </a>
    </p>
    <p style="color:#64748b;font-size:13px;line-height:1.6;margin:0 0 8px;">
      Or paste this link into your browser:<br>
      <a href="${trackUrl}" style="color:#065f46;word-break:break-all;">${trackUrl}</a>
    </p>
    <p style="color:#64748b;font-size:13px;line-height:1.6;margin:0;">
      If you have already uploaded the CAC Status Report, you can ignore this email.
    </p>
  </div>
  <div style="padding:20px 32px;text-align:center;">
    <p style="color:#94a3b8;font-size:12px;margin:0;">KGEF Graduate Start-Up Capital Fund, funded and administered by KASEDA</p>
  </div>
</div>`.trim();

  const text = `Hello ${greetingName},

Your application ${params.applicationNumber} is now under review. To complete your file, please upload your CAC Status Report.

Open this link, enter your application number under Track Your Application, verify with the code we email you, then upload the status report from your dashboard:
${trackUrl}

If you have already uploaded the CAC Status Report, you can ignore this email.

KGEF Graduate Start-Up Capital Fund, funded and administered by KASEDA`;

  await client.sendMail({
    from: getFromAddress(),
    to: params.email,
    subject: `KGEF document update for ${params.applicationNumber}`,
    text,
    html,
  });
}

/**
 * Asks an under_review applicant to log in, read the reviewer comment on
 * their dashboard, and upload only the document(s) named in that comment.
 */
export async function sendDocumentResubmissionEmail(params: {
  email: string;
  fullName: string;
  applicationNumber: string;
  reviewNotes?: string;
}): Promise<void> {
  const client = getTransporter();
  if (!client) {
    console.warn("SMTP not configured, skipping document-resubmission email.");
    return;
  }

  const greetingName = params.fullName?.trim() || "Applicant";
  const trackUrl = getPublicSiteUrl();
  const comment = params.reviewNotes?.trim();

  const commentHtml = comment
    ? `
    <p style="color:#334155;font-size:14px;line-height:1.6;margin:0 0 8px;">
      Please read this note from the review team carefully:
    </p>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:5px;padding:14px 16px;margin:0 0 20px;">
      <p style="color:#0f172a;font-size:14px;line-height:1.6;margin:0;white-space:pre-wrap;">${comment.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
    </div>`
    : `
    <p style="color:#334155;font-size:14px;line-height:1.6;margin:0 0 20px;">
      After you sign in, read the reviewer comment on your dashboard and upload
      <strong>only</strong> the document(s) they asked for.
    </p>`;

  const commentText = comment
    ? `Please read this note from the review team carefully:\n\n${comment}\n`
    : `After you sign in, read the reviewer comment on your dashboard and upload only the document(s) they asked for.\n`;

  const html = `
<div style="font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;max-width:480px;margin:0 auto;background:#ffffff;">
  <div style="background:#065f46;padding:24px 32px;">
    <span style="display:inline-block;background:#047857;color:#ffffff;font-weight:700;font-size:13px;padding:6px 10px;border-radius:5px;">KGEF</span>
    <p style="color:#ffffff;font-size:18px;font-weight:700;margin:12px 0 0;">Document Update for Your Application</p>
  </div>
  <div style="padding:32px;border:1px solid #e2e8f0;border-top:none;">
    <p style="color:#0f172a;font-size:15px;margin:0 0 16px;">Hello ${greetingName},</p>
    <p style="color:#334155;font-size:14px;line-height:1.6;margin:0 0 16px;">
      Your application <strong>${params.applicationNumber}</strong> is under review.
      The review team needs an updated document from you before they can continue.
    </p>
    ${commentHtml}
    <p style="color:#334155;font-size:14px;line-height:1.6;margin:0 0 20px;">
      Use the link below, enter your application number under Track Your Application,
      verify with the code we email you, then upload <strong>only</strong> the
      requested document from your dashboard. Each upload saves immediately.
    </p>
    <p style="text-align:center;margin:0 0 20px;">
      <a href="${trackUrl}" style="display:inline-block;background:#065f46;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:12px 20px;border-radius:5px;">
        Open your application dashboard
      </a>
    </p>
    <p style="color:#64748b;font-size:13px;line-height:1.6;margin:0 0 8px;">
      Or paste this link into your browser:<br>
      <a href="${trackUrl}" style="color:#065f46;word-break:break-all;">${trackUrl}</a>
    </p>
    <p style="color:#64748b;font-size:13px;line-height:1.6;margin:0;">
      If you have already uploaded the requested document, you can ignore this email.
    </p>
  </div>
  <div style="padding:20px 32px;text-align:center;">
    <p style="color:#94a3b8;font-size:12px;margin:0;">KGEF Graduate Start-Up Capital Fund, funded and administered by KASEDA</p>
  </div>
</div>`.trim();

  const text = `Hello ${greetingName},

Your application ${params.applicationNumber} is under review. The review team needs an updated document from you before they can continue.

${commentText}
Open this link, enter your application number under Track Your Application, verify with the code we email you, then upload only the requested document from your dashboard:
${trackUrl}

If you have already uploaded the requested document, you can ignore this email.

KGEF Graduate Start-Up Capital Fund, funded and administered by KASEDA`;

  await client.sendMail({
    from: getFromAddress(),
    to: params.email,
    subject: `KGEF document update for ${params.applicationNumber}`,
    text,
    html,
  });
}
