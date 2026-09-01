import type { IncomingMessage, ServerResponse } from "http";
import dotenv from "dotenv";
dotenv.config();

import { createApp } from "../src/app";
import { connectDB } from "../src/config/db";

// Reused across warm invocations of the same function instance: connecting
// once per cold start (not per request) avoids exhausting the Atlas
// connection pool. Mongoose itself manages pooling once connected.
let connectionPromise: Promise<void> | null = null;
function ensureDbConnected(): Promise<void> {
  if (!connectionPromise) {
    connectionPromise = connectDB().catch((err) => {
      connectionPromise = null; // allow retry on the next invocation
      throw err;
    });
  }
  return connectionPromise;
}

const app = createApp();

// Routes that never touch Mongoose (health check, Cloudinary signature
// issuance/delete) must not be blocked by a slow or failing DB connection —
// gating them here would turn an unrelated Mongo outage into a total outage
// for uploads too.
const DB_FREE_PREFIXES = ["/api/health", "/api/uploads"];

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const path = (req.url || "").split("?")[0];
  if (!DB_FREE_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    await ensureDbConnected();
  }
  return app(req, res);
}
