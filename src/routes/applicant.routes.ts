import { Router } from "express";
import {
  createApplicant,
  listApplicants,
  getApplicant,
  updateApplicantStatus,
  deleteApplicant,
} from "../controllers/applicant.controller";
import { requireAdminAuth } from "../middleware/adminAuth";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

// Only creation is public — an applicant submits their own data once.
// Listing, viewing, updating, and deleting expose full PII (NIN, BVN, phone,
// documents) for every applicant and are admin-only.
router.post("/", asyncHandler(createApplicant));
router.get("/", requireAdminAuth, asyncHandler(listApplicants));
router.get("/:id", requireAdminAuth, asyncHandler(getApplicant));
router.patch("/:id/status", requireAdminAuth, asyncHandler(updateApplicantStatus));
router.delete("/:id", requireAdminAuth, asyncHandler(deleteApplicant));

export default router;
