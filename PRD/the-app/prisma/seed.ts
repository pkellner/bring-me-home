import { PrismaClient, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { processAndStoreImage } from '../src/lib/image-storage';
import { createTownSlug, createPersonSlug } from '../src/lib/slug-utils';

const { Decimal } = Prisma;

const prisma = new PrismaClient();

// Store placeholder image IDs
const placeholderImageIds: Map<
  number,
  { fullImageId: string; thumbnailImageId: string }
> = new Map();

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
    const imagePath = join(
      process.cwd(),
      'public',
      'images',
      `placeholder-person-${i}.jpg`
    );
    const imageBuffer = await readFile(imagePath);

    const { fullImageId, thumbnailImageId } =
      await processAndStoreImage(imageBuffer);

    placeholderImageIds.set(i, { fullImageId, thumbnailImageId });
    console.log(`Stored placeholder image ${i}`);
  }
}

// Store created IDs for relationships
const createdIds = {
  detentionCenters: new Map<string, string>(),
  towns: new Map<string, string>(),
  persons: new Map<string, string>(),
  roles: new Map<string, string>(),
  themes: new Map<string, string>(),
  layouts: new Map<string, string>(),
  users: new Map<string, string>(),
};

// Seed data for Southern California detention centers
const detentionCenters = [
  {
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
    name: 'Borrego Springs',
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
    name: 'Mendocino',
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
    name: 'Julian',
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
    name: 'Cambria',
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
    name: 'Ferndale',
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

  for (let townIndex = 0; townIndex < towns.length; townIndex++) {
    const town = towns[townIndex];
    const townName = town.name;
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
      const detentionCenterName = isDetained
        ? randomElement(detentionCenters).name
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
        emailAddress: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${persons.length + 1}@email.com`,
        story: generateStory(
          firstName,
          lastName,
          town.name,
          detentionDate || lastSeenDate
        ),
        detentionStory: isDetained
          ? generateDetentionStory(firstName, town.name)
          : null,
        familyMessage: isDetained ? generateFamilyMessage(firstName) : null,
        lastSeenDate,
        lastSeenLocation: `${randomElement([
          'Downtown',
          'Market Street',
          'City Park',
          'Main Street',
          'Shopping Center',
        ])}, ${town.name}`,
        townName,
        primaryPicture: `/api/images/${placeholderImageIds.get(
          ((persons.length + 1) % 10) + 1
        )?.fullImageId}`,
        secondaryPic1:
          Math.random() > 0.5
            ? `/api/images/${placeholderImageIds.get(((persons.length + 2) % 10) + 1)
                ?.fullImageId}`
            : null,
        secondaryPic2:
          Math.random() > 0.7
            ? `/api/images/${placeholderImageIds.get(((persons.length + 3) % 10) + 1)
                ?.fullImageId}`
            : null,
        status: 'detained', // All persons in this system are detained
        // Detention information
        detentionCenterName,
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
    }
  }
  
  // Add Joe Plumber specifically to Borrego Springs
  const joePlumber = {
    firstName: 'Joe',
    middleName: null,
    lastName: 'Plumber',
    alienIdNumber: 'A123456789',
    dateOfBirth: new Date(1975, 5, 15), // June 15, 1975
    placeOfBirth: 'Phoenix, Arizona, USA',
    height: "5'10\"",
    weight: '180 lbs',
    eyeColor: 'Brown',
    hairColor: 'Black',
    lastKnownAddress: '123 Desert Vista Rd, Borrego Springs, CA 92004',
    phoneNumber: '760-555-0123',
    emailAddress: 'joe.plumber@email.com',
    story: 'Joe Plumber has been a beloved member of the Borrego Springs community for over 20 years. As a skilled plumber, he helped build and maintain many homes and businesses in our town. Joe is known for his generous spirit, often providing free services to elderly residents and those in need. His detention has left many without reliable plumbing services and has deeply affected our community.',
    detentionStory: 'Joe was detained during a routine traffic stop despite having no criminal record. He has been held at Otay Mesa Detention Center for the past 6 months, awaiting his immigration hearing. His family and the community are working tirelessly to bring him home.',
    familyMessage: 'My husband Joe is the backbone of our family and our community. Our three children miss their father terribly, and our plumbing business is struggling without him. We need Joe home where he belongs, helping our neighbors and raising our children.',
    lastSeenDate: new Date(2024, 0, 15), // January 15, 2024
    lastSeenLocation: 'Downtown Borrego Springs',
    townName: 'Borrego Springs',
    primaryPicture: `/api/images/${placeholderImageIds.get(1)?.fullImageId}`,
    secondaryPic1: `/api/images/${placeholderImageIds.get(2)?.fullImageId}`,
    secondaryPic2: `/api/images/${placeholderImageIds.get(3)?.fullImageId}`,
    status: 'detained',
    // Detention information
    detentionCenterName: 'Otay Mesa Detention Center',
    detentionDate: new Date(2024, 0, 15), // January 15, 2024
    releaseDate: null,
    detentionStatus: 'detained',
    caseNumber: 'ICE-2024-00123',
    bondAmount: new Decimal(15000),
    bondStatus: 'pending',
    // Legal representation
    legalRepFirm: 'Immigration Law Center',
    legalRepName: 'Maria Rodriguez',
    legalRepPhone: '619-555-0200',
    legalRepEmail: 'mrodriguez@immigrationlawcenter.com',
    nextCourtDate: new Date(2024, 6, 15), // July 15, 2024
    courtLocation: 'San Diego Immigration Court',
    // Additional information
    isActive: true,
    lastHeardFromDate: new Date(2024, 3, 1),
    countryOfOrigin: 'Mexico',
  };
  
  persons.push(joePlumber);

  return persons;
};

// Generate story content for detained person
function generateStory(
  firstName: string,
  lastName: string,
  townName: string,
  detentionDate: Date
): string {
  const professions = [
    'teacher',
    'construction worker',
    'farmer',
    'store owner',
    'mechanic',
    'nurse',
    'chef',
    'restaurant worker',
    'landscaper',
    'house cleaner',
  ];
  const familyDetails = [
    'parent of two young children',
    'sole provider for their family',
    'caring for elderly parents',
    'parent of three US citizen children',
    'supporting extended family',
  ];

  const profession = randomElement(professions);
  const family = randomElement(familyDetails);
  const years = Math.floor(Math.random() * 20) + 5;

  return (
    `${firstName} ${lastName} has lived in ${townName} for ${years} years, working as a ${profession} and ${family}. ` +
    `${firstName} has been an active member of the community, contributing to local churches, schools, and neighborhood events. ` +
    `They have no criminal record and have always been known as a hardworking, honest person who came to this country seeking a better life for their family. ` +
    `${firstName} was detained by ICE on ${detentionDate.toLocaleDateString()} and is currently being held pending immigration proceedings.`
  );
}

// Generate detention circumstances
function generateDetentionStory(firstName: string, townName: string): string {
  const locations = [
    'their workplace',
    'home during an early morning raid',
    'dropping children at school',
    'local courthouse for a routine check-in',
    'traffic stop',
    'workplace raid',
  ];
  const detentionReasons = [
    'during a routine ICE enforcement action',
    'following an expired visa',
    'after missing an immigration court date they were never notified about',
    'despite having pending asylum application',
    'while their DACA renewal was being processed',
  ];

  const location = randomElement(locations);
  const reason = randomElement(detentionReasons);

  return (
    `${firstName} was detained at ${location} in ${townName} ${reason}. ` +
    `The detention has caused significant hardship for their family, including potential loss of housing and income. ` +
    `Community members have rallied to support the family during this difficult time, providing meals, childcare, and financial assistance. ` +
    `We urgently need your support to help bring ${firstName} home to their family.`
  );
}

// Generate family message
function generateFamilyMessage(firstName: string): string {
  const messages = [
    `We are devastated by ${firstName}'s detention. Our children cry every night asking when their parent will come home. We need ${firstName} back with us - they are the heart of our family and have never done anything wrong. Please help us by showing your support.`,
    `${firstName} is a loving parent and hard worker who has always provided for our family. This detention has torn our family apart. We are struggling without them, both emotionally and financially. Your support means everything to us.`,
    `Our family is incomplete without ${firstName}. They have always been there for us and for our community. We are asking for your help to bring them home where they belong. Every message of support helps our case.`,
    `${firstName} came to this country seeking safety and a better life for our family. They have worked hard, paid taxes, and contributed to our community. Please stand with us in this difficult time.`,
  ];

  return randomElement(messages);
}

// Type definitions for seed data
interface SeedPerson {
  firstName: string;
  lastName: string;
  townName: string;
  detentionCenterName?: string | null;
  detentionDate?: Date | null;
  lastSeenDate?: Date | null;
  story?: string | null;
  detentionStory?: string | null;
  familyMessage?: string | null;
}

// Generate supporters for detained persons
const generateSupporters = (persons: SeedPerson[]) => {
  const relationships = [
    'Friend',
    'Coworker',
    'Church member',
    'Neighbor',
    'Community member',
    'Former student',
    'Customer',
    'Fellow parent',
  ];

  const supportMessages = [
    '{firstName} is a pillar of our community. I stand with their family during this difficult time.',
    'I have known {firstName} for years. They are honest, hardworking, and deserve to be with their family.',
    "{firstName} helped me when I needed it most. Now it's our turn to help them.",
    'Our children go to school together. {firstName} is a wonderful parent who should be home with their family.',
    '{firstName} has always been there for our community. We need to bring them home.',
    'I worked alongside {firstName} for many years. They are dedicated and trustworthy.',
    '{firstName} is part of our church family. We pray for their swift return.',
    "As a business owner, I can attest to {firstName}'s character. They deserve to be free.",
  ];

  const supporters = [];
  let supporterId = 1;

  for (const person of persons) {
    // Only detained persons get supporters
    if (!person.detentionCenterName) continue;

    // Generate 10-30 supporters per detained person
    const supportersPerPerson = Math.floor(Math.random() * 21) + 10;
    for (let i = 0; i < supportersPerPerson; i++) {
      const firstName = randomElement([
        'John',
        'Maria',
        'Robert',
        'Linda',
        'James',
        'Patricia',
        'Michael',
        'Jennifer',
        'David',
        'Elizabeth',
        'William',
        'Susan',
        'Richard',
        'Jessica',
        'Joseph',
        'Sarah',
        'Thomas',
        'Karen',
      ]);
      const lastName = randomElement([
        'Smith',
        'Johnson',
        'Williams',
        'Brown',
        'Jones',
        'Garcia',
        'Miller',
        'Davis',
        'Rodriguez',
        'Martinez',
        'Hernandez',
        'Lopez',
      ]);

      const messageTemplate = randomElement(supportMessages);
      const supportMessage = messageTemplate.replace(
        '{firstName}',
        person.firstName
      );

      supporters.push({
        firstName,
        lastName,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${supporters.length + 1}@email.com`,
        phone:
          Math.random() > 0.5
            ? `555-${String(Math.floor(Math.random() * 10000)).padStart(
                4,
                '0'
              )}`
            : null,
        country: 'USA',
        relationship: randomElement(relationships),
        displayName: `${firstName} ${lastName.charAt(0)}.`,
        isPublic: Math.random() > 0.2, // 80% public
        supportMessage,
        shareEmail: Math.random() > 0.7, // 30% share email
        sharePhone: Math.random() > 0.9, // 10% share phone
        isVerified: Math.random() > 0.5, // 50% verified
        verifiedAt:
          Math.random() > 0.5 && person.detentionDate
            ? randomDate(person.detentionDate, new Date())
            : null,
        personFirstName: person.firstName,
        personLastName: person.lastName,
        createdAt: randomDate(
          person.detentionDate ||
            person.lastSeenDate ||
            new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          new Date()
        ),
      });
    }
  }

  return supporters;
};

// Generate comments (updates and messages)
const generateComments = (persons: SeedPerson[]) => {
  const commentTypes = ['general', 'update', 'legal', 'family'];
  const visibilities = ['public', 'supporters', 'family'];

  const updateTemplates = [
    "Update: {firstName}'s next court date has been scheduled for next month. Please keep them in your prayers.",
    'The family has asked us to share that {firstName} is doing okay but misses everyone greatly.',
    'Legal update: The attorney is working on filing a motion for bond reduction.',
    'Thank you to everyone who has shown support. The family is overwhelmed by your kindness.',
    "Urgent: We need more letters of support for {firstName}'s upcoming hearing.",
    'The children made drawings for {firstName}. They ask about their parent every day.',
  ];

  const comments = [];
  let commentId = 1;

  for (const person of persons) {
    // Only detained persons get comments
    if (!person.detentionCenterName) continue;

    // Generate 3-8 comments per person
    const commentsPerPerson = Math.floor(Math.random() * 6) + 3;
    for (let i = 0; i < commentsPerPerson; i++) {
      const type = randomElement(commentTypes);
      let content;

      if (type === 'update' || type === 'legal') {
        const template = randomElement(updateTemplates);
        content = template.replace('{firstName}', person.firstName);
      } else if (type === 'family') {
        content = `Message from the family: Thank you all for your continued support. Every message helps strengthen our case.`;
      } else {
        content = `Keeping ${person.firstName} and their family in our thoughts and prayers.`;
      }

      comments.push({
        content,
        type,
        visibility: randomElement(visibilities),
        personFirstName: person.firstName,
        personLastName: person.lastName,
        isApproved: Math.random() > 0.1, // 90% approved
        createdAt: randomDate(
          person.detentionDate ||
            person.lastSeenDate ||
            new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          new Date()
        ),
      });
    }
  }

  return comments;
};

// Seed data for roles
const roles = [
  {
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
    name: 'town-admin',
    description: 'Administrator for specific towns',
    permissions: JSON.stringify({
      towns: ['read', 'update'],
      persons: ['create', 'read', 'update', 'delete'],
      comments: ['read', 'update', 'moderate'],
    }),
  },
  {
    name: 'person-admin',
    description: 'Administrator for specific persons',
    permissions: JSON.stringify({
      persons: ['read', 'update'],
      comments: ['read', 'update', 'moderate'],
    }),
  },
  {
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
    name: 'Standard Profile',
    description: 'Traditional layout with image on left, info on right',
    template: JSON.stringify({
      type: 'grid',
      columns: 2,
      sections: ['image', 'info', 'story', 'comments'],
    }),
  },
  {
    name: 'Compact Card',
    description: 'Compact layout suitable for mobile viewing',
    template: JSON.stringify({
      type: 'stack',
      sections: ['image', 'info', 'story', 'comments'],
    }),
  },
  {
    name: 'Hero Image',
    description: 'Large hero image at top',
    template: JSON.stringify({
      type: 'hero',
      sections: ['hero-image', 'info', 'story', 'comments'],
    }),
  },
  {
    name: 'Sidebar Left',
    description: 'Information sidebar on the left',
    template: JSON.stringify({
      type: 'sidebar-left',
      sections: ['sidebar-info', 'main-content', 'comments'],
    }),
  },
  {
    name: 'Sidebar Right',
    description: 'Information sidebar on the right',
    template: JSON.stringify({
      type: 'sidebar-right',
      sections: ['main-content', 'sidebar-info', 'comments'],
    }),
  },
  {
    
    name: 'Timeline',
    description: 'Timeline-based layout',
    template: JSON.stringify({
      type: 'timeline',
      sections: ['header', 'timeline-events', 'story', 'comments'],
    }),
  },
  {
    
    name: 'Magazine',
    description: 'Magazine-style layout',
    template: JSON.stringify({
      type: 'magazine',
      columns: 3,
      sections: ['featured-image', 'article-content', 'sidebar', 'comments'],
    }),
  },
  {
    
    name: 'Minimal',
    description: 'Minimal clean layout',
    template: JSON.stringify({
      type: 'minimal',
      sections: ['basic-info', 'story', 'comments'],
    }),
  },
  {
    
    name: 'Gallery Focus',
    description: 'Emphasizes image gallery',
    template: JSON.stringify({
      type: 'gallery',
      sections: ['gallery-grid', 'info', 'story', 'comments'],
    }),
  },
  {
    
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
    await prisma.supporter.deleteMany();
    await prisma.story.deleteMany();
    await prisma.familyPrivacySettings.deleteMany();
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
    await prisma.imageStorage.deleteMany();

    console.log('Database cleaned.');
  } catch (error) {
    console.log('Database appears to be empty, skipping cleanup');
  }
}

// Create comprehensive stories for all persons with special focus on Borrego Springs
async function createStoriesForPersons(persons: SeedPerson[]) {
  const borregoSpringsPersons = persons.filter(p => p.townName === 'Borrego Springs');
  const otherPersons = persons.filter(p => p.townName !== 'Borrego Springs');

  // Create detailed stories for Borrego Springs persons
  for (const person of borregoSpringsPersons) {
    const personId = createdIds.persons.get(`${person.firstName}_${person.lastName}`)!;
    await createDetailedStoriesForPerson(person, personId);
  }

  // Create basic stories for other persons (migrate from old fields)
  for (const person of otherPersons) {
    const personId = createdIds.persons.get(`${person.firstName}_${person.lastName}`)!;
    await createBasicStoriesForPerson(person, personId);
  }

  const totalStories = await prisma.story.count();
  console.log(`Created ${totalStories} stories in multiple languages.`);
}

// Create detailed, comprehensive stories for Borrego Springs persons
async function createDetailedStoriesForPerson(person: SeedPerson, personId: string) {
  const isDetained = !!person.detentionCenterName;

  // Personal Story - English
  await prisma.story.create({
    data: {
      personId,
      language: 'en',
      storyType: 'personal',
      content: generateDetailedPersonalStory(person, 'en'),
      isActive: true,
    },
  });

  // Personal Story - Spanish
  await prisma.story.create({
    data: {
      personId,
      language: 'es',
      storyType: 'personal',
      content: generateDetailedPersonalStory(person, 'es'),
      isActive: true,
    },
  });

  if (isDetained) {
    // Detention Story - English
    await prisma.story.create({
      data: {
        personId,
        language: 'en',
        storyType: 'detention',
        content: generateDetailedDetentionStory(person, 'en'),
        isActive: true,
      },
    });

    // Detention Story - Spanish
    await prisma.story.create({
      data: {
        personId,
        language: 'es',
        storyType: 'detention',
        content: generateDetailedDetentionStory(person, 'es'),
        isActive: true,
      },
    });

    // Family Story - English
    await prisma.story.create({
      data: {
        personId,
        language: 'en',
        storyType: 'family',
        content: generateDetailedFamilyStory(person, 'en'),
        isActive: true,
      },
    });

    // Family Story - Spanish
    await prisma.story.create({
      data: {
        personId,
        language: 'es',
        storyType: 'family',
        content: generateDetailedFamilyStory(person, 'es'),
        isActive: true,
      },
    });
  }
}

// Create basic stories by migrating from old fields
async function createBasicStoriesForPerson(person: SeedPerson, personId: string) {
  // Migrate personal story
  if (person.story) {
    await prisma.story.create({
      data: {
        personId,
        language: 'en',
        storyType: 'personal',
        content: person.story,
        isActive: true,
      },
    });
  }

  // Migrate detention story
  if (person.detentionStory) {
    await prisma.story.create({
      data: {
        personId,
        language: 'en',
        storyType: 'detention',
        content: person.detentionStory,
        isActive: true,
      },
    });
  }

  // Migrate family message
  if (person.familyMessage) {
    await prisma.story.create({
      data: {
        personId,
        language: 'en',
        storyType: 'family',
        content: person.familyMessage,
        isActive: true,
      },
    });
  }
}

// Generate detailed personal stories for Borrego Springs
function generateDetailedPersonalStory(
  person: SeedPerson,
  language: string
): string {
  const firstName = person.firstName;
  const detentionDate =
    person.detentionDate || person.lastSeenDate || new Date();

  if (language === 'es') {
    const stories = [
      `${firstName} llegó a Borrego Springs hace 15 años con la esperanza de construir una vida mejor para su familia. Trabajando en los campos de dátiles y en la construcción, ${firstName} se convirtió en un miembro valioso de nuestra comunidad.

Como padre de tres hijos nacidos aquí, ${firstName} siempre priorizó la educación de sus hijos. Cada mañana, antes del amanecer, preparaba el desayuno para su familia antes de dirigirse al trabajo. Los fines de semana, entrenaba al equipo de fútbol juvenil local y participaba activamente en la iglesia San Juan Bautista.

${firstName} es conocido en Borrego Springs por su generosidad. Durante la pandemia, organizó entregas de alimentos para familias necesitadas y ayudó a vecinos ancianos con sus compras. Su pequeño negocio de jardinería empleaba a otros miembros de la comunidad y mantenía hermosos los espacios públicos de nuestro pueblo.

La detención de ${firstName} el ${detentionDate.toLocaleDateString(
        'es-ES'
      )} ha dejado un vacío en nuestra comunidad. Sus hijos preguntan cada noche cuándo volverá papá a casa. Su esposa lucha por mantener a la familia unida mientras trabaja dos empleos. Necesitamos que ${firstName} regrese a casa donde pertenece.`,

      `Durante más de una década, ${firstName} ha sido parte integral del tejido social de Borrego Springs. Llegó como un joven con sueños y construyó una vida honorable trabajando en los huertos de cítricos que son el corazón económico de nuestra región.

${firstName} no es solo un trabajador; es un líder comunitario. Fundó el grupo de apoyo para nuevos inmigrantes, ayudándoles a integrarse y encontrar trabajo. Su casa siempre estaba abierta para quienes necesitaban un lugar donde quedarse o una comida caliente.

Como voluntario en la escuela primaria de Borrego Springs, ${firstName} enseñaba inglés a otros padres para que pudieran ayudar a sus hijos con las tareas. También organizaba eventos culturales que unían a toda la comunidad, celebrando nuestras tradiciones mientras abrazábamos nuestro hogar estadounidense.

Su detención ha impactado profundamente a docenas de familias que dependían de su liderazgo y apoyo. Los maestros de sus hijos han notado el cambio en su rendimiento académico. El equipo de fútbol que entrenaba ha perdido no solo un entrenador, sino un mentor que enseñaba valores más allá del deporte.`,
    ];

    return randomElement(stories);
  } else {
    const stories = [
      `${firstName} came to Borrego Springs 15 years ago with hopes of building a better life for their family. Working in the date palm fields and construction, ${firstName} became a valued member of our community.

As a parent of three US-born children, ${firstName} always prioritized their education. Every morning before dawn, they would prepare breakfast for the family before heading to work. On weekends, ${firstName} coached the local youth soccer team and was active in St. John the Baptist Church.

${firstName} is known throughout Borrego Springs for their generosity. During the pandemic, they organized food deliveries for families in need and helped elderly neighbors with their shopping. Their small landscaping business employed other community members and kept our town's public spaces beautiful.

${firstName}'s detention on ${detentionDate.toLocaleDateString(
        'en-US'
      )} has left a void in our community. Their children ask every night when daddy will come home. Their spouse struggles to keep the family together while working two jobs. We need ${firstName} back home where they belong.`,

      `For over a decade, ${firstName} has been an integral part of Borrego Springs' social fabric. They arrived as a young person with dreams and built an honorable life working in the citrus groves that are the economic heart of our region.

${firstName} is not just a worker; they're a community leader. They founded the support group for new immigrants, helping them integrate and find work. Their home was always open to those who needed a place to stay or a hot meal.

As a volunteer at Borrego Springs Elementary School, ${firstName} taught English to other parents so they could help their children with homework. They also organized cultural events that brought the whole community together, celebrating our traditions while embracing our American home.

Their detention has deeply impacted dozens of families who depended on their leadership and support. Their children's teachers have noticed the change in academic performance. The soccer team they coached has lost not just a coach, but a mentor who taught values beyond sports.`,
    ];

    return randomElement(stories);
  }
}

// Generate detailed detention stories for Borrego Springs
function generateDetailedDetentionStory(
  person: SeedPerson,
  language: string
): string {
  const firstName = person.firstName;
  const detentionCenter = detentionCenters.find(
    dc => dc.name === person.detentionCenterName
  );
  const detentionDate = person.detentionDate || new Date();

  if (language === 'es') {
    const stories = [
      `La mañana del ${detentionDate.toLocaleDateString(
        'es-ES'
      )}, ${firstName} fue detenido mientras llevaba a sus hijos a la escuela. Los agentes de ICE esperaban afuera de su casa, traumatizando a los niños que vieron cómo se llevaban a su padre.

${firstName} ahora está detenido en ${
        detentionCenter?.name || 'un centro de detención'
      }, a más de 200 millas de su familia. Las visitas son casi imposibles debido a la distancia y los horarios restrictivos. Solo puede hablar con sus hijos por teléfono durante 10 minutos al día, si puede pagar las costosas tarifas telefónicas.

A pesar de no tener antecedentes penales y tener fuertes lazos comunitarios, se le ha negado la libertad bajo fianza. Su caso de asilo, basado en la persecución que sufrió en su país de origen, está pendiente desde hace años. Mientras tanto, su familia lucha por sobrevivir sin su principal sostén económico.

La comunidad de Borrego Springs se ha unido para apoyar a la familia de ${firstName}, pero necesitamos su ayuda para traerlo de vuelta a casa. Cada carta de apoyo, cada llamada a los funcionarios electos, marca la diferencia en los procedimientos de inmigración.`,

      `${firstName} fue arrestado durante una redada en su lugar de trabajo, una granja de dátiles donde había trabajado fielmente durante 12 años. Sin previo aviso, los agentes de ICE rodearon el campo y detuvieron a varios trabajadores, incluido ${firstName}.

Actualmente detenido en ${
        detentionCenter?.name || 'el centro de detención'
      }, ${firstName} enfrenta condiciones inhumanas. La comida es escasa y de mala calidad, la atención médica es inadecuada, y el aislamiento de su familia está afectando gravemente su salud mental.

Su empleador ha escrito cartas de apoyo, destacando que ${firstName} era su trabajador más confiable y responsable. Los vecinos han iniciado una petición con cientos de firmas pidiendo su liberación. La iglesia local realiza vigilias de oración semanales por su regreso seguro.

El caso de ${firstName} ilustra la crueldad del sistema actual. Una persona trabajadora, sin antecedentes penales, que paga impuestos y contribuye a la comunidad, no debería ser separada de su familia. Necesitamos reformas migratorias justas y humanas ahora.`,
    ];

    return randomElement(stories);
  } else {
    const stories = [
      `On the morning of ${detentionDate.toLocaleDateString(
        'en-US'
      )}, ${firstName} was detained while taking their children to school. ICE agents waited outside their home, traumatizing the children who watched their parent being taken away.

${firstName} is now held at ${
        detentionCenter?.name || 'a detention center'
      }, over 200 miles from their family. Visits are nearly impossible due to the distance and restrictive hours. They can only speak to their children by phone for 10 minutes a day, if they can afford the expensive phone charges.

Despite having no criminal record and strong community ties, they have been denied bond. Their asylum case, based on persecution suffered in their home country, has been pending for years. Meanwhile, their family struggles to survive without their primary breadwinner.

The Borrego Springs community has rallied to support ${firstName}'s family, but we need your help to bring them home. Every letter of support, every call to elected officials, makes a difference in immigration proceedings.`,

      `${firstName} was arrested during a workplace raid at a date farm where they had worked faithfully for 12 years. Without warning, ICE agents surrounded the field and detained several workers, including ${firstName}.

Now detained at ${
        detentionCenter?.name || 'the detention center'
      }, ${firstName} faces inhumane conditions. Food is scarce and poor quality, medical care is inadequate, and isolation from family is severely affecting their mental health.

Their employer has written letters of support, noting that ${firstName} was their most reliable and responsible worker. Neighbors have started a petition with hundreds of signatures calling for their release. The local church holds weekly prayer vigils for their safe return.

${firstName}'s case illustrates the cruelty of the current system. A hardworking person with no criminal record, who pays taxes and contributes to the community, should not be separated from their family. We need fair and humane immigration reform now.`,
    ];

    return randomElement(stories);
  }
}

// Generate detailed family stories for Borrego Springs
function generateDetailedFamilyStory(
  person: SeedPerson,
  language: string
): string {
  const firstName = person.firstName;
  const spouseName =
    Math.random() > 0.5 ? 'Maria' : 'Carlos';

  if (language === 'es') {
    const stories = [
      `Mi nombre es ${spouseName}, esposa de ${firstName}. Escribo esto con lágrimas en los ojos y un peso insoportable en mi corazón.

Nuestros tres hijos - Miguel de 12 años, Sofia de 9, y el pequeño Diego de 5 - preguntan por su papá todos los días. Diego dibuja tarjetas para ${firstName} que no podemos enviar. Sofia llora en las noches. Miguel trata de ser fuerte, pero veo cómo sus calificaciones han bajado desde que se llevaron a su padre.

${firstName} no es solo mi esposo; es el pilar de nuestra familia. Trabajaba duro para darnos una vida digna. Los domingos cocinaba para toda la familia, y las tardes ayudaba a los niños con sus tareas. Ahora trabajo dos empleos solo para pagar el alquiler, y apenas veo a mis hijos.

Por favor, ayúdennos. ${firstName} es un buen hombre que solo quería darle a su familia una vida mejor. No somos números o estadísticas - somos una familia que está siendo destruida. Cada día sin ${firstName} es una eternidad. Los niños necesitan a su padre, y yo necesito a mi esposo. Por favor, tráiganlo a casa.`,

      `Soy ${spouseName}, y ${firstName} es el amor de mi vida. Nos conocimos hace 16 años en Borrego Springs, construimos una vida juntos, y formamos una hermosa familia.

La detención de ${firstName} ha destrozado nuestro mundo. Nuestro hijo mayor tuvo que dejar el equipo de fútbol porque no puedo llevarlo a las prácticas mientras trabajo. Nuestra hija del medio tiene pesadillas constantes. El más pequeño apenas recuerda a su papá y eso me rompe el corazón.

Económicamente, estamos al borde del colapso. ${firstName} no solo mantenía a nuestra familia, sino que también enviaba dinero a sus padres ancianos. Ahora, a pesar de trabajar día y noche, apenas podemos sobrevivir. Los vecinos nos han ayudado, pero no es sostenible.

${firstName} es inocente de cualquier crimen. Su único "delito" fue buscar una vida mejor para su familia. Es un padre amoroso, un esposo dedicado, y un miembro valioso de nuestra comunidad. Por favor, ayúdennos a reunir a nuestra familia. Los niños necesitan a su papá, y Borrego Springs necesita a ${firstName}.`,
    ];

    return randomElement(stories);
  } else {
    const stories = [
      `My name is ${spouseName}, ${firstName}'s wife. I write this with tears in my eyes and an unbearable weight on my heart.

Our three children - Miguel, 12, Sofia, 9, and little Diego, 5 - ask for their daddy every day. Diego draws cards for ${firstName} that we can't send. Sofia cries at night. Miguel tries to be strong, but I see how his grades have dropped since they took his father away.

${firstName} is not just my husband; they're the pillar of our family. They worked hard to give us a dignified life. On Sundays, they cooked for the whole family, and in the evenings helped the children with homework. Now I work two jobs just to pay rent, and barely see my children.

Please help us. ${firstName} is a good person who only wanted to give their family a better life. We're not numbers or statistics - we're a family being destroyed. Every day without ${firstName} is an eternity. The children need their parent, and I need my spouse. Please bring them home.`,

      `I'm ${spouseName}, and ${firstName} is the love of my life. We met 16 years ago in Borrego Springs, built a life together, and created a beautiful family.

${firstName}'s detention has shattered our world. Our oldest had to quit the soccer team because I can't drive him to practice while working. Our middle child has constant nightmares. The youngest barely remembers their daddy, and that breaks my heart.

Financially, we're on the brink of collapse. ${firstName} not only supported our family but also sent money to their elderly parents. Now, despite working day and night, we can barely survive. Neighbors have helped, but it's not sustainable.

${firstName} is innocent of any crime. Their only "offense" was seeking a better life for their family. They're a loving parent, dedicated spouse, and valuable community member. Please help us reunite our family. The children need their parent, and Borrego Springs needs ${firstName}.`,
    ];

    return randomElement(stories);
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
    const created = await prisma.role.create({ data: role });
    createdIds.roles.set(role.name, created.id);
  }

  // Create themes
  console.log('Creating themes...');
  for (const theme of themes) {
    const created = await prisma.theme.create({ data: theme });
    createdIds.themes.set(theme.name, created.id);
  }

  // Create layouts
  console.log('Creating layouts...');
  for (const layout of layouts) {
    const created = await prisma.layout.create({ data: layout });
    createdIds.layouts.set(layout.name, created.id);
  }

  // Create detention centers with images
  console.log('Creating detention centers...');
  for (let i = 0; i < detentionCenters.length; i++) {
    const center = detentionCenters[i];

    // Use placeholder images for detention centers
    // In production, use actual facility images
    const imageNum = (i % 10) + 1;
    const imagePath = join(
      process.cwd(),
      'public',
      'images',
      `placeholder-person-${imageNum}.jpg`
    );
    const imageBuffer = await readFile(imagePath);

    const { fullImageId, thumbnailImageId } =
      await processAndStoreImage(imageBuffer);

    const created = await prisma.detentionCenter.create({
      data: {
        ...center,
        facilityImageId: fullImageId,
        thumbnailImageId: thumbnailImageId,
      },
    });
    createdIds.detentionCenters.set(center.name, created.id);
  }

  // Create towns
  console.log('Creating towns...');
  const layoutNames = Array.from(createdIds.layouts.keys());
  const themeNames = Array.from(createdIds.themes.keys());
  
  // Get existing town slugs for uniqueness check
  const existingTownSlugs: string[] = [];
  
  for (const town of towns) {
    const layoutName = layoutNames[Math.floor(Math.random() * layoutNames.length)];
    const themeName = themeNames[Math.floor(Math.random() * themeNames.length)];
    
    // Generate unique slug
    const slug = createTownSlug(town.name, existingTownSlugs);
    existingTownSlugs.push(slug);
    
    const created = await prisma.town.create({
      data: {
        ...town,
        slug,
        defaultLayoutId: createdIds.layouts.get(layoutName),
        defaultThemeId: createdIds.themes.get(themeName),
      },
    });
    createdIds.towns.set(town.name, created.id);
  }

  // Generate and create persons
  console.log('Generating and creating persons...');
  const persons = generatePersons();
  
  // Get existing person slugs for uniqueness check
  const existingPersonSlugs: string[] = [];
  
  for (const person of persons) {
    const { townName, detentionCenterName, ...personData } = person;
    
    // Generate unique slug
    const slug = createPersonSlug(
      person.firstName, 
      person.middleName, 
      person.lastName, 
      existingPersonSlugs
    );
    existingPersonSlugs.push(slug);
    
    const created = await prisma.person.create({
      data: {
        ...personData,
        slug,
        townId: createdIds.towns.get(townName)!,
        detentionCenterId: detentionCenterName ? createdIds.detentionCenters.get(detentionCenterName) : null,
      },
    });
    createdIds.persons.set(`${person.firstName}_${person.lastName}`, created.id);
  }
  console.log(`Created ${persons.length} persons.`);

  // Create stories for all persons (especially detailed for Borrego Springs)
  console.log('Creating multi-language stories...');
  await createStoriesForPersons(persons);

  // Generate and create supporters
  console.log('Generating and creating supporters...');
  const supporters = generateSupporters(persons);
  for (const supporter of supporters) {
    const { personFirstName, personLastName, ...supporterData } = supporter;
    const personId = createdIds.persons.get(`${personFirstName}_${personLastName}`)!;
    
    await prisma.supporter.create({
      data: {
        ...supporterData,
        personId,
      },
    });
  }
  console.log(`Created ${supporters.length} supporters.`);

  // Generate and create comments
  console.log('Generating and creating comments...');
  const comments = generateComments(persons);
  for (const comment of comments) {
    const { personFirstName, personLastName, ...commentData } = comment;
    const personId = createdIds.persons.get(`${personFirstName}_${personLastName}`)!;
    
    await prisma.comment.create({
      data: {
        ...commentData,
        personId,
      },
    });
  }
  console.log(`Created ${comments.length} comments.`);

  // Create family privacy settings for detained persons
  console.log('Creating family privacy settings...');
  const detainedPersons = persons.filter(p => p.detentionCenterName);
  for (const person of detainedPersons) {
    const personId = createdIds.persons.get(`${person.firstName}_${person.lastName}`)!;
    
    await prisma.familyPrivacySettings.create({
      data: {
        personId,
        showDetaineeEmail: Math.random() > 0.7, // 30% show email
        showDetaineePhone: Math.random() > 0.8, // 20% show phone
        showDetaineeAddress: false, // Never show address by default
        showAlienId: false, // Never show alien ID by default
        showLegalInfo: Math.random() > 0.5, // 50% show legal info
        showSupporterEmails: Math.random() > 0.7, // 30% show supporter emails
        showSupporterPhones: false, // Never show supporter phones by default
        showSupporterAddresses: false, // Never show supporter addresses
        defaultCommentVisibility: randomElement([
          'public',
          'supporters',
          'family',
        ]),
        notifyFamilyEmail: `family.${person.firstName.toLowerCase()}.${person.lastName.toLowerCase()}@email.com`,
        notifyOnNewSupporter: true,
        notifyOnNewComment: true,
        authorizedEmails: JSON.stringify([
          `family.${person.firstName.toLowerCase()}.${person.lastName.toLowerCase()}@email.com`,
          `spouse.${person.firstName.toLowerCase()}.${person.lastName.toLowerCase()}@email.com`,
        ]),
      },
    });
  }
  console.log(`Created ${detainedPersons.length} family privacy settings.`);

  // Create admin user
  console.log('Creating admin user...');
  const hashedPassword = await bcrypt.hash('admin123', 12);
  const adminUser = await prisma.user.create({
    data: {
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
      roleId: createdIds.roles.get('site-admin')!,
    },
  });

  // Create PersonImages for Borrego Springs persons
  console.log('Creating person images for Borrego Springs...');
  const borregoPersons = persons.filter(p => p.townName === 'Borrego Springs');

  for (let idx = 0; idx < borregoPersons.length; idx++) {
    const person = borregoPersons[idx];
    const personId = createdIds.persons.get(`${person.firstName}_${person.lastName}`)!;
    
    // Create 3-5 additional images per person
    const imageCount = Math.floor(Math.random() * 3) + 3;

    for (let i = 0; i < imageCount; i++) {
      // Use different placeholder images for variety
      const imageNum = ((idx + i) % 10) + 1;
      const imageIds = placeholderImageIds.get(imageNum);

      if (imageIds) {
        await prisma.personImage.create({
          data: {
            personId,
            imageUrl: `/api/images/${imageIds.fullImageId}`,
            thumbnailUrl: `/api/images/${imageIds.thumbnailImageId}`,
            caption: randomElement([
              'Family gathering',
              'At community event',
              'With children',
              'Working in the fields',
              'Holiday celebration',
              'Church activities',
              'Coaching soccer',
              'Volunteer work',
              'Birthday party',
              'School event',
            ]),
            displayPublicly: true, // All images are public
            uploadedById: adminUser.id,
            isActive: true,
          },
        });
      }
    }
  }
  console.log(
    `Created ${borregoPersons.length * 4} person images for Borrego Springs.`
  );

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
        roleId: createdIds.roles.get('viewer')!,
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
        roleId: createdIds.roles.get('town-admin')!,
      },
    });

    // Grant access to their town
    await prisma.townAccess.create({
      data: {
        userId: townAdmin.id,
        townId: createdIds.towns.get(town.name)!,
        accessLevel: 'admin',
      },
    });
  }
  
  // Create person-admin user
  console.log('Creating person admin user...');
  const personAdminPassword = await bcrypt.hash('person1123', 12);
  const personAdmin = await prisma.user.create({
    data: {
      username: 'person_admin_1',
      email: 'personadmin@bringmehome.com',
      password: personAdminPassword,
      firstName: 'Person',
      lastName: 'Admin',
      isActive: true,
    },
  });
  
  // Assign person-admin role
  await prisma.userRole.create({
    data: {
      userId: personAdmin.id,
      roleId: createdIds.roles.get('person-admin')!,
    },
  });
  
  // Grant access to Joe Plumber
  const joePlumberId = createdIds.persons.get('Joe_Plumber')!;
  await prisma.personAccess.create({
    data: {
      userId: personAdmin.id,
      personId: joePlumberId,
      accessLevel: 'admin',
    },
  });

  // Create system config
  console.log('Creating system configuration...');
  const systemConfigs = [
    // Site Identity
    {
      key: 'site_title',
      value:
        process.env.SITE_TITLE || 'Bring Me Home - Support for ICE Detainees',
      description: 'Main site title',
      dataType: 'string',
    },
    {
      key: 'site_tagline',
      value: process.env.SITE_TAGLINE || 'Help Bring Families Together',
      description: 'Site tagline shown on homepage',
      dataType: 'string',
    },
    {
      key: 'site_description',
      value:
        process.env.SITE_DESCRIPTION ||
        'A platform dedicated to reuniting detained individuals with their families through community support and advocacy.',
      description: 'Site description for metadata and homepage',
      dataType: 'string',
    },
    {
      key: 'copyright_text',
      value:
        process.env.COPYRIGHT_TEXT ||
        'Bring Me Home. Together, we can bring our loved ones home.',
      description: 'Copyright text (year is added automatically)',
      dataType: 'string',
    },

    // Homepage Text
    {
      key: 'homepage_cta_title',
      value: process.env.HOMEPAGE_CTA_TITLE || 'How You Can Help',
      description: 'Call to action title on homepage',
      dataType: 'string',
    },
    {
      key: 'homepage_cta_text',
      value:
        process.env.HOMEPAGE_CTA_TEXT ||
        'Every voice matters. By showing your support for detained individuals, you help demonstrate to authorities the community ties and support system waiting for their return.',
      description: 'Call to action text on homepage',
      dataType: 'string',
    },
    {
      key: 'homepage_cta_button',
      value: process.env.HOMEPAGE_CTA_BUTTON || 'Show Your Support',
      description: 'Call to action button text',
      dataType: 'string',
    },

    // Town Page Text
    {
      key: 'town_page_title',
      value:
        process.env.TOWN_PAGE_TITLE || 'Detained Community Members in {town}',
      description: 'Title format for town pages ({town} is replaced)',
      dataType: 'string',
    },
    {
      key: 'town_page_subtitle',
      value:
        process.env.TOWN_PAGE_SUBTITLE ||
        '{count} community member(s) need your support',
      description: 'Subtitle format for town pages',
      dataType: 'string',
    },
    {
      key: 'town_no_detainees_title',
      value:
        process.env.TOWN_NO_DETAINEES_TITLE ||
        'No detained individuals reported',
      description: 'Title when no detained persons in town',
      dataType: 'string',
    },
    {
      key: 'town_no_detainees_text',
      value:
        process.env.TOWN_NO_DETAINEES_TEXT ||
        'There are currently no detained community members from {town} in the system.',
      description: 'Text when no detained persons in town',
      dataType: 'string',
    },
    {
      key: 'town_info_title',
      value: process.env.TOWN_INFO_TITLE || 'Want to Help?',
      description: 'Information section title on town pages',
      dataType: 'string',
    },
    {
      key: 'town_info_text',
      value:
        process.env.TOWN_INFO_TEXT ||
        'If you know someone who has been detained or want to show support for those already in the system, please add your voice. Community support can make a real difference in immigration proceedings.',
      description: 'Information section text on town pages',
      dataType: 'string',
    },
    {
      key: 'town_info_button',
      value: process.env.TOWN_INFO_BUTTON || 'Add Your Support',
      description: 'Information section button text',
      dataType: 'string',
    },

    // Person Profile Text
    {
      key: 'detained_at_label',
      value: process.env.DETAINED_AT_LABEL || 'Detained at',
      description: 'Label for detention center',
      dataType: 'string',
    },
    {
      key: 'last_seen_label',
      value: process.env.LAST_SEEN_LABEL || 'Detained since',
      description: 'Label for detention date',
      dataType: 'string',
    },
    {
      key: 'view_profile_button',
      value:
        process.env.VIEW_PROFILE_BUTTON || 'View Full Story & Show Support',
      description: 'Button text to view person profile',
      dataType: 'string',
    },

    // Support/Comment Section
    {
      key: 'submit_support_button',
      value: process.env.SUBMIT_SUPPORT_BUTTON || 'Add Your Support',
      description: 'Button text for submitting support',
      dataType: 'string',
    },
    {
      key: 'no_support_text',
      value:
        process.env.NO_SUPPORT_TEXT ||
        'Be the first to show your support for this community member.',
      description: 'Text when no supporters yet',
      dataType: 'string',
    },

    // Navigation
    {
      key: 'find_by_location_text',
      value: process.env.FIND_BY_LOCATION_TEXT || 'Find by Location',
      description: 'Navigation text for location search',
      dataType: 'string',
    },
    {
      key: 'recently_added_text',
      value: process.env.RECENTLY_ADDED_TEXT || 'Recently Added',
      description: 'Text for recently added section',
      dataType: 'string',
    },
    {
      key: 'back_to_home_text',
      value: process.env.BACK_TO_HOME_TEXT || '← Back to Home',
      description: 'Back to home navigation text',
      dataType: 'string',
    },
    {
      key: 'view_other_towns_text',
      value: process.env.VIEW_OTHER_TOWNS_TEXT || 'View Other Towns',
      description: 'Link text to view other towns',
      dataType: 'string',
    },

    // Admin Interface
    {
      key: 'admin_detained_persons_title',
      value: process.env.ADMIN_DETAINED_PERSONS_TITLE || 'Detained Persons',
      description: 'Title for detained persons in admin',
      dataType: 'string',
    },
    {
      key: 'admin_add_person_button',
      value: process.env.ADMIN_ADD_PERSON_BUTTON || 'Add Detained Person',
      description: 'Button text to add new detained person',
      dataType: 'string',
    },

    // System Settings (existing)
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

  // Count detained persons and stories
  const detainedCount = persons.filter(p => p.detentionCenterName).length;
  const storyCount = await prisma.story.count();
  const borregoSpringsStoryCount = await prisma.story.count({
    where: {
      person: {
        town: {
          name: 'Borrego Springs',
        },
      },
    },
  });

  console.log('Database seeding completed successfully!');
  console.log('\nCreated:');
  console.log(`- ${towns.length} towns`);
  console.log(`- ${persons.length} persons (${detainedCount} detained by ICE)`);
  console.log(
    `- ${storyCount} stories (${borregoSpringsStoryCount} for Borrego Springs with full English/Spanish)`
  );
  console.log(`- ${supporters.length} supporters`);
  console.log(`- ${comments.length} comments and updates`);
  console.log(`- ${detainedPersons.length} family privacy settings`);
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
