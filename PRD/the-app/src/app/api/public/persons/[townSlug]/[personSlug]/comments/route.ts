import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  context: { params: Promise<{ townSlug: string; personSlug: string }> }
) {
  try {
    const { townSlug, personSlug } = await context.params;

    // First verify the person exists and is active
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
        id: true,
      },
    });

    if (!person) {
      return NextResponse.json(
        { error: 'Person not found' },
        { status: 404 }
      );
    }

    // Fetch comments
    const comments = await prisma.comment.findMany({
      where: {
        personId: person.id,
        isActive: true,
        isApproved: true,
      },
      select: {
        id: true,
        content: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        occupation: true,
        birthdate: true,
        streetAddress: true,
        city: true,
        state: true,
        zipCode: true,
        showOccupation: true,
        showBirthdate: true,
        showComment: true,
        showCityState: true,
        wantsToHelpMore: true,
        displayNameOnly: true,
        requiresFamilyApproval: true,
        privacyRequiredDoNotShowPublicly: true,
        isApproved: true,
        isActive: true,
        personId: true,
        type: true,
        visibility: true,
        familyVisibilityOverride: true,
        moderatorNotes: true,
        createdAt: true,
        updatedAt: true,
        approvedAt: true,
        approvedBy: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Serialize comments
    const serializedComments = comments.map(comment => ({
      ...comment,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
      birthdate: comment.birthdate ? comment.birthdate.toISOString() : null,
      approvedAt: comment.approvedAt ? comment.approvedAt.toISOString() : null,
    }));

    return NextResponse.json(serializedComments);
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}