import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import applicantRoutes from "./routes/applicant.routes";
import verificationRoutes from "./routes/verification.routes";
import trackingRoutes from "./routes/tracking.routes";
import uploadRoutes from "./routes/upload.routes";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: process.env.CLIENT_ORIGIN?.split(",") ?? "*",
    })
  );
  app.use(morgan("dev"));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
  app.use("/api/applicants", applicantRoutes);
  app.use("/api/verify", verificationRoutes);
  app.use("/api/track", trackingRoutes);
  app.use("/api/uploads", uploadRoutes);

  app.use((req: Request, res: Response) => {
    res.status(404).json({ message: `Route ${req.method} ${req.path} not found` });
  });

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(500).json({ message: err.message || "Internal server error" });
  });

  return app;
}
