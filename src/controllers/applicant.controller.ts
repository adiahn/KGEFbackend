import { Request, Response } from "express";
import { Applicant } from "../models/Applicant";
import { applicantInputSchema } from "../utils/validation";

type UploadedFiles = Record<string, Express.Multer.File[]>;

export async function createApplicant(req: Request, res: Response) {
  const parsed = applicantInputSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Validation failed", errors: parsed.error.flatten() });
  }

  const files = (req.files as UploadedFiles) || {};
  const documents = {
    universityCertificate: files.universityCertificate?.[0]?.filename,
    kasedaCertificate: files.kasedaCertificate?.[0]?.filename,
    cacCertificate: files.cacCertificate?.[0]?.filename,
    tinCertificate: files.tinCertificate?.[0]?.filename,
    lgaIndigeneLetter: files.lgaIndigeneLetter?.[0]?.filename,
  };

  const applicant = await Applicant.create({ ...parsed.data, documents });
  res.status(201).json(applicant);
}

export async function listApplicants(req: Request, res: Response) {
  const { status } = req.query;
  const filter = status ? { status } : {};
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

export async function updateApplicantStatus(req: Request, res: Response) {
  const { status, score } = req.body;
  const allowedStatuses = ["pending", "under_review", "approved", "rejected"];
  if (status && !allowedStatuses.includes(status)) {
    return res.status(400).json({ message: "Invalid status value" });
  }

  const applicant = await Applicant.findByIdAndUpdate(
    req.params.id,
    { ...(status && { status }), ...(score !== undefined && { score }) },
    { new: true }
  );
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
