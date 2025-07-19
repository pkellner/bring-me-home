#!/usr/bin/env tsx

/**
 * Script to generate email configuration section for .env.example
 * This ensures all email configurations are documented in one place
 */

import { getEmailEnvConfig } from '../src/config/emails';

function generateEmailEnvSection(): string {
  const emailConfigs = getEmailEnvConfig();
  
  let output = '# Contact Email Addresses\n';
  
  emailConfigs.forEach(config => {
    const paddedName = config.name.padEnd(30);
    output += `${paddedName}# ${config.description}\n`;
  });
  
  output += '\n# Default values:\n';
  emailConfigs.forEach(config => {
    output += `# ${config.name}="${config.defaultValue}"\n`;
  });
  
  return output;
}

console.log('Email configuration section for .env.example:\n');
console.log('----------------------------------------\n');
console.log(generateEmailEnvSection());
console.log('----------------------------------------\n');
console.log('\nTo use this configuration:');
console.log('1. Copy the above section to your .env.example file');
console.log('2. Set actual values in your .env file');
console.log('3. The application will use defaults if environment variables are not set');