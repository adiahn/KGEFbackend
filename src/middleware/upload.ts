import multer from "multer";

// Files are kept in memory only, then streamed straight to Cloudinary in the
// controller — nothing touches the local filesystem, so this works the same
// way locally and on Vercel's read-only/ephemeral filesystem.
const allowedMimeTypes = new Set(["application/pdf", "image/jpeg", "image/png", "image/jpg"]);

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (allowedMimeTypes.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Unsupported file type. Only PDF, JPG, and PNG are allowed."));
    }
  },
});

export const applicantDocumentFields = upload.fields([
  { name: "universityCertificate", maxCount: 1 },
  { name: "kasedaCertificate", maxCount: 1 },
  { name: "cacCertificate", maxCount: 1 },
  { name: "tinCertificate", maxCount: 1 },
  { name: "lgaIndigeneLetter", maxCount: 1 },
]);
