import { Request, Response } from "express";
import { Applicant } from "../models/Applicant";
import { getNextApplicationNumber } from "../models/Counter";
import { applicantInputSchema } from "../utils/validation";
import { sendApplicationConfirmationEmail } from "../utils/mailer";
import { APPLICATION_CLOSE_DATE, isApplicationWindowClosed } from "../utils/applicationWindow";

export async function getApplicationWindow(_req: Request, res: Response) {
  res.json({ closed: isApplicationWindowClosed(), closesAt: APPLICATION_CLOSE_DATE.toISOString() });
}

export async function createApplicant(req: Request, res: Response) {
  if (isApplicationWindowClosed()) {
    return res.status(403).json({
      message: "Applications for KGEF closed on 11 September 2026 and are no longer being accepted.",
    });
  }

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
  const { status, search, grade, page, limit } = req.query as {
    status?: string;
    search?: string;
    grade?: string;
    page?: string;
    limit?: string;
  };
  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;
  if (grade) filter.grade = grade;
  if (search?.trim()) {
    const pattern = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ fullName: pattern }, { applicationNumber: pattern }, { email: pattern }];
  }

  const pageNum = Math.max(1, parseInt(page ?? "1", 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit ?? "30", 10) || 30));

  const [data, total] = await Promise.all([
    // Oldest first: whoever applied first appears first, matching the
    // first-come-first-served ordering the fund is reviewed in.
    Applicant.find(filter)
      .sort({ createdAt: 1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Applicant.countDocuments(filter),
  ]);

  res.json({ data, page: pageNum, limit: limitNum, total, totalPages: Math.max(1, Math.ceil(total / limitNum)) });
}

export async function getApplicantCounts(_req: Request, res: Response) {
  const grouped = await Applicant.aggregate<{ _id: string; count: number }>([
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);

  const counts = { pending: 0, under_review: 0, approved: 0, rejected: 0, total: 0 };
  for (const g of grouped) {
    if (g._id in counts) counts[g._id as keyof typeof counts] = g.count;
    counts.total += g.count;
  }

  res.json(counts);
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
  "cacStatusReport",
  "lgaIndigeneLetter",
];

const ALLOWED_GRADES = [
  "First Class",
  "Second Class Upper",
  "Second Class Lower",
  "Third Class",
  "Distinction",
  "Merit",
  "Credit",
  "Pass",
];

export async function updateApplicantStatus(req: Request, res: Response) {
  const { status, score, reviewNotes, decisionReason, grade, documentVerification } = req.body;
  const allowedStatuses = ["pending", "under_review", "approved", "rejected"];
  if (status && !allowedStatuses.includes(status)) {
    return res.status(400).json({ message: "Invalid status value" });
  }
  if ((status === "approved" || status === "rejected") && !decisionReason?.trim()) {
    return res.status(400).json({ message: "A decision reason is required to approve or reject an application" });
  }
  if (grade !== undefined && !ALLOWED_GRADES.includes(grade)) {
    return res.status(400).json({ message: "Invalid grade value" });
  }

  const update: Record<string, unknown> = {};
  if (status) update.status = status;
  if (score !== undefined) update.score = score;
  if (reviewNotes !== undefined) update.reviewNotes = reviewNotes;
  if (decisionReason !== undefined) update.decisionReason = decisionReason;
  if (grade !== undefined) update.grade = grade;
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
