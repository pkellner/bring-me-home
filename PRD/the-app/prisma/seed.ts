import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Seed data for California towns
const towns = [
  {
    id: 'town_1',
    name: 'Borrego Springs',
    state: 'California',
    county: 'San Diego',
    zipCode: '92004',
    fullAddress: 'Borrego Springs, CA 92004, USA',
    description: 'A small desert town in San Diego County known for its wildflowers and stargazing.',
    latitude: 33.2553,
    longitude: -116.3747,
  },
  {
    id: 'town_2',
    name: 'Mendocino',
    state: 'California',
    county: 'Mendocino',
    zipCode: '95460',
    fullAddress: 'Mendocino, CA 95460, USA',
    description: 'A historic coastal town in Northern California with Victorian architecture.',
    latitude: 39.3076,
    longitude: -123.7997,
  },
  {
    id: 'town_3',
    name: 'Julian',
    state: 'California',
    county: 'San Diego',
    zipCode: '92036',
    fullAddress: 'Julian, CA 92036, USA',
    description: 'A historic mountain town known for apple orchards and gold mining history.',
    latitude: 33.0786,
    longitude: -116.6022,
  },
  {
    id: 'town_4',
    name: 'Cambria',
    state: 'California',
    county: 'San Luis Obispo',
    zipCode: '93428',
    fullAddress: 'Cambria, CA 93428, USA',
    description: 'A charming coastal town near Hearst Castle with beautiful beaches.',
    latitude: 35.5641,
    longitude: -121.0807,
  },
  {
    id: 'town_5',
    name: 'Ferndale',
    state: 'California',
    county: 'Humboldt',
    zipCode: '95536',
    fullAddress: 'Ferndale, CA 95536, USA',
    description: 'A Victorian village known for its well-preserved 19th-century architecture.',
    latitude: 40.5759,
    longitude: -124.2636,
  },
];

// Seed data for persons
const persons = [
  {
    id: 'person_1',
    firstName: 'Fidel',
    middleName: 'Antonio',
    lastName: 'Rodriguez',
    alienIdNumber: 'A123456789',
    dateOfBirth: new Date('1985-03-15'),
    height: '5\'8"',
    weight: '165 lbs',
    eyeColor: 'Brown',
    hairColor: 'Black',
    lastKnownAddress: '123 Desert View Dr, Borrego Springs, CA 92004',
    phoneNumber: '760-555-0123',
    emailAddress: 'fidel.rodriguez@email.com',
    story: 'Fidel was last seen at the local grocery store in Borrego Springs on March 10th, 2024. He was wearing a blue denim jacket and black jeans. Fidel is known to be friendly and helpful to others. He has been living in the area for over 10 years and is well-known by the community.',
    circumstances: 'Fidel left his home around 2 PM to go grocery shopping and never returned. His car was found at the grocery store parking lot. He had mentioned to neighbors that he was planning to visit the desert area later that day.',
    lastSeenDate: new Date('2024-03-10'),
    lastSeenLocation: 'Borrego Springs Market, Main Street',
    townId: 'town_1',
    primaryPicture: 'PERSON_PLACEHOLDER_001',
    secondaryPic1: 'PERSON_PLACEHOLDER_002',
    status: 'missing',
  },
  {
    id: 'person_2',
    firstName: 'Maria',
    middleName: 'Elena',
    lastName: 'Gonzalez',
    alienIdNumber: 'A987654321',
    dateOfBirth: new Date('1978-07-22'),
    height: '5\'4"',
    weight: '140 lbs',
    eyeColor: 'Hazel',
    hairColor: 'Brown',
    lastKnownAddress: '456 Ocean View Ave, Mendocino, CA 95460',
    phoneNumber: '707-555-0456',
    emailAddress: 'maria.gonzalez@email.com',
    story: 'Maria is a local artist who has been part of the Mendocino community for 15 years. She was last seen at the Mendocino Art Center where she taught pottery classes. Maria is known for her vibrant personality and dedication to her students.',
    circumstances: 'Maria finished her evening pottery class at 7 PM and left the art center. She usually walks home along the coastal path. Her purse and art supplies were found on the cliff path the next morning.',
    lastSeenDate: new Date('2024-02-28'),
    lastSeenLocation: 'Mendocino Art Center, coastal path',
    townId: 'town_2',
    primaryPicture: 'PERSON_PLACEHOLDER_003',
    status: 'missing',
  },
  {
    id: 'person_3',
    firstName: 'Carlos',
    middleName: 'Miguel',
    lastName: 'Hernandez',
    alienIdNumber: 'A456789123',
    dateOfBirth: new Date('1990-11-08'),
    height: '6\'0"',
    weight: '180 lbs',
    eyeColor: 'Brown',
    hairColor: 'Black',
    lastKnownAddress: '789 Mountain View Rd, Julian, CA 92036',
    phoneNumber: '760-555-0789',
    story: 'Carlos works as a tour guide in Julian and is passionate about the town\'s history. He has been missing since taking a group on a hiking tour in the surrounding mountains. Carlos is experienced in outdoor activities and knows the area well.',
    circumstances: 'Carlos was leading a small hiking group when he separated from them to scout ahead for a better viewpoint. He never returned to the group, and a search was initiated immediately.',
    lastSeenDate: new Date('2024-01-20'),
    lastSeenLocation: 'Julian mountain trails, near Eagle Peak',
    townId: 'town_3',
    primaryPicture: 'PERSON_PLACEHOLDER_004',
    secondaryPic1: 'PERSON_PLACEHOLDER_005',
    secondaryPic2: 'PERSON_PLACEHOLDER_006',
    status: 'missing',
  },
];

