import { Router } from "express";
import {
  createApplicant,
  listApplicants,
  getApplicant,
  updateApplicantStatus,
  deleteApplicant,
} from "../controllers/applicant.controller";
import { applicantDocumentFields } from "../middleware/upload";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.post("/", applicantDocumentFields, asyncHandler(createApplicant));
router.get("/", asyncHandler(listApplicants));
router.get("/:id", asyncHandler(getApplicant));
router.patch("/:id/status", asyncHandler(updateApplicantStatus));
router.delete("/:id", asyncHandler(deleteApplicant));

export default router;
