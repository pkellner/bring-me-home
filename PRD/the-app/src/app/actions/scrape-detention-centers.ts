'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { processAndStoreImage } from '@/lib/image-storage';
import { revalidatePath } from 'next/cache';

interface ScrapedDetentionCenter {
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode?: string;
  facilityType?: string;
  operatedBy?: string;
  phoneNumber?: string;
  imageUrl?: string;
}

// Known ICE detention facilities by state - scraped from https://www.ice.gov/detention-facilities
const ICE_FACILITIES_BY_STATE: Record<string, ScrapedDetentionCenter[]> = {
  Arizona: [
    {
      name: 'Central Arizona Florence Correctional Center',
      address: '1100 Bowling Road',
      city: 'Florence',
      state: 'Arizona',
      zipCode: '85132',
      facilityType: 'Contract Detention Facility',
    },
  ],
  California: [
    {
      name: 'Adelanto ICE Processing Center',
      address: '10400 Rancho Road (East) and 10250 Rancho Road (West)',
      city: 'Adelanto',
      state: 'California',
      zipCode: '92301',
      facilityType: 'ICE Processing Center',
    },
  ],
  Texas: [
    {
      name: 'Bluebonnet Detention Facility',
      address: '400 2nd Street',
      city: 'Anson',
      state: 'Texas',
      zipCode: '79501',
      facilityType: 'Detention Facility',
    },
  ],
  Colorado: [],
  Florida: [
    {
      name: 'Baker County Detention Center',
      address: "1 Sheriff's Office Drive",
      city: 'MacClenny',
      state: 'Florida',
      zipCode: '32063',
      facilityType: 'County Detention Center',
    },
    {
      name: 'Broward Transitional Center',
      address: '3900 N. Powerline Road',
      city: 'Pompano Beach',
      state: 'Florida',
      zipCode: '33073',
      facilityType: 'Transitional Center',
    },
  ],
  Georgia: [],
  Guam: [],
  Hawaii: [],
  Idaho: [],
  Indiana: [
    {
      name: 'Clark County Jail',
      address: '501 E Court Avenue, Suite 159',
      city: 'Jeffersonville',
      state: 'Indiana',
      zipCode: '47130',
      facilityType: 'County Jail',
    },
  ],
  Iowa: [],
  Kansas: [],
  Kentucky: [
    {
      name: 'Boone County Jail',
      address: '3020 Conrad Lane',
      city: 'Burlington',
      state: 'Kentucky',
      zipCode: '41005',
      facilityType: 'County Jail',
    },
    {
      name: 'Campbell County Detention Center',
      address: '601 Central Avenue',
      city: 'Newport',
      state: 'Kentucky',
      zipCode: '41071',
      facilityType: 'County Detention Center',
      phoneNumber: '(859) 431-4611',
    },
  ],
  Louisiana: [
    {
      name: 'Allen Parish Public Safety Complex',
      address: '7340 Highway 26 W',
      city: 'Oberlin',
      state: 'Louisiana',
      zipCode: '70655',
      facilityType: 'Public Safety Complex',
    },
    {
      name: 'Central Louisiana ICE Processing Center',
      address: '830 Pine Hill Road',
      city: 'Jena',
      state: 'Louisiana',
      zipCode: '71342',
      facilityType: 'ICE Processing Center',
    },
  ],
  Massachusetts: [],
  Michigan: [
    {
      name: 'Calhoun County Correctional Center',
      address: '185 E. Michigan Street',
      city: 'Battle Creek',
      state: 'Michigan',
      zipCode: '49014',
      facilityType: 'County Correctional Center',
    },
    {
      name: 'Chippewa County Correctional Facility',
      address: '325 Court Street',
      city: 'Sault Ste. Marie',
      state: 'Michigan',
      zipCode: '49783',
      facilityType: 'County Correctional Facility',
    },
  ],
  Minnesota: [],
  Mississippi: [
    {
      name: 'Adams County Correctional Center',
      address: '20 Hobo Forks Road',
      city: 'Natchez',
      state: 'Mississippi',
      zipCode: '39120',
      facilityType: 'County Correctional Center',
    },
  ],
  Nebraska: [],
  Nevada: [],
  'New Hampshire': [],
  'New Jersey': [],
  'New Mexico': [
    {
      name: 'Cibola County Correctional Center',
      address: '2000 Cibola Loop',
      city: 'Milan',
      state: 'New Mexico',
      zipCode: '87021',
      facilityType: 'County Correctional Center',
    },
  ],
  'New York': [
    {
      name: 'Buffalo (Batavia) Service Processing Center',
      address: '4250 Federal Drive',
      city: 'Batavia',
      state: 'New York',
      zipCode: '14020',
      facilityType: 'Service Processing Center',
    },
  ],
  'North Carolina': [],
  'North Dakota': [],
  'Northern Mariana Islands': [],
  Ohio: [
    {
      name: "Butler County Sheriff's Office",
      address: '705 Hanover Street',
      city: 'Hamilton',
      state: 'Ohio',
      zipCode: '45011',
      facilityType: "County Sheriff's Office",
    },
  ],
  Oklahoma: [],
  Pennsylvania: [],
  'Rhode Island': [],
  'South Dakota': [],
  Utah: [],
  Virginia: [
    {
      name: 'Abyon | Farmville Detention Center',
      address: '508 Waterworks Road',
      city: 'Farmville',
      state: 'Virginia',
      zipCode: '23901',
      facilityType: 'Detention Center',
    },
    {
      name: 'Caroline Detention Facility',
      address: '11093 SW Lewis Memorial Dr',
      city: 'Bowling Green',
      state: 'Virginia',
      zipCode: '22427',
      facilityType: 'Detention Facility',
    },
  ],
  Washington: [],
  Wisconsin: [],
};

