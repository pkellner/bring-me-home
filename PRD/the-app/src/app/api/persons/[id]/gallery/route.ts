import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ImageStorageService } from '@/lib/image-storage';

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
    const imageStorageService = new ImageStorageService(prisma);
    
    // Handle image deletions
    const deleteImageIds = formData.getAll('deleteImages').filter(id => id) as string[];
    if (deleteImageIds.length > 0) {
      // Delete PersonImage records
      await prisma.personImage.deleteMany({
        where: {
          personId: personId,
          imageId: { in: deleteImageIds }
        }
      });
      
      // Delete actual images
      for (const imageId of deleteImageIds) {
        await imageStorageService.deleteImage(imageId);
      }
    }

    // Handle new images
    const entries = Array.from(formData.entries());
    const newImageEntries = entries.filter(([key]) => key.startsWith('galleryImage_'));
    
    for (const [key, file] of newImageEntries) {
      if (file instanceof File) {
        const imageId = key.replace('galleryImage_', '');
        const caption = formData.get(`galleryCaption_${imageId}`) as string || '';
        
        // Save the image
        const buffer = Buffer.from(await file.arrayBuffer());
        const savedImage = await imageStorageService.storeImage(buffer, {
          caption: caption
        });
        
        // Get the highest sequence number for gallery images
        const maxSequence = await prisma.personImage.findFirst({
          where: {
            personId: personId,
            imageType: 'gallery'
          },
          orderBy: {
            sequenceNumber: 'desc'
          }
        });
        
        // Create PersonImage record
        await prisma.personImage.create({
          data: {
            personId: personId,
            imageId: savedImage.id,
            imageType: 'gallery',
            sequenceNumber: (maxSequence?.sequenceNumber || 0) + 1
          }
        });
      }
    }

    // Handle caption updates
    const captionUpdates = entries.filter(([key]) => key.startsWith('updateCaption_'));
    for (const [key, caption] of captionUpdates) {
      const imageId = key.replace('updateCaption_', '');
      await prisma.imageStorage.update({
        where: { id: imageId },
        data: { caption: caption as string }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating gallery images:', error);
    return NextResponse.json(
      { error: 'Failed to update gallery images' },
      { status: 500 }
    );
  }
}