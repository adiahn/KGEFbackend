import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface TrackingTokenPayload {
  applicationNumber: string;
  applicantId: string;
}

declare global {
  namespace Express {
    interface Request {
      tracking?: TrackingTokenPayload;
    }
  }
}

export function requireTrackingAuth(req: Request, res: Response, next: NextFunction) {
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
    const payload = jwt.verify(token, secret) as TrackingTokenPayload;
    req.tracking = payload;
    next();
  } catch {
    return res.status(401).json({ message: "Session expired, please verify again" });
  }
}
