# KasedaLoan — Backend

Express + TypeScript + MongoDB API for the KGEF Graduate Start-up Capital
Needs Assessment.

## Setup

```bash
npm install
npm run dev
```

The API listens on `http://localhost:5000` by default. **No database setup required
for local development** — if `MONGODB_URI` isn't set, the server automatically
starts an in-memory MongoDB on launch. This is zero-config but **data is wiped
every time you restart the server**.

For a real/persistent database (or in production), copy `.env.example` to `.env`
and set `MONGODB_URI` to a real MongoDB instance (local `mongod` or
[MongoDB Atlas](https://www.mongodb.com/atlas)):

```bash
cp .env.example .env   # then set MONGODB_URI
```

## Endpoints

| Method | Path                        | Description                              |
| ------ | --------------------------- | ----------------------------------------- |
| GET    | `/api/health`                | Health check                              |
| POST   | `/api/applicants`            | Submit an application (multipart, with document uploads) |
| GET    | `/api/applicants`            | List applications (optional `?status=`)   |
| GET    | `/api/applicants/:id`        | Get one application                       |
| PATCH  | `/api/applicants/:id/status` | Update `status` and/or `score`            |
| DELETE | `/api/applicants/:id`        | Delete an application                     |

Uploaded documents are stored in `uploads/` and served statically at
`/uploads/<filename>`.

## Structure

- `src/models/Applicant.ts` — Mongoose schema mirroring sections A–I of the
  assessment PDF.
- `src/utils/validation.ts` — Zod input validation matching the schema's
  enums.
- `src/middleware/upload.ts` — Multer config for the 5 required document
  uploads.
- `src/controllers/applicant.controller.ts` / `src/routes/applicant.routes.ts`
  — CRUD endpoints.

## Build

```bash
npm run build
npm start
```
