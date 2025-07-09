import { PrismaClient, Town, Theme, Layout } from '@prisma/client';

export async function seedTowns(
  prisma: PrismaClient, 
  defaultTheme: Theme, 
  defaultLayout: Layout
): Promise<Town[]> {
  const townsData = [
    {
      name: 'Borrego Springs',
      state: 'California',
      county: 'San Diego',
      zipCode: '92004',
      fullAddress: 'Borrego Springs, CA 92004, USA',
      description: 'A small desert town in San Diego County known for its clear skies and natural beauty.',
      latitude: 33.2553,
      longitude: -116.3747,
      imageUploadMaxSizeMB: 15,  // Town-specific limit
      defaultThemeId: defaultTheme.id,
      defaultLayoutId: defaultLayout.id
    },
    {
      name: 'Chula Vista',
      state: 'California', 
      county: 'San Diego',
      zipCode: '91910',
      fullAddress: 'Chula Vista, CA 91910, USA',
      description: 'The second-largest city in San Diego County with a large immigrant population.',
      latitude: 32.6401,
      longitude: -117.0842,
      defaultThemeId: defaultTheme.id,
      defaultLayoutId: defaultLayout.id
    },
    {
      name: 'Los Angeles',
      state: 'California',
      county: 'Los Angeles',
      zipCode: '90001',
      fullAddress: 'Los Angeles, CA 90001, USA',
      description: 'The largest city in California and a major immigrant destination.',
      latitude: 34.0522,
      longitude: -118.2437,
      imageStorageMaxSizeKB: 300,  // Town-specific storage limit
      defaultThemeId: defaultTheme.id,
      defaultLayoutId: defaultLayout.id
    },
    {
      name: 'San Francisco',
      state: 'California',
      county: 'San Francisco',
      zipCode: '94102',
      fullAddress: 'San Francisco, CA 94102, USA',
      description: 'A sanctuary city with strong immigrant protection policies.',
      latitude: 37.7749,
      longitude: -122.4194,
      defaultThemeId: defaultTheme.id,
      defaultLayoutId: defaultLayout.id
    },
    {
      name: 'Fresno',
      state: 'California',
      county: 'Fresno',
      zipCode: '93721',
      fullAddress: 'Fresno, CA 93721, USA',
      description: 'Central Valley city with a large agricultural worker population.',
      latitude: 36.7378,
      longitude: -119.7871,
      defaultThemeId: defaultTheme.id,
      defaultLayoutId: defaultLayout.id
    }
  ];

  const createdTowns: Town[] = [];

  for (const townData of townsData) {
    const town = await prisma.town.create({
      data: townData
    });
    createdTowns.push(town);
    console.log(`  ✓ Created town: ${town.name}`);
  }

  return createdTowns;
}