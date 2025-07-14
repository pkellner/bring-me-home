import { prisma } from '@/lib/prisma';
import { generateImageUrlServer } from '@/lib/image-url-server';
import { generateImageUrl } from '@/lib/image-url';

async function getRandomPersonImage() {
  // Get a random person with an image
  const personWithImage = await prisma.person.findFirst({
    where: {
      isActive: true,
      personImages: {
        some: {
          imageType: 'primary',
        },
      },
    },
    include: {
      personImages: {
        where: {
          imageType: 'primary',
        },
        include: {
          image: true,
        },
        take: 1,
      },
    },
  });

  if (!personWithImage || !personWithImage.personImages[0]) {
    return null;
  }

  const image = personWithImage.personImages[0].image;
  return {
    id: image.id,
    personName: `${personWithImage.firstName} ${personWithImage.lastName}`,
    s3Key: image.s3Key,
    storageType: image.storageType,
  };
}

interface ImageServingDemoProps {
  s3DirectServing: boolean;
}

export default async function ImageServingDemo({ s3DirectServing }: ImageServingDemoProps) {
  const imageData = await getRandomPersonImage();

  if (!imageData) {
    return (
      <section>
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          Image Serving Demonstration
        </h2>
        <div className="bg-yellow-50 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            No images available for demonstration. Upload some person images to see this feature.
          </p>
        </div>
      </section>
    );
  }

  // Generate URLs
  const apiUrl = generateImageUrl(imageData.id);
  const publicPageUrl = s3DirectServing ? await generateImageUrlServer(imageData.id) : apiUrl;

  return (
    <section>
      <h2 className="text-lg font-medium text-gray-900 mb-4">
        Image Serving Demonstration
      </h2>
      <div className="bg-gray-50 rounded-lg p-4 space-y-4">
        <p className="text-sm text-gray-600">
          Demonstrating how images are served for {imageData.personName}:
        </p>
        
        {s3DirectServing ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Public Page Image */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-900">
                Public Pages (S3 Direct)
              </h3>
              <div className="aspect-square bg-white rounded-lg shadow overflow-hidden">
                <img
                  src={publicPageUrl}
                  alt={`${imageData.personName} from S3`}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="text-xs text-gray-500 break-all">
                <span className="font-medium">URL:</span> {publicPageUrl.substring(0, 80)}...
              </div>
              <div className="text-xs text-green-600">
                <span className="font-medium">✓ Served directly from S3</span>
              </div>
            </div>

            {/* Admin Page Image */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-900">
                Admin Pages (API)
              </h3>
              <div className="aspect-square bg-white rounded-lg shadow overflow-hidden">
                <img
                  src={apiUrl}
                  alt={`${imageData.personName} from API`}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="text-xs text-gray-500 break-all">
                <span className="font-medium">URL:</span> {apiUrl}
              </div>
              <div className="text-xs text-blue-600">
                <span className="font-medium">✓ Served via API for security</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-900">
              All Pages (API Only)
            </h3>
            <div className="max-w-md mx-auto">
              <div className="aspect-square bg-white rounded-lg shadow overflow-hidden">
                <img
                  src={apiUrl}
                  alt={`${imageData.personName} from API`}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="mt-2 text-xs text-gray-500 break-all">
                <span className="font-medium">URL:</span> {apiUrl}
              </div>
              <div className="mt-1 text-xs text-gray-600">
                <span className="font-medium">Note:</span> All images served through API endpoint
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 p-3 bg-blue-50 rounded-md">
          <p className="text-sm text-blue-800">
            <strong>Configuration:</strong> AWS_SERVER_IMAGES_FROM_S3_DIRECTLY = {s3DirectServing ? 'true' : 'false'}
            {s3DirectServing && (
              <><br />Public pages use S3 presigned URLs for better performance while admin pages always use the API for security.</>
            )}
          </p>
        </div>
      </div>
    </section>
  );
}