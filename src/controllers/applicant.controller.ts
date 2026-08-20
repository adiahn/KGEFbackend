import { Request, Response } from "express";
import { Applicant } from "../models/Applicant";
import { getNextApplicationNumber } from "../models/Counter";
import { applicantInputSchema } from "../utils/validation";
import { sendApplicationConfirmationEmail } from "../utils/mailer";

export async function createApplicant(req: Request, res: Response) {
  const parsed = applicantInputSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Validation failed", errors: parsed.error.flatten() });
  }

  const applicationNumber = await getNextApplicationNumber();
  const applicant = await Applicant.create({ ...parsed.data, applicationNumber });

  // Awaited (not fire-and-forget) because Vercel can freeze the function the
  // instant the response is sent; a "background" send after res.json()
  // would not reliably complete. A failed email must not fail the
  // submission itself, since the applicant's data is already saved.
  try {
    await sendApplicationConfirmationEmail(applicant);
  } catch (err) {
    console.error("Failed to send application confirmation email:", err);
  }

  res.status(201).json(applicant);
}

export async function listApplicants(req: Request, res: Response) {
  const { status, search } = req.query as { status?: string; search?: string };
  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;
  if (search?.trim()) {
    const pattern = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ fullName: pattern }, { applicationNumber: pattern }, { email: pattern }];
  }

  const applicants = await Applicant.find(filter).sort({ createdAt: -1 });
  res.json(applicants);
}

export async function getApplicant(req: Request, res: Response) {
  const applicant = await Applicant.findById(req.params.id);
  if (!applicant) {
    return res.status(404).json({ message: "Applicant not found" });
  }
  res.json(applicant);
}

const DOCUMENT_FIELDS = [
  "universityCertificate",
  "kasedaCertificate",
  "cacCertificate",
  "tinCertificate",
  "lgaIndigeneLetter",
];

export async function updateApplicantStatus(req: Request, res: Response) {
  const { status, score, reviewNotes, decisionReason, documentVerification } = req.body;
  const allowedStatuses = ["pending", "under_review", "approved", "rejected"];
  if (status && !allowedStatuses.includes(status)) {
    return res.status(400).json({ message: "Invalid status value" });
  }
  if ((status === "approved" || status === "rejected") && !decisionReason?.trim()) {
    return res.status(400).json({ message: "A decision reason is required to approve or reject an application" });
  }

  const update: Record<string, unknown> = {};
  if (status) update.status = status;
  if (score !== undefined) update.score = score;
  if (reviewNotes !== undefined) update.reviewNotes = reviewNotes;
  if (decisionReason !== undefined) update.decisionReason = decisionReason;
  if (documentVerification && typeof documentVerification === "object") {
    for (const field of DOCUMENT_FIELDS) {
      if (field in documentVerification) {
        update[`documentVerification.${field}`] = Boolean(documentVerification[field]);
      }
    }
  }

  const applicant = await Applicant.findByIdAndUpdate(req.params.id, update, { new: true });
  if (!applicant) {
    return res.status(404).json({ message: "Applicant not found" });
  }
  res.json(applicant);
}

export async function deleteApplicant(req: Request, res: Response) {
  const applicant = await Applicant.findByIdAndDelete(req.params.id);
  if (!applicant) {
    return res.status(404).json({ message: "Applicant not found" });
  }
  res.status(204).send();
}
