'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isSiteAdmin } from '@/lib/permissions';
import { ImageStorageService } from '@/lib/image-storage';

interface ExportedImage {
  imageType: 'primary' | 'gallery';
  sequenceNumber: number;
  caption?: string | null;
  mimeType: string;
  imageData: string; // base64
}

interface ExportedStory {
  language: string;
  storyType: string;
  content: string;
  isActive: boolean;
}

interface ExportedPersonData {
  // Person fields (excluding relations and IDs)
  firstName: string;
  middleName?: string | null;
  lastName: string;
  alienIdNumber?: string | null;
  ssn?: string | null;
  dateOfBirth?: string | null;
  placeOfBirth?: string | null;
  height?: string | null;
  weight?: string | null;
  eyeColor?: string | null;
  hairColor?: string | null;
  lastKnownAddress: string;
  currentAddress?: string | null;
  phoneNumber?: string | null;
  emailAddress?: string | null;
  story?: string | null;
  detentionStory?: string | null;
  familyMessage?: string | null;
  lastSeenDate?: string | null;
  lastSeenLocation?: string | null;
  isActive: boolean;
  isFound: boolean;
  status: string;
  detentionDate?: string | null;
  lastHeardFromDate?: string | null;
  notesFromLastContact?: string | null;
  releaseDate?: string | null;
  detentionStatus?: string | null;
  caseNumber?: string | null;
  bondAmount?: string | null;
  bondStatus?: string | null;
  representedByLawyer: boolean;
  representedByNotes?: string | null;
  legalRepName?: string | null;
  legalRepPhone?: string | null;
  legalRepEmail?: string | null;
  legalRepFirm?: string | null;
  nextCourtDate?: string | null;
  courtLocation?: string | null;
  internationalAddress?: string | null;
  countryOfOrigin?: string | null;
  showDetentionInfo: boolean;
  showLastHeardFrom: boolean;
  showDetentionDate: boolean;
  showCommunitySupport: boolean;
  
  // Related data
  stories: ExportedStory[];
  images: ExportedImage[];
  
  // Export metadata
  exportVersion: string;
  exportedAt: string;
  exportedBy: string;
}

