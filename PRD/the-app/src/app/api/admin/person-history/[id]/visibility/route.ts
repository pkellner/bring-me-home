import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { hasPersonAccess } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get the person history to check permissions
    const personHistory = await prisma.personHistory.findUnique({
      where: { id },
      include: {
        person: {
          include: {
            town: true,
          },
        },
      },
    });

    if (!personHistory) {
      return NextResponse.json({ error: 'Person history not found' }, { status: 404 });
    }

    // Check if user has permission to edit this person
    const canEdit = await hasPersonAccess(
      session,
      personHistory.person.id,
      'write'
    );

    if (!canEdit) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // Get the new visibility status from request body
    const body = await request.json();
    const { visible } = body;

    if (typeof visible !== 'boolean') {
      return NextResponse.json({ error: 'Invalid visibility value' }, { status: 400 });
    }

    // Update the visibility
    const updated = await prisma.personHistory.update({
      where: { id },
      data: { visible },
    });

    return NextResponse.json({ 
      success: true, 
      visible: updated.visible 
    });
  } catch (error) {
    console.error('Error updating person history visibility:', error);
    return NextResponse.json(
      { error: 'Failed to update visibility' },
      { status: 500 }
    );
  }
}