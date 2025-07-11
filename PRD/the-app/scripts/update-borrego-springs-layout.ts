import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateBorregoSpringsLayout() {
  try {
    console.log('🚀 Starting Borrego Springs layout update...\n');

    // First, check if the grid layout with gallery-grid exists
    let gridLayout = await prisma.layout.findFirst({
      where: {
        name: 'Grid with Gallery',
        isActive: true,
      },
    });

    // If it doesn't exist, create it
    if (!gridLayout) {
      console.log('📐 Creating new "Grid with Gallery" layout...');
      
      gridLayout = await prisma.layout.create({
        data: {
          name: 'Grid with Gallery',
          description: 'Grid layout with image, info, gallery grid, story, and comments sections',
          template: JSON.stringify({
            type: 'grid',
            sections: ['image', 'info', 'gallery-grid', 'story', 'comments'],
          }),
          isActive: true,
        },
      });
      
      console.log('✅ Created new layout:', gridLayout.name);
      console.log('   ID:', gridLayout.id);
    } else {
      console.log('✅ Found existing layout:', gridLayout.name);
      console.log('   ID:', gridLayout.id);
      
      // Parse and display current template
      try {
        const template = JSON.parse(gridLayout.template);
        console.log('   Current sections:', template.sections.join(', '));
      } catch (e) {
        console.log('   ⚠️  Could not parse template JSON');
      }
    }

    console.log('');

    // Find Borrego Springs town
    const borregoSprings = await prisma.town.findFirst({
      where: {
        slug: 'borrego-springs',
      },
      include: {
        layout: true,
      },
    });

    if (!borregoSprings) {
      console.error('❌ Borrego Springs town not found in the database');
      return;
    }

    console.log('🏘️  Found Borrego Springs:');
    console.log('   Name:', borregoSprings.name);
    console.log('   State:', borregoSprings.state);
    console.log('   Current layout:', borregoSprings.layout?.name || 'None (using system default)');
    console.log('');

    // Update the town to use the grid layout
    console.log('🔄 Updating Borrego Springs to use grid layout...');
    
    const updatedTown = await prisma.town.update({
      where: {
        id: borregoSprings.id,
      },
      data: {
        defaultLayoutId: gridLayout.id,
      },
      include: {
        layout: true,
      },
    });

    console.log('✅ Successfully updated Borrego Springs!');
    console.log('   New layout:', updatedTown.layout?.name);
    
    // Parse and display the new template
    if (updatedTown.layout?.template) {
      try {
        const template = JSON.parse(updatedTown.layout.template);
        console.log('   Layout type:', template.type);
        console.log('   Sections:', template.sections.join(', '));
      } catch (e) {
        console.log('   ⚠️  Could not parse template JSON');
      }
    }

    // Check how many persons will be affected
    const personsCount = await prisma.person.count({
      where: {
        townId: borregoSprings.id,
      },
    });

    console.log('');
    console.log('📊 Impact:');
    console.log(`   ${personsCount} persons in Borrego Springs will now use the grid layout`);
    console.log('   (unless they have person-specific layout overrides)');

    // Show a few sample persons
    const samplePersons = await prisma.person.findMany({
      where: {
        townId: borregoSprings.id,
      },
      take: 5,
      select: {
        firstName: true,
        lastName: true,
        layout: {
          select: {
            name: true,
          },
        },
      },
    });

    if (samplePersons.length > 0) {
      console.log('');
      console.log('👥 Sample persons:');
      samplePersons.forEach(person => {
        const layoutName = person.layout?.name || 'Grid with Gallery (from town)';
        console.log(`   - ${person.firstName} ${person.lastName}: ${layoutName}`);
      });
    }

    console.log('\n✨ Update complete!');

  } catch (error) {
    console.error('❌ Error updating Borrego Springs layout:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
updateBorregoSpringsLayout();