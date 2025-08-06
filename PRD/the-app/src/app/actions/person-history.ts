'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPersonAccess, isSiteAdmin, isTownAdmin, isPersonAdmin } from '@/lib/permissions';
import { z } from 'zod';

// Get character limits from environment variables
const CHAR_LIMIT = parseInt(process.env.NEXT_PUBLIC_PERSON_HISTORY_CHAR_LIMIT || '5000', 10);
const HTML_MULTIPLIER = parseInt(process.env.NEXT_PUBLIC_PERSON_HISTORY_HTML_MULTIPLIER || '3', 10);
const HTML_LIMIT = CHAR_LIMIT * HTML_MULTIPLIER;

const personHistorySchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title must be less than 255 characters'),
  description: z.string().min(1, 'Description is required').max(HTML_LIMIT, `Description HTML content exceeds maximum size. Your content has too much formatting. Please simplify the formatting or shorten the text.`),
  date: z.string().optional().refine((val) => {
    if (!val) return true; // Optional field
    const date = new Date(val);
    return !isNaN(date.getTime());
  }, 'Invalid date format'),
  visible: z.boolean().optional(),
  sendNotifications: z.boolean().optional(),
});

export async function createPersonHistory(personId: string, formData: FormData) {

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  // Check if user has access to this person
  const hasAccess = await hasPersonAccess(session, personId, 'write') || 
                    isTownAdmin(session) || 
                    isPersonAdmin(session);
  
  if (!hasAccess) {
    throw new Error('Unauthorized');
  }

  const parseData = {
    title: formData.get('title'),
    description: formData.get('description'),
    date: formData.get('date'),
    visible: formData.get('visible') === 'true',
    sendNotifications: formData.get('sendNotifications') === 'true',
  };

  const validatedFields = personHistorySchema.safeParse(parseData);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  try {
    const { title, description, visible, sendNotifications } = validatedFields.data;

    // Only site admins can set sendNotifications
    const finalSendNotifications = isSiteAdmin(session) ? sendNotifications : false;

    // Always use current time for new entries
    const dateObj = new Date();
    
    const history = await prisma.personHistory.create({
      data: {
        personId,
        title,
        description,
        date: dateObj,
        visible: visible ?? true,
        sendNotifications: finalSendNotifications ?? false,
        createdByUsername: session.user.username || session.user.email || 'Unknown',
        createdByUserId: session.user.id,
      },
    });

    revalidatePath(`/admin/persons/${personId}/edit/history`);
    revalidatePath(`/[townSlug]/[personSlug]`, 'page');

    return { success: true, data: history };
  } catch (error) {
    console.error('[createPersonHistory] Error creating person history:', error);
    return { 
      error: 'Failed to create history note',
      errors: {},
    };
  }
}

export async function updatePersonHistory(historyId: string, formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  // Get the history record to check person access
  const history = await prisma.personHistory.findUnique({
    where: { id: historyId },
    select: { personId: true, sendNotifications: true, date: true },
  });

  if (!history) {
    throw new Error('History record not found');
  }

  // Check if user has access to this person
  const hasAccess = await hasPersonAccess(session, history.personId, 'write') || 
                    isTownAdmin(session) || 
                    isPersonAdmin(session);
  
  if (!hasAccess) {
    throw new Error('Unauthorized');
  }

  const validatedFields = personHistorySchema.safeParse({
    title: formData.get('title'),
    description: formData.get('description'),
    date: formData.get('date'), // Let validation handle optional field
    visible: formData.get('visible') === 'true',
    sendNotifications: formData.get('sendNotifications') === 'true',
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  try {
    const { title, description, date, visible, sendNotifications } = validatedFields.data;

    // Only site admins can change sendNotifications
    const finalSendNotifications = isSiteAdmin(session) 
      ? (sendNotifications ?? history.sendNotifications)
      : history.sendNotifications;

    // Handle datetime-local input or keep existing date if not provided
    let dateObj: Date;
    if (date) {
      // datetime-local format: "2024-01-25T14:30" or date format: "2024-01-25"
      dateObj = new Date(date);
    } else {
      // Keep existing date if not provided
      dateObj = history.date;
    }
    
    const updatedHistory = await prisma.personHistory.update({
      where: { id: historyId },
      data: {
        title,
        description,
        date: dateObj,
        visible: visible ?? true,
        sendNotifications: finalSendNotifications,
      },
    });

    revalidatePath(`/admin/persons/${history.personId}/edit/history`);
    revalidatePath(`/[townSlug]/[personSlug]`, 'page');

    return { success: true, data: updatedHistory };
  } catch (error) {
    console.error('Error updating person history:', error);
    return { 
      error: 'Failed to update history note',
      errors: {},
    };
  }
}

export async function deletePersonHistory(historyId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  // Get the history record to check person access
  const history = await prisma.personHistory.findUnique({
    where: { id: historyId },
    select: { personId: true },
  });

  if (!history) {
    throw new Error('History record not found');
  }

  // Check if user has access to this person
  const hasAccess = await hasPersonAccess(session, history.personId, 'write') || 
                    isTownAdmin(session) || 
                    isPersonAdmin(session);
  
  if (!hasAccess) {
    throw new Error('Unauthorized');
  }

  try {
    await prisma.personHistory.delete({
      where: { id: historyId },
    });

    revalidatePath(`/admin/persons/${history.personId}/edit/history`);
    revalidatePath(`/[townSlug]/[personSlug]`, 'page');

    return { success: true };
  } catch (error) {
    console.error('Error deleting person history:', error);
    return { 
      error: 'Failed to delete history note',
    };
  }
}

export async function deleteAllPersonHistory(personId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  // Only site admins can delete all history
  if (!isSiteAdmin(session)) {
    throw new Error('Only site admins can delete all history');
  }

  // Verify the person exists
  const person = await prisma.person.findUnique({
    where: { id: personId },
    select: { id: true },
  });

  if (!person) {
    return { error: 'Person not found' };
  }

  try {
    // Delete all history for this person
    await prisma.personHistory.deleteMany({
      where: { personId },
    });

    revalidatePath(`/admin/persons/${personId}/edit/history`);
    revalidatePath(`/[townSlug]/[personSlug]`, 'page');

    return { success: true };
  } catch (error) {
    console.error('Error deleting all person history:', error);
    return { 
      error: 'Failed to delete all history notes',
    };
  }
}

export async function getPersonHistory(personId: string, includeHidden = false) {
  const session = await getServerSession(authOptions);
  
  // For public view, only show visible notes
  const whereClause = includeHidden || !session ? 
    { personId } : 
    { personId, visible: true };

  try {
    const history = await prisma.personHistory.findMany({
      where: whereClause,
      include: {
        createdBy: {
          select: {
            username: true,
            email: true,
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
    });

    return history;
  } catch (error) {
    console.error('Error fetching person history:', error);
    return [];
  }
}