import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { Applicant } from "../models/Applicant";
import { Otp } from "../models/Otp";
import { generateOtpCode, hashOtpCode, maskEmail } from "../utils/otp";
import { sendOtpEmail } from "../utils/mailer";
import { isQualifyingGrade, PRE_SELECTION_REJECTION_REASON } from "../utils/preSelection";

const OTP_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

const DOCUMENT_FIELDS = [
  "universityCertificate",
  "kasedaCertificate",
  "cacCertificate",
  "cacStatusReport",
  "lgaIndigeneLetter",
] as const;
type DocumentField = (typeof DOCUMENT_FIELDS)[number];

export async function requestOtp(req: Request, res: Response) {
  const { applicationNumber } = req.body as { applicationNumber?: string };
  if (!applicationNumber?.trim()) {
    return res.status(400).json({ message: "Application number is required" });
  }

  const applicant = await Applicant.findOne({ applicationNumber: applicationNumber.trim() });
  if (!applicant) {
    return res.status(404).json({ message: "No application found with that number" });
  }

  const existing = await Otp.findOne({ applicationNumber: applicant.applicationNumber });
  if (existing && Date.now() - existing.lastSentAt.getTime() < RESEND_COOLDOWN_MS) {
    const waitSeconds = Math.ceil(
      (RESEND_COOLDOWN_MS - (Date.now() - existing.lastSentAt.getTime())) / 1000
    );
    return res.status(429).json({ message: `Please wait ${waitSeconds}s before requesting another code` });
  }

  const code = generateOtpCode();
  await Otp.findOneAndUpdate(
    { applicationNumber: applicant.applicationNumber },
    {
      applicationNumber: applicant.applicationNumber,
      codeHash: hashOtpCode(code),
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
      attempts: 0,
      lastSentAt: new Date(),
    },
    { upsert: true }
  );

  await sendOtpEmail({
    email: applicant.email,
    fullName: applicant.fullName,
    applicationNumber: applicant.applicationNumber,
    code,
  });

  res.json({ maskedEmail: maskEmail(applicant.email) });
}

export async function verifyOtp(req: Request, res: Response) {
  const { applicationNumber, code } = req.body as { applicationNumber?: string; code?: string };
  if (!applicationNumber?.trim() || !code?.trim()) {
    return res.status(400).json({ message: "Application number and code are required" });
  }

  const otpRecord = await Otp.findOne({ applicationNumber: applicationNumber.trim() });
  if (!otpRecord) {
    return res.status(400).json({ message: "Code expired or not found. Request a new one" });
  }

  if (otpRecord.attempts >= MAX_ATTEMPTS) {
    await otpRecord.deleteOne();
    return res.status(429).json({ message: "Too many incorrect attempts. Request a new code" });
  }

  if (hashOtpCode(code.trim()) !== otpRecord.codeHash) {
    otpRecord.attempts += 1;
    await otpRecord.save();
    return res.status(400).json({ message: "Incorrect code" });
  }

  const applicant = await Applicant.findOne({ applicationNumber: applicationNumber.trim() });
  if (!applicant) {
    return res.status(404).json({ message: "Application no longer exists" });
  }

  await otpRecord.deleteOne();

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return res.status(500).json({ message: "Server auth is not configured" });
  }

  const token = jwt.sign(
    { applicationNumber: applicant.applicationNumber, applicantId: applicant.id },
    secret,
    { expiresIn: "2h" }
  );

  res.json({ token });
}

export async function getMe(req: Request, res: Response) {
  const applicant = await Applicant.findOne({ applicationNumber: req.tracking?.applicationNumber });
  if (!applicant) {
    return res.status(404).json({ message: "Application not found" });
  }

  res.json({
    applicationNumber: applicant.applicationNumber,
    fullName: applicant.fullName,
    email: applicant.email,
    businessSector: applicant.businessSector,
    requestedAmount: applicant.requestedAmount,
    status: applicant.status,
    decisionReason: applicant.decisionReason,
    documents: applicant.documents,
    createdAt: applicant.createdAt,
    updatedAt: applicant.updatedAt,
  });
}

// Lets an applicant who was reset to "pending" for having no documents (see
// scripts/ and the pre-selection sweep) come back and finish their
// application without re-entering any of the rest of their form data. Once
// all 5 documents are present, the same grade-based pre-selection rule used
// at initial submission runs again, so the record rejoins the normal
// pipeline instead of needing a manual admin nudge.
export async function submitDocuments(req: Request, res: Response) {
  const { documents } = req.body as { documents?: Partial<Record<DocumentField, string>> };
  if (!documents || typeof documents !== "object") {
    return res.status(400).json({ message: "Documents are required" });
  }

  const applicant = await Applicant.findOne({ applicationNumber: req.tracking?.applicationNumber });
  if (!applicant) {
    return res.status(404).json({ message: "Application not found" });
  }

  for (const field of DOCUMENT_FIELDS) {
    const url = documents[field];
    if (typeof url === "string" && /^https:\/\//.test(url)) {
      applicant.documents = { ...applicant.documents, [field]: url };
    }
  }

  const allPresent = DOCUMENT_FIELDS.every((field) => applicant.documents?.[field]);
  if (allPresent) {
    if (isQualifyingGrade(applicant.grade)) {
      applicant.status = "pre_selected";
      applicant.decisionReason = undefined;
    } else {
      applicant.status = "rejected";
      applicant.decisionReason = PRE_SELECTION_REJECTION_REASON;
    }
  }

  await applicant.save();

  res.json({
    applicationNumber: applicant.applicationNumber,
    status: applicant.status,
    decisionReason: applicant.decisionReason,
    documents: applicant.documents,
  });
}
