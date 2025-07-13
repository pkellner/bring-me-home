#!/usr/bin/env tsx

import bcrypt from 'bcryptjs';

async function testPassword() {
  const testPassword = 'Wj72n8Tz4H1';
  
  console.log('Testing password:', testPassword);
  console.log('Password length:', testPassword.length);
  console.log('Password chars:', testPassword.split('').map((char, i) => `${i}: '${char}' (${char.charCodeAt(0)})`).join(', '));
  
  // Test hashing with different rounds
  console.log('\nTesting bcrypt hashing:');
  
  const hash12 = await bcrypt.hash(testPassword, 12);
  console.log('Hash (12 rounds):', hash12);
  
  const verify12 = await bcrypt.compare(testPassword, hash12);
  console.log('Verify (12 rounds):', verify12);
  
  // Test with trimmed password
  const trimmedPassword = testPassword.trim();
  console.log('\nTrimmed password equals original?', trimmedPassword === testPassword);
  
  // Test common variations
  console.log('\nTesting variations:');
  const variations = [
    testPassword,
    testPassword.trim(),
    testPassword + ' ',
    ' ' + testPassword,
    testPassword.replace(/\s+/g, ''),
  ];
  
  for (const variant of variations) {
    const match = await bcrypt.compare(variant, hash12);
    console.log(`"${variant}" (length: ${variant.length}) matches hash:`, match);
  }
}

testPassword().catch(console.error);