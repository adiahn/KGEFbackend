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

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  await ensureDbConnected();
  return app(req, res);
}
