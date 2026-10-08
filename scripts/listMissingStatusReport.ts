import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { Applicant } from "../src/models/Applicant";

const migrationEnvPath = path.resolve(__dirname, "../.env.migration");
if (fs.existsSync(migrationEnvPath)) {
  const migrationEnv = dotenv.parse(fs.readFileSync(migrationEnvPath));
  for (const [key, value] of Object.entries(migrationEnv)) {
    if (value) process.env[key] = value;
  }
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI!);

  const rows = await Applicant.find({
    status: "under_review",
    $or: [
      { "documents.cacStatusReport": { $exists: false } },
      { "documents.cacStatusReport": null },
      { "documents.cacStatusReport": "" },
    ],
  })
    .select("applicationNumber fullName email phone lgaOfOrigin grade createdAt documents")
    .sort({ createdAt: 1 })
    .lean();

  const outDir = path.resolve(__dirname, "../email-status-report-output");
  fs.mkdirSync(outDir, { recursive: true });

  const jsonPath = path.join(outDir, "under-review-missing-status-report.json");
  const csvPath = path.join(outDir, "under-review-missing-status-report.csv");

  const exportRows = rows.map((a) => ({
    applicationNumber: a.applicationNumber,
    fullName: a.fullName,
    email: a.email,
    phone: a.phone,
    lgaOfOrigin: a.lgaOfOrigin,
    grade: a.grade,
    createdAt: a.createdAt,
    hasUniversityCertificate: Boolean(a.documents?.universityCertificate),
    hasKasedaCertificate: Boolean(a.documents?.kasedaCertificate),
    hasCacCertificate: Boolean(a.documents?.cacCertificate),
    hasCacStatusReport: Boolean(a.documents?.cacStatusReport),
    hasLgaIndigeneLetter: Boolean(a.documents?.lgaIndigeneLetter),
  }));

  fs.writeFileSync(jsonPath, JSON.stringify(exportRows, null, 2));

  const header = [
    "applicationNumber",
    "fullName",
    "email",
    "phone",
    "lgaOfOrigin",
    "grade",
    "createdAt",
    "hasUniversityCertificate",
    "hasKasedaCertificate",
    "hasCacCertificate",
    "hasCacStatusReport",
    "hasLgaIndigeneLetter",
  ];
  const escape = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [
    header.join(","),
    ...exportRows.map((r) => header.map((k) => escape((r as Record<string, unknown>)[k])).join(",")),
  ].join("\n");
  fs.writeFileSync(csvPath, csv);

  console.log(`Count: ${exportRows.length}`);
  console.log(`JSON: ${jsonPath}`);
  console.log(`CSV:  ${csvPath}`);
  console.log("");
  for (const r of exportRows) {
    console.log(`${r.applicationNumber}\t${r.email}\t${r.fullName}`);
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
