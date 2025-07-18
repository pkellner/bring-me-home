'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { hasPermission, hasPersonAccess, isSiteAdmin } from '@/lib/permissions';
import { headers } from 'next/headers';

const debugCaptcha = false;

const commentSchema = z.object({
  personId: z.string().min(1, 'Person ID is required'),
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  occupation: z.string().optional().or(z.literal('')),
  birthdate: z.string().optional().or(z.literal('')),
  streetAddress: z.string().optional().or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  state: z.string().max(2).optional().or(z.literal('')),
  zipCode: z.string().max(10).optional().or(z.literal('')),
  content: z.string().max(500).optional().or(z.literal('')),
  privateNoteToFamily: z.string().max(1500).optional().or(z.literal('')),
  wantsToHelpMore: z.boolean().default(false),
  displayNameOnly: z.boolean().default(false),
  requiresFamilyApproval: z.boolean().default(true),
  showOccupation: z.boolean().default(false),
  showBirthdate: z.boolean().default(false),
  showComment: z.boolean().default(true),
  showCityState: z.boolean().default(true),
  privacyRequiredDoNotShowPublicly: z.boolean().default(false),
});

async function verifyRecaptcha(token: string): Promise<boolean> {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;

  if (debugCaptcha) {
    console.log('[verifyRecaptcha] Starting verification');
    console.log('[verifyRecaptcha] Secret key present:', !!secretKey);
    console.log('[verifyRecaptcha] Secret key length:', secretKey?.length);
    console.log('[verifyRecaptcha] Token received:', token ? `${token.substring(0, 20)}...` : 'NO TOKEN');
    console.log('[verifyRecaptcha] Token length:', token?.length);
    console.log('[verifyRecaptcha] Token sample:', token ? token.substring(0, 50) : 'NO TOKEN');
  }

  if (!secretKey) {
    console.error('RECAPTCHA_SECRET_KEY not configured');
    return false;
  }

  try {
    const verifyUrl = 'https://www.google.com/recaptcha/api/siteverify';

    // Properly encode the parameters
    const params = new URLSearchParams();
    params.append('secret', secretKey);
    params.append('response', token);

    if (debugCaptcha) {
      console.log('[verifyRecaptcha] Sending request to:', verifyUrl);
      console.log('[verifyRecaptcha] Request params:', params.toString().substring(0, 100) + '...');
      console.log('[verifyRecaptcha] Secret key in body (first 10 chars):', secretKey ? secretKey.substring(0, 10) : 'NO KEY');
      // Log if token contains any special characters that might need encoding
      console.log('[verifyRecaptcha] Token contains special chars:', /[^a-zA-Z0-9_-]/.test(token));
    }

    const response = await fetch(verifyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const data = await response.json();

    if (debugCaptcha) {
      console.log('[verifyRecaptcha] Response status:', response.status);
      console.log('[verifyRecaptcha] Response data:', {
        success: data.success,
        score: data.score,
        action: data.action,
        hostname: data.hostname,
        challenge_ts: data.challenge_ts,
        error_codes: data['error-codes'],
      });
    }

    // Google reCAPTCHA v3 returns a score from 0.0 to 1.0
    // 0.5 is a reasonable threshold, adjust as needed
    const isValid = data.success && data.score >= 0.5;

    if (debugCaptcha) {
      console.log('[verifyRecaptcha] Verification result:', isValid);
      if (!data.success) {
        console.log('[verifyRecaptcha] Verification failed, error codes:', data['error-codes']);
      }
    }

    return isValid;
  } catch (error) {
    console.error('reCAPTCHA verification error:', error);
    if (debugCaptcha) {
      console.error('[verifyRecaptcha] Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
    return false;
  }
}

export async function submitComment(
  prevState: {
    success?: boolean;
    error?: string;
    errors?: Record<string, string[]>;
  },
  formData: FormData
) {
  try {
    // Verify reCAPTCHA token
    const recaptchaToken = formData.get('recaptchaToken') as string;

    if (debugCaptcha) {
      console.log('[submitComment] Starting comment submission');
      console.log('[submitComment] reCAPTCHA token present:', !!recaptchaToken);
      console.log('[submitComment] Token from formData length:', recaptchaToken?.length);
      console.log('[submitComment] Token from formData (first 50):', recaptchaToken ? recaptchaToken.substring(0, 50) : 'NO TOKEN');

      // Check all formData entries
      console.log('[submitComment] All formData keys:', Array.from(formData.keys()));
    }

    if (!recaptchaToken) {
      if (debugCaptcha) {
        console.error('[submitComment] No reCAPTCHA token provided');
      }
      return {
        success: false,
        error: 'Security verification failed. Please refresh the page and try again.',
      };
    }

    const isValidRecaptcha = await verifyRecaptcha(recaptchaToken);
    if (!isValidRecaptcha) {
      if (debugCaptcha) {
        console.error('[submitComment] reCAPTCHA verification failed');
      }
      return {
        success: false,
        error: 'Security verification failed. Please try again.',
      };
    }

    if (debugCaptcha) {
      console.log('[submitComment] reCAPTCHA verification passed, proceeding with comment submission');
    }

    const rawData = {
      personId: formData.get('personId') as string,
      firstName: formData.get('firstName') as string,
      lastName: formData.get('lastName') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      occupation: formData.get('occupation') as string,
      birthdate: formData.get('birthdate') as string,
      streetAddress: formData.get('streetAddress') as string,
      city: formData.get('city') as string,
      state: formData.get('state') as string,
      zipCode: formData.get('zipCode') as string,
      content: formData.get('content') as string,
      privateNoteToFamily: formData.get('privateNoteToFamily') as string,
      wantsToHelpMore: formData.get('wantsToHelpMore') === 'true',
      displayNameOnly: formData.get('displayNameOnly') === 'true',
      requiresFamilyApproval: formData.get('requiresFamilyApproval') === 'true',
      showOccupation: formData.get('showOccupation') === 'true',
      showBirthdate: formData.get('showBirthdate') === 'true',
      showCityState: formData.get('showCityState') === 'true',
      privacyRequiredDoNotShowPublicly: formData.get('privacyRequiredDoNotShowPublicly') === 'true',
    };

    const validatedData = commentSchema.safeParse(rawData);

    if (!validatedData.success) {
      return {
        success: false,
        errors: validatedData.error.flatten().fieldErrors,
      };
    }

    const data = validatedData.data;

    // Check if person exists and is active
    const person = await prisma.person.findFirst({
      where: {
        id: data.personId,
        isActive: true,
      },
    });

    if (!person) {
      return {
        success: false,
        error: 'Person not found or no longer active',
      };
    }

    // Get IP address and user agent from headers
    const headersList = await headers();
    const forwarded = headersList.get('x-forwarded-for');
    const ipAddress = forwarded ? forwarded.split(',')[0] : headersList.get('x-real-ip') || 'unknown';
    const userAgent = headersList.get('user-agent') || undefined;

    // Create the comment
    await prisma.comment.create({
      data: {
        personId: data.personId,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email || null,
        phone: data.phone || null,
        occupation: data.occupation || null,
        birthdate: data.birthdate ? new Date(data.birthdate) : null,
        streetAddress: data.streetAddress || null,
        city: data.city || null,
        state: data.state || null,
        zipCode: data.zipCode || null,
        content: data.content || '',
        privateNoteToFamily: data.privateNoteToFamily || null,
        wantsToHelpMore: data.wantsToHelpMore,
        displayNameOnly: data.displayNameOnly,
        requiresFamilyApproval: data.requiresFamilyApproval,
        showOccupation: data.showOccupation,
        showBirthdate: data.showBirthdate,
        showCityState: data.showCityState,
        privacyRequiredDoNotShowPublicly: data.privacyRequiredDoNotShowPublicly,
        type: 'support',
        visibility: 'public',
        isActive: true,
        isApproved: false, // Requires approval
        ipAddress,
        userAgent,
      },
    });

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error submitting comment:', error);
    return {
      success: false,
      error: 'An unexpected error occurred. Please try again.',
    };
  }
}

export async function approveComment(
  commentId: string,
  moderatorNotes?: string
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  // Check if user has permission to update comments
  if (!hasPermission(session, 'comments', 'update')) {
    throw new Error('Insufficient permissions');
  }

  // Get the comment with person info to check access
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    include: { person: true },
  });

  if (!comment) {
    throw new Error('Comment not found');
  }

  // Check if user has access to this person (unless they're a site admin)
  if (!isSiteAdmin(session) && !hasPersonAccess(session, comment.personId, 'write')) {
    throw new Error('No access to this person');
  }

  await prisma.comment.update({
    where: { id: commentId },
    data: {
      isApproved: true,
      approvedAt: new Date(),
      approvedBy: session.user.id,
      moderatorNotes: moderatorNotes || null,
    },
  });

  return { success: true };
}

export async function rejectComment(commentId: string, moderatorNotes: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  // Check if user has permission to update comments
  if (!hasPermission(session, 'comments', 'update')) {
    throw new Error('Insufficient permissions');
  }

  // Get the comment with person info to check access
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    include: { person: true },
  });

  if (!comment) {
    throw new Error('Comment not found');
  }

  // Check if user has access to this person (unless they're a site admin)
  if (!isSiteAdmin(session) && !hasPersonAccess(session, comment.personId, 'write')) {
    throw new Error('No access to this person');
  }

  await prisma.comment.update({
    where: { id: commentId },
    data: {
      isActive: false,
      moderatorNotes,
    },
  });

  return { success: true };
}

export async function updateCommentAndApprove(
  commentId: string,
  content: string,
  moderatorNotes?: string,
  additionalFields?: {
    occupation?: string;
    birthdate?: string;
    showOccupation?: boolean;
    showBirthdate?: boolean;
    showComment?: boolean;
    showCityState?: boolean;
  }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  // Check if user has permission to update comments
  if (!hasPermission(session, 'comments', 'update')) {
    throw new Error('Insufficient permissions');
  }

  // Only site admins can edit comment content
  if (!isSiteAdmin(session)) {
    throw new Error('Only site admins can edit comment content');
  }

  // Get the comment with person info to check access
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    include: { person: true },
  });

  if (!comment) {
    throw new Error('Comment not found');
  }

  await prisma.comment.update({
    where: { id: commentId },
    data: {
      content,
      isApproved: true,
      approvedAt: new Date(),
      approvedBy: session.user.id,
      moderatorNotes: moderatorNotes || null,
      ...(additionalFields && {
        occupation: additionalFields.occupation || null,
        birthdate: additionalFields.birthdate
          ? new Date(additionalFields.birthdate)
          : null,
        showOccupation: additionalFields.showOccupation ?? false,
        showBirthdate: additionalFields.showBirthdate ?? false,
        showComment: additionalFields.showComment ?? true,
        showCityState: additionalFields.showCityState ?? false,
      }),
    },
  });

  return { success: true };
}

export async function approveBulkComments(commentIds: string[]) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return { success: false, error: 'Unauthorized' };
  }

  // Check if user has permission to update comments
  if (!hasPermission(session, 'comments', 'update')) {
    return { success: false, error: 'Insufficient permissions' };
  }

  try {
    // If not site admin, verify access to all comments
    if (!isSiteAdmin(session)) {
      const comments = await prisma.comment.findMany({
        where: { id: { in: commentIds } },
        select: { personId: true },
      });

      // Check if user has write access to all persons
      for (const comment of comments) {
        if (!hasPersonAccess(session, comment.personId, 'write')) {
          return { success: false, error: 'No access to some persons' };
        }
      }
    }

    await prisma.comment.updateMany({
      where: { id: { in: commentIds } },
      data: {
        isApproved: true,
        approvedAt: new Date(),
        approvedBy: session.user.id,
      },
    });

    revalidatePath('/admin/comments');
    return { success: true };
  } catch (error) {
    console.error('Failed to approve bulk comments:', error);
    return { success: false, error: 'Failed to approve comments' };
  }
}

export async function rejectBulkComments(
  commentIds: string[],
  moderatorNotes: string
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return { success: false, error: 'Unauthorized' };
  }

  // Check if user has permission to update comments
  if (!hasPermission(session, 'comments', 'update')) {
    return { success: false, error: 'Insufficient permissions' };
  }

  try {
    // If not site admin, verify access to all comments
    if (!isSiteAdmin(session)) {
      const comments = await prisma.comment.findMany({
        where: { id: { in: commentIds } },
        select: { personId: true },
      });

      // Check if user has write access to all persons
      for (const comment of comments) {
        if (!hasPersonAccess(session, comment.personId, 'write')) {
          return { success: false, error: 'No access to some persons' };
        }
      }
    }

    await prisma.comment.updateMany({
      where: { id: { in: commentIds } },
      data: {
        isApproved: false,
        approvedAt: new Date(),
        approvedBy: session.user.id,
        moderatorNotes,
      },
    });

    revalidatePath('/admin/comments');
    return { success: true };
  } catch (error) {
    console.error('Failed to reject bulk comments:', error);
    return { success: false, error: 'Failed to reject comments' };
  }
}

export async function updateCommentVisibility(
  commentId: string,
  showComment: boolean,
  moderatorNotes?: string
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  // Check if user has permission to update comments
  if (!hasPermission(session, 'comments', 'update')) {
    throw new Error('Insufficient permissions');
  }

  // Get the comment with person info to check access
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    include: {
      person: {
        include: {
          town: true
        }
      }
    },
  });

  if (!comment) {
    throw new Error('Comment not found');
  }

  // If not site admin, verify access to the person
  if (!isSiteAdmin(session) && !hasPersonAccess(session, comment.personId, 'write')) {
    throw new Error('No access to this person');
  }

  await prisma.comment.update({
    where: { id: commentId },
    data: {
      showComment,
      isApproved: true,
      approvedAt: new Date(),
      approvedBy: session.user.id,
      moderatorNotes: moderatorNotes || null,
    },
  });

  revalidatePath(`/${comment.person.town.slug}/${comment.person.slug}`);
  revalidatePath('/admin/comments');
}

export async function toggleCommentStatus(
  commentId: string,
  isApproved: boolean
) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session, 'comments', 'update')) {
    throw new Error('Unauthorized');
  }

  try {
    // Get the comment with person info to check access
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { personId: true },
    });

    if (!comment) {
      throw new Error('Comment not found');
    }

    // Check if user has access to this person (unless they're a site admin)
    if (!isSiteAdmin(session) && !hasPersonAccess(session, comment.personId, 'write')) {
      throw new Error('No access to this person');
    }

    await prisma.comment.update({
      where: { id: commentId },
      data: {
        isApproved,
        approvedAt: isApproved ? new Date() : null,
        approvedBy: isApproved ? session.user.id : null,
      },
    });

    revalidatePath('/admin/comments');
    return { success: true };
  } catch (error) {
    console.error('Failed to toggle comment status:', error);
    return { success: false, error: 'Failed to update comment status' };
  }
}
