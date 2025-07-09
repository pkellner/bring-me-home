import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const detentionCenter = await prisma.detentionCenter.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            detainees: true,
          },
        },
      },
    });

    if (!detentionCenter) {
      return NextResponse.json({ error: 'Detention center not found' }, { status: 404 });
    }

    return NextResponse.json(detentionCenter);
  } catch (error) {
    console.error('Error fetching detention center:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}