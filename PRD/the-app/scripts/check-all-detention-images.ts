import { prisma } from '../src/lib/prisma';

async function checkAllDetentionImages() {
  console.log('=== Checking All Detention Centers for Image Issues ===\n');

  try {
    // Get all detention centers with their images
    const centers = await prisma.detentionCenter.findMany({
      include: {
        detentionCenterImage: {
          include: {
            image: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    let totalCenters = centers.length;
    let centersWithBothImages = 0;
    let centersWithLegacyOnly = 0;
    let centersWithNewOnly = 0;
    let centersWithNoImages = 0;

    console.log(`Found ${totalCenters} detention centers\n`);

    for (const center of centers) {
      const hasLegacy = !!center.imageId;
      const hasNew = !!center.detentionCenterImage?.imageId;

      if (hasLegacy && hasNew) {
        centersWithBothImages++;
        console.log(`⚠️  ${center.name} (${center.city}, ${center.state})`);
        console.log(`    Has BOTH legacy and new images`);
        console.log(`    Legacy: ${center.imageId}`);
        console.log(`    New: ${center.detentionCenterImage?.imageId}`);
        
        // Check if they're the same
        if (center.imageId === center.detentionCenterImage?.imageId) {
          console.log(`    ✅ Same image ID (redundant but consistent)`);
        } else {
          console.log(`    ❌ Different image IDs (needs review)`);
        }
        console.log('');
      } else if (hasLegacy && !hasNew) {
        centersWithLegacyOnly++;
      } else if (!hasLegacy && hasNew) {
        centersWithNewOnly++;
      } else {
        centersWithNoImages++;
      }
    }

    // Summary
    console.log('\n📊 SUMMARY:');
    console.log(`   Total detention centers: ${totalCenters}`);
    console.log(`   Centers with BOTH images: ${centersWithBothImages} ⚠️`);
    console.log(`   Centers with legacy image only: ${centersWithLegacyOnly}`);
    console.log(`   Centers with new image only: ${centersWithNewOnly} ✅`);
    console.log(`   Centers with no images: ${centersWithNoImages}`);

    if (centersWithBothImages > 0) {
      console.log('\n⚠️  ACTION REQUIRED:');
      console.log(`   ${centersWithBothImages} detention center(s) have both legacy and new image references.`);
      console.log('   These need to be reviewed to determine which image should be kept.');
      console.log('   Run the compare-detention-images.ts script for each center to analyze the differences.');
    }

    if (centersWithLegacyOnly > 0) {
      console.log('\n📋 MIGRATION NEEDED:');
      console.log(`   ${centersWithLegacyOnly} detention center(s) still use the legacy imageId field.`);
      console.log('   These should be migrated to the new DetentionCenterImage system.');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the check
checkAllDetentionImages().catch(console.error);