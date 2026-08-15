import { Router } from "express";
import { verifyNin, verifyBvn, verifyCac } from "../controllers/verification.controller";

const router = Router();

router.post("/nin", verifyNin);
router.post("/bvn", verifyBvn);
router.post("/cac", verifyCac);

export default router;
