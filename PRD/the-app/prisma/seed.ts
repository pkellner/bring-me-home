import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { processAndStoreImage } from '../src/lib/image-storage';

const prisma = new PrismaClient();

// Store placeholder image IDs
const placeholderImageIds: Map<number, { fullImageId: string; thumbnailImageId: string }> = new Map();

// Helper function to generate random date within range
function randomDate(start: Date, end: Date): Date {
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime())
  );
}

// Helper function to get random element from array
function randomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

// Helper function to store placeholder images in database
async function storePlaceholderImages() {
  console.log('Storing placeholder images in database...');
  
  for (let i = 1; i <= 10; i++) {
    const imagePath = join(process.cwd(), 'public', 'images', `placeholder-person-${i}.jpg`);
    const imageBuffer = await readFile(imagePath);
    
    const { fullImageId, thumbnailImageId } = await processAndStoreImage(
      imageBuffer,
      'image/jpeg'
    );
    
    placeholderImageIds.set(i, { fullImageId, thumbnailImageId });
    console.log(`Stored placeholder image ${i}`);
  }
}

// Seed data for Southern California detention centers
const detentionCenters = [
  {
    id: 'dc_1',
    name: 'Adelanto ICE Processing Center',
    facilityType: 'ICE',
    operatedBy: 'The GEO Group, Inc.',
    address: '10250 Rancho Road',
    city: 'Adelanto',
    state: 'CA',
    zipCode: '92301',
    phoneNumber: '(760) 561-6100',
    capacity: 1940,
    currentPopulation: 1500,
    latitude: 34.5639,
    longitude: -117.432,
    notes:
      'One of the largest immigration detention facilities in the United States.',
    visitingHours: 'Friday - Monday: 8:00 AM - 3:00 PM',
    isActive: true,
  },
  {
    id: 'dc_2',
    name: 'Otay Mesa Detention Center',
    facilityType: 'Private',
    operatedBy: 'CoreCivic',
    address: '7488 Calzada de la Fuente',
    city: 'San Diego',
    state: 'CA',
    zipCode: '92154',
    phoneNumber: '(619) 661-6500',
    capacity: 1482,
    currentPopulation: 1100,
    latitude: 32.5692,
    longitude: -116.9735,
    notes: 'Contracted facility housing ICE detainees in San Diego.',
    visitingHours: 'Daily: 8:00 AM - 10:00 PM',
    isActive: true,
  },
  {
    id: 'dc_3',
    name: 'Imperial Regional Detention Facility',
    facilityType: 'ICE',
    operatedBy: 'Management & Training Corporation',
    address: '1572 Gateway Road',
    city: 'Calexico',
    state: 'CA',
    zipCode: '92231',
    phoneNumber: '(760) 768-2400',
    capacity: 704,
    currentPopulation: 650,
    latitude: 32.679,
    longitude: -115.4872,
    notes: 'Regional facility near the Mexican border.',
    visitingHours: 'Saturday - Sunday: 8:00 AM - 3:00 PM',
    isActive: true,
  },
  {
    id: 'dc_4',
    name: 'Mesa Verde ICE Processing Center',
    facilityType: 'ICE',
    operatedBy: 'The GEO Group, Inc.',
    address: '425 Golden State Ave',
    city: 'Bakersfield',
    state: 'CA',
    zipCode: '93301',
    phoneNumber: '(661) 322-2400',
    capacity: 400,
    currentPopulation: 350,
    latitude: 35.3733,
    longitude: -119.0187,
    notes: 'Dedicated ICE facility in Central California.',
    visitingHours: 'Friday - Monday: 8:00 AM - 3:00 PM',
    isActive: true,
  },
  {
    id: 'dc_5',
    name: 'Orange County Jail - James A. Musick Facility',
    facilityType: 'County',
    operatedBy: "Orange County Sheriff's Department",
    address: '13502 Musick Road',
    city: 'Irvine',
    state: 'CA',
    zipCode: '92618',
    phoneNumber: '(949) 598-4122',
    capacity: 200,
    currentPopulation: 150,
    latitude: 33.6092,
    longitude: -117.7637,
    notes: 'County facility that houses ICE detainees under contract.',
    visitingHours: 'Wednesday, Saturday, Sunday: 8:00 AM - 2:00 PM',
    isActive: true,
  },
];

// Seed data for California towns
const towns = [
  {
    id: 'town_1',
    name: 'Borrego Springs',
    slug: 'borrego-springs',
    state: 'California',
    county: 'San Diego',
    zipCode: '92004',
    fullAddress: 'Borrego Springs, CA 92004, USA',
    description:
      'A small desert town in San Diego County known for its wildflowers and stargazing.',
    latitude: 33.2553,
    longitude: -116.3747,
    isActive: true,
  },
  {
    id: 'town_2',
    name: 'Mendocino',
    slug: 'mendocino',
    state: 'California',
    county: 'Mendocino',
    zipCode: '95460',
    fullAddress: 'Mendocino, CA 95460, USA',
    description:
      'A historic coastal town in Northern California with Victorian architecture.',
    latitude: 39.3076,
    longitude: -123.7997,
    isActive: true,
  },
  {
    id: 'town_3',
    name: 'Julian',
    slug: 'julian',
    state: 'California',
    county: 'San Diego',
    zipCode: '92036',
    fullAddress: 'Julian, CA 92036, USA',
    description:
      'A historic mountain town known for apple orchards and gold mining history.',
    latitude: 33.0786,
    longitude: -116.6022,
    isActive: true,
  },
  {
    id: 'town_4',
    name: 'Cambria',
    slug: 'cambria',
    state: 'California',
    county: 'San Luis Obispo',
    zipCode: '93428',
    fullAddress: 'Cambria, CA 93428, USA',
    description:
      'A charming coastal town near Hearst Castle with beautiful beaches.',
    latitude: 35.5641,
    longitude: -121.0807,
    isActive: true,
  },
  {
    id: 'town_5',
    name: 'Ferndale',
    slug: 'ferndale',
    state: 'California',
    county: 'Humboldt',
    zipCode: '95536',
    fullAddress: 'Ferndale, CA 95536, USA',
    description:
      'A Victorian village known for its well-preserved 19th-century architecture.',
    latitude: 40.5759,
    longitude: -124.2636,
    isActive: true,
  },
];

// Generate comprehensive person data
const generatePersons = () => {
  const firstNames = [
    'Juan',
    'Maria',
    'Carlos',
    'Rosa',
    'Miguel',
    'Carmen',
    'Jose',
    'Ana',
    'Luis',
    'Isabel',
    'Francisco',
    'Elena',
    'Javier',
    'Patricia',
    'Diego',
    'Sofia',
    'Antonio',
    'Lucia',
    'Pedro',
    'Gabriela',
  ];
  const lastNames = [
    'Rodriguez',
    'Gonzalez',
    'Martinez',
    'Lopez',
    'Hernandez',
    'Garcia',
    'Perez',
    'Sanchez',
    'Ramirez',
    'Torres',
    'Flores',
    'Rivera',
    'Gomez',
    'Diaz',
    'Reyes',
    'Morales',
  ];
  const middleNames = [
    'Antonio',
    'Maria',
    'Jose',
    'Elena',
    'Miguel',
    'Carmen',
    'Luis',
    'Ana',
    'Francisco',
    'Isabel',
  ];

  const eyeColors = ['Brown', 'Black', 'Hazel', 'Green', 'Blue'];
  const hairColors = [
    'Black',
    'Brown',
    'Dark Brown',
    'Gray',
    'Salt and Pepper',
  ];
  const heights = [
    '5\'2"',
    '5\'4"',
    '5\'6"',
    '5\'8"',
    '5\'10"',
    '6\'0"',
    '6\'2"',
  ];
  const weights = [
    '120 lbs',
    '140 lbs',
    '160 lbs',
    '180 lbs',
    '200 lbs',
    '220 lbs',
  ];

  // Detention statuses
  const detentionStatuses = [
    'detained',
    'released',
    'deported',
    'in-proceedings',
  ];
  const bondStatuses = ['posted', 'denied', 'pending'];
  const countries = [
    'Mexico',
    'Guatemala',
    'Honduras',
    'El Salvador',
    'Nicaragua',
    'Colombia',
    'Peru',
    'Ecuador',
  ];
  const lawFirms = [
    'Immigration Law Center',
    'Pro Bono Legal Services',
    'Defenders of Justice',
    'Human Rights Law Group',
  ];

  const persons = [];
  let personId = 1;

  for (const town of towns) {
    // Generate 2-5 persons per town
    const personsPerTown = Math.floor(Math.random() * 4) + 2;

    for (let i = 0; i < personsPerTown; i++) {
      const firstName = randomElement(firstNames);
      const lastName = randomElement(lastNames);
      const dateOfBirth = randomDate(
        new Date(1950, 0, 1),
        new Date(2000, 0, 1)
      );
      const lastSeenDate = randomDate(
        new Date(2023, 0, 1),
        new Date(2024, 3, 1)
      );

      // Determine if this person is detained (30% chance)
      const isDetained = Math.random() < 0.3;
      const detentionStatus = isDetained
        ? randomElement(detentionStatuses)
        : null;
      const detentionCenterId = isDetained
        ? randomElement(detentionCenters).id
        : null;
      const detentionDate = isDetained
        ? randomDate(new Date(2023, 0, 1), lastSeenDate)
        : null;
      const releaseDate =
        isDetained && detentionStatus === 'released'
          ? randomDate(detentionDate!, new Date())
          : null;

      // Legal representation for detained persons (70% chance)
      const hasLegalRep = isDetained && Math.random() < 0.7;
      const nextCourtDate =
        isDetained && detentionStatus === 'in-proceedings'
          ? randomDate(new Date(), new Date(2025, 0, 1))
          : null;

      persons.push({
        id: `person_${personId}`,
        firstName,
        middleName: Math.random() > 0.5 ? randomElement(middleNames) : null,
        lastName,
        alienIdNumber: `A${Math.floor(Math.random() * 900000000) + 100000000}`,
        dateOfBirth,
        placeOfBirth: `${randomElement([
          'Mexico City',
          'Guadalajara',
          'Tijuana',
          'Guatemala City',
          'San Salvador',
          'Tegucigalpa',
          'Managua',
          'Bogota',
          'Lima',
          'Quito',
        ])}, ${randomElement(countries)}`,
        height: randomElement(heights),
        weight: randomElement(weights),
        eyeColor: randomElement(eyeColors),
        hairColor: randomElement(hairColors),
        lastKnownAddress: `${
          Math.floor(Math.random() * 9999) + 100
        } ${randomElement([
          'Main',
          'Oak',
          'Pine',
          'Elm',
          'Desert',
          'Ocean',
          'Mountain',
        ])} ${randomElement(['St', 'Ave', 'Rd', 'Dr'])}, ${town.name}, CA ${
          town.zipCode
        }`,
        phoneNumber: `${town.zipCode.substring(0, 3)}-555-${String(
          Math.floor(Math.random() * 10000)
        ).padStart(4, '0')}`,
        emailAddress: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${personId}@email.com`,
        story: generateStory(firstName, lastName, town.name, lastSeenDate),
        circumstances: generateCircumstances(firstName, town.name),
        lastSeenDate,
        lastSeenLocation: `${randomElement([
          'Downtown',
          'Market Street',
          'City Park',
          'Main Street',
          'Shopping Center',
        ])}, ${town.name}`,
        townId: town.id,
        primaryPicture: `/api/images/${placeholderImageIds.get((personId % 10) + 1)?.fullImageId}`,
        secondaryPic1:
          Math.random() > 0.5
            ? `/api/images/${placeholderImageIds.get(((personId + 1) % 10) + 1)?.fullImageId}`
            : null,
        secondaryPic2:
          Math.random() > 0.7
            ? `/api/images/${placeholderImageIds.get(((personId + 2) % 10) + 1)?.fullImageId}`
            : null,
        status: isDetained ? 'detained' : 'missing',
        // Detention information
        detentionCenterId,
        detentionDate,
        releaseDate,
        detentionStatus,
        caseNumber: isDetained
          ? `ICE-${new Date().getFullYear()}-${String(
              Math.floor(Math.random() * 100000)
            ).padStart(5, '0')}`
          : null,
        bondAmount:
          isDetained && detentionStatus === 'detained'
            ? Math.floor(Math.random() * 20000 + 5000)
            : null,
        bondStatus:
          isDetained && detentionStatus === 'detained'
            ? randomElement(bondStatuses)
            : null,
        // Legal information
        legalRepName: hasLegalRep
          ? `${randomElement([
              'James',
              'Maria',
              'Robert',
              'Linda',
            ])} ${randomElement(['Smith', 'Johnson', 'Williams', 'Brown'])}`
          : null,
        legalRepPhone: hasLegalRep
          ? `555-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`
          : null,
        legalRepEmail: hasLegalRep
          ? `lawyer${Math.floor(Math.random() * 100)}@${randomElement(lawFirms)
              .toLowerCase()
              .replace(/\s+/g, '')}.com`
          : null,
        legalRepFirm: hasLegalRep ? randomElement(lawFirms) : null,
        nextCourtDate,
        courtLocation: nextCourtDate
          ? '1501 W. Madison St, Phoenix, AZ 85007'
          : null,
        // International address
        internationalAddress:
          Math.random() > 0.3
            ? `${Math.floor(Math.random() * 999) + 1} ${randomElement([
                'Calle',
                'Avenida',
                'Boulevard',
              ])} ${randomElement([
                'Principal',
                'Central',
                'Norte',
                'Sur',
              ])}, ${randomElement([
                'Mexico City',
                'Guadalajara',
                'Tijuana',
                'Guatemala City',
              ])}, ${randomElement(countries)}`
            : null,
        countryOfOrigin: randomElement(countries),
      });

      personId++;
    }
  }

  return persons;
};

// Generate story content
function generateStory(
  firstName: string,
  lastName: string,
  townName: string,
  lastSeenDate: Date
): string {
  const professions = [
    'teacher',
    'construction worker',
    'farmer',
    'store owner',
    'mechanic',
    'nurse',
    'chef',
    'artist',
  ];
  const hobbies = [
    'hiking',
    'fishing',
    'painting',
    'gardening',
    'reading',
    'cooking',
    'music',
    'volunteering',
  ];

  const profession = randomElement(professions);
  const hobby = randomElement(hobbies);
  const years = Math.floor(Math.random() * 20) + 5;

  return (
    `${firstName} ${lastName} has been a beloved member of the ${townName} community for ${years} years, working as a ${profession}. ` +
    `Known for their passion for ${hobby}, ${firstName} was always willing to help neighbors and participate in community events. ` +
    `Friends describe ${firstName} as kind, hardworking, and reliable. The family moved to ${townName} seeking a better life and quickly became integral parts of the community. ` +
    `${firstName} was last seen on ${lastSeenDate.toLocaleDateString()}, and the community continues to hope for their safe return.`
  );
}

// Generate circumstances
function generateCircumstances(firstName: string, townName: string): string {
  const locations = [
    'grocery store',
    'gas station',
    'community center',
    'local park',
    'workplace',
    'church',
    'bus stop',
  ];
  const times = [
    'early morning',
    'mid-morning',
    'afternoon',
    'evening',
    'late evening',
  ];
  const activities = [
    'going to work',
    'running errands',
    'visiting family',
    'shopping',
    'attending a community event',
    'heading home',
  ];

  const location = randomElement(locations);
  const time = randomElement(times);
  const activity = randomElement(activities);

  return (
    `${firstName} was last seen at the ${location} in ${townName} during the ${time} while ${activity}. ` +
    `Witnesses report seeing them in good spirits and nothing seemed out of the ordinary. ` +
    `Personal belongings were found nearby, suggesting they may have left unexpectedly. ` +
    `Local authorities and family members continue to search for any information about their whereabouts.`
  );
}

// Generate comprehensive comments
const generateComments = (persons: any[]) => {
  const commentTemplates = [
    'I saw someone matching this description near {location} about {timeAgo}.',
    'I remember seeing {firstName} at {location}. They seemed {mood}.',
    '{firstName} helped me with {helpType} last year. Such a kind person.',
    "My family and I are praying for {firstName}'s safe return.",
    'I worked with {firstName} at {workplace}. They were always {trait}.',
    'Please share this everywhere. Someone must have seen {firstName}.',
    'I think I saw {firstName} near {location} {timeAgo}. They were wearing {clothing}.',
    'Does anyone know if {firstName} had any medical conditions? This might help in the search.',
    "{firstName} was a regular customer at my {business}. Haven't seen them in a while.",
    "The whole community misses {firstName}. We're organizing a search party this weekend.",
    "I've shared this on all my social media. Hoping someone recognizes {firstName}.",
    "My kids went to school with {firstName}'s children. This is heartbreaking.",
    'I saw the missing person flyers around town. Is there anything else we can do to help?',
    'Has anyone checked the {location}? {firstName} used to go there often.',
    'Sending prayers to the family. {firstName} will be found soon.',
  ];

  const locations = [
    'downtown area',
    'shopping center',
    'main street',
    'park',
    'church',
    'community center',
    'bus station',
    'library',
  ];
  const timeAgos = [
    'a few days ago',
    'last week',
    'two weeks ago',
    'last month',
    'recently',
  ];
  const moods = ['happy', 'normal', 'tired', 'worried', 'in a hurry', 'calm'];
  const helpTypes = [
    'car trouble',
    'moving furniture',
    'yard work',
    'translation',
    'directions',
  ];
  const workplaces = [
    'the factory',
    'the restaurant',
    'the farm',
    'the store',
    'the school',
  ];
  const traits = [
    'reliable',
    'helpful',
    'friendly',
    'hardworking',
    'punctual',
    'dedicated',
  ];
  const clothing = [
    'blue jeans and a jacket',
    'work uniform',
    'casual clothes',
    'a red shirt',
    'dark clothing',
  ];
  const businesses = [
    'restaurant',
    'grocery store',
    'hardware store',
    'cafe',
    'shop',
  ];

  const comments = [];
  let commentId = 1;

  for (const person of persons) {
    // Generate 5-15 comments per person
    const commentsPerPerson = Math.floor(Math.random() * 11) + 5;
    for (let i = 0; i < commentsPerPerson; i++) {
      const template = randomElement(commentTemplates);
      const content = template
        .replace('{firstName}', person.firstName)
        .replace('{location}', randomElement(locations))
        .replace('{timeAgo}', randomElement(timeAgos))
        .replace('{mood}', randomElement(moods))
        .replace('{helpType}', randomElement(helpTypes))
        .replace('{workplace}', randomElement(workplaces))
        .replace('{trait}', randomElement(traits))
        .replace('{clothing}', randomElement(clothing))
        .replace('{business}', randomElement(businesses));

      const isAnonymous = Math.random() > 0.7;
      const submitterNames = [
        'Local Resident',
        'Concerned Neighbor',
        'Community Member',
        'Former Colleague',
        'Family Friend',
        'Store Owner',
        'Anonymous Helper',
        'Witness',
      ];

      comments.push({
        id: `comment_${commentId}`,
        content,
        submitterName: isAnonymous ? null : randomElement(submitterNames),
        submitterEmail: isAnonymous ? null : `commenter${commentId}@email.com`,
        isAnonymous,
        privacy: randomElement(['public', 'public', 'public', 'registered']), // Most comments are public
        personId: person.id,
        isApproved: Math.random() > 0.1, // 90% approved
        isVerified: Math.random() > 0.8, // 20% verified
        createdAt: randomDate(person.lastSeenDate, new Date()),
      });

      commentId++;
    }
  }

  return comments;
};

// Seed data for roles
const roles = [
  {
    id: 'role_1',
    name: 'site-admin',
    description: 'Full system administrator with all permissions',
    permissions: JSON.stringify({
      users: ['create', 'read', 'update', 'delete'],
      roles: ['create', 'read', 'update', 'delete'],
      towns: ['create', 'read', 'update', 'delete'],
      persons: ['create', 'read', 'update', 'delete'],
      detentionCenters: ['create', 'read', 'update', 'delete'],
      comments: ['create', 'read', 'update', 'delete', 'moderate'],
      system: ['config', 'audit', 'backup'],
    }),
  },
  {
    id: 'role_2',
    name: 'town-admin',
    description: 'Administrator for specific towns',
    permissions: JSON.stringify({
      towns: ['read', 'update'],
      persons: ['create', 'read', 'update', 'delete'],
      comments: ['read', 'update', 'moderate'],
    }),
  },
  {
    id: 'role_3',
    name: 'person-admin',
    description: 'Administrator for specific persons',
    permissions: JSON.stringify({
      persons: ['read', 'update'],
      comments: ['read', 'moderate'],
    }),
  },
  {
    id: 'role_4',
    name: 'viewer',
    description: 'Read-only access',
    permissions: JSON.stringify({
      towns: ['read'],
      persons: ['read'],
      comments: ['read'],
    }),
  },
];

// Seed data for themes (10 themes)
const themes = [
  {
    id: 'theme_1',
    name: 'Desert Sunset',
    description: 'Warm colors inspired by desert landscapes',
    colors: JSON.stringify({
      primary: '#D2691E',
      secondary: '#F4A460',
      accent: '#FF6347',
      background: '#FFF8DC',
      text: '#2F4F4F',
    }),
    cssVars:
      ':root { --primary: #D2691E; --secondary: #F4A460; --accent: #FF6347; --background: #FFF8DC; --text: #2F4F4F; }',
  },
  {
    id: 'theme_2',
    name: 'Ocean Breeze',
    description: 'Cool blues and greens of the California coast',
    colors: JSON.stringify({
      primary: '#4682B4',
      secondary: '#87CEEB',
      accent: '#20B2AA',
      background: '#F0F8FF',
      text: '#191970',
    }),
    cssVars:
      ':root { --primary: #4682B4; --secondary: #87CEEB; --accent: #20B2AA; --background: #F0F8FF; --text: #191970; }',
  },
  {
    id: 'theme_3',
    name: 'Mountain Pine',
    description: 'Earthy greens and browns',
    colors: JSON.stringify({
      primary: '#228B22',
      secondary: '#8FBC8F',
      accent: '#654321',
      background: '#F5F5DC',
      text: '#2F4F2F',
    }),
    cssVars:
      ':root { --primary: #228B22; --secondary: #8FBC8F; --accent: #654321; --background: #F5F5DC; --text: #2F4F2F; }',
  },
  {
    id: 'theme_4',
    name: 'Sunset Gold',
    description: 'Golden hour colors',
    colors: JSON.stringify({
      primary: '#FFD700',
      secondary: '#FFA500',
      accent: '#FF8C00',
      background: '#FFFAF0',
      text: '#333333',
    }),
    cssVars:
      ':root { --primary: #FFD700; --secondary: #FFA500; --accent: #FF8C00; --background: #FFFAF0; --text: #333333; }',
  },
  {
    id: 'theme_5',
    name: 'Purple Twilight',
    description: 'Deep purples and midnight blues',
    colors: JSON.stringify({
      primary: '#6B46C1',
      secondary: '#9333EA',
      accent: '#7C3AED',
      background: '#FAF5FF',
      text: '#1F2937',
    }),
    cssVars:
      ':root { --primary: #6B46C1; --secondary: #9333EA; --accent: #7C3AED; --background: #FAF5FF; --text: #1F2937; }',
  },
  {
    id: 'theme_6',
    name: 'Rose Garden',
    description: 'Soft pinks and roses',
    colors: JSON.stringify({
      primary: '#EC4899',
      secondary: '#F472B6',
      accent: '#F87171',
      background: '#FFF1F2',
      text: '#881337',
    }),
    cssVars:
      ':root { --primary: #EC4899; --secondary: #F472B6; --accent: #F87171; --background: #FFF1F2; --text: #881337; }',
  },
  {
    id: 'theme_7',
    name: 'Neutral Gray',
    description: 'Professional grayscale theme',
    colors: JSON.stringify({
      primary: '#4B5563',
      secondary: '#9CA3AF',
      accent: '#6B7280',
      background: '#F9FAFB',
      text: '#111827',
    }),
    cssVars:
      ':root { --primary: #4B5563; --secondary: #9CA3AF; --accent: #6B7280; --background: #F9FAFB; --text: #111827; }',
  },
  {
    id: 'theme_8',
    name: 'Forest Deep',
    description: 'Deep forest greens',
    colors: JSON.stringify({
      primary: '#064E3B',
      secondary: '#059669',
      accent: '#34D399',
      background: '#ECFDF5',
      text: '#022C22',
    }),
    cssVars:
      ':root { --primary: #064E3B; --secondary: #059669; --accent: #34D399; --background: #ECFDF5; --text: #022C22; }',
  },
  {
    id: 'theme_9',
    name: 'Warm Terra',
    description: 'Terracotta and warm earth tones',
    colors: JSON.stringify({
      primary: '#C2410C',
      secondary: '#EA580C',
      accent: '#FB923C',
      background: '#FFF7ED',
      text: '#431407',
    }),
    cssVars:
      ':root { --primary: #C2410C; --secondary: #EA580C; --accent: #FB923C; --background: #FFF7ED; --text: #431407; }',
  },
  {
    id: 'theme_10',
    name: 'Cool Slate',
    description: 'Modern slate blues',
    colors: JSON.stringify({
      primary: '#1E293B',
      secondary: '#475569',
      accent: '#3B82F6',
      background: '#F8FAFC',
      text: '#0F172A',
    }),
    cssVars:
      ':root { --primary: #1E293B; --secondary: #475569; --accent: #3B82F6; --background: #F8FAFC; --text: #0F172A; }',
  },
];

// Seed data for layouts (10 layouts)
const layouts = [
  {
    id: 'layout_1',
    name: 'Standard Profile',
    description: 'Traditional layout with image on left, info on right',
    template: JSON.stringify({
      type: 'grid',
      columns: 2,
      sections: ['image', 'info', 'story', 'comments'],
    }),
  },
  {
    id: 'layout_2',
    name: 'Compact Card',
    description: 'Compact layout suitable for mobile viewing',
    template: JSON.stringify({
      type: 'stack',
      sections: ['image', 'info', 'story', 'comments'],
    }),
  },
  {
    id: 'layout_3',
    name: 'Hero Image',
    description: 'Large hero image at top',
    template: JSON.stringify({
      type: 'hero',
      sections: ['hero-image', 'info', 'story', 'comments'],
    }),
  },
  {
    id: 'layout_4',
    name: 'Sidebar Left',
    description: 'Information sidebar on the left',
    template: JSON.stringify({
      type: 'sidebar-left',
      sections: ['sidebar-info', 'main-content', 'comments'],
    }),
  },
  {
    id: 'layout_5',
    name: 'Sidebar Right',
    description: 'Information sidebar on the right',
    template: JSON.stringify({
      type: 'sidebar-right',
      sections: ['main-content', 'sidebar-info', 'comments'],
    }),
  },
  {
    id: 'layout_6',
    name: 'Timeline',
    description: 'Timeline-based layout',
    template: JSON.stringify({
      type: 'timeline',
      sections: ['header', 'timeline-events', 'story', 'comments'],
    }),
  },
  {
    id: 'layout_7',
    name: 'Magazine',
    description: 'Magazine-style layout',
    template: JSON.stringify({
      type: 'magazine',
      columns: 3,
      sections: ['featured-image', 'article-content', 'sidebar', 'comments'],
    }),
  },
  {
    id: 'layout_8',
    name: 'Minimal',
    description: 'Minimal clean layout',
    template: JSON.stringify({
      type: 'minimal',
      sections: ['basic-info', 'story', 'comments'],
    }),
  },
  {
    id: 'layout_9',
    name: 'Gallery Focus',
    description: 'Emphasizes image gallery',
    template: JSON.stringify({
      type: 'gallery',
      sections: ['gallery-grid', 'info', 'story', 'comments'],
    }),
  },
  {
    id: 'layout_10',
    name: 'Full Width',
    description: 'Full width modern layout',
    template: JSON.stringify({
      type: 'full-width',
      sections: ['banner', 'content-blocks', 'comments'],
    }),
  },
];

async function cleanDatabase() {
  console.log('Cleaning database...');

  try {
    // Delete in correct order to respect foreign key constraints
    await prisma.auditLog.deleteMany();
    await prisma.attachment.deleteMany();
    await prisma.personImage.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.personAccess.deleteMany();
    await prisma.townAccess.deleteMany();
    await prisma.userRole.deleteMany();
    await prisma.person.deleteMany();
    await prisma.detentionCenter.deleteMany();
    await prisma.town.deleteMany();
    await prisma.user.deleteMany();
    await prisma.role.deleteMany();
    await prisma.theme.deleteMany();
    await prisma.layout.deleteMany();
    await prisma.systemConfig.deleteMany();

    console.log('Database cleaned.');
  } catch (error) {
    console.log('Database appears to be empty, skipping cleanup');
  }
}

async function main() {
  console.log('Starting database seeding...');

  // Clean existing data
  await cleanDatabase();
  
  // Store placeholder images in database
  await storePlaceholderImages();

  // Create roles first
  console.log('Creating roles...');
  for (const role of roles) {
    await prisma.role.create({ data: role });
  }

  // Create themes
  console.log('Creating themes...');
  for (const theme of themes) {
    await prisma.theme.create({ data: theme });
  }

  // Create layouts
  console.log('Creating layouts...');
  for (const layout of layouts) {
    await prisma.layout.create({ data: layout });
  }

  // Create detention centers with images
  console.log('Creating detention centers...');
  for (let i = 0; i < detentionCenters.length; i++) {
    const center = detentionCenters[i];
    
    // Use placeholder images for detention centers
    // In production, use actual facility images
    const imageNum = (i % 10) + 1;
    const imagePath = join(process.cwd(), 'public', 'images', `placeholder-person-${imageNum}.jpg`);
    const imageBuffer = await readFile(imagePath);
    
    const { fullImageId, thumbnailImageId } = await processAndStoreImage(
      imageBuffer,
      'image/jpeg'
    );
    
    await prisma.detentionCenter.create({ 
      data: {
        ...center,
        facilityImageId: fullImageId,
        thumbnailImageId: thumbnailImageId,
      }
    });
  }

  // Create towns
  console.log('Creating towns...');
  for (const town of towns) {
    await prisma.town.create({
      data: {
        ...town,
        defaultLayoutId: layouts[Math.floor(Math.random() * layouts.length)].id,
        defaultThemeId: themes[Math.floor(Math.random() * themes.length)].id,
      },
    });
  }

  // Generate and create persons
  console.log('Generating and creating persons...');
  const persons = generatePersons();
  for (const person of persons) {
    await prisma.person.create({ data: person });
  }
  console.log(`Created ${persons.length} persons.`);

  // Generate and create comments
  console.log('Generating and creating comments...');
  const comments = generateComments(persons);
  for (const comment of comments) {
    await prisma.comment.create({ data: comment });
  }
  console.log(`Created ${comments.length} comments.`);

  // Create admin user
  console.log('Creating admin user...');
  const hashedPassword = await bcrypt.hash('admin123', 12);
  const adminUser = await prisma.user.create({
    data: {
      id: 'user_admin',
      username: 'admin',
      email: 'admin@bringmehome.com',
      password: hashedPassword,
      firstName: 'System',
      lastName: 'Administrator',
      isActive: true,
    },
  });

  // Assign site-admin role to admin user
  await prisma.userRole.create({
    data: {
      userId: adminUser.id,
      roleId: 'role_1',
    },
  });

  // Create demo users
  console.log('Creating demo users...');
  const demoUsers = [
    {
      username: 'john.doe',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@demo.com',
    },
    {
      username: 'jane.smith',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@demo.com',
    },
    {
      username: 'mike.jones',
      firstName: 'Mike',
      lastName: 'Jones',
      email: 'mike@demo.com',
    },
  ];

  for (const demoUser of demoUsers) {
    const hashedDemoPassword = await bcrypt.hash('demo123', 12);
    const user = await prisma.user.create({
      data: {
        ...demoUser,
        password: hashedDemoPassword,
        isActive: true,
      },
    });

    // Assign viewer role
    await prisma.userRole.create({
      data: {
        userId: user.id,
        roleId: 'role_4',
      },
    });
  }

  // Create town admin users
  console.log('Creating town admin users...');
  for (let i = 0; i < towns.length; i++) {
    const town = towns[i];
    const hashedPassword = await bcrypt.hash(`town${i + 1}123`, 12);
    const townAdmin = await prisma.user.create({
      data: {
        id: `user_town_admin_${i + 1}`,
        username: `town_admin_${i + 1}`,
        email: `town${i + 1}@bringmehome.com`,
        password: hashedPassword,
        firstName: `${town.name}`,
        lastName: 'Admin',
        isActive: true,
      },
    });

    // Assign town-admin role
    await prisma.userRole.create({
      data: {
        userId: townAdmin.id,
        roleId: 'role_2',
      },
    });

    // Grant access to their town
    await prisma.townAccess.create({
      data: {
        userId: townAdmin.id,
        townId: town.id,
        accessLevel: 'admin',
      },
    });
  }

  // Create system config
  console.log('Creating system configuration...');
  const systemConfigs = [
    {
      key: 'site_title',
      value: 'Bring Me Home',
      description: 'Main site title',
      dataType: 'string',
    },
    {
      key: 'default_page_size',
      value: '100',
      description: 'Default number of items per page in admin grids',
      dataType: 'number',
    },
    {
      key: 'max_file_size_mb',
      value: '5',
      description: 'Maximum file upload size in MB',
      dataType: 'number',
    },
    {
      key: 'enable_public_comments',
      value: 'true',
      description: 'Allow public to submit comments',
      dataType: 'boolean',
    },
    {
      key: 'require_comment_approval',
      value: 'true',
      description: 'Require admin approval for new comments',
      dataType: 'boolean',
    },
    {
      key: 'days_to_archive',
      value: '365',
      description: 'Days before a case is automatically archived',
      dataType: 'number',
    },
  ];

  for (const config of systemConfigs) {
    await prisma.systemConfig.create({ data: config });
  }

  // Count detained persons
  const detainedCount = persons.filter(p => p.detentionCenterId).length;

  console.log('Database seeding completed successfully!');
  console.log('\nCreated:');
  console.log(`- ${towns.length} towns`);
  console.log(`- ${persons.length} persons (${detainedCount} detained)`);
  console.log(`- ${comments.length} comments`);
  console.log(`- ${roles.length} roles`);
  console.log(`- ${themes.length} themes`);
  console.log(`- ${layouts.length} layouts`);
  console.log(`- ${detentionCenters.length} detention centers`);
  console.log(`- ${demoUsers.length + towns.length + 1} users`);
  console.log('\nAdmin login: admin / admin123');
  console.log(
    'Demo users: john.doe, jane.smith, mike.jones (password: demo123)'
  );
  console.log(
    'Town admins: town_admin_1 through town_admin_5 (password: town[n]123)'
  );
}

main()
  .catch(e => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
