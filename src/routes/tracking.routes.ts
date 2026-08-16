import { Router } from "express";
import { requestOtp, verifyOtp, getMe } from "../controllers/tracking.controller";
import { requireTrackingAuth } from "../middleware/trackingAuth";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.post("/request-otp", asyncHandler(requestOtp));
router.post("/verify-otp", asyncHandler(verifyOtp));
router.get("/me", requireTrackingAuth, asyncHandler(getMe));

export default router;