export async function exportPersonData(personId: string): Promise<{ success: boolean; data?: ExportedPersonData; error?: string }> {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isSiteAdmin(session)) {
      return { success: false, error: 'Unauthorized' };
    }

    // Fetch person with all related data
    const person = await prisma.person.findUnique({
      where: { id: personId },
      include: {
        stories: {
          where: { isActive: true }
        },
        personImages: {
          include: {
            image: true
          },
          orderBy: [
            { imageType: 'asc' },
            { sequenceNumber: 'asc' }
          ]
        }
      }
    });

    if (!person) {
      return { success: false, error: 'Person not found' };
    }

    // Prepare images with base64 data
    const imageService = new ImageStorageService(prisma);
    const exportedImages: ExportedImage[] = [];
    
    for (const personImage of person.personImages) {
      try {
        const imageData = await imageService.getImage(personImage.image.id);
        if (imageData?.buffer) {
          const base64 = `data:${personImage.image.mimeType};base64,${imageData.buffer.toString('base64')}`;
          exportedImages.push({
            imageType: personImage.imageType as 'primary' | 'gallery',
            sequenceNumber: personImage.sequenceNumber,
            caption: personImage.image.caption,
            mimeType: personImage.image.mimeType,
            imageData: base64
          });
        }
      } catch (error) {
        console.error('Failed to export image:', personImage.imageId, error);
      }
    }

    // Prepare export data
    const exportData: ExportedPersonData = {
      // Person fields
      firstName: person.firstName,
      middleName: person.middleName,
      lastName: person.lastName,
      alienIdNumber: person.alienIdNumber,
      ssn: person.ssn,
      dateOfBirth: person.dateOfBirth?.toISOString() || null,
      placeOfBirth: person.placeOfBirth,
      height: person.height,
      weight: person.weight,
      eyeColor: person.eyeColor,
      hairColor: person.hairColor,
      lastKnownAddress: person.lastKnownAddress,
      currentAddress: person.currentAddress,
      phoneNumber: person.phoneNumber,
      emailAddress: person.emailAddress,
      story: person.story,
      detentionStory: person.detentionStory,
      familyMessage: person.familyMessage,
      lastSeenDate: person.lastSeenDate?.toISOString() || null,
      lastSeenLocation: person.lastSeenLocation,
      isActive: person.isActive,
      isFound: person.isFound,
      status: person.status,
      detentionDate: person.detentionDate?.toISOString() || null,
      lastHeardFromDate: person.lastHeardFromDate?.toISOString() || null,
      notesFromLastContact: person.notesFromLastContact,
      releaseDate: person.releaseDate?.toISOString() || null,
      detentionStatus: person.detentionStatus,
      caseNumber: person.caseNumber,
      bondAmount: person.bondAmount?.toString() || null,
      bondStatus: person.bondStatus,
      representedByLawyer: person.representedByLawyer,
      representedByNotes: person.representedByNotes,
      legalRepName: person.legalRepName,
      legalRepPhone: person.legalRepPhone,
      legalRepEmail: person.legalRepEmail,
      legalRepFirm: person.legalRepFirm,
      nextCourtDate: person.nextCourtDate?.toISOString() || null,
      courtLocation: person.courtLocation,
      internationalAddress: person.internationalAddress,
      countryOfOrigin: person.countryOfOrigin,
      showDetentionInfo: person.showDetentionInfo,
      showLastHeardFrom: person.showLastHeardFrom,
      showDetentionDate: person.showDetentionDate,
      showCommunitySupport: person.showCommunitySupport,
      
      // Related data
      stories: person.stories.map(story => ({
        language: story.language,
        storyType: story.storyType,
        content: story.content,
        isActive: story.isActive
      })),
      images: exportedImages,
      
      // Metadata
      exportVersion: '2.0',
      exportedAt: new Date().toISOString(),
      exportedBy: session.user.email || session.user.username
    };

    return { success: true, data: exportData };
  } catch (error) {
    console.error('Export error:', error);
    return { success: false, error: 'Failed to export person data' };
  }
}

