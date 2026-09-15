/**
 * One-off grade-based pre-selection sweep over every existing "pending"
 * applicant. Applicants already touched by a reviewer (any other status)
 * are left untouched. Run from KGEFbackend/ with tsx, in this order:
 *
 *   npx tsx scripts/preSelectApplicants.ts classify      — read-only, writes manifests
 *   npx tsx scripts/preSelectApplicants.ts promote        — moves qualifying applicants to pre_selected
 *   npx tsx scripts/preSelectApplicants.ts delete-docs    — deletes disqualified applicants' documents from Cloudinary, resumable
 *   npx tsx scripts/preSelectApplicants.ts disqualify-db  — clears documents + sets status=disqualified, after delete-docs finishes
 *
 * Credentials + Mongo URI come from .env.migration (git-ignored), same as
 * migrateCloudinary.ts.
 */
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { v2 as cloudinary } from "cloudinary";
import { Applicant } from "../src/models/Applicant";
import { isQualifyingGrade, DISQUALIFICATION_REASON } from "../src/utils/preSelection";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const migrationEnvPath = path.resolve(__dirname, "../.env.migration");
if (fs.existsSync(migrationEnvPath)) {
  const migrationEnv = dotenv.parse(fs.readFileSync(migrationEnvPath));
  for (const [key, value] of Object.entries(migrationEnv)) {
    if (value) process.env[key] = value;
  }
}

const OUT_DIR = path.resolve(__dirname, "../preselect-output");
const PROMOTE_MANIFEST_PATH = path.join(OUT_DIR, "promote-manifest.json");
const DISQUALIFY_MANIFEST_PATH = path.join(OUT_DIR, "disqualify-manifest.json");
const LOG_PATH = path.join(OUT_DIR, "delete-log.json");

const DOCUMENT_FIELDS = [
  "universityCertificate",
  "kasedaCertificate",
  "cacCertificate",
  "cacStatusReport",
  "lgaIndigeneLetter",
] as const;
type DocumentField = (typeof DOCUMENT_FIELDS)[number];

const CLOUDINARY_URL_PATTERN =
  /^https:\/\/res\.cloudinary\.com\/([^/]+)\/(image|video|raw)\/upload\/v\d+\/(.+?)(?:\.[a-zA-Z0-9]+)?(?:\?.*)?$/;

interface DisqualifyManifestEntry {
  applicantId: string;
  applicationNumber: string;
  field: DocumentField;
  url: string;
  resourceType: "image" | "video" | "raw";
  publicId: string;
}

interface LogEntry {
  status: "done" | "failed" | "pending";
  attempts: number;
  error?: string;
}
type LogMap = Record<string, LogEntry>;

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
  await mongoose.connect(requireEnv("MONGODB_URI"));
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function configureCloudinary() {
  cloudinary.config({
    cloud_name: requireEnv("NEW_CLOUDINARY_CLOUD_NAME"),
    api_key: requireEnv("NEW_CLOUDINARY_API_KEY"),
    api_secret: requireEnv("NEW_CLOUDINARY_API_SECRET"),
    secure: true,
  });
}

// ---------- classify ----------

async function classify() {
  ensureOutDir();
  await connectMongo();

  const applicants = await Applicant.find(
    { status: "pending" },
    { applicationNumber: 1, grade: 1, documents: 1 }
  ).lean();

  const promoteIds: string[] = [];
  const disqualifyManifest: DisqualifyManifestEntry[] = [];
  const skipped: { applicantId: string; field: string; url: string; reason: string }[] = [];

  for (const applicant of applicants) {
    const id = String(applicant._id);
    if (isQualifyingGrade((applicant as any).grade)) {
      promoteIds.push(id);
      continue;
    }

    const documents = (applicant as any).documents ?? {};
    for (const field of DOCUMENT_FIELDS) {
      const url: string | undefined = documents[field];
      if (!url) continue;
      const match = url.match(CLOUDINARY_URL_PATTERN);
      if (!match) {
        skipped.push({ applicantId: id, field, url, reason: "URL did not match expected Cloudinary pattern" });
        continue;
      }
      const [, , resourceType, publicId] = match;
      disqualifyManifest.push({
        applicantId: id,
        applicationNumber: (applicant as any).applicationNumber,
        field,
        url,
        resourceType: resourceType as "image" | "video" | "raw",
        publicId,
      });
    }
  }

  writeJson(PROMOTE_MANIFEST_PATH, promoteIds);
  writeJson(DISQUALIFY_MANIFEST_PATH, disqualifyManifest);
  if (skipped.length) writeJson(path.join(OUT_DIR, "classify-skipped.json"), skipped);

  const disqualifyApplicantCount = new Set(disqualifyManifest.map((e) => e.applicantId)).size;
  console.log(`Pending applicants scanned: ${applicants.length}`);
  console.log(`Qualifying (-> pre_selected): ${promoteIds.length}`);
  console.log(
    `Disqualifying (-> disqualified): ${applicants.length - promoteIds.length} applicants, ${disqualifyManifest.length} documents to delete (${disqualifyApplicantCount} applicants had at least one document)`
  );
  if (skipped.length) console.log(`Skipped (unparsable URLs, see classify-skipped.json): ${skipped.length}`);
  console.log(`Manifests written to ${OUT_DIR}`);

  await mongoose.disconnect();
}

// ---------- promote ----------

async function promote() {
  if (!fs.existsSync(PROMOTE_MANIFEST_PATH)) throw new Error(`No manifest at ${PROMOTE_MANIFEST_PATH}. Run 'classify' first.`);
  await connectMongo();

  const ids: string[] = readJson(PROMOTE_MANIFEST_PATH, []);
  const result = await Applicant.updateMany(
    { _id: { $in: ids.map((id) => new mongoose.Types.ObjectId(id)) }, status: "pending" },
    { $set: { status: "pre_selected" } }
  );
  console.log(`Promoted ${result.modifiedCount} of ${ids.length} qualifying applicants to pre_selected.`);

  await mongoose.disconnect();
}

