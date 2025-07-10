import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkPersons() {
  // Find all persons in Borrego Springs
  const persons = await prisma.person.findMany({
    where: {
      town: {
        name: 'Borrego Springs'
      }
    },
    include: {
      town: true
    }
  });

  console.log(`\nFound ${persons.length} persons in Borrego Springs:`);
  persons.forEach(person => {
    console.log(`- ${person.firstName} ${person.lastName}`);
    console.log(`  URL: /borrego-springs/${person.firstName.toLowerCase()}-${person.lastName.toLowerCase()}`);
    console.log(`  Has story: ${person.story ? 'Yes' : 'No'}`);
    console.log(`  Story length: ${person.story?.length || 0} characters`);
    if (person.story) {
      console.log(`  Story preview: ${person.story.substring(0, 100)}...`);
    }
    console.log('');
  });

  // Check if Carlos Diaz exists
  const carlos = await prisma.person.findFirst({
    where: {
      firstName: 'Carlos',
      lastName: 'Diaz'
    },
    include: {
      town: true
    }
  });

  if (carlos) {
    console.log('\nCarlos Diaz found:');
    console.log(`Town: ${carlos.town.name}`);
    console.log(`URL should be: /${carlos.town.slug}/${carlos.firstName.toLowerCase()}-${carlos.lastName.toLowerCase()}`);
    console.log(`Has story: ${carlos.story ? 'Yes' : 'No'}`);
    console.log(`Story content: ${carlos.story}`);
  } else {
    console.log('\nCarlos Diaz not found in database');
  }
}

checkPersons()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });