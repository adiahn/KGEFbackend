import rateLimit from "express-rate-limit";

// Applied to specific public routes that are expensive to let someone
// hammer: they either send an email, write to the DB, or (for the upload
// signature route) gate an upload that will be billed by Cloudinary.
export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests. Please try again later." },
});
