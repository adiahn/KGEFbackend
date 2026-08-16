import { Router } from "express";
import { adminLogin } from "../controllers/admin.controller";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.post("/login", asyncHandler(adminLogin));

export default router;
