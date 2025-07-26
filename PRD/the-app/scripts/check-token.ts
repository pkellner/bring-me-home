import { prisma } from '../src/lib/prisma';
import { hashToken } from '../src/lib/comment-verification';

async function checkToken() {
  const token = "Nbwpdd1rzfjGFiIrggmlmhXIy2JGvYUM1uKD5uw5FNU";
  console.log('Checking token:', token);
  
  // Hash the token
  const tokenHash = hashToken(token);
  console.log('Token hash:', tokenHash);
  
  try {
    // Look up the token in the database
    const verificationToken = await prisma.commentVerificationToken.findFirst({
      where: {
        tokenHash,
      }
    });
    
    if (!verificationToken) {
      console.log('\n❌ Token not found in the database');
      
      // Let's check if there are any tokens with similar patterns
      const allTokens = await prisma.commentVerificationToken.findMany({
        select: {
          id: true,
          email: true,
          tokenHash: true,
          isActive: true,
          createdAt: true,
          lastUsedAt: true,
          usageCount: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 10,
      });
      
      console.log('\nRecent tokens in the database:');
      allTokens.forEach(t => {
        console.log(`- Email: ${t.email}, Active: ${t.isActive}, Created: ${t.createdAt}, Hash: ${t.tokenHash.substring(0, 10)}...`);
      });
    } else {
      console.log('\n✅ Token found!');
      console.log('Token details:');
      console.log('- ID:', verificationToken.id);
      console.log('- Email:', verificationToken.email);
      console.log('- Active:', verificationToken.isActive);
      console.log('- Created:', verificationToken.createdAt);
      console.log('- Last used:', verificationToken.lastUsedAt);
      console.log('- Usage count:', verificationToken.usageCount);
      console.log('- Last action:', verificationToken.lastAction);
      console.log('- Revoked at:', verificationToken.revokedAt);
      console.log('- Revoked by:', verificationToken.revokedBy);
      
      // Check if we need to reset it
      if (!verificationToken.isActive) {
        console.log('\n⚠️  Token is currently INACTIVE');
        
        const readline = require('readline').createInterface({
          input: process.stdin,
          output: process.stdout
        });
        
        readline.question('\nDo you want to reactivate this token? (yes/no): ', async (answer: string) => {
          if (answer.toLowerCase() === 'yes') {
            await prisma.commentVerificationToken.update({
              where: { id: verificationToken.id },
              data: { isActive: true }
            });
            console.log('✅ Token has been reactivated!');
          } else {
            console.log('Token remains inactive.');
          }
          readline.close();
          process.exit(0);
        });
        
        return; // Don't exit yet, wait for user input
      }
    }
  } catch (error) {
    console.error('Error checking token:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the check
checkToken().catch(console.error);