import { Request, Response } from "express";

// NOTE: These endpoints perform FORMAT validation only. Real identity/business
// verification against NIMC (NIN), a licensed BVN provider, or the CAC registry
// requires a commercial API agreement this project does not have credentials
// for. Wire a real provider in here before relying on this for eligibility
// decisions. Do not treat `valid: true` as a confirmed identity/business match.

const NIN_PATTERN = /^\d{11}$/;
const BVN_PATTERN = /^\d{11}$/;
const CAC_PATTERN = /^[A-Za-z]{0,2}\d{4,10}$/;

export function verifyNin(req: Request, res: Response) {
  const { nin } = req.body as { nin?: string };
  const valid = typeof nin === "string" && NIN_PATTERN.test(nin.trim());
  res.json({
    valid,
    message: valid
      ? "NIN format looks valid."
      : "NIN must be exactly 11 digits.",
  });
}

export function verifyBvn(req: Request, res: Response) {
  const { bvn } = req.body as { bvn?: string };
  const valid = typeof bvn === "string" && BVN_PATTERN.test(bvn.trim());
  res.json({
    valid,
    message: valid
      ? "BVN format looks valid."
      : "BVN must be exactly 11 digits.",
  });
}

export function verifyCac(req: Request, res: Response) {
  const { cacNumber } = req.body as { cacNumber?: string };
  const valid = typeof cacNumber === "string" && CAC_PATTERN.test(cacNumber.trim());
  res.json({
    valid,
    message: valid
      ? "CAC number format looks valid."
      : "Enter a valid CAC registration number (e.g. RC1234567).",
  });
}