export async function importPersonData(
  personId: string, 
  importData: ExportedPersonData
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isSiteAdmin(session)) {
      return { success: false, error: 'Unauthorized' };
    }

    // Verify the person exists
    const existingPerson = await prisma.person.findUnique({
      where: { id: personId }
    });

    if (!existingPerson) {
      return { success: false, error: 'Person not found' };
    }

    // Prepare images for import
    const imageService = new ImageStorageService(prisma);
    const imagesToCreate: Array<{
      imageType: 'primary' | 'gallery';
      sequenceNumber: number;
      caption?: string;
      buffer: Buffer;
    }> = [];

    // Process images from import data
    if (importData.images && Array.isArray(importData.images)) {
      for (const image of importData.images) {
        if (image.imageData) {
          try {
            // Extract base64 data
            const base64Match = image.imageData.match(/^data:([^;]+);base64,(.+)$/);
            if (base64Match) {
              const buffer = Buffer.from(base64Match[2], 'base64');
              imagesToCreate.push({
                buffer,
                imageType: image.imageType,
                sequenceNumber: image.sequenceNumber,
                caption: image.caption || undefined
              });
            }
          } catch (error) {
            console.error('Failed to process image:', error);
          }
        }
      }
    }

    // Start transaction
    await prisma.$transaction(async (tx) => {
      // Update person data
      await tx.person.update({
        where: { id: personId },
        data: {
          firstName: importData.firstName,
          middleName: importData.middleName,
          lastName: importData.lastName,
          alienIdNumber: importData.alienIdNumber,
          ssn: importData.ssn,
          dateOfBirth: importData.dateOfBirth ? new Date(importData.dateOfBirth) : null,
          placeOfBirth: importData.placeOfBirth,
          height: importData.height,
          weight: importData.weight,
          eyeColor: importData.eyeColor,
          hairColor: importData.hairColor,
          lastKnownAddress: importData.lastKnownAddress,
          currentAddress: importData.currentAddress,
          phoneNumber: importData.phoneNumber,
          emailAddress: importData.emailAddress,
          story: importData.story,
          detentionStory: importData.detentionStory,
          familyMessage: importData.familyMessage,
          lastSeenDate: importData.lastSeenDate ? new Date(importData.lastSeenDate) : null,
          lastSeenLocation: importData.lastSeenLocation,
          isActive: importData.isActive,
          isFound: importData.isFound,
          status: importData.status,
          detentionDate: importData.detentionDate ? new Date(importData.detentionDate) : null,
          lastHeardFromDate: importData.lastHeardFromDate ? new Date(importData.lastHeardFromDate) : null,
          notesFromLastContact: importData.notesFromLastContact,
          releaseDate: importData.releaseDate ? new Date(importData.releaseDate) : null,
          detentionStatus: importData.detentionStatus,
          caseNumber: importData.caseNumber,
          bondAmount: importData.bondAmount ? parseFloat(importData.bondAmount) : null,
          bondStatus: importData.bondStatus,
          representedByLawyer: importData.representedByLawyer,
          representedByNotes: importData.representedByNotes,
          legalRepName: importData.legalRepName,
          legalRepPhone: importData.legalRepPhone,
          legalRepEmail: importData.legalRepEmail,
          legalRepFirm: importData.legalRepFirm,
          nextCourtDate: importData.nextCourtDate ? new Date(importData.nextCourtDate) : null,
          courtLocation: importData.courtLocation,
          internationalAddress: importData.internationalAddress,
          countryOfOrigin: importData.countryOfOrigin,
          showDetentionInfo: importData.showDetentionInfo,
          showLastHeardFrom: importData.showLastHeardFrom,
          showDetentionDate: importData.showDetentionDate,
          showCommunitySupport: importData.showCommunitySupport,
        }
      });

      // Delete and recreate stories
      await tx.story.deleteMany({
        where: { personId }
      });

      if (importData.stories && Array.isArray(importData.stories)) {
        for (const story of importData.stories) {
          await tx.story.create({
            data: {
              personId,
              language: story.language,
              storyType: story.storyType,
              content: story.content,
              isActive: story.isActive
            }
          });
        }
      }

      // Delete existing person images
      const existingImages = await tx.personImage.findMany({
        where: { personId },
        select: { imageId: true }
      });

      await tx.personImage.deleteMany({
        where: { personId }
      });

      // Delete orphaned images
      for (const img of existingImages) {
        const otherUsage = await tx.personImage.count({
          where: { imageId: img.imageId }
        });
        const dcUsage = await tx.detentionCenterImage.count({
          where: { imageId: img.imageId }
        });
        
        if (otherUsage === 0 && dcUsage === 0) {
          await tx.imageStorage.delete({
            where: { id: img.imageId }
          });
        }
      }
    }, {
      maxWait: 10000,
      timeout: 30000
    });

    // Create new images outside transaction
    for (const imageData of imagesToCreate) {
      try {
        await imageService.addPersonImage(
          personId,
          imageData.buffer,
          imageData.imageType,
          {
            sequenceNumber: imageData.sequenceNumber,
            caption: imageData.caption,
            uploadedById: session.user.id
          }
        );
      } catch (error) {
        console.error('Failed to create image:', error);
      }
    }

    return { 
      success: true, 
      message: `Successfully imported data for ${importData.firstName} ${importData.lastName}` 
    };
  } catch (error) {
    console.error('Import error:', error);
    return { success: false, error: 'Failed to import person data' };
  }
}