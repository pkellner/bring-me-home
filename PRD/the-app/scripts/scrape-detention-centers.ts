import { PrismaClient } from '@prisma/client';
import { processAndStoreImage } from '../src/lib/image-storage';

const prisma = new PrismaClient();

interface DetentionCenterData {
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  imageUrl?: string;
  facilityType?: string;
  operatedBy?: string;
}

// California detention centers from ICE website
const californiaDetentionCenters: DetentionCenterData[] = [
  {
    name: 'Adelanto ICE Processing Center - East',
    address: '10400 Rancho Road',
    city: 'Adelanto',
    state: 'CA',
    zipCode: '92301',
    imageUrl:
      'https://www.ice.gov/sites/default/files/images/detention/adelantoMain_0.jpg',
    facilityType: 'ICE Processing Center',
    operatedBy: 'The GEO Group, Inc.',
  },
  {
    name: 'Adelanto ICE Processing Center - West',
    address: '10250 Rancho Road',
    city: 'Adelanto',
    state: 'CA',
    zipCode: '92301',
    imageUrl:
      'https://www.ice.gov/sites/default/files/images/detention/adelantoMain_0.jpg',
    facilityType: 'ICE Processing Center',
    operatedBy: 'The GEO Group, Inc.',
  },
  {
    name: 'Desert View Annex',
    address: '10250 Rancho Road',
    city: 'Adelanto',
    state: 'CA',
    zipCode: '92301',
    facilityType: 'ICE Processing Center',
    operatedBy: 'The GEO Group, Inc.',
  },
  {
    name: 'Golden State Annex',
    address: '425 Golden State Avenue',
    city: 'Bakersfield',
    state: 'CA',
    zipCode: '93301',
    facilityType: 'Contract Detention Facility',
    operatedBy: 'The GEO Group, Inc.',
  },
  {
    name: 'Mesa Verde ICE Processing Center',
    address: '425 Golden State Avenue',
    city: 'Bakersfield',
    state: 'CA',
    zipCode: '93301',
    facilityType: 'ICE Processing Center',
    operatedBy: 'The GEO Group, Inc.',
  },
  {
    name: 'Imperial Regional Detention Facility',
    address: '1572 Gateway Road',
    city: 'Calexico',
    state: 'CA',
    zipCode: '92231',
    facilityType: 'Contract Detention Facility',
    operatedBy: 'Management & Training Corporation',
  },
  {
    name: 'Otay Mesa Detention Center',
    address: '7488 Calzada de la Fuente',
    city: 'San Diego',
    state: 'CA',
    zipCode: '92154',
    facilityType: 'Contract Detention Facility',
    operatedBy: 'CoreCivic',
  },
  {
    name: 'Yuba County Jail',
    address: '215 5th Street',
    city: 'Marysville',
    state: 'CA',
    zipCode: '95901',
    facilityType: 'Intergovernmental Agreement',
    operatedBy: "Yuba County Sheriff's Office",
  },
];

async function fetchImageAsBuffer(url: string): Promise<Buffer | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Failed to fetch image: ${response.status}`);
      return null;
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error(`Error fetching image from ${url}:`, error);
    return null;
  }
}

async function scrapeAndStoreDetentionCenters() {
  console.log('Starting detention center scraping and import...');

  for (const centerData of californiaDetentionCenters) {
    try {
      // Check if center already exists
      const existing = await prisma.detentionCenter.findFirst({
        where: {
          name: centerData.name,
          city: centerData.city,
          state: centerData.state,
        },
      });

      if (existing) {
        console.log(`Skipping ${centerData.name} - already exists`);
        continue;
      }

      let facilityImageId: string | undefined;
      let thumbnailImageId: string | undefined;

      // Try to fetch and store the image
      if (centerData.imageUrl) {
        console.log(`Fetching image for ${centerData.name}...`);
        const imageBuffer = await fetchImageAsBuffer(centerData.imageUrl);

        if (imageBuffer) {
          try {
            const { fullImageId, thumbnailImageId: thumbId } =
              await processAndStoreImage(imageBuffer);
            facilityImageId = fullImageId;
            thumbnailImageId = thumbId;
            console.log(`Successfully stored images for ${centerData.name}`);
          } catch (error) {
            console.error(
              `Failed to process image for ${centerData.name}:`,
              error
            );
          }
        }
      }

      // Create the detention center
      const detentionCenter = await prisma.detentionCenter.create({
        data: {
          name: centerData.name,
          facilityType: centerData.facilityType || 'ICE Processing Center',
          operatedBy: centerData.operatedBy,
          address: centerData.address,
          city: centerData.city,
          state: centerData.state,
          zipCode: centerData.zipCode,
          country: 'USA',
          isActive: true,
          isICEFacility: true,
          facilityImageId,
          thumbnailImageId,
        },
      });

      console.log(`Created detention center: ${centerData.name}`);
    } catch (error) {
      console.error(`Failed to create ${centerData.name}:`, error);
    }
  }

  console.log('Finished importing detention centers');
}

scrapeAndStoreDetentionCenters()
  .catch(e => {
    console.error('Error in detention center import:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
