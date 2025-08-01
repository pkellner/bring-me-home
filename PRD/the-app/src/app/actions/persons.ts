'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission, hasPersonAccess, isSiteAdmin } from '@/lib/permissions';
import { z } from 'zod';
import { validateImageBuffer } from '@/lib/image-utils';
import { processAndStoreImage } from '@/lib/image-storage';
import { createPersonSlug } from '@/lib/slug-utils';
import { invalidatePersonCache } from '@/lib/cache/person-cache';
import { invalidateTownCache } from '@/lib/cache/town-cache';
import { invalidateHomepageCache } from '@/lib/cache/homepage-cache';

const personSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  middleName: z.string().max(100).nullable().optional(),
  townId: z.string().min(1, 'Town is required'),
  dateOfBirth: z.string().nullable().optional(),
  lastKnownAddress: z.string().min(1, 'Last known address is required'),
  status: z.string().default('detained'),
  stories: z.string().nullable().optional(), // JSON string of stories array
  themeId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  detentionCenterId: z.string().nullable().optional(),
  detentionDate: z.string().nullable().optional(),
  detentionStatus: z.string().nullable().optional(),
  caseNumber: z.string().nullable().optional(),
  bondAmount: z.coerce.number().optional(),
  lastHeardFromDate: z.string().nullable().optional(),
  notesFromLastContact: z.string().nullable().optional(),
  representedByLawyer: z.boolean().optional(),
  representedByNotes: z.string().nullable().optional(),
  showDetentionInfo: z.boolean().optional(),
  showLastHeardFrom: z.boolean().optional(),
  showDetentionDate: z.boolean().optional(),
  showCommunitySupport: z.boolean().optional(),
});

