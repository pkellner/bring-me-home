import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { updatePerson } from '@/app/actions/persons';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: personId } = await params;
    const searchParams = req.nextUrl.searchParams;
    const imageType = searchParams.get('type') || 'gallery';

    const personImages = await prisma.personImage.findMany({
      where: {
        personId: personId,
        imageType: imageType
      },
      include: {
        image: true
      },
      orderBy: {
        sequenceNumber: 'asc'
      }
    });

    // If requesting primary image, return just the first one (should be only one)
    if (imageType === 'primary') {
      return NextResponse.json(personImages[0] || null);
    }

    return NextResponse.json(personImages);
  } catch (error) {
    console.error('Error fetching person images:', error);
    return NextResponse.json(
      { error: 'Failed to fetch person images' },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: personId } = await params;
    const formData = await req.formData();
    
    // Use the existing updatePerson action which handles image updates
    const result = await updatePerson(personId, formData);
    
    if (result.errors) {
      console.error('Update person errors:', result.errors);
      const errorMessage = '_form' in result.errors && result.errors._form 
        ? result.errors._form[0] 
        : 'Failed to update image';
      return NextResponse.json(
        { error: errorMessage, details: result.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating person image:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update person image' },
      { status: 500 }
    );
  }
}