async function fetchImageAsBuffer(url: string): Promise<Buffer | null> {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      console.log(`Image not found at ${url}`);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length === 0) {
      return null;
    }

    console.log(`Successfully fetched image from ${url}`);
    return buffer;
  } catch {
    console.log(`Could not fetch image from ${url}`);
    return null;
  }
}

export async function getAvailableStates() {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session, 'detentionCenters', 'create')) {
    throw new Error('Unauthorized');
  }

  return Object.keys(ICE_FACILITIES_BY_STATE).sort();
}

export async function getDetentionCentersByState(state: string) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session, 'detentionCenters', 'create')) {
    throw new Error('Unauthorized');
  }

  const facilities = ICE_FACILITIES_BY_STATE[state] || [];

  // Check which facilities already exist
  const existingFacilities = await prisma.detentionCenter.findMany({
    where: {
      state,
      name: {
        in: facilities.map(f => f.name),
      },
    },
    select: {
      name: true,
      city: true,
      state: true,
    },
  });

  const existingNames = new Set(existingFacilities.map(f => f.name));

  return facilities.map(facility => ({
    ...facility,
    exists: existingNames.has(facility.name),
  }));
}

export async function importDetentionCenters(
  state: string,
  facilityNames: string[]
) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session, 'detentionCenters', 'create')) {
    throw new Error('Unauthorized');
  }

  const facilities = ICE_FACILITIES_BY_STATE[state] || [];
  const selectedFacilities = facilities.filter(f =>
    facilityNames.includes(f.name)
  );

  const results = {
    success: [] as string[],
    failed: [] as { name: string; error: string }[],
    skipped: [] as string[],
  };

  for (const facility of selectedFacilities) {
    try {
      // Check if already exists
      const existing = await prisma.detentionCenter.findFirst({
        where: {
          name: facility.name,
          city: facility.city,
          state: facility.state,
        },
      });

      if (existing) {
        results.skipped.push(facility.name);
        continue;
      }

      // Try to fetch and store image, but don't fail if it doesn't work
      let facilityImageId: string | undefined;
      let thumbnailImageId: string | undefined;

      if (facility.imageUrl) {
        console.log(
          `Attempting to fetch image for ${facility.name} from ${facility.imageUrl}`
        );
        const imageBuffer = await fetchImageAsBuffer(facility.imageUrl);

        if (imageBuffer) {
          try {
            const { fullImageId, thumbnailImageId: thumbId } =
              await processAndStoreImage(imageBuffer);
            facilityImageId = fullImageId;
            thumbnailImageId = thumbId;
            console.log(`Successfully stored image for ${facility.name}`);
          } catch (error) {
            console.log(`Failed to process image for ${facility.name}:`, error);
          }
        }
      }

      // Create the detention center
      await prisma.detentionCenter.create({
        data: {
          name: facility.name,
          facilityType: facility.facilityType || 'ICE Processing Center',
          operatedBy: facility.operatedBy,
          address: facility.address,
          city: facility.city,
          state: facility.state,
          zipCode: facility.zipCode || '',
          country: 'USA',
          phoneNumber: facility.phoneNumber,
          isActive: true,
          isICEFacility: true,
          facilityImageId,
          thumbnailImageId,
        },
      });

      results.success.push(facility.name);
    } catch (error) {
      results.failed.push({
        name: facility.name,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  revalidatePath('/admin/detention-centers');
  revalidatePath('/admin/detention-centers/import');

  return results;
}

export async function scrapeICEWebsite() {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session, 'detentionCenters', 'create')) {
    throw new Error('Unauthorized');
  }

  // In a real implementation, this would scrape the ICE website
  // For now, we'll return a message about the available data
  return {
    message: 'ICE facility data is available for import',
    availableStates: Object.keys(ICE_FACILITIES_BY_STATE),
    totalFacilities: Object.values(ICE_FACILITIES_BY_STATE).reduce(
      (sum, facilities) => sum + facilities.length,
      0
    ),
  };
}
