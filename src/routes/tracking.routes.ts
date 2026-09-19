import { Router } from "express";
import { requestOtp, verifyOtp, getMe, submitDocuments } from "../controllers/tracking.controller";
import { requireTrackingAuth } from "../middleware/trackingAuth";
import { strictLimiter } from "../middleware/rateLimit";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.post("/request-otp", strictLimiter, asyncHandler(requestOtp));
router.post("/verify-otp", asyncHandler(verifyOtp));
router.get("/me", requireTrackingAuth, asyncHandler(getMe));
router.patch("/documents", requireTrackingAuth, asyncHandler(submitDocuments));

export default router;
