// Debug script to check environment variable loading order
const fs = require('fs');
const path = require('path');

console.log('=== Environment Variable Debug ===\n');

// Check system environment
console.log('1. System Environment:');
console.log('   NEXT_PUBLIC_AWS_SERVER_IMAGES_FROM_S3_DIRECTLY:', process.env.NEXT_PUBLIC_AWS_SERVER_IMAGES_FROM_S3_DIRECTLY || '(not set)');

// Check .env file
console.log('\n2. .env file content:');
try {
  const envContent = fs.readFileSync('.env', 'utf8');
  const lines = envContent.split('\n');
  const awsLine = lines.find(line => line.includes('NEXT_PUBLIC_AWS_SERVER_IMAGES_FROM_S3_DIRECTLY'));
  console.log('   Found:', awsLine || '(not found)');
} catch (e) {
  console.log('   Error reading .env:', e.message);
}

// Check .env.local
console.log('\n3. .env.local file:');
try {
  const envLocalContent = fs.readFileSync('.env.local', 'utf8');
  const lines = envLocalContent.split('\n');
  const awsLine = lines.find(line => line.includes('NEXT_PUBLIC_AWS_SERVER_IMAGES_FROM_S3_DIRECTLY'));
  console.log('   Found:', awsLine || '(not found in file)');
} catch (e) {
  console.log('   File does not exist');
}

// Check .env.development
console.log('\n4. .env.development file:');
try {
  const envDevContent = fs.readFileSync('.env.development', 'utf8');
  const lines = envDevContent.split('\n');
  const awsLine = lines.find(line => line.includes('NEXT_PUBLIC_AWS_SERVER_IMAGES_FROM_S3_DIRECTLY'));
  console.log('   Found:', awsLine || '(not found in file)');
} catch (e) {
  console.log('   File does not exist');
}

// Load dotenv and check
console.log('\n5. After loading dotenv:');
require('dotenv').config();
console.log('   NEXT_PUBLIC_AWS_SERVER_IMAGES_FROM_S3_DIRECTLY:', process.env.NEXT_PUBLIC_AWS_SERVER_IMAGES_FROM_S3_DIRECTLY);
console.log('   Type:', typeof process.env.NEXT_PUBLIC_AWS_SERVER_IMAGES_FROM_S3_DIRECTLY);
console.log('   Value === "true":', process.env.NEXT_PUBLIC_AWS_SERVER_IMAGES_FROM_S3_DIRECTLY === 'true');
console.log('   Value === "false":', process.env.NEXT_PUBLIC_AWS_SERVER_IMAGES_FROM_S3_DIRECTLY === 'false');

// Check if it's set as a command line argument
console.log('\n6. Process arguments:');
console.log('   argv:', process.argv);
console.log('   NODE_ENV:', process.env.NODE_ENV);