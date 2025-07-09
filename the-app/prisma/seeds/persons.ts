import { PrismaClient, Person, Town, DetentionCenter } from '@prisma/client';

export async function seedPersons(
  prisma: PrismaClient,
  towns: Town[],
  detentionCenters: DetentionCenter[]
): Promise<Person[]> {
  const personsData = [
    {
      firstName: 'Miguel',
      middleName: 'Angel',
      lastName: 'Rodriguez',
      alienIdNumber: 'A123456789',
      dateOfBirth: new Date('1985-03-15'),
      placeOfBirth: 'Guadalajara, Mexico',
      height: "5'8\"",
      weight: '165 lbs',
      eyeColor: 'Brown',
      hairColor: 'Black',
      usAddress: '123 Desert View Dr, Borrego Springs, CA 92004',
      homeCountryAddress: 'Calle Principal 456, Guadalajara, Jalisco, Mexico',
      detentionCenterId: detentionCenters[0].id, // Adelanto
      detentionDate: new Date('2024-01-15'),
      caseNumber: 'SD-2024-001234',
      bondAmount: 15000,
      legalRepName: 'Maria Gonzalez, Esq.',
      legalRepPhone: '(619) 555-0123',
      phoneNumber: '(760) 555-0101',
      storyHtml: '<p>Miguel was detained during a workplace raid at a construction site in Borrego Springs where he had worked for over 5 years. He is the sole provider for his family of four, including two US-citizen children ages 8 and 10.</p><p>Miguel has been an active member of the community, volunteering at the local church and coaching youth soccer. His employer and coworkers have written letters of support, describing him as a reliable and hardworking employee.</p>',
      storyPlainText: 'Miguel was detained during a workplace raid at a construction site in Borrego Springs where he had worked for over 5 years. He is the sole provider for his family of four, including two US-citizen children ages 8 and 10. Miguel has been an active member of the community, volunteering at the local church and coaching youth soccer.',
      status: 'detained',
      townId: towns[0].id, // Borrego Springs
      primaryPicture: '/images/persons/miguel-rodriguez-primary.webp'
    },
    {
      firstName: 'Rosa',
      lastName: 'Martinez',
      alienIdNumber: 'A987654321',
      dateOfBirth: new Date('1990-07-22'),
      placeOfBirth: 'El Salvador',
      height: "5'4\"",
      weight: '130 lbs',
      eyeColor: 'Brown',
      hairColor: 'Brown',
      usAddress: '456 Border Ave, Chula Vista, CA 91910',
      homeCountryAddress: 'Colonia San Jose, San Salvador, El Salvador',
      detentionCenterId: detentionCenters[3].id, // Otay Mesa
      detentionDate: new Date('2024-02-01'),
      caseNumber: 'SD-2024-002345',
      bondAmount: 10000,
      phoneNumber: '(619) 555-0202',
      storyHtml: '<p>Rosa fled violence in El Salvador and was detained at the border while seeking asylum. She has family in Chula Vista who are ready to sponsor her.</p><p>Rosa worked as a nurse in El Salvador and hopes to continue helping people in the United States. She has already passed her credible fear interview.</p>',
      storyPlainText: 'Rosa fled violence in El Salvador and was detained at the border while seeking asylum. She has family in Chula Vista who are ready to sponsor her.',
      status: 'detained',
      townId: towns[1].id, // Chula Vista
      primaryPicture: '/images/persons/rosa-martinez-primary.webp'
    },
    {
      firstName: 'Carlos',
      lastName: 'Mendez',
      alienIdNumber: 'A456789123',
      dateOfBirth: new Date('1988-11-30'),
      placeOfBirth: 'Guatemala City, Guatemala',
      height: "5'10\"",
      weight: '180 lbs',
      eyeColor: 'Brown',
      hairColor: 'Black',
      usAddress: '789 Central Ave, Los Angeles, CA 90001',
      detentionCenterId: detentionCenters[0].id, // Adelanto
      detentionDate: new Date('2023-12-20'),
      caseNumber: 'LA-2023-009876',
      bondAmount: 25000,
      legalRepName: 'Public Defender Office',
      legalRepPhone: '(213) 555-0333',
      storyHtml: '<p>Carlos has lived in Los Angeles for 15 years and owns a small restaurant that employs 8 people. He was detained during a routine traffic stop.</p><p>His restaurant continues to operate with help from his wife and brother, but the community misses his presence. Over 200 community members have signed a petition for his release.</p>',
      storyPlainText: 'Carlos has lived in Los Angeles for 15 years and owns a small restaurant. He was detained during a routine traffic stop.',
      status: 'in-proceedings',
      townId: towns[2].id, // Los Angeles
      primaryPicture: '/images/persons/carlos-mendez-primary.webp'
    },
    {
      firstName: 'Ana',
      middleName: 'Maria',
      lastName: 'Gonzalez',
      alienIdNumber: 'A789456123',
      dateOfBirth: new Date('1995-05-18'),
      placeOfBirth: 'Oaxaca, Mexico',
      height: "5'2\"",
      weight: '115 lbs',
      eyeColor: 'Brown',
      hairColor: 'Black',
      usAddress: '321 Mission St, San Francisco, CA 94102',
      homeCountryAddress: 'Calle Morelos 789, Oaxaca, Mexico',
      detentionCenterId: detentionCenters[5].id, // Yuba County
      detentionDate: new Date('2024-01-28'),
      caseNumber: 'SF-2024-003456',
      storyHtml: '<p>Ana is a DACA recipient whose status lapsed due to processing delays. She was detained while traveling for her job as a software engineer.</p><p>Ana graduated from UC Berkeley and has worked at a tech company for 3 years. Her employer is actively supporting her case.</p>',
      storyPlainText: 'Ana is a DACA recipient whose status lapsed. She was detained while traveling for work as a software engineer.',
      status: 'detained',
      townId: towns[3].id, // San Francisco
      primaryPicture: '/images/persons/ana-gonzalez-primary.webp'
    },
    {
      firstName: 'Juan',
      lastName: 'Hernandez',
      alienIdNumber: 'A321654987',
      dateOfBirth: new Date('1975-09-10'),
      placeOfBirth: 'Michoacan, Mexico',
      height: "5'6\"",
      weight: '150 lbs',
      eyeColor: 'Brown',
      hairColor: 'Gray',
      usAddress: '654 Vineyard Rd, Fresno, CA 93721',
      detentionCenterId: detentionCenters[2].id, // Mesa Verde
      detentionDate: new Date('2024-02-10'),
      caseNumber: 'FR-2024-004567',
      bondAmount: 8000,
      phoneNumber: '(559) 555-0505',
      storyHtml: '<p>Juan has worked in California\'s agricultural industry for over 20 years. He was detained during an ICE raid at a farm where he was a crew supervisor.</p><p>Juan\'s wife and three children are all US citizens. His oldest daughter is in her second year of college. The family is struggling without his income and leadership.</p>',
      storyPlainText: 'Juan has worked in California agriculture for over 20 years. He was detained during an ICE raid at a farm.',
      status: 'detained',
      townId: towns[4].id, // Fresno
      primaryPicture: '/images/persons/juan-hernandez-primary.webp'
    },
    {
      firstName: 'Maria',
      lastName: 'Silva',
      alienIdNumber: 'A654321789',
      dateOfBirth: new Date('1982-12-25'),
      placeOfBirth: 'Honduras',
      height: "5'5\"",
      weight: '140 lbs',
      eyeColor: 'Brown',
      hairColor: 'Brown',
      usAddress: '789 Hope St, Los Angeles, CA 90001',
      detentionCenterId: detentionCenters[0].id, // Adelanto
      detentionDate: new Date('2023-11-15'),
      caseNumber: 'LA-2023-008765',
      releaseDate: new Date('2024-01-20'),
      storyHtml: '<p>Maria was detained for 2 months before being released on bond. She is now fighting her case from home while wearing an ankle monitor.</p><p>Maria works as a housekeeper and is the primary caregiver for her elderly mother. The community rallied to raise her bond money.</p>',
      storyPlainText: 'Maria was detained for 2 months before being released on bond. She is fighting her case while caring for her elderly mother.',
      status: 'released',
      townId: towns[2].id, // Los Angeles
      primaryPicture: '/images/persons/maria-silva-primary.webp'
    }
  ];

  const createdPersons: Person[] = [];

  for (const personData of personsData) {
    const person = await prisma.person.create({
      data: personData
    });
    createdPersons.push(person);
    console.log(`  ✓ Created person: ${person.firstName} ${person.lastName}`);
  }

  return createdPersons;
}