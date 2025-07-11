import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkJoePlumber() {
  console.log('Searching for Joe Plumber in the database...\n');

  // Find Joe Plumber
  const joe = await prisma.person.findFirst({
    where: {
      firstName: 'Joe',
      lastName: 'Plumber',
    },
    include: {
      town: true,
      personImages: {
        include: {
          fullImage: true,
          thumbnailImage: true,
          uploadedBy: {
            select: {
              username: true,
              email: true,
            },
          },
        },
      },
    },
  });

  if (!joe) {
    console.log('Joe Plumber not found in the database.');
    return;
  }

  console.log('✅ Joe Plumber found!\n');
  console.log('Basic Information:');
  console.log(`- ID: ${joe.id}`);
  console.log(`- Name: ${joe.firstName} ${joe.middleName || ''} ${joe.lastName}`.trim());
  console.log(`- Town: ${joe.town.name} (${joe.town.slug})`);
  console.log(`- Status: ${joe.status}`);
  console.log(`- Active: ${joe.isActive}`);
  console.log(`- Found: ${joe.isFound}`);
  console.log(`- Created: ${joe.createdAt}`);
  console.log(`- Updated: ${joe.updatedAt}`);

  console.log('\nLegacy Image Fields:');
  console.log(`- Primary Picture: ${joe.primaryPicture || 'None'}`);
  console.log(`- Secondary Pic 1: ${joe.secondaryPic1 || 'None'}`);
  console.log(`- Secondary Pic 2: ${joe.secondaryPic2 || 'None'}`);
  console.log(`- Secondary Pic 3: ${joe.secondaryPic3 || 'None'}`);

  console.log('\nNew PersonImages Relation:');
  if (joe.personImages.length === 0) {
    console.log('- No images in personImages table');
  } else {
    console.log(`- Total images: ${joe.personImages.length}`);
    joe.personImages.forEach((image, index) => {
      console.log(`\n  Image ${index + 1}:`);
      console.log(`  - ID: ${image.id}`);
      console.log(`  - Image URL: ${image.imageUrl}`);
      console.log(`  - Thumbnail URL: ${image.thumbnailUrl || 'None'}`);
      console.log(`  - Caption: ${image.caption || 'None'}`);
      console.log(`  - Primary: ${image.isPrimary}`);
      console.log(`  - Active: ${image.isActive}`);
      console.log(`  - Display Publicly: ${image.displayPublicly}`);
      console.log(`  - Full Image ID: ${image.fullImageId || 'None'}`);
      console.log(`  - Thumbnail Image ID: ${image.thumbnailImageId || 'None'}`);
      console.log(`  - Full Image Size: ${image.fullImage?.size ? `${(image.fullImage.size / 1024).toFixed(2)} KB` : 'N/A'}`);
      console.log(`  - Thumbnail Size: ${image.thumbnailImage?.size ? `${(image.thumbnailImage.size / 1024).toFixed(2)} KB` : 'N/A'}`);
      console.log(`  - Uploaded By: ${image.uploadedBy.username} (${image.uploadedBy.email || 'no email'})`);
      console.log(`  - Created: ${image.createdAt}`);
      console.log(`  - Updated: ${image.updatedAt}`);
    });
  }

  // Check if any images exist in ImageStorage that might be orphaned
  console.log('\nChecking for any orphaned images in ImageStorage...');
  const allImageIds = joe.personImages.flatMap(img => [img.fullImageId, img.thumbnailImageId].filter(Boolean)) as string[];
  if (allImageIds.length > 0) {
    const orphanedImages = await prisma.imageStorage.findMany({
      where: {
        NOT: {
          id: {
            in: allImageIds,
          },
        },
      },
      select: {
        id: true,
        size: true,
        createdAt: true,
      },
    });
    
    if (orphanedImages.length > 0) {
      console.log(`Found ${orphanedImages.length} orphaned images in ImageStorage`);
    } else {
      console.log('No orphaned images found');
    }
  }

  // URL information
  console.log('\nProfile URL:');
  console.log(`- /${joe.town.slug}/${joe.firstName.toLowerCase()}-${joe.lastName.toLowerCase()}`);
}

checkJoePlumber()
  .catch(e => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });