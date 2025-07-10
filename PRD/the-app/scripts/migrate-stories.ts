import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateStories() {
  console.log('Starting story migration...');
  
  // Get all persons with stories
  const persons = await prisma.person.findMany({
    where: {
      OR: [
        { story: { not: null } },
        { detentionStory: { not: null } },
        { familyMessage: { not: null } }
      ]
    }
  });
  
  console.log(`Found ${persons.length} persons with stories to migrate`);
  
  for (const person of persons) {
    const stories = [];
    
    // Migrate personal story
    if (person.story) {
      stories.push({
        personId: person.id,
        language: 'en',
        storyType: 'personal',
        content: person.story,
        isActive: true
      });
    }
    
    // Migrate detention story
    if (person.detentionStory) {
      stories.push({
        personId: person.id,
        language: 'en',
        storyType: 'detention',
        content: person.detentionStory,
        isActive: true
      });
    }
    
    // Migrate family message
    if (person.familyMessage) {
      stories.push({
        personId: person.id,
        language: 'en',
        storyType: 'family',
        content: person.familyMessage,
        isActive: true
      });
    }
    
    // Create story records
    if (stories.length > 0) {
      await prisma.story.createMany({
        data: stories
      });
      console.log(`Migrated ${stories.length} stories for ${person.firstName} ${person.lastName}`);
    }
  }
  
  console.log('Migration completed!');
}

migrateStories()
  .catch(e => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });