// Check environment variables
require('dotenv').config();

console.log('Environment Variables Check:');
console.log('IMAGE_STORAGE_TYPE:', process.env.IMAGE_STORAGE_TYPE);
console.log('AWS_S3_BUCKET:', process.env.AWS_S3_BUCKET);
console.log('AWS_S3_REGION:', process.env.AWS_S3_REGION);
console.log('AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? 'Set (starts with ' + process.env.AWS_ACCESS_KEY_ID.substring(0, 4) + ')' : 'Not set');
console.log('AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? 'Set' : 'Not set');
console.log('NEXT_PUBLIC_AWS_SERVER_IMAGES_FROM_S3_DIRECTLY:', process.env.NEXT_PUBLIC_AWS_SERVER_IMAGES_FROM_S3_DIRECTLY);