// ---------- delete-docs ----------

async function deleteOne(entry: DisqualifyManifestEntry, log: LogMap): Promise<void> {
  const attempts = (log[entry.url]?.attempts ?? 0) + 1;
  try {
    await cloudinary.uploader.destroy(entry.publicId, { resource_type: entry.resourceType });
    log[entry.url] = { status: "done", attempts };
    console.log(`  done   ${entry.field} (${entry.applicationNumber})`);
  } catch (err: any) {
    const message = err?.message ?? String(err);
    const status = attempts >= 5 ? "failed" : "pending";
    log[entry.url] = { status, error: message, attempts };
    console.log(`  ${status === "failed" ? "FAILED" : "retry "} ${entry.field} (${entry.applicationNumber}) — ${message}`);
  }
}

async function deleteDocs() {
  ensureOutDir();
  if (!fs.existsSync(DISQUALIFY_MANIFEST_PATH)) throw new Error(`No manifest at ${DISQUALIFY_MANIFEST_PATH}. Run 'classify' first.`);
  configureCloudinary();

  const manifest = readJson<DisqualifyManifestEntry[]>(DISQUALIFY_MANIFEST_PATH, []);
  const log = readJson<LogMap>(LOG_PATH, {});
  const pending = manifest.filter((e) => log[e.url]?.status !== "done");

  console.log(`Total documents to delete: ${manifest.length}`);
  console.log(`Already deleted: ${manifest.length - pending.length}`);
  console.log(`Remaining: ${pending.length}\n`);

  const CONCURRENCY = 4;
  let index = 0;
  async function worker() {
    while (index < pending.length) {
      const entry = pending[index++];
      await deleteOne(entry, log);
      writeJson(LOG_PATH, log);
      await sleep(150);
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, pending.length) }, worker));

  const done = manifest.filter((e) => log[e.url]?.status === "done").length;
  const failed = manifest.filter((e) => log[e.url]?.status === "failed").length;
  console.log(`\nDone: ${done}  Failed: ${failed}  Still pending: ${manifest.length - done - failed}`);
}

// ---------- disqualify-db ----------

async function disqualifyDb() {
  ensureOutDir();
  if (!fs.existsSync(DISQUALIFY_MANIFEST_PATH)) throw new Error(`No manifest at ${DISQUALIFY_MANIFEST_PATH}. Run 'classify' first.`);
  await connectMongo();

  const manifest = readJson<DisqualifyManifestEntry[]>(DISQUALIFY_MANIFEST_PATH, []);
  const log = readJson<LogMap>(LOG_PATH, {});

  // Every applicant in the manifest, plus every disqualifying applicant with
  // zero documents (never appears in the manifest at all, so trivially ready).
  const allDisqualifyingIds = new Set(manifest.map((e) => e.applicantId));
  const readyIds: string[] = [];
  const notReadyIds = new Set<string>();
  for (const id of allDisqualifyingIds) {
    const entries = manifest.filter((e) => e.applicantId === id);
    const allDone = entries.every((e) => log[e.url]?.status === "done");
    if (allDone) readyIds.push(id);
    else notReadyIds.add(id);
  }

  // Applicants classified as disqualifying but with no documents at all
  // never entered the manifest — pull them from the classify pass's pending
  // set indirectly: anyone with status still "pending" and not in the
  // promote manifest is one of these, so just let the update filter handle it.

  if (readyIds.length > 0) {
    const result = await Applicant.updateMany(
      { _id: { $in: readyIds.map((id) => new mongoose.Types.ObjectId(id)) }, status: "pending" },
      {
        $set: {
          status: "disqualified",
          decisionReason: DISQUALIFICATION_REASON,
          documents: {},
          documentVerification: {},
        },
      }
    );
    console.log(`Disqualified ${result.modifiedCount} applicants with documents (all deletions confirmed).`);
  }

  // Disqualifying applicants with no documents at all: anyone still "pending"
  // whose id isn't in the promote manifest and isn't in the disqualify
  // manifest either.
  const promoteIds = new Set<string>(readJson<string[]>(PROMOTE_MANIFEST_PATH, []));
  const stillPending = await Applicant.find({ status: "pending" }, { _id: 1 }).lean();
  const noDocIds = stillPending
    .map((a) => String(a._id))
    .filter((id) => !promoteIds.has(id) && !allDisqualifyingIds.has(id));

  if (noDocIds.length > 0) {
    const result = await Applicant.updateMany(
      { _id: { $in: noDocIds.map((id) => new mongoose.Types.ObjectId(id)) }, status: "pending" },
      { $set: { status: "disqualified", decisionReason: DISQUALIFICATION_REASON, documents: {}, documentVerification: {} } }
    );
    console.log(`Disqualified ${result.modifiedCount} applicants with no documents to delete.`);
  }

  if (notReadyIds.size > 0) {
    console.log(
      `${notReadyIds.size} applicants still have undeleted documents — run 'delete-docs' again, then re-run 'disqualify-db'.`
    );
  }

  await mongoose.disconnect();
}

// ---------- entrypoint ----------

async function main() {
  const mode = process.argv[2];
  switch (mode) {
    case "classify":
      return classify();
    case "promote":
      return promote();
    case "delete-docs":
      return deleteDocs();
    case "disqualify-db":
      return disqualifyDb();
    default:
      console.error("Usage: npx tsx scripts/preSelectApplicants.ts <classify|promote|delete-docs|disqualify-db>");
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
