import { Request, Response } from "express";
import crypto from "crypto";
import jwt from "jsonwebtoken";

function timingSafeStringEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // Still run a comparison so mismatched-length attempts take the same
    // rough time as a real one, rather than returning early.
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

export async function adminLogin(req: Request, res: Response) {
  const { password } = req.body as { password?: string };
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    return res.status(500).json({ message: "Admin login is not configured" });
  }
  if (!password || !timingSafeStringEqual(password, adminPassword)) {
    return res.status(401).json({ message: "Incorrect password" });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return res.status(500).json({ message: "Server auth is not configured" });
  }

  const token = jwt.sign({ role: "admin" }, secret, { expiresIn: "8h" });
  res.json({ token });
}
