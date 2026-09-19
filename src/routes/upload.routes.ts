import { Router } from "express";
import { getUploadSignature, deleteDocument, getDocumentViewUrl } from "../controllers/upload.controller";
import { strictLimiter } from "../middleware/rateLimit";
import { requireAdminAuth } from "../middleware/adminAuth";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.post("/signature", strictLimiter, asyncHandler(getUploadSignature));
router.delete("/", strictLimiter, asyncHandler(deleteDocument));
router.post("/view-url", requireAdminAuth, asyncHandler(getDocumentViewUrl));

export default router;
