import { Router } from "express";
import multer from "multer";
import { uploadDocument, deleteDocument } from "../controllers/upload.controller";
import { asyncHandler } from "../utils/asyncHandler";

const allowedMimeTypes = new Set(["application/pdf", "image/jpeg", "image/png", "image/jpg"]);

const upload = multer({
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

const router = Router();

router.post("/", upload.single("file"), asyncHandler(uploadDocument));
router.delete("/", asyncHandler(deleteDocument));

export default router;
