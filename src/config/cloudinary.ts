import { v2 as cloudinary } from "cloudinary";

// Configured lazily (on first use) rather than at module-load time. ES import
// declarations are hoisted above other top-level statements, including a
// `dotenv.config()` call that textually precedes them, so reading
// process.env.CLOUDINARY_* at import time can run before .env is loaded.
let configured = false;

export function getCloudinary() {
  if (!configured) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
    configured = true;
  }
  return cloudinary;
}