export async function createPerson(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session, 'persons', 'create')) {
    throw new Error('Unauthorized');
  }

  // Verify session user exists in database
  const sessionUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true }
  });

  if (!sessionUser) {
    throw new Error('Invalid session. Please log out and log in again.');
  }

  const validatedFields = personSchema.safeParse({
    firstName: formData.get('firstName'),
    lastName: formData.get('lastName'),
    middleName: formData.get('middleName') || null,
    townId: formData.get('townId'),
    dateOfBirth: formData.get('dateOfBirth') || null,
    lastKnownAddress: formData.get('lastKnownAddress'),
    status: formData.get('status') || 'detained',
    stories: formData.get('stories') || null,
    themeId: formData.get('themeId') || null,
    isActive: formData.get('isActive') === 'on',
    detentionCenterId: formData.get('detentionCenterId') || null,
    detentionDate: formData.get('detentionDate') || null,
    detentionStatus: formData.get('detentionStatus') || null,
    caseNumber: formData.get('caseNumber') || null,
    bondAmount: formData.get('bondAmount')
      ? Number(formData.get('bondAmount'))
      : undefined,
    lastHeardFromDate: formData.get('lastHeardFromDate') || null,
    notesFromLastContact: formData.get('notesFromLastContact') || null,
    representedByLawyer: formData.get('representedByLawyer') === 'on',
    representedByNotes: formData.get('representedByNotes') || null,
    showDetentionInfo: formData.get('showDetentionInfo') === 'on',
    showLastHeardFrom: formData.get('showLastHeardFrom') === 'on',
    showDetentionDate: formData.get('showDetentionDate') === 'on',
    showCommunitySupport: formData.get('showCommunitySupport') === 'on',
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  try {
    // Get existing person slugs to ensure uniqueness
    const existingPersons = await prisma.person.findMany({
      select: { slug: true },
    });
    const existingSlugs = existingPersons.map(p => p.slug);

    // Generate unique slug
    const slug = createPersonSlug(
      validatedFields.data.firstName,
      validatedFields.data.middleName,
      validatedFields.data.lastName,
      existingSlugs
    );

    // Extract stories from data first (don't include in person creation)
    const storiesJson = validatedFields.data.stories;

    // Process data for database (exclude stories)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { stories, ...dataWithoutStories } = validatedFields.data;
    const data = {
      ...dataWithoutStories,
      slug,
      dateOfBirth: validatedFields.data.dateOfBirth
        ? new Date(validatedFields.data.dateOfBirth)
        : null,
      detentionDate: validatedFields.data.detentionDate
        ? new Date(validatedFields.data.detentionDate)
        : null,
      lastHeardFromDate: validatedFields.data.lastHeardFromDate
        ? new Date(validatedFields.data.lastHeardFromDate)
        : null,
    };

    // Handle empty detentionCenterId
    if (data.detentionCenterId === '') {
      data.detentionCenterId = undefined;
    }

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

      // Store the image with person association
      await processAndStoreImage(buffer, {
        personId: person.id,
        imageType: 'primary',
        sequenceNumber: 0,
        uploadedById: session.user.id,
      });
    }

    // Get the town slug for the redirect
    const createdPerson = await prisma.person.findUnique({
      where: { id: person.id },
      include: { town: true }
    });

    if (createdPerson) {
      // Invalidate town cache since a new person was added
      await invalidateTownCache(createdPerson.town.slug);
      // Invalidate homepage cache since recent persons might have changed
      await invalidateHomepageCache();
    }

    revalidatePath('/admin/persons');
    return {
      success: true,
      person: {
        id: person.id,
        slug: person.slug,
        townSlug: createdPerson?.town.slug || ''
      }
    };
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

  // Verify session user exists in database
  const sessionUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true }
  });

  if (!sessionUser) {
    throw new Error('Invalid session. Please log out and log in again.');
  }

  // Check if user has access to this person (unless they're a site admin)
  if (!isSiteAdmin(session) && !hasPersonAccess(session, id, 'write')) {
    throw new Error('No access to this person');
  }

  // Remove unused variable - stories are accessed later through validatedFields
  // const storiesFromForm = formData.get('stories');

  // Check if this is a partial update (only images)
  const hasPersonFields = formData.has('firstName') || formData.has('lastName') ||
                         formData.has('townId') || formData.has('lastKnownAddress');

  type ValidatedFieldsType = {
    success: boolean;
    data?: z.infer<typeof personSchema>;
    error?: z.ZodError<z.infer<typeof personSchema>>;
  };

  let validatedFields: ValidatedFieldsType = { success: true, data: {} as z.infer<typeof personSchema> };

  if (hasPersonFields) {
    // Full update with validation
    validatedFields = personSchema.safeParse({
      firstName: formData.get('firstName'),
      lastName: formData.get('lastName'),
      middleName: formData.get('middleName') || null,
      townId: formData.get('townId'),
      dateOfBirth: formData.get('dateOfBirth') || null,
      lastKnownAddress: formData.get('lastKnownAddress'),
      status: formData.get('status') || 'detained',
      stories: formData.get('stories') || null,
        themeId: formData.get('themeId') || null,
      isActive: formData.get('isActive') === 'on',
      detentionCenterId: formData.get('detentionCenterId') || null,
      detentionDate: formData.get('detentionDate') || null,
      detentionStatus: formData.get('detentionStatus') || null,
      caseNumber: formData.get('caseNumber') || null,
      bondAmount: formData.get('bondAmount')
        ? Number(formData.get('bondAmount'))
        : undefined,
      lastHeardFromDate: formData.get('lastHeardFromDate') || null,
      notesFromLastContact: formData.get('notesFromLastContact') || null,
      representedByLawyer: formData.get('representedByLawyer') === 'on',
      representedByNotes: formData.get('representedByNotes') || null,
      showDetentionInfo: formData.get('showDetentionInfo') === 'on',
      showLastHeardFrom: formData.get('showLastHeardFrom') === 'on',
      showDetentionDate: formData.get('showDetentionDate') === 'on',
      showCommunitySupport: formData.get('showCommunitySupport') === 'on',
    });

    if (!validatedFields.success) {
      return {
        errors: validatedFields.error?.flatten().fieldErrors || {},
      };
    }
  }

  try {
    // Get existing person for validation
    const existingPerson = await prisma.person.findUnique({
      where: { id },
      select: { firstName: true, middleName: true, lastName: true, slug: true },
    });

    if (!existingPerson) {
      throw new Error('Person not found');
    }

    let updateData: Partial<{
      firstName: string;
      lastName: string;
      middleName?: string | null;
      townId: string;
      dateOfBirth: Date | null;
      lastKnownAddress: string;
      status: string;
      themeId?: string | null;
      isActive?: boolean;
      detentionCenterId?: string | null;
      detentionDate: Date | null;
      detentionStatus?: string | null;
      caseNumber?: string | null;
      bondAmount?: number;
      lastHeardFromDate: Date | null;
      notesFromLastContact?: string | null;
      representedByLawyer?: boolean;
      representedByNotes?: string | null;
      showDetentionInfo?: boolean;
      showLastHeardFrom?: boolean;
      showDetentionDate?: boolean;
      showCommunitySupport?: boolean;
      slug: string;
    }> = {};
    let slug = existingPerson.slug;
    let storiesJson: string | null | undefined;

    // Only process person fields if they are present
    if (hasPersonFields && validatedFields.data) {
      // Check if name has changed
      const nameChanged =
        existingPerson.firstName !== validatedFields.data.firstName ||
        existingPerson.middleName !== validatedFields.data.middleName ||
        existingPerson.lastName !== validatedFields.data.lastName;

      // If name changed, check if we need a new slug
      if (nameChanged) {
        // First, generate the base slug to see if it would be different
        const baseSlug = createPersonSlug(
          validatedFields.data.firstName,
          validatedFields.data.middleName,
          validatedFields.data.lastName,
          [] // Empty array to get base slug without uniqueness suffix
        );

        // Only generate a new slug if the base would be different from current
        // This handles case-only changes where the slug would remain the same
        if (baseSlug !== existingPerson.slug) {
          const existingPersons = await prisma.person.findMany({
            where: { id: { not: id } }, // Exclude current person
            select: { slug: true },
          });
          const existingSlugs = existingPersons.map(p => p.slug);

          slug = createPersonSlug(
            validatedFields.data.firstName,
            validatedFields.data.middleName,
            validatedFields.data.lastName,
            existingSlugs
          );
        }
      }

      // Extract stories from data first (don't include in person update)
      storiesJson = validatedFields.data.stories;

      // Process data for database (exclude stories)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { stories, ...dataWithoutStories } = validatedFields.data;
      updateData = {
        ...dataWithoutStories,
        slug,
        dateOfBirth: validatedFields.data.dateOfBirth
          ? new Date(validatedFields.data.dateOfBirth)
          : null,
        detentionDate: validatedFields.data.detentionDate
          ? new Date(validatedFields.data.detentionDate)
          : null,
        lastHeardFromDate: validatedFields.data.lastHeardFromDate
          ? new Date(validatedFields.data.lastHeardFromDate)
          : null,
      };

      // Handle empty detentionCenterId
      if (updateData.detentionCenterId === '') {
        updateData.detentionCenterId = undefined;
      }
    }

    // Handle primary picture upload or clear
    const primaryPicture = formData.get('primaryPicture') as File;
    const clearPrimaryPicture = formData.get('clearPrimaryPicture') === 'true';

    if ((primaryPicture && primaryPicture.size > 0) || clearPrimaryPicture) {
      // Delete existing profile images through PersonImage
      const existingProfileImages = await prisma.personImage.findMany({
        where: {
          personId: id,
          imageType: 'primary',
        },
      });

      for (const pi of existingProfileImages) {
        await prisma.personImage.delete({
          where: { id: pi.id },
        });

        // Check if image is used elsewhere
        const otherUsage = await prisma.personImage.count({
          where: { imageId: pi.imageId },
        });

        if (otherUsage === 0) {
          // Also check detention center usage
          const dcUsage = await prisma.detentionCenterImage.count({
            where: { imageId: pi.imageId },
          });

          if (dcUsage === 0) {
            await prisma.imageStorage.delete({
              where: { id: pi.imageId },
            });
          }
        }
      }

      // Only store new image if we're not just clearing
      if (primaryPicture && primaryPicture.size > 0 && !clearPrimaryPicture) {
        const buffer = Buffer.from(await primaryPicture.arrayBuffer());

        // Validate image
        const isValidImage = await validateImageBuffer(buffer);
        if (!isValidImage) {
          return {
            errors: { _form: ['Invalid image file'] },
          };
        }

        // Store new profile image
        await processAndStoreImage(buffer, {
          personId: id,
          imageType: 'primary',
          sequenceNumber: 0,
          uploadedById: session.user.id,
        });
      }
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

    // Update person only if we have person fields
    if (hasPersonFields && Object.keys(updateData).length > 0) {
      await prisma.person.update({
        where: { id },
        data: updateData,
      });
    }

    // Handle additional gallery images
    if (additionalImages.length > 0) {
      // Get current max sequence number for gallery images
      const maxSeq = await prisma.personImage.aggregate({
        where: {
          personId: id,
          imageType: 'gallery',
        },
        _max: {
          sequenceNumber: true,
        },
      });
      let nextSequence = (maxSeq._max.sequenceNumber ?? -1) + 1;

      for (const imageData of additionalImages) {
        if (imageData.toDelete && imageData.id) {
          // Delete the PersonImage relationship
          const personImage = await prisma.personImage.findFirst({
            where: {
              personId: id,
              imageId: imageData.id,
            },
          });

          if (personImage) {
            await prisma.personImage.delete({
              where: { id: personImage.id },
            });

            // Check if image is used elsewhere
            const otherUsage = await prisma.personImage.count({
              where: { imageId: imageData.id },
            });

            if (otherUsage === 0) {
              // Also check detention center usage
              const dcUsage = await prisma.detentionCenterImage.count({
                where: { imageId: imageData.id },
              });

              if (dcUsage === 0) {
                await prisma.imageStorage.delete({
                  where: { id: imageData.id },
                });
              }
            }
          }
        } else if (imageData.isNew && imageData.file) {
          // Process and create new image
          try {
            // Get the file from FormData using the image ID
            const imageFile = formData.get(
              `galleryImage_${imageData.id}`
            ) as File;
            if (imageFile && imageFile.size > 0) {
              const buffer = Buffer.from(await imageFile.arrayBuffer());
              const isValidImage = await validateImageBuffer(buffer);

              if (isValidImage) {
                await processAndStoreImage(buffer, {
                  personId: id,
                  imageType: 'gallery',
                  sequenceNumber: nextSequence++,
                  caption: imageData.caption || undefined,
                  uploadedById: session.user.id,
                });
              }
            }
          } catch (error) {
            console.error('Failed to process additional image:', error);
          }
        } else if (imageData.id && !imageData.toDelete && !imageData.isNew) {
          // Update existing image caption
          await prisma.imageStorage.update({
            where: { id: imageData.id },
            data: {
              caption: imageData.caption || undefined,
            },
          });
        }
      }
    }

    // Handle stories update only if we have person fields
    if (hasPersonFields) {

      if (storiesJson !== undefined && storiesJson !== null && storiesJson !== '') {
        try {
          const stories = JSON.parse(storiesJson);

          // Delete existing stories for this person
          await prisma.story.deleteMany({
            where: { personId: id },
          });

          // Create new stories
          if (Array.isArray(stories) && stories.length > 0) {

            const storiesToCreate = stories.map(
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
            );


            await prisma.story.createMany({
              data: storiesToCreate,
            });

          }
        } catch (error) {
          console.error('Failed to update stories:', error);
        }
      }
    }

    // Verify stories were actually saved
    await prisma.story.findMany({
      where: { personId: id },
      orderBy: [{ language: 'asc' }, { storyType: 'asc' }],
    });

    // Get the updated person to find the town and person slugs
    const updatedPerson = await prisma.person.findUnique({
      where: { id },
      include: { town: true }
    });

    if (updatedPerson) {
      // Invalidate the cached person data
      await invalidatePersonCache(updatedPerson.town.slug, updatedPerson.slug);
      // Invalidate town cache since person data might have changed
      await invalidateTownCache(updatedPerson.town.slug);
      // Invalidate homepage cache in case this person appears in recent persons
      await invalidateHomepageCache();
      
      // Revalidate the public person page
      revalidatePath(`/${updatedPerson.town.slug}/${updatedPerson.slug}`);
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
    // Get person info before deleting for cache invalidation
    const person = await prisma.person.findUnique({
      where: { id },
      include: { town: true }
    });
    
    await prisma.person.delete({
      where: { id },
    });

    if (person) {
      // Invalidate person cache
      await invalidatePersonCache(person.town.slug, person.slug);
      // Invalidate town cache since person list changed
      await invalidateTownCache(person.town.slug);
      // Invalidate homepage cache in case this person was in recent persons
      await invalidateHomepageCache();
    }

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
    const person = await prisma.person.update({
      where: { id: personId },
      data: { isActive },
      include: { town: true }
    });

    // Invalidate caches when visibility changes
    await invalidatePersonCache(person.town.slug, person.slug);
    await invalidateTownCache(person.town.slug);
    await invalidateHomepageCache();

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
    // Get all affected persons with their towns for cache invalidation
    const affectedPersons = await prisma.person.findMany({
      where: { id: { in: personIds } },
      include: { town: true }
    });
    
    await prisma.person.updateMany({
      where: { id: { in: personIds } },
      data: { isActive },
    });

    // Invalidate caches for all affected persons and towns
    const uniqueTownSlugs = new Set<string>();
    for (const person of affectedPersons) {
      await invalidatePersonCache(person.town.slug, person.slug);
      uniqueTownSlugs.add(person.town.slug);
    }
    
    // Invalidate each unique town cache
    for (const townSlug of uniqueTownSlugs) {
      await invalidateTownCache(townSlug);
    }
    
    // Invalidate homepage cache once
    await invalidateHomepageCache();

    revalidatePath('/admin/persons');
    return { success: true };
  } catch (error) {
    console.error('Failed to update bulk person visibility:', error);
    return { success: false, error: 'Failed to update visibility' };
  }
}

interface ImportPersonData {
  // Person fields
  firstName?: string;
  middleName?: string;
  lastName?: string;
  dateOfBirth?: string;
  placeOfBirth?: string;
  height?: string;
  weight?: string;
  eyeColor?: string;
  hairColor?: string;
  phoneNumber?: string;
  emailAddress?: string;
  lastKnownAddress?: string;
  currentAddress?: string;
  internationalAddress?: string;
  alienIdNumber?: string;
  ssn?: string;
  bondAmount?: string;
  bondStatus?: string;
  caseNumber?: string;
  countryOfOrigin?: string;
  courtLocation?: string;
  nextCourtDate?: string;
  detentionDate?: string;
  detentionStatus?: string;
  releaseDate?: string;
  showDetentionInfo?: boolean;
  showDetentionDate?: boolean;
  legalRepName?: string;
  legalRepFirm?: string;
  legalRepPhone?: string;
  legalRepEmail?: string;
  representedByLawyer?: boolean;
  representedByNotes?: string;
  story?: string;
  detentionStory?: string;
  familyMessage?: string;
  lastHeardFromDate?: string;
  notesFromLastContact?: string;
  showLastHeardFrom?: boolean;
  status?: string;
  isActive?: boolean;
  isFound?: boolean;
  lastSeenDate?: string;
  lastSeenLocation?: string;
  primaryPictureData?: string;
  showCommunitySupport?: boolean;
  // Related data
  stories?: Array<{
    language: string;
    storyType: string;
    content: string;
    isActive?: boolean;
  }>;
  personImages?: Array<{
    imageUrl: string;
    caption?: string | null;
    isPrimary?: boolean;
    isActive?: boolean;
    displayPublicly?: boolean;
    imageData?: string | null;
  }>;
  // Export metadata and relations (to be excluded)
  id?: string;
  townId?: string;
  town?: unknown;
  themeId?: string;
  theme?: unknown;
  detentionCenterId?: string;
  detentionCenter?: unknown;
  createdAt?: string;
  updatedAt?: string;
  exportedAt?: string;
  exportVersion?: string;
}

export async function importPersonData(personId: string, importData: ImportPersonData) {
  const session = await getServerSession(authOptions);

  // Only system admins can import person data
  if (!session || !isSiteAdmin(session)) {
    throw new Error('Unauthorized - only system admins can import person data');
  }

  try {
    // Verify the person exists
    const existingPerson = await prisma.person.findUnique({
      where: { id: personId },
      include: {
        stories: true,
        personImages: {
          include: {
            image: true,
          },
        },
      }
    });

    if (!existingPerson) {
      throw new Error('Person not found');
    }

    // Extract data categories
    const {
      stories,
      personImages,
      primaryPictureData,
      // These are intentionally extracted to exclude them from personData
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      id: _id,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      townId: _townId,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      town: _town,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      createdAt: _createdAt,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      updatedAt: _updatedAt,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      exportedAt: _exportedAt,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      exportVersion: _exportVersion,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      themeId: _themeId,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      theme: _theme,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      detentionCenterId: _detentionCenterId,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      detentionCenter: _detentionCenter,
      ...personData
    } = importData;

    // Process images outside of transaction to avoid timeout
    const processedImages: Array<{
      buffer: Buffer;
      imageType: string;
      sequenceNumber: number;
      caption?: string;
    }> = [];

    // Prepare all images for processing

    // Process primary picture if provided
    if (primaryPictureData) {
      try {
        const base64Data = primaryPictureData.split(',')[1];
        const buffer = Buffer.from(base64Data, 'base64');
        processedImages.push({
          buffer,
          imageType: 'primary',
          sequenceNumber: 0,
          caption: undefined,
        });
      } catch (error) {
        console.error('Failed to prepare primary picture:', error);
      }
    }

    // Pre-process person images
    if (personImages && Array.isArray(personImages)) {
      let sequenceNumber = 0;

      // First, check for profile image from personImages if no primaryPictureData
      if (!primaryPictureData) {
        const profileImage = personImages.find(img => img.isPrimary && img.imageData);
        if (profileImage && profileImage.imageData) {
          try {
            const base64Data = profileImage.imageData.split(',')[1];
            const buffer = Buffer.from(base64Data, 'base64');
            processedImages.push({
              buffer,
              imageType: 'primary',
              sequenceNumber: 0,
              caption: profileImage.caption || undefined,
            });
          } catch (error) {
            console.error('Failed to prepare profile image from personImages:', error);
          }
        }
      }

      // Process gallery images
      sequenceNumber = 1; // Start gallery images at 1
      for (const image of personImages) {
        if (image.imageData && !image.isPrimary) {
          try {
            const base64Data = image.imageData.split(',')[1];
            const buffer = Buffer.from(base64Data, 'base64');
            processedImages.push({
              buffer,
              imageType: 'gallery',
              sequenceNumber,
              caption: image.caption || undefined,
            });
            sequenceNumber++;
          } catch (error) {
            console.error('Failed to prepare image for import:', error);
          }
        }
      }
    }

    // Start a transaction with increased timeout
    await prisma.$transaction(async (tx) => {
      // Update person data (excluding relationships and metadata)
      // personData already has the excluded fields removed from earlier extraction
      await tx.person.update({
        where: { id: personId },
        data: {
          ...personData,
          dateOfBirth: personData.dateOfBirth ? new Date(personData.dateOfBirth) : null,
          detentionDate: personData.detentionDate ? new Date(personData.detentionDate) : null,
          releaseDate: personData.releaseDate ? new Date(personData.releaseDate) : null,
          nextCourtDate: personData.nextCourtDate ? new Date(personData.nextCourtDate) : null,
          lastHeardFromDate: personData.lastHeardFromDate ? new Date(personData.lastHeardFromDate) : null,
          lastSeenDate: personData.lastSeenDate ? new Date(personData.lastSeenDate) : null,
          bondAmount: personData.bondAmount ? parseFloat(personData.bondAmount) : null,
        }
      });

      // Delete existing stories and recreate from import
      if (stories && Array.isArray(stories)) {
        await tx.story.deleteMany({
          where: { personId }
        });

        for (const story of stories) {
          await tx.story.create({
            data: {
              personId,
              language: story.language,
              storyType: story.storyType,
              content: story.content,
              isActive: story.isActive ?? true,
            }
          });
        }
      }

      // Delete all existing person-image associations
      // (We'll re-create them outside the transaction)
      const personImageAssociations = await tx.personImage.findMany({
        where: { personId },
        select: { imageId: true }
      });

      await tx.personImage.deleteMany({
        where: { personId }
      });

      // Delete orphaned images
      for (const assoc of personImageAssociations) {
        const otherUsage = await tx.personImage.count({
          where: {
            imageId: assoc.imageId,
            personId: { not: personId }
          }
        });

        const dcUsage = await tx.detentionCenterImage.count({
          where: { imageId: assoc.imageId }
        });

        if (otherUsage === 0 && dcUsage === 0) {
          await tx.imageStorage.delete({
            where: { id: assoc.imageId }
          });
        }
      }
    }, {
      maxWait: 10000, // Maximum time to wait for a transaction slot (10s)
      timeout: 30000, // Maximum time for the transaction to complete (30s)
    });

    // Process and store images after transaction
    let newPrimaryImageId: string | null = null;
    for (const imageData of processedImages) {
      try {
        const { imageId } = await processAndStoreImage(imageData.buffer, {
          personId,
          imageType: imageData.imageType,
          sequenceNumber: imageData.sequenceNumber,
          caption: imageData.caption,
          uploadedById: session.user.id,
        });

        // Track the profile image ID to update primaryPicture
        if (imageData.imageType === 'profile' && !newPrimaryImageId) {
          newPrimaryImageId = imageId;
        }
      } catch (error) {
        console.error('Failed to store imported image:', error);
      }
    }

    revalidatePath(`/admin/persons/${personId}/edit`);
    revalidatePath('/admin/persons');

    return { success: true, message: 'Person data imported successfully' };
  } catch (error) {
    console.error('Failed to import person data:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to import person data'
    };
  }
}
