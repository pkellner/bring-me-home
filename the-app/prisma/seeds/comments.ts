import { PrismaClient, Comment, Person } from '@prisma/client';

export async function seedComments(
  prisma: PrismaClient,
  persons: Person[]
): Promise<Comment[]> {
  const commentsData = [
    // Comments for Miguel Rodriguez
    {
      personId: persons[0].id,
      content: 'Miguel is a pillar of our community. He coached my son\'s soccer team for 3 years and never missed a practice. The kids adore him and we need him back home.',
      submitterName: 'Robert Johnson',
      submitterEmail: 'rjohnson@email.com',
      isAnonymous: false,
      privacyLevel: 'public',
      isApproved: true,
      isVerified: true
    },
    {
      personId: persons[0].id,
      content: 'I\'ve worked alongside Miguel for 5 years. He\'s the hardest worker on our crew and always helps new employees. His family needs him.',
      submitterName: 'Construction Coworker',
      isAnonymous: true,
      privacyLevel: 'public',
      isApproved: true
    },
    {
      personId: persons[0].id,
      content: 'Our church congregation is praying for Miguel\'s release. He volunteers every weekend and helps with our food pantry. His children ask about him every Sunday.',
      submitterName: 'Father Martinez',
      submitterEmail: 'fmartinez@church.org',
      isAnonymous: false,
      privacyLevel: 'public',
      isApproved: true,
      isVerified: true
    },
    {
      personId: persons[0].id,
      content: 'As Miguel\'s employer, I can attest to his character. He\'s been employee of the month multiple times. I\'m holding his position for when he returns.',
      submitterName: 'James Wilson',
      submitterEmail: 'jwilson@construction.com',
      submitterPhone: '(760) 555-1000',
      isAnonymous: false,
      privacyLevel: 'public',
      isApproved: true,
      isVerified: true
    },
    {
      personId: persons[0].id,
      content: 'Legal update: We\'ve filed a motion for bond reduction. The family has raised $5,000 so far.',
      submitterName: 'Maria Gonzalez, Esq.',
      submitterEmail: 'mgonzalez@lawfirm.com',
      isAnonymous: false,
      privacyLevel: 'family',
      isApproved: true,
      moderatorNotes: 'Verified attorney'
    },

    // Comments for Rosa Martinez
    {
      personId: persons[1].id,
      content: 'Rosa saved my mother\'s life when she was a nurse in El Salvador. She\'s a caring person who deserves safety and freedom.',
      isAnonymous: true,
      privacyLevel: 'public',
      isApproved: true
    },
    {
      personId: persons[1].id,
      content: 'I\'m Rosa\'s cousin in Chula Vista. Our whole family is ready to support her. She can stay with us and we\'ll help her get established.',
      submitterName: 'Elena Martinez',
      submitterEmail: 'emartinez@email.com',
      isAnonymous: false,
      privacyLevel: 'public',
      isApproved: true
    },
    {
      personId: persons[1].id,
      content: 'Rosa treated patients during the violence in our neighborhood. She risked her life to help others. She deserves asylum.',
      submitterName: 'Former Patient',
      isAnonymous: true,
      privacyLevel: 'public',
      isApproved: true
    },

    // Comments for Carlos Mendez
    {
      personId: persons[2].id,
      content: 'Carlos\'s restaurant is the heart of our neighborhood. He employs local youth and gives them a chance. We need him back!',
      submitterName: 'Local Customer',
      isAnonymous: true,
      privacyLevel: 'public',
      isApproved: true
    },
    {
      personId: persons[2].id,
      content: 'I\'m one of Carlos\'s employees. He gave me a job when no one else would. He\'s more than a boss - he\'s family to all of us.',
      submitterName: 'Restaurant Employee',
      isAnonymous: true,
      privacyLevel: 'public',
      isApproved: true
    },
    {
      personId: persons[2].id,
      content: 'Over 200 signatures collected for Carlos\'s petition! Community support is overwhelming. #BringCarlosHome',
      submitterName: 'Community Organizer',
      submitterEmail: 'organizer@community.org',
      isAnonymous: false,
      privacyLevel: 'public',
      isApproved: true
    },

    // Comments for Ana Gonzalez
    {
      personId: persons[3].id,
      content: 'Ana is brilliant and dedicated. As her manager, I can confirm she\'s essential to our team. We\'re doing everything to support her case.',
      submitterName: 'Tech Manager',
      submitterEmail: 'manager@techcompany.com',
      isAnonymous: false,
      privacyLevel: 'public',
      isApproved: true,
      isVerified: true
    },
    {
      personId: persons[3].id,
      content: 'Ana mentored me when I started in tech. She\'s an inspiration to other young Latinas in STEM. This is a loss for our entire industry.',
      submitterName: 'Former Mentee',
      isAnonymous: false,
      privacyLevel: 'public',
      isApproved: true
    },
    {
      personId: persons[3].id,
      content: 'UC Berkeley stands with our alumna Ana Gonzalez. Her detention highlights the urgent need for immigration reform.',
      submitterName: 'UC Berkeley Alumni Association',
      submitterEmail: 'alumni@berkeley.edu',
      isAnonymous: false,
      privacyLevel: 'public',
      isApproved: true,
      isVerified: true
    },

    // Comments for Juan Hernandez
    {
      personId: persons[4].id,
      content: 'Juan trained me when I started farm work 10 years ago. He looks out for everyone and makes sure we\'re safe in the fields.',
      submitterName: 'Fellow Farm Worker',
      isAnonymous: true,
      privacyLevel: 'public',
      isApproved: true
    },
    {
      personId: persons[4].id,
      content: 'Mr. Hernandez\'s daughter is in my class at Fresno State. She\'s struggling without her dad. This is tearing families apart.',
      submitterName: 'College Professor',
      isAnonymous: true,
      privacyLevel: 'public',
      isApproved: true
    },

    // Comments for Maria Silva
    {
      personId: persons[5].id,
      content: 'Maria cleaned our offices for years. She\'s trustworthy and kind. We\'re glad she\'s home with her mother now.',
      submitterName: 'Office Manager',
      isAnonymous: false,
      privacyLevel: 'public',
      isApproved: true
    },
    {
      personId: persons[5].id,
      content: 'Thank you to everyone who contributed to Maria\'s bond fund. She\'s home but still needs our support for her legal case.',
      submitterName: 'Bond Fund Organizer',
      submitterEmail: 'bondfund@email.com',
      isAnonymous: false,
      privacyLevel: 'public',
      isApproved: true
    },

    // Some pending/unapproved comments
    {
      personId: persons[0].id,
      content: 'Test comment pending approval',
      isAnonymous: true,
      privacyLevel: 'public',
      isApproved: false
    },
    {
      personId: persons[1].id,
      content: 'Private family update on the case',
      submitterName: 'Family Member',
      isAnonymous: false,
      privacyLevel: 'family',
      isApproved: true
    }
  ];

  const createdComments: Comment[] = [];

  for (const commentData of commentsData) {
    const comment = await prisma.comment.create({
      data: commentData
    });
    createdComments.push(comment);
  }

  console.log(`  ✓ Created ${createdComments.length} comments`);
  return createdComments;
}