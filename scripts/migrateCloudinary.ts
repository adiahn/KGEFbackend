/**
 * One-off migration of applicant documents from the old (soon-to-be-blocked)
 * Cloudinary account to a new one. Run from KGEFbackend/ with tsx.
 *
 * Modes (run in this order):
 *   npx tsx scripts/migrateCloudinary.ts dry-run   — read-only, writes manifest.json
 *   npx tsx scripts/migrateCloudinary.ts migrate    — uploads bytes to the new account, resumable
 *   npx tsx scripts/migrateCloudinary.ts apply-db   — rewrites Applicant.documents.* URLs, after snapshotting old ones
 *
 * Credentials + Mongo URI come from .env.migration (git-ignored — see that
 * file's template). Falls back to .env's MONGODB_URI if .env.migration's is blank.
 */
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { v2 as cloudinary } from "cloudinary";
import { Applicant } from "../src/models/Applicant";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Only override with .env.migration values that are actually set, so leaving
// e.g. MONGODB_URI blank there doesn't wipe out the one already loaded from .env.
const migrationEnvPath = path.resolve(__dirname, "../.env.migration");
if (fs.existsSync(migrationEnvPath)) {
  const migrationEnv = dotenv.parse(fs.readFileSync(migrationEnvPath));
  for (const [key, value] of Object.entries(migrationEnv)) {
    if (value) process.env[key] = value;
  }
}

const OUT_DIR = path.resolve(__dirname, "../migration-output");
const MANIFEST_PATH = path.join(OUT_DIR, "manifest.json");
const LOG_PATH = path.join(OUT_DIR, "migration-log.json");
const snapshotPath = (ts: string) => path.join(OUT_DIR, `pre-migration-snapshot-${ts}.json`);

const DOCUMENT_FIELDS = [
  "universityCertificate",
  "kasedaCertificate",
  "cacCertificate",
  "cacStatusReport",
  "lgaIndigeneLetter",
] as const;
type DocumentField = (typeof DOCUMENT_FIELDS)[number];

const CLOUDINARY_URL_PATTERN =
  /^https:\/\/res\.cloudinary\.com\/([^/]+)\/(image|video|raw)\/upload\/v\d+\/(.+)\.[a-zA-Z0-9]+(?:\?.*)?$/;

interface ManifestEntry {
  applicantId: string;
  applicationNumber: string;
  field: DocumentField;
  url: string;
  cloudName: string;
  resourceType: "image" | "video" | "raw";
  publicId: string;
}

interface LogEntry {
  status: "done" | "failed" | "pending";
  newUrl?: string;
  error?: string;
  attempts: number;
}
type LogMap = Record<string, LogEntry>; // keyed by old url

function ensureOutDir() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

function readJson<T>(filePath: string, fallback: T): T {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function writeJson(filePath: string, data: unknown) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name} — fill it in .env.migration`);
  return value;
}

async function connectMongo() {
  const uri = requireEnv("MONGODB_URI");
  await mongoose.connect(uri);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------- dry-run ----------

async function dryRun() {
  ensureOutDir();
  await connectMongo();

  const oldCloudName = requireEnv("OLD_CLOUDINARY_CLOUD_NAME");
  const applicants = await Applicant.find({}, { applicationNumber: 1, documents: 1 }).lean();

  const manifest: ManifestEntry[] = [];
  const skipped: { applicantId: string; field: string; url: string; reason: string }[] = [];

  for (const applicant of applicants) {
    const documents = (applicant as any).documents ?? {};
    for (const field of DOCUMENT_FIELDS) {
      const url: string | undefined = documents[field];
      if (!url) continue;

      const match = url.match(CLOUDINARY_URL_PATTERN);
      if (!match) {
        skipped.push({ applicantId: String(applicant._id), field, url, reason: "URL did not match expected Cloudinary pattern" });
        continue;
      }
      const [, cloudName, resourceType, publicId] = match;
      if (cloudName !== oldCloudName) {
        skipped.push({
          applicantId: String(applicant._id),
          field,
          url,
          reason: `cloud_name '${cloudName}' != OLD_CLOUDINARY_CLOUD_NAME ('${oldCloudName}') — already migrated?`,
        });
        continue;
      }

      manifest.push({
        applicantId: String(applicant._id),
        applicationNumber: (applicant as any).applicationNumber,
        field,
        url,
        cloudName,
        resourceType: resourceType as "image" | "video" | "raw",
        publicId,
      });
    }
  }

  writeJson(MANIFEST_PATH, manifest);
  if (skipped.length) writeJson(path.join(OUT_DIR, "dry-run-skipped.json"), skipped);

  const byField = Object.fromEntries(DOCUMENT_FIELDS.map((f) => [f, manifest.filter((m) => m.field === f).length]));
  const byResourceType = manifest.reduce<Record<string, number>>((acc, m) => {
    acc[m.resourceType] = (acc[m.resourceType] ?? 0) + 1;
    return acc;
  }, {});

  console.log(`Applicants scanned: ${applicants.length}`);
  console.log(`Documents found on old account: ${manifest.length}`);
  console.log("By field:", byField);
  console.log("By resource type:", byResourceType);
  if (skipped.length) console.log(`Skipped (see dry-run-skipped.json): ${skipped.length}`);
  console.log(`Manifest written to ${MANIFEST_PATH}`);

  const sampleSize = Math.min(10, manifest.length);
  if (sampleSize > 0) {
    console.log(`\nSpot-checking ${sampleSize} source URLs for reachability...`);
    for (const entry of manifest.slice(0, sampleSize)) {
      try {
        const res = await fetch(entry.url, { method: "HEAD" });
        console.log(`  ${res.ok ? "OK  " : "FAIL"} ${res.status} ${entry.url}`);
      } catch (err) {
        console.log(`  FAIL (network error) ${entry.url} — ${(err as Error).message}`);
      }
    }
  }

  await mongoose.disconnect();
}

// ---------- migrate ----------

function configureDestinationCloudinary() {
  cloudinary.config({
    cloud_name: requireEnv("NEW_CLOUDINARY_CLOUD_NAME"),
    api_key: requireEnv("NEW_CLOUDINARY_API_KEY"),
    api_secret: requireEnv("NEW_CLOUDINARY_API_SECRET"),
    secure: true,
  });
}

async function migrateOne(entry: ManifestEntry, log: LogMap): Promise<void> {
  const attempts = (log[entry.url]?.attempts ?? 0) + 1;

  try {
    const result = await cloudinary.uploader.upload(entry.url, {
      public_id: entry.publicId,
      resource_type: entry.resourceType,
      overwrite: false,
      unique_filename: false,
      use_filename: false,
    });
    log[entry.url] = { status: "done", newUrl: result.secure_url, attempts };
    console.log(`  done   ${entry.field} (${entry.applicationNumber}) -> ${result.secure_url}`);
  } catch (err: any) {
    const message = err?.message ?? String(err);
    const status = attempts >= 5 ? "failed" : "pending";
    log[entry.url] = { status, error: message, attempts };
    console.log(`  ${status === "failed" ? "FAILED" : "retry "} ${entry.field} (${entry.applicationNumber}) — ${message}`);
  }
}

async function migrate() {
  ensureOutDir();
  if (!fs.existsSync(MANIFEST_PATH)) {
    throw new Error(`No manifest found at ${MANIFEST_PATH}. Run 'dry-run' first.`);
  }
  configureDestinationCloudinary();

  const manifest = readJson<ManifestEntry[]>(MANIFEST_PATH, []);
  const log = readJson<LogMap>(LOG_PATH, {});

  const pending = manifest.filter((entry) => log[entry.url]?.status !== "done");
  console.log(`Total assets in manifest: ${manifest.length}`);
  console.log(`Already migrated: ${manifest.length - pending.length}`);
  console.log(`Remaining to migrate: ${pending.length}\n`);

  const CONCURRENCY = 4;
  let index = 0;

  async function worker() {
    while (index < pending.length) {
      const entry = pending[index++];
      await migrateOne(entry, log);
      writeJson(LOG_PATH, log); // persisted after every asset so a crash is resumable
      await sleep(150); // gentle pacing under Cloudinary's rate limits
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, pending.length) }, worker));

  const done = manifest.filter((entry) => log[entry.url]?.status === "done").length;
  const failed = manifest.filter((entry) => log[entry.url]?.status === "failed").length;
  const stillPending = manifest.length - done - failed;

  console.log(`\nDone: ${done}  Failed (gave up after 5 attempts): ${failed}  Still pending (re-run to retry): ${stillPending}`);
  console.log(`Log written to ${LOG_PATH}`);
}

// ---------- apply-db ----------

async function applyDb() {
  ensureOutDir();
  if (!fs.existsSync(MANIFEST_PATH)) throw new Error(`No manifest found at ${MANIFEST_PATH}. Run 'dry-run' first.`);
  if (!fs.existsSync(LOG_PATH)) throw new Error(`No migration log found at ${LOG_PATH}. Run 'migrate' first.`);

  await connectMongo();

  const manifest = readJson<ManifestEntry[]>(MANIFEST_PATH, []);
  const log = readJson<LogMap>(LOG_PATH, {});

  const toApply = manifest.filter((entry) => log[entry.url]?.status === "done");
  const notReady = manifest.length - toApply.length;

  if (toApply.length === 0) {
    console.log("Nothing to apply — no manifest entries are marked 'done' in the migration log.");
    await mongoose.disconnect();
    return;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const snapshot = toApply.map((entry) => ({ applicantId: entry.applicantId, field: entry.field, oldUrl: entry.url }));
  writeJson(snapshotPath(timestamp), snapshot);
  console.log(`Pre-migration snapshot of ${snapshot.length} URLs written to ${snapshotPath(timestamp)}`);

  const operations = toApply.map((entry) => ({
    updateOne: {
      filter: { _id: new mongoose.Types.ObjectId(entry.applicantId) },
      update: { $set: { [`documents.${entry.field}`]: log[entry.url].newUrl } },
    },
  }));

  const BATCH_SIZE = 500;
  let updated = 0;
  for (let i = 0; i < operations.length; i += BATCH_SIZE) {
    const result = await Applicant.bulkWrite(operations.slice(i, i + BATCH_SIZE));
    updated += result.modifiedCount;
  }

  console.log(`Updated ${updated} document field(s) across applicants.`);
  if (notReady > 0) {
    console.log(
      `${notReady} manifest entries were not 'done' yet and were left untouched — run 'migrate' again to pick them up, then re-run 'apply-db'.`
    );
  }

  await mongoose.disconnect();
}

// ---------- entrypoint ----------

async function main() {
  const mode = process.argv[2];
  switch (mode) {
    case "dry-run":
      return dryRun();
    case "migrate":
      return migrate();
    case "apply-db":
      return applyDb();
    default:
      console.error("Usage: npx tsx scripts/migrateCloudinary.ts <dry-run|migrate|apply-db>");
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
