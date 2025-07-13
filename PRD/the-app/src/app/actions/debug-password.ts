'use server';

import bcrypt from 'bcryptjs';

export async function debugPasswordAction(testPassword: string) {
  console.log('[DEBUG ACTION] Called with:', {
    received: !!testPassword,
    type: typeof testPassword,
    length: testPassword?.length,
    value: testPassword,
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
  
  if (!testPassword) {
    return { error: 'No password received' };
  }
  
  try {
    // Test hashing
    const hash = await bcrypt.hash(testPassword, 12);
    const verify = await bcrypt.compare(testPassword, hash);
    
    return {
      success: true,
      debug: {
        passwordLength: testPassword.length,
        hashLength: hash.length,
        verifyResult: verify,
        firstChar: testPassword.charCodeAt(0),
        lastChar: testPassword.charCodeAt(testPassword.length - 1),
      }
    };
  } catch (error) {
    return {
      error: 'Hash failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}