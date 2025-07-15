// Test environment variable loading
console.log('=== Environment Variable Test ===');
console.log('NEXT_PUBLIC_AWS_SERVER_IMAGES_FROM_S3_DIRECTLY:', process.env.NEXT_PUBLIC_AWS_SERVER_IMAGES_FROM_S3_DIRECTLY);
console.log('Type:', typeof process.env.NEXT_PUBLIC_AWS_SERVER_IMAGES_FROM_S3_DIRECTLY);
console.log('Length:', process.env.NEXT_PUBLIC_AWS_SERVER_IMAGES_FROM_S3_DIRECTLY?.length);
console.log('JSON.stringify:', JSON.stringify(process.env.NEXT_PUBLIC_AWS_SERVER_IMAGES_FROM_S3_DIRECTLY));
console.log('Equals "false":', process.env.NEXT_PUBLIC_AWS_SERVER_IMAGES_FROM_S3_DIRECTLY === 'false');
console.log('Equals "true":', process.env.NEXT_PUBLIC_AWS_SERVER_IMAGES_FROM_S3_DIRECTLY === 'true');

// Also check if dotenv is being used
try {
  const dotenv = require('dotenv');
  const result = dotenv.config();
  console.log('\n=== Dotenv Test ===');
  console.log('Dotenv loaded:', !result.error);
  if (result.parsed) {
    console.log('NEXT_PUBLIC_AWS_SERVER_IMAGES_FROM_S3_DIRECTLY from dotenv:', result.parsed.NEXT_PUBLIC_AWS_SERVER_IMAGES_FROM_S3_DIRECTLY);
  }
} catch (e) {
  console.log('\nDotenv not available');
}