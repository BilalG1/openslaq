import { S3Client } from "bun";

// Bun reads S3_ENDPOINT, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_BUCKET, S3_REGION from env
const s3 = new S3Client();

// Optional public-facing endpoint for presigned URLs (e.g. LAN IP for iOS simulator).
// Falls back to the default S3Client when unset.
const publicEndpoint = process.env.S3_PUBLIC_ENDPOINT;
const s3Public = publicEndpoint
  ? new S3Client({ endpoint: publicEndpoint })
  : s3;

export function uploadToS3(key: string, body: Uint8Array, contentType: string) {
  return s3.write(key, body, { type: contentType });
}

export function getPresignedDownloadUrl(key: string, expiresIn = 3600): string {
  return s3Public.presign(key, { expiresIn });
}

export function deleteFromS3(key: string) {
  return s3.delete(key);
}
