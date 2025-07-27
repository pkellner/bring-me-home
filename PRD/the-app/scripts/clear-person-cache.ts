#!/usr/bin/env tsx

import { invalidatePersonCache } from '../src/lib/cache/person-cache';

async function main() {
  try {
    console.log('Clearing cache for joe_plumber in borrego_springs...');
    await invalidatePersonCache('borrego_springs', 'joe_plumber');
    console.log('Cache cleared successfully!');
    console.log('\nNow refresh the page at http://localhost:3000/borrego_springs/joe_plumber');
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
}

main();