import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('=== Searching for Fidel Arias Torres in Borrego Springs ===\n');
    
    // First, find the town
    const borregoSprings = await prisma.town.findFirst({
      where: { name: 'Borrego Springs' }
    });
    
    if (!borregoSprings) {
      console.log('Borrego Springs town not found');
      return;
    }
    
    console.log('Found Borrego Springs:', {
      id: borregoSprings.id,
      name: borregoSprings.name,
      slug: borregoSprings.slug
    });
    
    // Find Fidel Arias Torres
    const fidel = await prisma.person.findFirst({
      where: {
        firstName: 'Fidel',
        lastName: 'Arias Torres',
        townId: borregoSprings.id
      },
      include: {
        town: true,
        detentionCenter: true
      }
    });
    
    if (!fidel) {
      console.log('\nFidel Arias Torres not found in Borrego Springs');
      
      // Try searching for any person with similar names
      const similarPersons = await prisma.person.findMany({
        where: {
          OR: [
            { firstName: { contains: 'Fidel' } },
            { lastName: { contains: 'Torres' } },
            { lastName: { contains: 'Arias' } }
          ],
          townId: borregoSprings.id
        },
        select: {
          id: true,
          firstName: true,
          middleName: true,
          lastName: true,
          slug: true
        }
      });
      
      console.log('\nSimilar persons in Borrego Springs:');
      similarPersons.forEach(p => {
        console.log(`- ${p.firstName} ${p.middleName || ''} ${p.lastName} (${p.slug})`);
      });
      
      return;
    }
    
    console.log('\nFound Fidel:', {
      id: fidel.id,
      name: `${fidel.firstName} ${fidel.middleName || ''} ${fidel.lastName}`,
      slug: fidel.slug,
      town: fidel.town.name,
      detentionCenter: fidel.detentionCenter?.name || 'Not detained'
    });
    
    // Find all comments for Fidel
    const comments = await prisma.comment.findMany({
      where: {
        personId: fidel.id
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log(`\n=== Found ${comments.length} comments for Fidel ===\n`);
    
    // Look specifically for Tammy B.'s comment
    const tammyComments = comments.filter(c => 
      c.firstName?.toLowerCase().includes('tammy') ||
      (c.firstName?.toLowerCase() === 'tammy' && c.lastName?.toLowerCase().startsWith('b'))
    );
    
    if (tammyComments.length > 0) {
      console.log('=== Tammy B.\'s comment(s) found ===\n');
      tammyComments.forEach((comment, index) => {
        console.log(`Comment ${index + 1}:`);
        console.log('ID:', comment.id);
        console.log('Name:', `${comment.firstName} ${comment.lastName}`);
        console.log('Display Name Only:', comment.displayNameOnly);
        console.log('Show Comment:', comment.showComment);
        console.log('Is Approved:', comment.isApproved);
        console.log('Is Active:', comment.isActive);
        console.log('Visibility:', comment.visibility);
        console.log('Type:', comment.type);
        console.log('Content:', comment.content);
        console.log('Private Note to Family:', comment.privateNoteToFamily);
        console.log('City/State:', `${comment.city || 'N/A'}, ${comment.state || 'N/A'}`);
        console.log('Show City/State:', comment.showCityState);
        console.log('Email:', comment.email || 'N/A');
        console.log('Phone:', comment.phone || 'N/A');
        console.log('Occupation:', comment.occupation || 'N/A');
        console.log('Show Occupation:', comment.showOccupation);
        console.log('Birthdate:', comment.birthdate || 'N/A');
        console.log('Show Birthdate:', comment.showBirthdate);
        console.log('Wants to Help More:', comment.wantsToHelpMore);
        console.log('Requires Family Approval:', comment.requiresFamilyApproval);
        console.log('Created At:', comment.createdAt);
        console.log('Approved At:', comment.approvedAt || 'Not approved');
        console.log('Approved By:', comment.approvedBy || 'N/A');
        console.log('Moderator Notes:', comment.moderatorNotes || 'None');
        console.log('\n---\n');
      });
    } else {
      console.log('No comments from Tammy B. found');
      
      // Show all comments with names
      console.log('\nAll comments with names:');
      comments.forEach((comment, index) => {
        if (comment.firstName || comment.lastName) {
          console.log(`${index + 1}. ${comment.firstName || ''} ${comment.lastName || ''} - Show Comment: ${comment.showComment}, Display Name Only: ${comment.displayNameOnly}, Approved: ${comment.isApproved}`);
        }
      });
    }
    
    // Check family privacy settings
    const familySettings = await prisma.familyPrivacySettings.findUnique({
      where: { personId: fidel.id }
    });
    
    if (familySettings) {
      console.log('\n=== Family Privacy Settings ===');
      console.log('Default Comment Visibility:', familySettings.defaultCommentVisibility);
      console.log('Notify on New Comment:', familySettings.notifyOnNewComment);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();