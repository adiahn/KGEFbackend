import { getCloudinary } from "../config/cloudinary";

export function isCloudinaryConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET
  );
}

const ALLOWED_FORMATS = "pdf,jpg,jpeg,png";

export interface UploadSignature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  publicId: string;
  allowedFormats: string;
}

// Signs the upload parameters so the browser can upload the file bytes
// straight to Cloudinary instead of routing them through this function.
// Vercel bills every byte that passes through a serverless function as
// Fast Origin Transfer, so proxying a 5MB file both in (from the client)
// and back out (to Cloudinary) doubled that bill for nothing — the
// function was never doing anything with the bytes besides relaying them.
// `folder`, `public_id`, and `allowed_formats` are part of the signed
// payload so the client can't redirect the upload elsewhere or bypass the
// format restriction without invalidating the signature.
export function createUploadSignature(documentType: string): UploadSignature {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME!;
  const apiKey = process.env.CLOUDINARY_API_KEY!;
  const apiSecret = process.env.CLOUDINARY_API_SECRET!;

  const timestamp = Math.round(Date.now() / 1000);
  const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const folder = "kgef-applications/uploads";
  const publicId = `${documentType}-${unique}`;

  const signature = getCloudinary().utils.api_sign_request(
    { timestamp, folder, public_id: publicId, allowed_formats: ALLOWED_FORMATS },
    apiSecret
  );

  return { cloudName, apiKey, timestamp, signature, folder, publicId, allowedFormats: ALLOWED_FORMATS };
}

const CLOUDINARY_URL_PATTERN = /\/(image|video|raw)\/upload\/v\d+\/(.+)\.[a-zA-Z0-9]+(?:\?.*)?$/;

export function deleteByCloudinaryUrl(url: string): Promise<void> {
  const match = url.match(CLOUDINARY_URL_PATTERN);
  if (!match) {
    return Promise.reject(new Error("Not a recognizable Cloudinary URL"));
  }
  const [, resourceType, publicId] = match;
  return getCloudinary()
    .uploader.destroy(publicId, { resource_type: resourceType })
    .then(() => undefined);
}
