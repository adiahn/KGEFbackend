import { Request, Response } from "express";
import { createUploadSignature, deleteByCloudinaryUrl, isCloudinaryConfigured } from "../utils/cloudinaryUpload";

const DOCUMENT_TYPES = new Set([
  "universityCertificate",
  "kasedaCertificate",
  "cacCertificate",
  "cacStatusReport",
  "lgaIndigeneLetter",
]);

export async function getUploadSignature(req: Request, res: Response) {
  if (!isCloudinaryConfigured()) {
    return res.status(503).json({ message: "Document storage is not configured. Try again later." });
  }

  const { documentType } = req.body as { documentType?: string };
  if (!documentType || !DOCUMENT_TYPES.has(documentType)) {
    return res.status(400).json({ message: "Unknown or missing document type" });
  }

  res.json(createUploadSignature(documentType));
}

export async function deleteDocument(req: Request, res: Response) {
  const { url } = req.body as { url?: string };
  if (!url) {
    return res.status(400).json({ message: "URL is required" });
  }

  try {
    await deleteByCloudinaryUrl(url);
    res.status(204).send();
  } catch (err) {
    console.error("Failed to delete document:", err);
    res.status(502).json({ message: "Couldn't delete the file. It may already be removed." });
  }
}
