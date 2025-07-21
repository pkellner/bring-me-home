import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateImageUrlServerWithCdn } from '@/lib/image-url-server';

export async function GET(
  request: Request,
  context: { params: Promise<{ townSlug: string; personSlug: string }> }
) {
  try {
    const { townSlug, personSlug } = await context.params;

    const person = await prisma.person.findFirst({
      where: {
        slug: personSlug,
        town: {
          slug: townSlug,
          isActive: true,
        },
        isActive: true,
      },
      select: {
        // Include all scalar fields
        id: true,
        firstName: true,
        middleName: true,
        lastName: true,
        alienIdNumber: true,
        ssn: true,
        dateOfBirth: true,
        placeOfBirth: true,
        height: true,
        weight: true,
        eyeColor: true,
        hairColor: true,
        lastKnownAddress: true,
        currentAddress: true,
        phoneNumber: true,
        emailAddress: true,
        story: true,
        detentionStory: true,
        familyMessage: true,
        lastSeenDate: true,
        lastSeenLocation: true,
        isActive: true,
        isFound: true,
        status: true,
        detentionCenterId: true,
        detentionDate: true,
        lastHeardFromDate: true,
        notesFromLastContact: true,
        releaseDate: true,
        detentionStatus: true,
        caseNumber: true,
        bondAmount: true,
        bondStatus: true,
        representedByLawyer: true,
        representedByNotes: true,
        legalRepName: true,
        legalRepPhone: true,
        legalRepEmail: true,
        legalRepFirm: true,
        nextCourtDate: true,
        courtLocation: true,
        internationalAddress: true,
        countryOfOrigin: true,
        layoutId: true,
        themeId: true,
        townId: true,
        slug: true,
        showDetentionInfo: true,
        showLastHeardFrom: true,
        showDetentionDate: true,
        showCommunitySupport: true,
        createdAt: true,
        updatedAt: true,
        // Include relations
        town: {
          include: {
            layout: true,
            theme: true,
          },
        },
        layout: true,
        theme: true,
        detentionCenter: {
          include: {
            detentionCenterImage: {
              include: {
                image: true,
              },
            },
          },
        },
        personImages: {
          include: {
            image: true,
          },
          orderBy: [{ imageType: 'asc' }, { sequenceNumber: 'asc' }],
        },
        stories: {
          where: {
            isActive: true,
          },
          orderBy: [
            {
              language: 'asc',
            },
            {
              storyType: 'asc',
            },
          ],
        },
      },
    });

    if (!person) {
      return NextResponse.json(
        { error: 'Person not found' },
        { status: 404 }
      );
    }

    // Serialize stories
    const serializedStories = (person.stories || []).map(story => ({
      id: story.id,
      language: story.language,
      storyType: story.storyType,
      content: story.content,
      isActive: story.isActive,
      personId: story.personId,
      createdAt: story.createdAt.toISOString(),
      updatedAt: story.updatedAt.toISOString(),
    }));

    // Transform personImages
    const images = await Promise.all(
      person.personImages?.map(async pi => {
        const imageUrl = await generateImageUrlServerWithCdn(pi.image.id, undefined, `/${townSlug}/${personSlug}`);

        return {
          id: pi.image.id,
          imageType: pi.imageType,
          sequenceNumber: pi.sequenceNumber,
          caption: pi.image.caption,
          mimeType: pi.image.mimeType,
          size: pi.image.size,
          width: pi.image.width,
          height: pi.image.height,
          createdAt: pi.image.createdAt.toISOString(),
          updatedAt: pi.image.updatedAt.toISOString(),
          imageUrl,
        };
      }) || []
    );

    // Exclude personImages to avoid circular reference
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { personImages, ...personWithoutImages } = person;

    const serializedPerson = {
      ...personWithoutImages,
      bondAmount: person.bondAmount ? person.bondAmount.toString() : null,
      stories: serializedStories,
      images,
      // Serialize all date fields
      detentionDate: person.detentionDate ? person.detentionDate.toISOString() : null,
      lastSeenDate: person.lastSeenDate ? person.lastSeenDate.toISOString() : null,
      lastHeardFromDate: person.lastHeardFromDate ? person.lastHeardFromDate.toISOString() : null,
      dateOfBirth: person.dateOfBirth ? person.dateOfBirth.toISOString() : null,
      releaseDate: person.releaseDate ? person.releaseDate.toISOString() : null,
      nextCourtDate: person.nextCourtDate ? person.nextCourtDate.toISOString() : null,
      createdAt: person.createdAt.toISOString(),
      updatedAt: person.updatedAt.toISOString(),
    };

    return NextResponse.json(serializedPerson);
  } catch (error) {
    console.error('Error fetching person:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}