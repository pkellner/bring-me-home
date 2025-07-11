'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission, hasPersonAccess, isSiteAdmin } from '@/lib/permissions';
import { z } from 'zod';
import { validateImageBuffer } from '@/lib/image-utils';
import { processAndStoreImage } from '@/lib/image-storage';

const personSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  middleName: z.string().max(100).optional(),
  townId: z.string().min(1, 'Town is required'),
  dateOfBirth: z.string().optional(),
  lastKnownAddress: z.string().min(1, 'Last known address is required'),
  stories: z.string().optional(), // JSON string of stories array
  layoutId: z.string().optional(),
  themeId: z.string().optional(),
  isActive: z.boolean().optional(),
  detentionCenterId: z.string().optional(),
  detentionDate: z.string().optional(),
  detentionStatus: z.string().optional(),
  caseNumber: z.string().optional(),
  bondAmount: z.coerce.number().optional(),
  lastHeardFromDate: z.string().optional(),
  notesFromLastContact: z.string().optional(),
  representedByLawyer: z.boolean().optional(),
  representedByNotes: z.string().optional(),
});

export async function createPerson(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session, 'persons', 'create')) {
    throw new Error('Unauthorized');
  }

  const validatedFields = personSchema.safeParse({
    firstName: formData.get('firstName'),
    lastName: formData.get('lastName'),
    middleName: formData.get('middleName') || undefined,
    townId: formData.get('townId'),
    dateOfBirth: formData.get('dateOfBirth') || undefined,
    lastKnownAddress: formData.get('lastKnownAddress'),
    stories: formData.get('stories') || undefined,
    layoutId: formData.get('layoutId') || undefined,
    themeId: formData.get('themeId') || undefined,
    isActive: formData.get('isActive') === 'on',
    detentionCenterId: formData.get('detentionCenterId') || undefined,
    detentionDate: formData.get('detentionDate') || undefined,
    detentionStatus: formData.get('detentionStatus') || undefined,
    caseNumber: formData.get('caseNumber') || undefined,
    bondAmount: formData.get('bondAmount')
      ? Number(formData.get('bondAmount'))
      : undefined,
    lastHeardFromDate: formData.get('lastHeardFromDate') || undefined,
    notesFromLastContact: formData.get('notesFromLastContact') || undefined,
    representedByLawyer: formData.get('representedByLawyer') === 'on',
    representedByNotes: formData.get('representedByNotes') || undefined,
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  try {
    // Process data for database
    const data = {
      ...validatedFields.data,
      dateOfBirth: validatedFields.data.dateOfBirth
        ? new Date(validatedFields.data.dateOfBirth)
        : undefined,
      detentionDate: validatedFields.data.detentionDate
        ? new Date(validatedFields.data.detentionDate)
        : undefined,
      lastHeardFromDate: validatedFields.data.lastHeardFromDate
        ? new Date(validatedFields.data.lastHeardFromDate)
        : undefined,
      stories: undefined as undefined, // Explicitly remove stories field
    };

    // Handle empty detentionCenterId
    if (data.detentionCenterId === '') {
      data.detentionCenterId = undefined;
    }

    // Extract stories from data (don't include in person creation)
    const storiesJson = data.stories;
    delete data.stories;

    const person = await prisma.person.create({
      data,
    });

    // Handle stories creation
    if (storiesJson) {
      try {
        const stories = JSON.parse(storiesJson);
        if (Array.isArray(stories) && stories.length > 0) {
          await prisma.story.createMany({
            data: stories.map(
              (story: {
                language: string;
                storyType: string;
                content: string;
              }) => ({
                personId: person.id,
                language: story.language,
                storyType: story.storyType,
                content: story.content,
                isActive: true,
              })
            ),
          });
        }
      } catch (error) {
        console.error('Failed to parse stories:', error);
      }
    }

    // Handle primary picture upload
    const primaryPicture = formData.get('primaryPicture') as File;
    if (primaryPicture && primaryPicture.size > 0) {
      const buffer = Buffer.from(await primaryPicture.arrayBuffer());

      // Validate image
      const isValidImage = await validateImageBuffer(buffer);
      if (!isValidImage) {
        // Delete the person record since image upload failed
        await prisma.person.delete({ where: { id: person.id } });
        return {
          errors: { _form: ['Invalid image file'] },
        };
      }

      const { fullImageId } = await processAndStoreImage(buffer);
      const fullPath = `/api/images/${fullImageId}`;

      // Create PersonImage record for primary image
      await prisma.personImage.create({
        data: {
          imageUrl: fullPath,
          thumbnailUrl: fullPath,
          isPrimary: true,
          isActive: true,
          displayPublicly: true,
          personId: person.id,
          uploadedById: session.user.id,
        },
      });
    }

    revalidatePath('/admin/persons');
    return { success: true };
  } catch (error) {
    console.error('Failed to create person:', error);
    return {
      errors: { _form: ['Failed to create person. Slug may already exist.'] },
    };
  }
}

export async function updatePerson(id: string, formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session, 'persons', 'update')) {
    throw new Error('Unauthorized');
  }

  // Check if user has access to this person (unless they're a site admin)
  if (!isSiteAdmin(session) && !hasPersonAccess(session, id, 'write')) {
    throw new Error('No access to this person');
  }

  const validatedFields = personSchema.safeParse({
    firstName: formData.get('firstName'),
    lastName: formData.get('lastName'),
    middleName: formData.get('middleName') || undefined,
    townId: formData.get('townId'),
    dateOfBirth: formData.get('dateOfBirth') || undefined,
    lastKnownAddress: formData.get('lastKnownAddress'),
    stories: formData.get('stories') || undefined,
    layoutId: formData.get('layoutId') || undefined,
    themeId: formData.get('themeId') || undefined,
    isActive: formData.get('isActive') === 'on',
    detentionCenterId: formData.get('detentionCenterId') || undefined,
    detentionDate: formData.get('detentionDate') || undefined,
    detentionStatus: formData.get('detentionStatus') || undefined,
    caseNumber: formData.get('caseNumber') || undefined,
    bondAmount: formData.get('bondAmount')
      ? Number(formData.get('bondAmount'))
      : undefined,
    lastHeardFromDate: formData.get('lastHeardFromDate') || undefined,
    notesFromLastContact: formData.get('notesFromLastContact') || undefined,
    representedByLawyer: formData.get('representedByLawyer') === 'on',
    representedByNotes: formData.get('representedByNotes') || undefined,
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  try {
    // Process data for database
    const updateData = {
      ...validatedFields.data,
      dateOfBirth: validatedFields.data.dateOfBirth
        ? new Date(validatedFields.data.dateOfBirth)
        : null,
      detentionDate: validatedFields.data.detentionDate
        ? new Date(validatedFields.data.detentionDate)
        : null,
      lastHeardFromDate: validatedFields.data.lastHeardFromDate
        ? new Date(validatedFields.data.lastHeardFromDate)
        : null,
      stories: undefined as undefined, // Explicitly remove stories field
    };

    // Handle empty detentionCenterId
    if (updateData.detentionCenterId === '') {
      updateData.detentionCenterId = undefined;
    }

    // Extract stories from data (don't include in person update)
    const storiesJson = updateData.stories;
    delete updateData.stories;

    // Handle primary picture upload
    const primaryPicture = formData.get('primaryPicture') as File;
    if (primaryPicture && primaryPicture.size > 0) {
      const buffer = Buffer.from(await primaryPicture.arrayBuffer());

      // Validate image
      const isValidImage = await validateImageBuffer(buffer);
      if (!isValidImage) {
        return {
          errors: { _form: ['Invalid image file'] },
        };
      }

      const { fullImageId } = await processAndStoreImage(buffer);
      const fullPath = `/api/images/${fullImageId}`;
      
      // Mark existing primary images as non-primary
      await prisma.personImage.updateMany({
        where: {
          personId: id,
          isPrimary: true,
        },
        data: {
          isPrimary: false,
        },
      });
      
      // Create new primary image
      await prisma.personImage.create({
        data: {
          imageUrl: fullPath,
          thumbnailUrl: fullPath,
          isPrimary: true,
          isActive: true,
          displayPublicly: true,
          personId: id,
          uploadedById: session.user.id,
        },
      });
    }

    // Handle additional images
    const additionalImagesJson = formData.get('additionalImages') as string;
    let additionalImages: Array<{
      buffer?: Buffer;
      caption?: string;
      toDelete?: boolean;
      id?: string;
      isNew?: boolean;
      file?: File;
    }> = [];
    if (additionalImagesJson) {
      try {
        additionalImages = JSON.parse(additionalImagesJson);
      } catch (error) {
        console.error('Failed to parse additional images:', error);
      }
    }

    // Update person first
    await prisma.person.update({
      where: { id },
      data: updateData,
    });

    // Handle PersonImage records
    if (additionalImages.length > 0) {
      for (const imageData of additionalImages) {
        if (imageData.toDelete && imageData.id) {
          // Delete existing image
          await prisma.personImage.update({
            where: { id: imageData.id },
            data: { isActive: false },
          });
        } else if (imageData.isNew && imageData.file) {
          // Process and create new image
          try {
            // Get the file from FormData
            const imageFile = formData.get(
              `image_file_${additionalImages.indexOf(imageData)}`
            ) as File;
            if (imageFile && imageFile.size > 0) {
              const buffer = Buffer.from(await imageFile.arrayBuffer());
              const isValidImage = await validateImageBuffer(buffer);

              if (isValidImage) {
                const { fullImageId, thumbnailImageId } =
                  await processAndStoreImage(buffer);

                await prisma.personImage.create({
                  data: {
                    personId: id,
                    imageUrl: `/api/images/${fullImageId}`,
                    thumbnailUrl: `/api/images/${thumbnailImageId}`,
                    fullImageId,
                    thumbnailImageId,
                    caption: imageData.caption || null,
                    displayPublicly: true, // All images are public now
                    isPrimary: false,
                    isActive: true,
                    uploadedById: session.user.id,
                  },
                });
              }
            }
          } catch (error) {
            console.error('Failed to process additional image:', error);
          }
        } else if (imageData.id && !imageData.toDelete) {
          // Update existing image
          await prisma.personImage.update({
            where: { id: imageData.id },
            data: {
              caption: imageData.caption || null,
            },
          });
        }
      }
    }

    // Handle stories update
    if (storiesJson) {
      try {
        const stories = JSON.parse(storiesJson);

        // Delete existing stories for this person
        await prisma.story.deleteMany({
          where: { personId: id },
        });

        // Create new stories
        if (Array.isArray(stories) && stories.length > 0) {
          await prisma.story.createMany({
            data: stories.map(
              (story: {
                language: string;
                storyType: string;
                content: string;
              }) => ({
                personId: id,
                language: story.language,
                storyType: story.storyType,
                content: story.content,
                isActive: true,
              })
            ),
          });
        }
      } catch (error) {
        console.error('Failed to update stories:', error);
      }
    }

    revalidatePath('/admin/persons');
    revalidatePath(`/admin/persons/${id}/edit`);
    return { success: true };
  } catch (error) {
    console.error('Failed to update person:', error);
    return {
      errors: { _form: ['Failed to update person. Slug may already exist.'] },
    };
  }
}

export async function deletePerson(id: string) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session, 'persons', 'delete')) {
    throw new Error('Unauthorized');
  }

  // Check if user has access to this person (unless they're a site admin)
  if (!isSiteAdmin(session) && !hasPersonAccess(session, id, 'admin')) {
    throw new Error('No access to this person');
  }

  try {
    await prisma.person.delete({
      where: { id },
    });

    revalidatePath('/admin/persons');
    return { success: true };
  } catch (error) {
    console.error('Failed to delete person:', error);
    return {
      errors: {
        _form: ['Failed to delete person. They may have associated comments.'],
      },
    };
  }
}

export async function togglePersonVisibility(
  personId: string,
  isActive: boolean
) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session, 'persons', 'update')) {
    throw new Error('Unauthorized');
  }

  // Check if user has access to this person (unless they're a site admin)
  if (!isSiteAdmin(session) && !hasPersonAccess(session, personId, 'write')) {
    throw new Error('No access to this person');
  }

  try {
    await prisma.person.update({
      where: { id: personId },
      data: { isActive },
    });

    revalidatePath('/admin/persons');
    return { success: true };
  } catch (error) {
    console.error('Failed to update person visibility:', error);
    return { success: false, error: 'Failed to update visibility' };
  }
}

export async function updateBulkPersonVisibility(
  personIds: string[],
  isActive: boolean
) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session, 'persons', 'update')) {
    throw new Error('Unauthorized');
  }

  // If not site admin, verify access to all persons
  if (!isSiteAdmin(session)) {
    for (const personId of personIds) {
      if (!hasPersonAccess(session, personId, 'write')) {
        throw new Error('No access to some persons');
      }
    }
  }

  try {
    await prisma.person.updateMany({
      where: { id: { in: personIds } },
      data: { isActive },
    });

    revalidatePath('/admin/persons');
    return { success: true };
  } catch (error) {
    console.error('Failed to update bulk person visibility:', error);
    return { success: false, error: 'Failed to update visibility' };
  }
}
