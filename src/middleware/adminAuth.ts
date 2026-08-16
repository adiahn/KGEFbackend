import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

interface AdminTokenPayload {
  role: "admin";
}

export function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return res.status(500).json({ message: "Server auth is not configured" });
  }

  try {
    const payload = jwt.verify(token, secret) as AdminTokenPayload;
    if (payload.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }
    next();
  } catch {
    return res.status(401).json({ message: "Session expired — please log in again" });
  }
}
