import { prisma } from '@/lib/prisma';
import { generateS3PresignedUrl, shouldServeFromS3 } from './image-url-s3';

// Local debug logger that prefixes every message with an ISO timestamp and the
// calling helper's name. Keeps noisy logging statements out of the core
// logic.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function debugLog(..._args: unknown[]) {
  // Logging disabled
}

/**
 * generateImageUrlServer
 *
 * Centralised helper that decides **one** URL for the client to load an image
 * from, keeping all of the storage‑specific decision‑making in a single place.
 * Nothing outside this file should need to know whether an image lives in the
 * database, S3, or gets transformed on‑the‑fly.
 *
 * ## Direct‑to‑S3 vs. CloudFront‑backed API
 *
 * There are two fundamentally different delivery paths:
 *
 * 1. **Presigned S3 URL** – fastest when we want the original bytes exactly as
 *    they were uploaded. A short‑lived, signed URL is returned and the client
 *    downloads directly from Amazon S3.
 * 2. **`/api/images/[id]` route behind CloudFront** – best when **any**
 *    transformation parameters are supplied (`w`, `h`, `q`, or `f`). The API
 *    route performs the resize/re‑encode once; CloudFront then caches that
 *    derived asset so subsequent identical requests are served straight from
 *    the CDN edge without hitting our servers again.
 *
 * Because S3 presigned URLs bypass CloudFront entirely, they **do not** benefit
 * from CDN caching, so they are only a win for the un‑transformed originals.
 *
 * ## What is `hasTransformations`?
 *
 * A convenience boolean that collapses five separate checks into one. It is
 * `true` whenever the caller provides at least one parameter that will change
 * the image bytes:
 *
 * | Parameter | Effect                               |
 * |-----------|--------------------------------------|
 * | `width`   | Resize to a maximum width            |
 * | `height`  | Resize to a maximum height           |
 * | `quality` | Re‑encode JPEG/WebP with new quality |
 * | `format`  | Convert format (jpeg, webp, png)     |
 *
 * When `hasTransformations === true` we **must** go through `/api/images` so
 * CloudFront can cache the transformed result. When `false` we are free to
 * return a presigned S3 URL—*provided* the image actually lives in S3 **and**
 * the `NEXT_PUBLIC_AWS_SERVER_IMAGES_FROM_S3_DIRECTLY` feature flag is enabled.
 *
 * @param imageId – The image ID from the database
 * @param options – Optional transformation parameters
 * @returns Promise<string> – The image URL the client should load
 */
export async function generateImageUrlServer(
  imageId: string,
  options?: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'jpeg' | 'webp' | 'png';
  }
): Promise<string> {
  // Check if we should serve from S3 and no transformations are requested
  const hasTransformations =
    options?.width || options?.height || options?.quality || options?.format;
  const serveFromS3 = shouldServeFromS3();

  // Get the image from database to determine storage type
  const image = await prisma.imageStorage.findUnique({
    where: { id: imageId },
    select: { s3Key: true, storageType: true },
  });

  // CENTRALIZED DECISION POINT FOR IMAGE URL GENERATION
  // This is the single source of truth for determining how to serve images
  const decisionLogic = {
    imageId,
    storageType: image?.storageType,
    hasS3Key: !!image?.s3Key,
    NEXT_PUBLIC_AWS_SERVER_IMAGES_FROM_S3_DIRECTLY: serveFromS3,
    hasTransformations,
    decision: 'unknown',
  };

  // Decision tree:
  // 1. If storage type is 'database', always use API URL
  if (image?.storageType === 'database' || !image) {
    decisionLogic.decision = 'API_URL_DATABASE_STORAGE';
    debugLog('[IMAGE URL DECISION]', decisionLogic);

    // Generate API URL
    const params = new URLSearchParams();
    if (options?.width) params.append('w', options.width.toString());
    if (options?.height) params.append('h', options.height.toString());
    if (options?.quality) params.append('q', options.quality.toString());
    if (options?.format) params.append('f', options.format);

    const queryString = params.toString();
    const apiUrl = `/api/images/${imageId}${queryString ? `?${queryString}` : ''}`;
    debugLog('[IMAGE URL GENERATED]', { type: 'API', url: apiUrl });
    return apiUrl;
  }

  // 2. If storage type is 's3' and NEXT_PUBLIC_AWS_SERVER_IMAGES_FROM_S3_DIRECTLY is false, use API URL
  if (image.storageType === 's3' && !serveFromS3) {
    decisionLogic.decision = 'API_URL_S3_DIRECT_DISABLED';
    debugLog('[IMAGE URL DECISION]', decisionLogic);

    // Generate API URL
    const params = new URLSearchParams();
    if (options?.width) params.append('w', options.width.toString());
    if (options?.height) params.append('h', options.height.toString());
    if (options?.quality) params.append('q', options.quality.toString());
    if (options?.format) params.append('f', options.format);

    const queryString = params.toString();
    const apiUrl = `/api/images/${imageId}${queryString ? `?${queryString}` : ''}`;
    debugLog('[IMAGE URL GENERATED]', { type: 'API', url: apiUrl });
    return apiUrl;
  }

  // 3. If storage type is 's3' and NEXT_PUBLIC_AWS_SERVER_IMAGES_FROM_S3_DIRECTLY is true
  if (image.storageType === 's3' && serveFromS3 && image.s3Key) {
    // 3a. If transformations are requested, must use API URL
    if (hasTransformations) {
      decisionLogic.decision = 'API_URL_TRANSFORMATIONS_REQUESTED';
      debugLog('[IMAGE URL DECISION]', decisionLogic);

      // Generate API URL with transformations
      const params = new URLSearchParams();
      if (options?.width) params.append('w', options.width.toString());
      if (options?.height) params.append('h', options.height.toString());
      if (options?.quality) params.append('q', options.quality.toString());
      if (options?.format) params.append('f', options.format);

      const queryString = params.toString();
      const apiUrl = `/api/images/${imageId}${queryString ? `?${queryString}` : ''}`;
      debugLog('[IMAGE URL GENERATED]', { type: 'API', url: apiUrl });
      return apiUrl;
    }

    // 3b. No transformations, serve directly from S3
    decisionLogic.decision = 'S3_DIRECT_URL';
    debugLog('[IMAGE URL DECISION]', decisionLogic);

    try {
      // Generate presigned URL for secure temporary access
      const s3Url = await generateS3PresignedUrl(image.s3Key, 3600); // 1 hour expiry
      if (s3Url) {
        debugLog('[IMAGE URL GENERATED]', { type: 'S3_PRESIGNED', url: s3Url });
        return s3Url;
      }
    } catch (error) {
      console.error('[IMAGE URL ERROR] Failed to generate S3 URL:', error);
      decisionLogic.decision = 'API_URL_S3_GENERATION_FAILED';
    }
  }

  // Fallback to API URL if something went wrong
  decisionLogic.decision = 'API_URL_FALLBACK';
  debugLog('[IMAGE URL DECISION]', decisionLogic);

  const params = new URLSearchParams();
  if (options?.width) params.append('w', options.width.toString());
  if (options?.height) params.append('h', options.height.toString());
  if (options?.quality) params.append('q', options.quality.toString());
  if (options?.format) params.append('f', options.format);

  const queryString = params.toString();
  const apiUrl = `/api/images/${imageId}${queryString ? `?${queryString}` : ''}`;
  debugLog('[IMAGE URL GENERATED]', { type: 'API_FALLBACK', url: apiUrl });
  return apiUrl;
}
