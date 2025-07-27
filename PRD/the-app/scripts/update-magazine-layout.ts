#!/usr/bin/env tsx

import { prisma } from '../src/lib/prisma';

async function main() {
  try {
    // Update the Magazine layout to include history section
    const updated = await prisma.layout.update({
      where: { id: 'cmdkvfmuh000u3dywf22eqi80' },
      data: {
        template: JSON.stringify({
          type: 'magazine',
          columns: 3,
          sections: ['featured-image', 'article-content', 'sidebar', 'history', 'comments']
        })
      }
    });
    
    console.log('Updated layout:', updated.name);
    console.log('New template:', updated.template);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();