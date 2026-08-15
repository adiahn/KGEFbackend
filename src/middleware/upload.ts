import multer from "multer";
import path from "path";
import fs from "fs";

// On Vercel the deployment bundle is read-only except /tmp — writing (or even
// mkdir'ing) anywhere else throws EROFS. /tmp works but is ephemeral and not
// shared across function instances, so uploaded files won't reliably persist
// or be servable back out. This keeps the app from crashing; real uploads on
// Vercel need object storage (S3, Vercel Blob, Cloudinary, etc.) instead of
// multer.diskStorage.
const uploadDir = process.env.VERCEL ? "/tmp" : path.join(__dirname, "..", "..", "uploads");
if (!process.env.VERCEL && !fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const allowedMimeTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/jpg",
]);

export const upload = multer({
  storage,
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
