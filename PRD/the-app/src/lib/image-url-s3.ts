import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

// Cache for storing S3 configuration
let s3Client: S3Client | null = null;
let s3Config: { bucket: string; region: string } | null = null;

// Initialize S3 client (server-side only)
function getS3Client() {
  if (!s3Client && typeof window === 'undefined') {
    const bucket = process.env.AWS_S3_BUCKET;
    const region = process.env.AWS_S3_REGION || 'us-east-1';
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    if (bucket && accessKeyId && secretAccessKey) {
      s3Client = new S3Client({
        region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
      s3Config = { bucket, region };
    }
  }
  return { client: s3Client, config: s3Config };
}

/**
 * Generates a presigned S3 URL for secure direct access
 * @param s3Key - The S3 object key
 * @param expiresIn - URL expiration in seconds (default: 3600 = 1 hour)
 * @returns Promise<string> - The presigned URL
 */
export async function generateS3PresignedUrl(
  s3Key: string,
  expiresIn: number = 3600
): Promise<string | null> {
  // Only works server-side
  if (typeof window !== 'undefined') {
    return null;
  }

  const { client, config } = getS3Client();
  if (!client || !config) {
    return null;
  }

  try {
    const command = new GetObjectCommand({
      Bucket: config.bucket,
      Key: s3Key,
    });

    const url = await getSignedUrl(client, command, { expiresIn });
    return url;
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    return null;
  }
}

/**
 * Generates a public S3 URL (only use if bucket has public read access)
 * @param s3Key - The S3 object key
 * @returns string - The public URL
 */
export function generateS3PublicUrl(s3Key: string): string | null {
  // Only works server-side
  if (typeof window !== 'undefined') {
    return null;
  }

  const bucket = process.env.AWS_S3_BUCKET;
  const region = process.env.AWS_S3_REGION || 'us-east-1';

  if (!bucket) {
    return null;
  }

  // Use the standard S3 URL format
  return `https://${bucket}.s3.${region}.amazonaws.com/${s3Key}`;
}

/**
 * Check if we should serve images directly from S3
 */
export function shouldServeFromS3(): boolean {

  // check to see if this code is running server-side
  // if (typeof window !== 'undefined') {
  //   console.warn("/src/lib/image-url-s3.ts: shouldServeFromS3 called on client-side, returning false");
  //   return false; // Should not be called on client-side
  // } else {
  //   console.log("/src/lib/image-url-s3.ts: shouldServeFromS3 called on server-side");
  // }

  console.log("/src/lib/image-url-s3.ts: Checking if images should be served from S3 directly: process.env.NEXT_PUBLIC_AWS_SERVER_IMAGES_FROM_S3_DIRECTLY:", process.env.NEXT_PUBLIC_AWS_SERVER_IMAGES_FROM_S3_DIRECTLY);
  const value = process.env.NEXT_PUBLIC_AWS_SERVER_IMAGES_FROM_S3_DIRECTLY;

  // Add detailed logging
  console.log("/src/lib/image-url-s3.ts: Raw value:", value);
  console.log("/src/lib/image-url-s3.ts: Value type:", typeof value);
  console.log("/src/lib/image-url-s3.ts: Value length:", value?.length);
  console.log("/src/lib/image-url-s3.ts: Value JSON.stringify:", JSON.stringify(value));
  console.log("/src/lib/image-url-s3.ts: Value === 'false':", value === 'false');
  console.log("/src/lib/image-url-s3.ts: Value === 'true':", value === 'true');

  if (value === undefined) {
    console.warn("/src/lib/image-url-s3.ts: NEXT_PUBLIC_AWS_SERVER_IMAGES_FROM_S3_DIRECTLY is not defined, defaulting to false");
    return false; // Default to false if not set
  }
  console.log("/src/lib/image-url-s3.ts: NEXT_PUBLIC_AWS_SERVER_IMAGES_FROM_S3_DIRECTLY value:", value);
  const result = value === 'true';
  console.log("/src/lib/image-url-s3.ts: Should serve from S3:", result);
  console.log("/src/lib/image-url-s3.ts: Stack trace:", new Error().stack);
  return result;
}