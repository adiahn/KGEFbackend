import { Router } from "express";
import { getUploadSignature, deleteDocument } from "../controllers/upload.controller";
import { strictLimiter } from "../middleware/rateLimit";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.post("/signature", strictLimiter, asyncHandler(getUploadSignature));
router.delete("/", strictLimiter, asyncHandler(deleteDocument));

export default router;
