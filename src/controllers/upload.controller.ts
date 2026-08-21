import { Request, Response } from "express";
import { uploadBufferToCloudinary, deleteByCloudinaryUrl, isCloudinaryConfigured } from "../utils/cloudinaryUpload";

const DOCUMENT_TYPES = new Set([
  "universityCertificate",
  "kasedaCertificate",
  "cacCertificate",
  "cacStatusReport",
  "lgaIndigeneLetter",
]);

export async function uploadDocument(req: Request, res: Response) {
  if (!isCloudinaryConfigured()) {
    return res.status(503).json({ message: "Document storage is not configured. Try again later." });
  }

  const { documentType } = req.body as { documentType?: string };
  if (!documentType || !DOCUMENT_TYPES.has(documentType)) {
    return res.status(400).json({ message: "Unknown or missing document type" });
  }

  const file = req.file;
  if (!file) {
    return res.status(400).json({ message: "No file was uploaded" });
  }

  try {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const url = await uploadBufferToCloudinary(file.buffer, {
      folder: "kgef-applications/uploads",
      publicId: `${documentType}-${unique}`,
    });
    res.json({ url });
  } catch (err) {
    console.error(`Failed to upload ${documentType}:`, err);
    res.status(502).json({ message: "Upload failed. Please try again." });
  }
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
