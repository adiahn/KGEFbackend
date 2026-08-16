import { getCloudinary } from "../config/cloudinary";

export function isCloudinaryConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET
  );
}

export function uploadBufferToCloudinary(
  buffer: Buffer,
  options: { folder: string; publicId: string }
): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = getCloudinary().uploader.upload_stream(
      {
        folder: options.folder,
        public_id: options.publicId,
        resource_type: "auto",
        overwrite: false,
        unique_filename: true,
      },
      (error, result) => {
        if (error || !result) {
          reject(error || new Error("Cloudinary upload returned no result"));
          return;
        }
        resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
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
