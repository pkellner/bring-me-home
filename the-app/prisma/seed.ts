import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { seedRoles } from './seeds/roles';
import { seedUsers } from './seeds/users';
import { seedTowns } from './seeds/towns';
import { seedDetentionCenters } from './seeds/detentionCenters';
import { seedPersons } from './seeds/persons';
import { seedComments } from './seeds/comments';
import { seedLayouts } from './seeds/layouts';
import { seedThemes } from './seeds/themes';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  try {
    // Clear existing data in correct order
    console.log('🗑️  Clearing existing data...');
    await prisma.comment.deleteMany();
    await prisma.attachment.deleteMany();
    await prisma.personAccess.deleteMany();
    await prisma.person.deleteMany();
    await prisma.townAccess.deleteMany();
    await prisma.town.deleteMany();
    await prisma.detentionCenter.deleteMany();
    await prisma.userRole.deleteMany();
    await prisma.user.deleteMany();
    await prisma.role.deleteMany();
    await prisma.layout.deleteMany();
    await prisma.theme.deleteMany();
    await prisma.systemConfig.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.healthCheck.deleteMany();

    // Seed in correct order
    console.log('👤 Seeding roles...');
    const roles = await seedRoles(prisma);

    console.log('👥 Seeding users...');
    const users = await seedUsers(prisma, roles);

    console.log('🎨 Seeding themes...');
    const themes = await seedThemes(prisma);

    console.log('📐 Seeding layouts...');
    const layouts = await seedLayouts(prisma);

    console.log('🏘️  Seeding towns...');
    const towns = await seedTowns(prisma, themes[0], layouts[0]);

    console.log('🏢 Seeding detention centers...');
    const detentionCenters = await seedDetentionCenters(prisma);

    console.log('👥 Seeding persons...');
    const persons = await seedPersons(prisma, towns, detentionCenters);

    console.log('💬 Seeding comments...');
    await seedComments(prisma, persons);

    console.log('✅ Database seed completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });