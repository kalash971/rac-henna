import "server-only";
import { v2 as cloudinary } from "cloudinary";

/**
 * Cloudinary, used with *signed* direct uploads.
 *
 * The browser sends the file straight to Cloudinary — a phone photo is far
 * past the request body limit a serverless function gets — so this module's
 * job is only to sign a short-lived permission slip. An unsigned upload preset
 * would let anyone on the internet fill the account instead.
 */

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

export const UPLOAD_FOLDER = "rac-henna/gallery";
const ALLOWED_FORMATS = "jpg,jpeg,png,webp,avif";

if (cloudName && apiKey && apiSecret) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
}

export function cloudinaryConfigured() {
  return !!(cloudName && apiKey && apiSecret);
}

export type UploadTicket = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  allowed_formats: string;
  signature: string;
};

/**
 * The exact set of fields the browser must post alongside the file. The
 * signature covers every one of them, so the client cannot quietly widen
 * `allowed_formats` or move the upload out of the gallery folder.
 */
export function createUploadTicket(): UploadTicket | null {
  if (!cloudName || !apiKey || !apiSecret) return null;

  const params = {
    folder: UPLOAD_FOLDER,
    // Cloudinary rejects a signature more than an hour old.
    timestamp: Math.round(Date.now() / 1000),
    allowed_formats: ALLOWED_FORMATS,
  };

  return {
    cloudName,
    apiKey,
    ...params,
    signature: cloudinary.utils.api_sign_request(params, apiSecret),
  };
}

/** True for a delivery URL from this account, so a typo cannot enter the gallery. */
export function isOwnDeliveryUrl(url: string) {
  if (!cloudName) return false;
  return url.startsWith(`https://res.cloudinary.com/${cloudName}/`);
}

export async function destroyImage(publicId: string) {
  if (!cloudinaryConfigured()) return;
  await cloudinary.uploader.destroy(publicId, { invalidate: true });
}
