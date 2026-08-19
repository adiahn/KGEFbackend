# KasedaLoan Backend

Express + TypeScript + MongoDB API for the KGEF Graduate Start-up Capital
Needs Assessment.

## Setup

```bash
npm install
npm run dev
```

The API listens on `http://localhost:5000` by default. No database setup is
required for local development: if `MONGODB_URI` isn't set, the server
automatically starts an in-memory MongoDB on launch. This is zero-config, but
data is wiped every time you restart the server.

For a real/persistent database (or in production), copy `.env.example` to `.env`
and set `MONGODB_URI` to a real MongoDB instance (local `mongod` or
[MongoDB Atlas](https://www.mongodb.com/atlas)):

```bash
cp .env.example .env   # then set MONGODB_URI
```

`CLIENT_ORIGIN` must list every frontend origin allowed to call this API
(comma-separated), including any custom domain in addition to the Vercel URL.

## Endpoints

| Method | Path                        | Description                                    |
| ------ | --------------------------- | ----------------------------------------------- |
| GET    | `/api/health`               | Health check                                    |
| POST   | `/api/applicants`           | Submit an application (JSON, documents pre-uploaded) |
| GET    | `/api/applicants`           | List applications, admin-only (optional `?status=`, `?search=`) |
| GET    | `/api/applicants/:id`       | Get one application, admin-only                 |
| PATCH  | `/api/applicants/:id/status`| Update status/score/notes/document verification, admin-only |
| DELETE | `/api/applicants/:id`       | Delete an application, admin-only                |
| POST   | `/api/uploads`               | Upload a document to Cloudinary                  |
| DELETE | `/api/uploads`               | Delete a document from Cloudinary                |
| POST   | `/api/admin/login`           | Admin password login, returns a JWT              |
| POST   | `/api/track/request-otp`     | Request an OTP to track an application           |
| POST   | `/api/track/verify-otp`      | Verify OTP, returns a tracking JWT               |
| GET    | `/api/track/me`              | Get the authenticated applicant's status         |
| POST   | `/api/verify/:endpoint`      | Format-check NIN/BVN/CAC (no real registry lookup) |

Uploaded documents are stored in Cloudinary, not on disk (required for
Vercel's read-only, ephemeral filesystem).

## Structure

- `src/models/Applicant.ts`: Mongoose schema mirroring the assessment form.
- `src/utils/validation.ts`: Zod input validation matching the schema's enums.
- `src/controllers/`, `src/routes/`: one pair per resource (applicant, admin,
  upload, tracking, verification).
- `src/middleware/`: JWT auth for admin and applicant-tracking sessions.

## Build

```bash
npm run build
npm start
```
