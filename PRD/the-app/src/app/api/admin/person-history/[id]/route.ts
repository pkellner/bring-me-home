import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPersonAccess, isSiteAdmin, isTownAdmin, isPersonAdmin } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: personHistoryId } = await context.params;

  try {
    // Get the person history to check access
    const personHistory = await prisma.personHistory.findUnique({
      where: { id: personHistoryId },
      include: {
        person: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            slug: true,
            town: {
              select: {
                id: true,
                name: true,
                slug: true,
              }
            }
          }
        }
      }
    });

    if (!personHistory) {
      return NextResponse.json({ error: 'Person history not found' }, { status: 404 });
    }

    // Check if user has access to this person
    const hasAccess = await hasPersonAccess(session, personHistory.person.id, 'read') || 
                      isTownAdmin(session) || 
                      isPersonAdmin(session) ||
                      isSiteAdmin(session);
    
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ 
      personId: personHistory.person.id,
      personName: `${personHistory.person.firstName} ${personHistory.person.lastName}`,
      townName: personHistory.person.town.name,
      townSlug: personHistory.person.town.slug,
      personSlug: personHistory.person.slug,
      updateDescription: personHistory.title,
      updateDate: personHistory.date.toISOString(),
    });
  } catch (error) {
    console.error('Error fetching person history:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}