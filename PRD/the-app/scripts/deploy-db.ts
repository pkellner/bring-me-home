#!/usr/bin/env tsx

import { execSync } from 'child_process';
import * as readline from 'readline';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });
config({ path: '.env' });

// Database configurations
// These should be set in your .env.production, .env.staging, or .env.local files
const environments = {
  production: {
    url: process.env.DATABASE_URL_PRODUCTION || '',
    name: 'Production',
  },
  staging: {
    url: process.env.DATABASE_URL_STAGING || '',
    name: 'Staging',
  },
  local: {
    url: process.env.DATABASE_URL || '',
    name: 'Local',
  },
};

type Environment = keyof typeof environments;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function askConfirmation(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${colors.yellow}${question} (yes/no): ${colors.reset}`, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes');
    });
  });
}

async function deployMigrations(env: Environment) {
  const config = environments[env];

  if (!config.url) {
    log(`\n❌ No database URL found for ${config.name}`, 'red');
    log(`Please set DATABASE_URL${env === 'production' ? '_PRODUCTION' : env === 'staging' ? '_STAGING' : ''} in your .env file`, 'yellow');
    process.exit(1);
  }

  log(`\n🚀 Deploying database migrations to ${config.name}`, 'blue');

  try {
    // Check migration status
    log('\n📊 Current migration status:', 'yellow');
    execSync(`DATABASE_URL="${config.url}" npx prisma migrate status`, {
      stdio: 'inherit',
    });

    // Ask for confirmation
    const confirmed = await askConfirmation(`\nDo you want to deploy migrations to ${config.name}?`);

    if (!confirmed) {
      log('\n❌ Deployment cancelled', 'red');
      process.exit(0);
    }

    // Deploy migrations
    log('\n🔄 Deploying migrations...', 'green');
    execSync(`DATABASE_URL="${config.url}" npx prisma migrate deploy`, {
      stdio: 'inherit',
    });

    // Generate Prisma Client
    log('\n🔨 Generating Prisma Client...', 'green');
    execSync('npx prisma generate', { stdio: 'inherit' });

    // Show final status
    log('\n📊 Final migration status:', 'yellow');
    execSync(`DATABASE_URL="${config.url}" npx prisma migrate status`, {
      stdio: 'inherit',
    });

    log('\n✅ Database deployment completed successfully!', 'green');
  } catch (error) {
    log('\n❌ Deployment failed!', 'red');
    console.error(error);
    process.exit(1);
  }
}

// Main execution
async function main() {
  const env = (process.argv[2] as Environment) || 'production';

  if (!environments[env]) {
    log(`Unknown environment: ${env}`, 'red');
    log(`Available environments: ${Object.keys(environments).join(', ')}`);
    process.exit(1);
  }

  await deployMigrations(env);
}

main().catch(console.error);