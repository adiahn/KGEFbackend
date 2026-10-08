/**
 * Email under_review applicants who still lack a CAC Status Report, asking
 * them to upload it via the tracking dashboard.
 *
 * Run from KGEFbackend/:
 *
 *   npx tsx scripts/emailMissingStatusReport.ts dry-run   — list recipients only
 *   npx tsx scripts/emailMissingStatusReport.ts send      — send emails
 *
 * Credentials + Mongo URI come from .env, with optional overrides from
 * .env.migration (same pattern as the other ops scripts).
 */
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { Applicant } from "../src/models/Applicant";
import { sendMissingStatusReportEmail } from "../src/utils/mailer";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const migrationEnvPath = path.resolve(__dirname, "../.env.migration");
if (fs.existsSync(migrationEnvPath)) {
  const migrationEnv = dotenv.parse(fs.readFileSync(migrationEnvPath));
  for (const [key, value] of Object.entries(migrationEnv)) {
    if (value) process.env[key] = value;
  }
}

const OUT_DIR = path.resolve(__dirname, "../email-status-report-output");
const LOG_PATH = path.join(OUT_DIR, "send-log.json");

type LogEntry = { status: "sent" | "failed" | "skipped"; error?: string; at: string };
type LogMap = Record<string, LogEntry>;

function ensureOutDir() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

function readLog(): LogMap {
  if (!fs.existsSync(LOG_PATH)) return {};
  return JSON.parse(fs.readFileSync(LOG_PATH, "utf8")) as LogMap;
}

function writeLog(log: LogMap) {
  ensureOutDir();
  fs.writeFileSync(LOG_PATH, JSON.stringify(log, null, 2));
}

async function connect() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Missing MONGODB_URI — set it in .env or .env.migration");
  await mongoose.connect(uri);
}

async function findTargets() {
  return Applicant.find({
    status: "under_review",
    $or: [
      { "documents.cacStatusReport": { $exists: false } },
      { "documents.cacStatusReport": null },
      { "documents.cacStatusReport": "" },
    ],
  })
    .select("applicationNumber fullName email documents status")
    .lean();
}

async function dryRun() {
  await connect();
  const targets = await findTargets();
  console.log(`Found ${targets.length} under_review applicant(s) missing a CAC Status Report:\n`);
  for (const a of targets) {
    console.log(`  ${a.applicationNumber}  ${a.email}  ${a.fullName}`);
  }
  await mongoose.disconnect();
}

async function send() {
  await connect();
  const targets = await findTargets();
  const log = readLog();
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  console.log(`Sending to ${targets.length} applicant(s)...\n`);

  for (const a of targets) {
    const key = a.applicationNumber;
    if (log[key]?.status === "sent") {
      console.log(`  skip (already sent)  ${key}`);
      skipped += 1;
      continue;
    }

    try {
      await sendMissingStatusReportEmail({
        email: a.email,
        fullName: a.fullName,
        applicationNumber: a.applicationNumber,
      });
      log[key] = { status: "sent", at: new Date().toISOString() };
      writeLog(log);
      console.log(`  sent  ${key}  →  ${a.email}`);
      sent += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      log[key] = { status: "failed", error: message, at: new Date().toISOString() };
      writeLog(log);
      console.error(`  FAIL  ${key}  ${message}`);
      failed += 1;
    }
  }

  console.log(`\nDone. sent=${sent} skipped=${skipped} failed=${failed}`);
  console.log(`Log: ${LOG_PATH}`);
  await mongoose.disconnect();
}

const mode = process.argv[2];
if (mode === "dry-run") {
  dryRun().catch((err) => {
    console.error(err);
    process.exit(1);
  });
} else if (mode === "send") {
  send().catch((err) => {
    console.error(err);
    process.exit(1);
  });
} else {
  console.error("Usage: npx tsx scripts/emailMissingStatusReport.ts <dry-run|send>");
  process.exit(1);
}
