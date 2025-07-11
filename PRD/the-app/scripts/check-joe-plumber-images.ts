import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkJoePlumberImages() {
  console.log('Checking Joe Plumber\'s legacy image references...\n');

  // Find Joe Plumber
  const joe = await prisma.person.findFirst({
    where: {
      firstName: 'Joe',
      lastName: 'Plumber',
    },
  });

  if (!joe) {
    console.log('Joe Plumber not found in the database.');
    return;
  }

  // Extract image IDs from the legacy URLs
  const imageIds: string[] = [];
  const imageFields = [
    { field: 'primaryPicture', url: joe.primaryPicture },
    { field: 'secondaryPic1', url: joe.secondaryPic1 },
    { field: 'secondaryPic2', url: joe.secondaryPic2 },
    { field: 'secondaryPic3', url: joe.secondaryPic3 },
  ];

  console.log('Legacy Image URLs:');
  imageFields.forEach(({ field, url }) => {
    if (url) {
      console.log(`- ${field}: ${url}`);
      // Extract ID from URL like /api/images/{id}
      const match = url.match(/\/api\/images\/(.+)/);
      if (match) {
        imageIds.push(match[1]);
      }
    }
  });

  console.log('\nExtracted Image IDs:');
  imageIds.forEach(id => console.log(`- ${id}`));

  // Check if these images exist in ImageStorage
  console.log('\nChecking ImageStorage table:');
  for (const id of imageIds) {
    const image = await prisma.imageStorage.findUnique({
      where: { id },
    });

    if (image) {
      console.log(`\n✅ Image ${id} found:`);
      console.log(`   - Size: ${(image.size / 1024).toFixed(2)} KB`);
      console.log(`   - MIME Type: ${image.mimeType}`);
      console.log(`   - Dimensions: ${image.width}x${image.height}`);
      console.log(`   - Created: ${image.createdAt}`);
    } else {
      console.log(`\n❌ Image ${id} NOT found in ImageStorage!`);
    }
  }

  // Check if there are any PersonImage entries that reference these IDs
  console.log('\nChecking if these images are referenced in PersonImage table:');
  const personImages = await prisma.personImage.findMany({
    where: {
      OR: [
        { fullImageId: { in: imageIds } },
        { thumbnailImageId: { in: imageIds } },
      ],
    },
    include: {
      person: true,
    },
  });

  if (personImages.length > 0) {
    console.log(`Found ${personImages.length} PersonImage entries referencing these images:`);
    personImages.forEach(pi => {
      console.log(`- PersonImage ${pi.id} for ${pi.person.firstName} ${pi.person.lastName}`);
      console.log(`  Full Image: ${pi.fullImageId}`);
      console.log(`  Thumbnail: ${pi.thumbnailImageId}`);
    });
  } else {
    console.log('No PersonImage entries reference these image IDs');
  }

  // Summary
  console.log('\n=== SUMMARY ===');
  console.log(`Joe Plumber has ${imageIds.length} legacy image URLs`);
  console.log(`These point to ImageStorage entries that ${imageIds.length > 0 ? 'need to be checked' : 'do not exist'}`);
  console.log('Joe Plumber has 0 entries in the new personImages relation');
  console.log('\nRecommendation: Consider migrating the legacy image fields to the new personImages structure');
}

checkJoePlumberImages()
  .catch(e => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });