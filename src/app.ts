import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import rateLimit from "express-rate-limit";
import applicantRoutes from "./routes/applicant.routes";
import verificationRoutes from "./routes/verification.routes";
import trackingRoutes from "./routes/tracking.routes";
import uploadRoutes from "./routes/upload.routes";
import adminRoutes from "./routes/admin.routes";

// Every byte in and out of this function is billed as Vercel Fast Origin
// Transfer, and this API has no auth in front of applicant-facing routes
// (OTP requests, uploads, applications). Without a request-rate ceiling, a
// single script or bot can drive that bill arbitrarily high. This is the
// loose baseline applied to every route; the specific public routes that
// are expensive to let someone hammer (mailer calls, signed upload
// issuance, full application writes) additionally apply `strictLimiter`
// from "./middleware/rateLimit" at the route level.
const baselineLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

export function createApp() {
  const app = express();

  app.use(helmet());
  // Open to any origin: this API has no cookie/session-based auth to protect
  // (the admin route is a bearer JWT returned in the response body, not an
  // ambient cookie), so an origin allowlist here was blocking legitimate
  // custom domains without adding any real protection, since a browser is
  // not the only way to call this API. CORS restrictions are for browsers
  // specifically; a direct/server-side request bypasses them entirely.
  app.use(cors());
  app.use(compression());
  app.use(morgan("dev"));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use("/api", baselineLimiter);

  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
  app.use("/api/applicants", applicantRoutes);
  app.use("/api/verify", verificationRoutes);
  app.use("/api/track", trackingRoutes);
  app.use("/api/uploads", uploadRoutes);
  app.use("/api/admin", adminRoutes);

  app.use((req: Request, res: Response) => {
    res.status(404).json({ message: `Route ${req.method} ${req.path} not found` });
  });

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(500).json({ message: err.message || "Internal server error" });
  });

  return app;
}
