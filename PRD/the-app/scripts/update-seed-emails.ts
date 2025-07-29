#!/usr/bin/env tsx

/**
 * Script to help update email addresses in seed data
 * 
 * Usage:
 *   npx tsx scripts/update-seed-emails.ts
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const SEED_FILE_PATH = join(process.cwd(), 'prisma', 'seed.ts');

interface EmailUpdate {
  username: string;
  oldEmail: string;
  newEmail: string;
}

// Define email updates here
const EMAIL_UPDATES: EmailUpdate[] = [
  // Example:
  // { username: 'admin', oldEmail: 'admin@bring-me-home.com', newEmail: 'admin@yourdomain.com' },
  // { username: 'demo', oldEmail: 'demo@bring-me-home.com', newEmail: 'demo@yourdomain.com' },
];

function updateSeedFile(updates: EmailUpdate[]) {
  if (updates.length === 0) {
    console.log('No email updates defined. Edit EMAIL_UPDATES in this script to define updates.');
    return;
  }

  console.log('Reading seed file...');
  let seedContent = readFileSync(SEED_FILE_PATH, 'utf-8');
  let updatedCount = 0;

  updates.forEach(({ username, oldEmail, newEmail }) => {
    // Pattern to match email in user creation/upsert
    const patterns = [
      // Match in create/upsert blocks
      new RegExp(`(username:\\s*['"\`]${username}['"\`][^}]*email:\\s*['"\`])${oldEmail}(['"\`])`, 'g'),
      // Match with different formatting
      new RegExp(`(username:\\s*"${username}"[^}]*email:\\s*")${oldEmail}(")`, 'g'),
      new RegExp(`(username:\\s*'${username}'[^}]*email:\\s*')${oldEmail}(')`, 'g'),
    ];

    patterns.forEach(pattern => {
      const matches = seedContent.match(pattern);
      if (matches) {
        seedContent = seedContent.replace(pattern, `$1${newEmail}$2`);
        updatedCount++;
        console.log(`✅ Updated email for ${username}: ${oldEmail} → ${newEmail}`);
      }
    });
  });

  if (updatedCount > 0) {
    console.log(`\nWriting changes to ${SEED_FILE_PATH}...`);
    writeFileSync(SEED_FILE_PATH, seedContent);
    console.log(`✅ Successfully updated ${updatedCount} email(s) in seed file.`);
    console.log('\nNext steps:');
    console.log('1. Review the changes in prisma/seed.ts');
    console.log('2. Run: npm run db:seed (if you want to apply to database)');
  } else {
    console.log('❌ No matching emails found in seed file.');
    console.log('Make sure the username and oldEmail values match exactly.');
  }
}

// Also provide a function to list current emails in seed
function listCurrentEmails() {
  console.log('\nScanning seed file for current email addresses...\n');
  const seedContent = readFileSync(SEED_FILE_PATH, 'utf-8');
  
  // Match username and email pairs
  const pattern = /username:\s*['"`]([^'"`]+)['"`][^}]*email:\s*['"`]([^'"`]+)['"`]/g;
  const matches = [...seedContent.matchAll(pattern)];
  
  if (matches.length > 0) {
    console.log('Found the following users with emails:');
    console.log('----------------------------------------');
    matches.forEach(([, username, email]) => {
      console.log(`Username: ${username.padEnd(20)} Email: ${email}`);
    });
    console.log('----------------------------------------');
    console.log(`Total: ${matches.length} users\n`);
  } else {
    console.log('No email addresses found in seed file.');
  }
}

// Main execution
console.log('🔧 Seed Email Update Tool\n');

if (EMAIL_UPDATES.length === 0) {
  listCurrentEmails();
  console.log('To update emails, edit the EMAIL_UPDATES array in this script and run again.');
} else {
  console.log('Updates to be applied:');
  EMAIL_UPDATES.forEach(({ username, oldEmail, newEmail }) => {
    console.log(`  ${username}: ${oldEmail} → ${newEmail}`);
  });
  console.log('');
  
  updateSeedFile(EMAIL_UPDATES);
}