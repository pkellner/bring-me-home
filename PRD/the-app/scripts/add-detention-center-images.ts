import { PrismaClient } from '@prisma/client';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { processAndStoreImage } from '../src/lib/image-storage';

const prisma = new PrismaClient();

// We'll use the person placeholder images temporarily for detention centers
// In production, you would want to use actual facility images
const detentionCenterImageMapping = [
  { centerId: 'dc_1', imageNum: 1 },
  { centerId: 'dc_2', imageNum: 2 },
  { centerId: 'dc_3', imageNum: 3 },
  { centerId: 'dc_4', imageNum: 4 },
  { centerId: 'dc_5', imageNum: 5 },
];

async function addDetentionCenterImages() {
  console.log('Adding images to detention centers...');

  for (const mapping of detentionCenterImageMapping) {
    try {
      // For now, we'll use person placeholder images
      // In production, replace these with actual detention center facility images
      const imagePath = join(process.cwd(), 'public', 'images', `placeholder-person-${mapping.imageNum}.jpg`);
      const imageBuffer = await readFile(imagePath);
      
      const { fullImageId, thumbnailImageId } = await processAndStoreImage(
        imageBuffer,
        'image/jpeg'
      );

      await prisma.detentionCenter.update({
        where: { id: mapping.centerId },
        data: {
          facilityImageId: fullImageId,
          thumbnailImageId: thumbnailImageId,
        },
      });

      console.log(`Updated detention center ${mapping.centerId} with images`);
    } catch (error) {
      console.error(`Failed to update detention center ${mapping.centerId}:`, error);
    }
  }

  console.log('Finished adding detention center images');
}

addDetentionCenterImages()
  .catch(e => {
    console.error('Error adding detention center images:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });