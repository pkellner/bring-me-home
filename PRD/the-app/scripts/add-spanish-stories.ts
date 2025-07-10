import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addSpanishStories() {
  // Find Miguel Ramirez in Borrego Springs
  const miguel = await prisma.person.findFirst({
    where: {
      firstName: 'Miguel',
      lastName: 'Ramirez',
      town: {
        name: 'Borrego Springs',
      },
    },
    include: {
      stories: true,
    },
  });

  if (!miguel) {
    console.log('Miguel Ramirez not found in Borrego Springs');
    return;
  }

  console.log(`Found Miguel Ramirez (${miguel.id})`);
  console.log(`Current stories: ${miguel.stories.length}`);

  // Add Spanish translations
  const spanishStories = [
    {
      personId: miguel.id,
      language: 'es',
      storyType: 'personal',
      content: `<p>Miguel Ramírez ha vivido en Borrego Springs durante 20 años, trabajando como agricultor y padre de dos niños pequeños. Miguel ha sido un miembro activo de la comunidad, contribuyendo a las iglesias locales, escuelas y eventos del vecindario.</p>
<p>No tiene antecedentes penales y siempre ha sido conocido como una persona trabajadora y honesta que vino a este país buscando una vida mejor para su familia. Miguel fue detenido por ICE el ${miguel.detentionDate?.toLocaleDateString(
        'es-ES'
      )} y actualmente está detenido pendiente de procedimientos de inmigración.</p>
<p>Su familia depende completamente de él, y su ausencia ha causado enormes dificultades emocionales y económicas. Los niños preguntan por su papá todos los días.</p>`,
      isActive: true,
    },
    {
      personId: miguel.id,
      language: 'es',
      storyType: 'detention',
      content: `<p>Miguel fue detenido en su lugar de trabajo en Borrego Springs durante una acción rutinaria de aplicación de ICE. A pesar de no tener antecedentes penales y ser un miembro contribuyente de la comunidad, fue llevado inmediatamente a custodia.</p>
<p>La detención ha causado dificultades significativas para su familia, incluyendo la posible pérdida de vivienda e ingresos. Los miembros de la comunidad se han unido para apoyar a la familia durante este momento difícil, proporcionando comidas, cuidado de niños y asistencia financiera.</p>
<p>Necesitamos urgentemente su apoyo para ayudar a traer a Miguel de vuelta a casa con su familia. Cada voz cuenta en demostrar sus lazos comunitarios.</p>`,
      isActive: true,
    },
    {
      personId: miguel.id,
      language: 'es',
      storyType: 'family',
      content: `<p>"Estamos devastados por la detención de Miguel. Nuestros hijos lloran todas las noches preguntando cuándo volverá su papá a casa. Necesitamos a Miguel de vuelta con nosotros - él es el corazón de nuestra familia y nunca ha hecho nada malo. Por favor, ayúdennos mostrando su apoyo."</p>
<p>"Miguel es todo para nosotros. Es un padre amoroso, un esposo dedicado y un trabajador incansable. Sin él, no sabemos cómo seguir adelante. Su apoyo significa todo para nosotros en este momento tan difícil."</p>`,
      isActive: true,
    },
  ];

  // Create Spanish stories
  for (const story of spanishStories) {
    const existing = await prisma.story.findFirst({
      where: {
        personId: story.personId,
        language: story.language,
        storyType: story.storyType,
      },
    });

    if (!existing) {
      await prisma.story.create({ data: story });
      console.log(`Created ${story.storyType} story in Spanish`);
    } else {
      console.log(`Spanish ${story.storyType} story already exists`);
    }
  }

  // Also add French translations for demonstration
  const frenchStories = [
    {
      personId: miguel.id,
      language: 'fr',
      storyType: 'personal',
      content: `<p>Miguel Ramírez vit à Borrego Springs depuis 20 ans, travaillant comme agriculteur et père de deux jeunes enfants. Miguel a été un membre actif de la communauté, contribuant aux églises locales, aux écoles et aux événements de quartier.</p>
<p>Il n'a pas de casier judiciaire et a toujours été connu comme une personne travailleuse et honnête venue dans ce pays à la recherche d'une vie meilleure pour sa famille. Miguel a été arrêté par l'ICE le ${miguel.detentionDate?.toLocaleDateString(
        'fr-FR'
      )} et est actuellement détenu en attente de procédures d'immigration.</p>`,
      isActive: true,
    },
  ];

  for (const story of frenchStories) {
    const existing = await prisma.story.findFirst({
      where: {
        personId: story.personId,
        language: story.language,
        storyType: story.storyType,
      },
    });

    if (!existing) {
      await prisma.story.create({ data: story });
      console.log(`Created ${story.storyType} story in French`);
    }
  }

  console.log('Spanish stories added successfully!');
}

addSpanishStories()
  .catch(e => {
    console.error('Error adding Spanish stories:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