// Seed data for comments
const comments = [
  {
    id: 'comment_1',
    content: 'I saw someone matching this description at the gas station about a week ago. He was asking for directions to the desert camping areas.',
    submitterName: 'Anonymous Helper',
    submitterEmail: 'helper@email.com',
    isAnonymous: false,
    privacyLevel: 'public',
    personId: 'person_1',
    isApproved: true,
    isVerified: false,
  },
  {
    id: 'comment_2',
    content: 'Fidel helped me with my car troubles last year. He\'s such a kind person. I hope he\'s found safe.',
    submitterName: 'Local Resident',
    isAnonymous: false,
    privacyLevel: 'public',
    personId: 'person_1',
    isApproved: true,
    isVerified: false,
  },
  {
    id: 'comment_3',
    content: 'I was in one of Maria\'s pottery classes. She mentioned she was working on a special project and seemed excited about it.',
    submitterName: 'Art Student',
    submitterEmail: 'student@email.com',
    isAnonymous: false,
    privacyLevel: 'public',
    personId: 'person_2',
    isApproved: true,
    isVerified: false,
  },
  {
    id: 'comment_4',
    content: 'Carlos was our tour guide last month. He was very knowledgeable and safety-conscious. Something must have happened for him to disappear like this.',
    submitterName: 'Previous Tour Guest',
    isAnonymous: false,
    privacyLevel: 'public',
    personId: 'person_3',
    isApproved: true,
    isVerified: false,
  },
];

// Seed data for roles
const roles = [
  {
    id: 'role_1',
    name: 'site-admin',
    description: 'Full system administrator with all permissions',
    permissions: JSON.stringify({
      users: ['create', 'read', 'update', 'delete'],
      towns: ['create', 'read', 'update', 'delete'],
      persons: ['create', 'read', 'update', 'delete'],
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

// Seed data for themes
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
    cssVars: ':root { --primary: #D2691E; --secondary: #F4A460; --accent: #FF6347; --background: #FFF8DC; --text: #2F4F4F; }',
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
    cssVars: ':root { --primary: #4682B4; --secondary: #87CEEB; --accent: #20B2AA; --background: #F0F8FF; --text: #191970; }',
  },
];

// Seed data for layouts
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
];

async function main() {
  console.log('Starting database seeding...');

  // Create roles first
  console.log('Creating roles...');
  for (const role of roles) {
    await prisma.role.upsert({
      where: { id: role.id },
      update: {},
      create: role,
    });
  }

  // Create themes
  console.log('Creating themes...');
  for (const theme of themes) {
    await prisma.theme.upsert({
      where: { id: theme.id },
      update: {},
      create: theme,
    });
  }

  // Create layouts
  console.log('Creating layouts...');
  for (const layout of layouts) {
    await prisma.layout.upsert({
      where: { id: layout.id },
      update: {},
      create: layout,
    });
  }

  // Create towns
  console.log('Creating towns...');
  for (const town of towns) {
    await prisma.town.upsert({
      where: { id: town.id },
      update: {},
      create: {
        ...town,
        defaultLayoutId: 'layout_1',
        defaultThemeId: 'theme_1',
      },
    });
  }

  // Create persons
  console.log('Creating persons...');
  for (const person of persons) {
    await prisma.person.upsert({
      where: { id: person.id },
      update: {},
      create: person,
    });
  }

  // Create comments
  console.log('Creating comments...');
  for (const comment of comments) {
    await prisma.comment.upsert({
      where: { id: comment.id },
      update: {},
      create: comment,
    });
  }

  // Create admin user
  console.log('Creating admin user...');
  const hashedPassword = await bcrypt.hash('admin123', 12);
  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
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
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: adminUser.id,
        roleId: 'role_1',
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      roleId: 'role_1',
    },
  });

  // Create town admin users
  console.log('Creating town admin users...');
  for (let i = 0; i < towns.length; i++) {
    const town = towns[i];
    const hashedPassword = await bcrypt.hash(`town${i + 1}123`, 12);
    const townAdmin = await prisma.user.upsert({
      where: { username: `town_admin_${i + 1}` },
      update: {},
      create: {
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
    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: townAdmin.id,
          roleId: 'role_2',
        },
      },
      update: {},
      create: {
        userId: townAdmin.id,
        roleId: 'role_2',
      },
    });

    // Grant access to their town
    await prisma.townAccess.upsert({
      where: {
        userId_townId: {
          userId: townAdmin.id,
          townId: town.id,
        },
      },
      update: {},
      create: {
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
  ];

  for (const config of systemConfigs) {
    await prisma.systemConfig.upsert({
      where: { key: config.key },
      update: {},
      create: config,
    });
  }

  console.log('Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });