'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { hasPermission, hasPersonAccess, isSiteAdmin } from '@/lib/permissions';
import { headers } from 'next/headers';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { generateVerificationToken, hashToken, generateVerificationUrls } from '@/lib/comment-verification';
import { EmailStatus } from '@prisma/client';
import { replaceTemplateVariables, replaceTemplateVariablesWithUnsubscribe } from '@/lib/email-template-variables';
import { generateOptOutToken } from '@/lib/email-opt-out-tokens';

const debugCaptcha = process.env.NEXT_PUBLIC_DEBUG_RECAPTCHA === 'true';

const commentSchema = z.object({
  personId: z.string().min(1, 'Person ID is required'),
  personHistoryId: z.union([
    z.string().min(1), // Valid non-empty string
    z.literal(''),     // Empty string (will be treated as null)
    z.null(),          // Explicit null
    z.undefined()      // Undefined
  ]).optional().transform(val => (!val || val === '') ? null : val), // Transform empty/falsy to null
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
  keepMeUpdated: z.boolean().default(true),
});

interface RecaptchaDetails {
  success: boolean;
  score: number;
  action: string;
  hostname: string;
  challenge_ts: string;
  'error-codes'?: string[];
}

async function verifyRecaptcha(token: string): Promise<{ isValid: boolean; score?: number; details?: RecaptchaDetails }> {
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
    return { isValid: false };
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
        'error-codes': data['error-codes'],
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

    return { 
      isValid, 
      score: data.score,
      details: debugCaptcha ? {
        success: data.success,
        score: data.score,
        action: data.action,
        hostname: data.hostname,
        challenge_ts: data.challenge_ts,
        'error-codes': data['error-codes']
      } : undefined
    };
  } catch (error) {
    console.error('reCAPTCHA verification error:', error);
    if (debugCaptcha) {
      console.error('[verifyRecaptcha] Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
    return { isValid: false };
  }
}

export async function submitComment(
  prevState: {
    success?: boolean;
    error?: string;
    errors?: Record<string, string[]>;
    warning?: string;
    recaptchaScore?: number;
    recaptchaDetails?: RecaptchaDetails;
  },
  formData: FormData
) {
  try {
    // Handle both prefixed (1_recaptchaToken) and non-prefixed field names
    // Next.js adds a prefix when using useActionState
    const recaptchaToken = (formData.get('1_recaptchaToken') || formData.get('recaptchaToken')) as string;

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

    const recaptchaResult = await verifyRecaptcha(recaptchaToken);
    if (!recaptchaResult.isValid) {
      if (debugCaptcha) {
        console.error('[submitComment] reCAPTCHA verification failed');
      }
      return {
        success: false,
        error: 'Security verification failed. Please try again.',
        recaptchaScore: recaptchaResult.score,
        recaptchaDetails: recaptchaResult.details
      };
    }

    if (debugCaptcha) {
      console.log('[submitComment] reCAPTCHA verification passed, proceeding with comment submission');
    }

    // Handle both prefixed (1_fieldName) and non-prefixed field names
    // Next.js adds a prefix when using useActionState
    const getFieldValue = (fieldName: string): string | null => {
      const prefixedValue = formData.get(`1_${fieldName}`);
      if (prefixedValue !== null) return prefixedValue as string;
      return formData.get(fieldName) as string;
    };

    const rawData = {
      personId: getFieldValue('personId') as string,
      personHistoryId: getFieldValue('personHistoryId') || null, // Handle missing field
      firstName: getFieldValue('firstName') as string,
      lastName: getFieldValue('lastName') as string,
      email: getFieldValue('email') as string,
      phone: getFieldValue('phone') as string,
      occupation: getFieldValue('occupation') as string,
      birthdate: getFieldValue('birthdate') as string,
      streetAddress: getFieldValue('streetAddress') as string,
      city: getFieldValue('city') as string,
      state: getFieldValue('state') as string,
      zipCode: getFieldValue('zipCode') as string,
      content: getFieldValue('content') as string,
      privateNoteToFamily: getFieldValue('privateNoteToFamily') as string,
      wantsToHelpMore: getFieldValue('wantsToHelpMore') === 'true',
      displayNameOnly: getFieldValue('displayNameOnly') === 'true',
      requiresFamilyApproval: getFieldValue('requiresFamilyApproval') === 'true',
      showOccupation: getFieldValue('showOccupation') === 'true',
      showBirthdate: getFieldValue('showBirthdate') === 'true',
      showComment: getFieldValue('showComment') === 'true', // Added missing field
      showCityState: getFieldValue('showCityState') === 'true',
      privacyRequiredDoNotShowPublicly: getFieldValue('privacyRequiredDoNotShowPublicly') === 'true',
      keepMeUpdated: getFieldValue('keepMeUpdated') === 'on', // checkboxes send 'on' when checked
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

    // Check if a user exists with this email
    let userId: string | null = null;
    let autoHideComment = false;
    let warningMessage: string | undefined;
    let userCreated = false;
    let existingUser: { id: string; allowAnonymousComments: boolean; emailVerified: Date | null; optOutOfAllEmail: boolean } | null = null;
    
    if (data.email) {
      existingUser = await prisma.user.findUnique({
        where: { email: data.email },
        select: { id: true, allowAnonymousComments: true, emailVerified: true, optOutOfAllEmail: true },
      });

      if (existingUser) {
        userId = existingUser.id;
        // Check if this user has disabled anonymous comments
        if (!existingUser.allowAnonymousComments) {
          autoHideComment = true;
          warningMessage = 'Comments from this email are hidden by default. The user must log in and enable anonymous comments in their profile settings to make them visible.';
        }
        
        // Update their email opt-out preference based on "Keep me updated" checkbox
        if (!data.keepMeUpdated) {
          // User unchecked the box - opt them out
          await prisma.user.update({
            where: { id: existingUser.id },
            data: { optOutOfAllEmail: true },
          });
        } else if (data.keepMeUpdated && existingUser.optOutOfAllEmail) {
          // User checked the box and was previously opted out - re-enable emails
          await prisma.user.update({
            where: { id: existingUser.id },
            data: { optOutOfAllEmail: false },
          });
          
          // Also remove any person-specific opt-out for this person
          await prisma.emailOptOut.deleteMany({
            where: {
              userId: existingUser.id,
              personId: data.personId,
            },
          });
        }
      } else {
        // Create a new user with the email as username
        const tempPassword = await bcrypt.hash(Math.random().toString(36).substring(7), 10);
        const newUser = await prisma.user.create({
          data: {
            username: data.email,
            email: data.email,
            password: tempPassword,
            firstName: data.firstName,
            lastName: data.lastName,
            isActive: true,
            allowAnonymousComments: true, // New users can post anonymously by default
            optOutOfAllEmail: !data.keepMeUpdated, // If they unchecked "Keep me updated", opt them out
          },
        });
        userId = newUser.id;
        userCreated = true;
      }
    }

    // Create the comment
    await prisma.comment.create({
      data: {
        personId: data.personId,
        personHistoryId: data.personHistoryId, // Already transformed to null if empty
        userId,
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
        showComment: data.showComment,
        showCityState: data.showCityState,
        privacyRequiredDoNotShowPublicly: data.privacyRequiredDoNotShowPublicly,
        type: 'support',
        visibility: 'public',
        isActive: true,
        isApproved: false, // Requires approval
        hideRequested: autoHideComment, // Auto-hide if user has disabled anonymous comments
        hideRequestedAt: autoHideComment ? new Date() : null,
        ipAddress,
        userAgent,
      },
    });

    // Send email notification if email was provided
    if (data.email && userId) {
      try {
        // Get person details
        const personData = await prisma.person.findUnique({
          where: { id: data.personId },
          select: {
            firstName: true,
            lastName: true,
            town: {
              select: { name: true, slug: true },
            },
            slug: true,
          },
        });

        if (personData) {
          const personFullName = `${personData.firstName} ${personData.lastName}`;
          const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
          const profileUrl = `${baseUrl}/profile`;
          const personUrl = `${baseUrl}/${personData.town.slug}/${personData.slug}`;
          
          // Determine which template to use based on user status
          let templateName: string;
          let needsVerification = false;
          
          if (userCreated || (existingUser && !existingUser.emailVerified)) {
            // New user or unverified existing user
            templateName = 'comment_submission';
            needsVerification = true;
          } else if (existingUser && !existingUser.allowAnonymousComments) {
            // User has disabled anonymous comments
            templateName = 'comment_submission_blocked';
          } else {
            // Verified user with anonymous comments allowed
            templateName = 'comment_submission_verified';
          }
          
          // Get the appropriate template
          const template = await prisma.emailTemplate.findUnique({
            where: { name: templateName },
          });

          if (template && template.isActive) {
            // Generate unsubscribe tokens
            const personOptOutToken = await generateOptOutToken(userId, data.personId);
            const allOptOutToken = await generateOptOutToken(userId);
            const personUnsubscribeUrl = `${baseUrl}/unsubscribe?token=${personOptOutToken}&action=person`;
            const allUnsubscribeUrl = `${baseUrl}/unsubscribe?token=${allOptOutToken}&action=all`;
            
            // Generate verification URL if needed
            let verificationUrl = '';
            if (needsVerification) {
              // Generate email verification token
              const token = crypto.randomBytes(32).toString('hex');
              const expires = new Date();
              expires.setHours(expires.getHours() + 24);
              
              await prisma.user.update({
                where: { id: userId },
                data: {
                  emailVerificationToken: token,
                  emailVerificationExpires: expires
                }
              });
              
              verificationUrl = `${baseUrl}/verify/email?token=${token}`;
            }
            
            // For comment verification (hide/manage links for anonymous users)
            const commentToken = generateVerificationToken();
            const tokenHash = hashToken(commentToken);
            
            // Create or update comment verification token
            await prisma.commentVerificationToken.upsert({
              where: { email: data.email },
              update: {
                tokenHash,
                lastUsedAt: new Date(),
                isActive: true
              },
              create: {
                email: data.email,
                tokenHash,
              }
            });
            
            const showUrl = `${baseUrl}/verify/comments?token=${commentToken}&action=show`;
            const hideUrl = `${baseUrl}/verify/comments?token=${commentToken}&action=hide`;
            const manageUrl = `${baseUrl}/verify/comments?token=${commentToken}&action=manage`;
            
            const templateData = {
              firstName: data.firstName || 'there',
              personName: personFullName,
              townName: personData.town.name,
              profileUrl,
              personUrl,
              verificationUrl,
              showUrl,
              hideUrl,
              manageUrl,
              personUnsubscribeUrl,
              allUnsubscribeUrl,
              // Additional fields needed for unsubscribe processing
              personOptOutUrl: personUnsubscribeUrl,
              allOptOutUrl: allUnsubscribeUrl,
            };

            const subject = replaceTemplateVariables(template.subject, templateData);
            const processedContent = replaceTemplateVariablesWithUnsubscribe(
              template.htmlContent,
              template.textContent || null,
              templateData
            );
            const htmlContent = processedContent.html;
            const textContent = processedContent.text;

            // Queue the email
            await prisma.emailNotification.create({
              data: {
                userId,
                personId: data.personId,
                templateId: template.id,
                subject,
                htmlContent,
                textContent,
                status: EmailStatus.QUEUED,
                sentTo: data.email,
                customizations: templateData,
              },
            });
          }
        }
      } catch (error) {
        console.error('Failed to queue comment submission notification:', error);
        // Don't fail the comment submission if email fails
      }
    }

    // Send notifications to person admins
    try {
      console.log('🔔 Starting admin notification process for comment on person:', data.personId);
      
      // Get the admin notification template
      const adminTemplate = await prisma.emailTemplate.findUnique({
        where: { name: 'admin_new_comment_notification' },
      });

      console.log('📧 Admin template found:', adminTemplate ? 'Yes' : 'No', 'Active:', adminTemplate?.isActive);

      if (adminTemplate && adminTemplate.isActive) {
        // Get person data for admin notifications
        const personData = await prisma.person.findUnique({
          where: { id: data.personId },
          include: {
            town: {
              select: {
                id: true,
                slug: true,
                name: true,
              }
            }
          }
        });

        console.log('👤 Person data:', personData ? `${personData.firstName} ${personData.lastName}` : 'Not found');

        if (personData) {
        // First, let's see ALL person admins for debugging
        const allPersonAdmins = await prisma.personAccess.findMany({
          where: {
            personId: data.personId,
          },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              }
            }
          }
        });

        console.log('👥 ALL person admins for this person:', allPersonAdmins.length);
        allPersonAdmins.forEach(pa => {
          console.log(`  - ${pa.user.firstName} ${pa.user.lastName} (${pa.user.email}) - notifyOnComment: ${pa.notifyOnComment} - userId: ${pa.userId}`);
        });

        // Get person admins with notifications enabled
        const personAdmins = await prisma.personAccess.findMany({
          where: {
            personId: data.personId,
            notifyOnComment: true,
          },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              }
            }
          }
        });

        console.log('👥 Person admins with notifications ENABLED:', personAdmins.length);
        personAdmins.forEach(pa => {
          console.log(`  - ${pa.user.firstName} ${pa.user.lastName} (${pa.user.email}) - notifyOnComment: ${pa.notifyOnComment}`);
        });

        // Get town admins with notifications enabled
        const townAdmins = await prisma.townAccess.findMany({
          where: {
            townId: personData.townId,
            notifyOnComment: true,
          },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              }
            }
          }
        });

        console.log('🏘️ Town admins with notifications enabled:', townAdmins.length);
        townAdmins.forEach(ta => {
          console.log(`  - ${ta.user.firstName} ${ta.user.lastName} (${ta.user.email}) - notifyOnComment: ${ta.notifyOnComment}`);
        });

        // Combine and deduplicate admins
        const allAdmins = [...personAdmins, ...townAdmins];
        const uniqueAdmins = Array.from(
          new Map(allAdmins.map(a => [a.user.email, a.user])).values()
        );

        console.log('📬 Total unique admins to notify:', uniqueAdmins.length);
        uniqueAdmins.forEach(admin => {
          console.log(`  - ${admin.firstName} ${admin.lastName} (${admin.email})`);
        });

        // Generate comment link
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
        const commentLink = `${baseUrl}/${personData.town.slug}/${personData.slug}#comments`;

        // Send notification to each admin
        for (const admin of uniqueAdmins) {
          if (admin.email) {
            console.log(`📤 Creating email notification for admin: ${admin.firstName} ${admin.lastName} (${admin.email})`);
            
            // For emails, we'll calculate relative time when the email is sent
            // Since emails are queued and might be sent later, we'll use the current time
            const now = new Date();
            
            // Format as ISO string for email clients that support it
            const commentDateISO = now.toISOString();
            
            // Also provide a readable format with multiple timezones
            const commentDateEST = now.toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
              timeZone: 'America/New_York'
            }) + ' EST';
            
            const commentDatePST = now.toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
              timeZone: 'America/Los_Angeles'
            }) + ' PST';
            
            const commentDateUTC = now.toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
              timeZone: 'UTC'
            }) + ' UTC';
            
            // Generate opt-out tokens for this admin
            const personOptOutToken = await generateOptOutToken(admin.id, data.personId);
            const allOptOutToken = await generateOptOutToken(admin.id);
            
            const adminTemplateData = {
              personName: `${personData.firstName} ${personData.lastName}`,
              commenterName: `${data.firstName} ${data.lastName}`,
              commenterFirstName: data.firstName,
              commenterLastName: data.lastName,
              commenterEmail: data.email || 'Anonymous',
              commentDate: `${commentDateEST} / ${commentDatePST} / ${commentDateUTC}`,
              commentDateISO: commentDateISO,
              commentLink,
              manageCommentsLink: `${baseUrl}/admin/comments/${personData.town.slug}/${personData.slug}`,
              profileLink: `${baseUrl}/profile`,
              personOptOutUrl: `${baseUrl}/unsubscribe?token=${personOptOutToken}&action=person`,
              allOptOutUrl: `${baseUrl}/unsubscribe?token=${allOptOutToken}&action=all`,
            };

            const adminSubject = replaceTemplateVariables(adminTemplate.subject, adminTemplateData);
            const processedContent = replaceTemplateVariablesWithUnsubscribe(
              adminTemplate.htmlContent, 
              adminTemplate.textContent || null,
              adminTemplateData
            );
            const adminHtmlContent = processedContent.html;
            const adminTextContent = processedContent.text;

            const emailNotification = await prisma.emailNotification.create({
              data: {
                userId: admin.id,
                personId: data.personId,
                templateId: adminTemplate.id,
                subject: adminSubject,
                htmlContent: adminHtmlContent,
                textContent: adminTextContent,
                status: EmailStatus.QUEUED,
                sentTo: admin.email,
                customizations: adminTemplateData,
              },
            });
            
            console.log(`✅ Email notification created with ID: ${emailNotification.id}, Status: ${emailNotification.status}`);
          }
        }
        }
      }
    } catch (adminEmailError) {
      console.error('Failed to send admin notifications:', adminEmailError);
      // Don't fail the comment submission if admin notifications fail
    }

    return {
      success: true,
      warning: warningMessage,
      recaptchaScore: recaptchaResult.score,
      recaptchaDetails: recaptchaResult.details
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

  // Check if comment has email but no userId, and try to link or create user
  let userId = comment.userId;
  if (!userId && comment.email) {
    const existingUser = await prisma.user.findUnique({
      where: { email: comment.email },
      select: { id: true },
    });

    if (existingUser) {
      userId = existingUser.id;
    } else {
      // Create a new user with the email as username
      const tempPassword = await bcrypt.hash(Math.random().toString(36).substring(7), 10);
      const newUser = await prisma.user.create({
        data: {
          username: comment.email,
          email: comment.email,
          password: tempPassword,
          firstName: comment.firstName || undefined,
          lastName: comment.lastName || undefined,
          isActive: true,
        },
      });
      userId = newUser.id;
    }
  }

  await prisma.comment.update({
    where: { id: commentId },
    data: {
      isApproved: true,
      approvedAt: new Date(),
      approvedBy: session.user.id,
      moderatorNotes: moderatorNotes || null,
      userId,
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
    displayNameOnly?: boolean;
    privacyRequiredDoNotShowPublicly?: boolean;
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

  // Check if comment has email but no userId, and try to link or create user
  let userId = comment.userId;
  if (!userId && comment.email) {
    const existingUser = await prisma.user.findUnique({
      where: { email: comment.email },
      select: { id: true },
    });

    if (existingUser) {
      userId = existingUser.id;
    } else {
      // Create a new user with the email as username
      const tempPassword = await bcrypt.hash(Math.random().toString(36).substring(7), 10);
      const newUser = await prisma.user.create({
        data: {
          username: comment.email,
          email: comment.email,
          password: tempPassword,
          firstName: comment.firstName || undefined,
          lastName: comment.lastName || undefined,
          isActive: true,
        },
      });
      userId = newUser.id;
    }
  }

  await prisma.comment.update({
    where: { id: commentId },
    data: {
      content,
      isApproved: true,
      approvedAt: new Date(),
      approvedBy: session.user.id,
      moderatorNotes: moderatorNotes || null,
      userId,
      ...(additionalFields && {
        occupation: additionalFields.occupation || null,
        birthdate: additionalFields.birthdate
          ? new Date(additionalFields.birthdate)
          : null,
        showOccupation: additionalFields.showOccupation ?? false,
        showBirthdate: additionalFields.showBirthdate ?? false,
        showComment: additionalFields.showComment ?? true,
        showCityState: additionalFields.showCityState ?? false,
        displayNameOnly: additionalFields.displayNameOnly ?? false,
        privacyRequiredDoNotShowPublicly: additionalFields.privacyRequiredDoNotShowPublicly ?? false,
      }),
    },
  });

  return { success: true };
}

export async function approveBulkComments(commentIds: string[]) {
  console.log(`[APPROVE COMMENTS] Starting approval for ${commentIds.length} comments:`, commentIds);
  
  const session = await getServerSession(authOptions);
  if (!session) {
    return { success: false, error: 'Unauthorized' };
  }

  // Check if user has permission to update comments
  if (!hasPermission(session, 'comments', 'update')) {
    return { success: false, error: 'Insufficient permissions' };
  }

  try {
    // Get comments with person and town info for emails
    console.log('[APPROVE COMMENTS] Fetching comment details...');
    const commentsWithDetails = await prisma.comment.findMany({
      where: { id: { in: commentIds } },
      include: {
        person: {
          include: {
            town: true,
          },
        },
        personHistory: {
          include: {
            person: {
              include: {
                town: true,
              },
            },
          },
        },
      },
    });

    console.log(`[APPROVE COMMENTS] Found ${commentsWithDetails.length} comments`);
    commentsWithDetails.forEach(c => {
      console.log(`[APPROVE COMMENTS] Comment ${c.id}: email=${c.email}, personId=${c.personId}, personHistoryId=${c.personHistoryId}`);
    });

    // If not site admin, verify access to all comments
    if (!isSiteAdmin(session)) {
      // Check if user has write access to all persons
      for (const comment of commentsWithDetails) {
        // Get the person ID from either direct person relation or through personHistory
        const personId = comment.person?.id || comment.personHistory?.person?.id;
        if (!personId || !hasPersonAccess(session, personId, 'write')) {
          return { success: false, error: 'No access to some persons' };
        }
      }
    }

    // Process each comment individually to handle user linking
    for (const comment of commentsWithDetails) {
      let userId = comment.userId;
      
      // If comment has email but no userId, try to link or create user
      if (!userId && comment.email) {
        const existingUser = await prisma.user.findUnique({
          where: { email: comment.email },
          select: { id: true },
        });

        if (existingUser) {
          userId = existingUser.id;
        } else {
          // Create a new user with the email as username
          const tempPassword = await bcrypt.hash(Math.random().toString(36).substring(7), 10);
          const newUser = await prisma.user.create({
            data: {
              username: comment.email,
              email: comment.email,
              password: tempPassword,
              firstName: comment.firstName || undefined,
              lastName: comment.lastName || undefined,
              isActive: true,
            },
          });
          userId = newUser.id;
        }
      }

      // Update the comment with approval and user link
      await prisma.comment.update({
        where: { id: comment.id },
        data: {
          isApproved: true,
          approvedAt: new Date(),
          approvedBy: session.user.id,
          userId,
          verificationEmailSentAt: new Date(),
        },
      });

      // Send verification email if comment has email
      if (comment.email) {
        console.log(`[EMAIL VERIFICATION] Processing comment ${comment.id} with email: ${comment.email}`);
        try {
          // Check for existing token or create new one
          let token = '';
          const existingToken = await prisma.commentVerificationToken.findFirst({
            where: {
              email: comment.email,
              isActive: true,
            },
          });
          console.log(`[EMAIL VERIFICATION] Existing token found: ${existingToken ? 'YES' : 'NO'}`);

          if (!existingToken) {
            // Generate new token
            token = generateVerificationToken();
            const tokenHash = hashToken(token);
            console.log(`[EMAIL VERIFICATION] Creating new token for ${comment.email}`);

            await prisma.commentVerificationToken.create({
              data: {
                email: comment.email,
                tokenHash,
              },
            });
            console.log(`[EMAIL VERIFICATION] New token created successfully`);
          } else {
            // Always generate a fresh token for each email
            token = generateVerificationToken();
            const tokenHash = hashToken(token);
            console.log(`[EMAIL VERIFICATION] Generating fresh token for ${comment.email}`);

            await prisma.commentVerificationToken.update({
              where: { id: existingToken.id },
              data: {
                tokenHash,
                lastUsedAt: new Date(),
                // Reset the isActive flag to ensure token is valid
                isActive: true,
              },
            });
            console.log(`[EMAIL VERIFICATION] Fresh token generated and stored successfully`);
          }

          // Get email template
          const template = await prisma.emailTemplate.findUnique({
            where: { name: 'comment_verification' },
          });
          console.log(`[EMAIL VERIFICATION] Email template found: ${template ? 'YES' : 'NO'}`);

          if (template) {
            const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
            // Get person data from either direct relation or through personHistory
            const personData = comment.person || comment.personHistory?.person;
            const townData = personData?.town;
            
            console.log(`[EMAIL VERIFICATION] Person data found: ${personData ? 'YES' : 'NO'}`);
            console.log(`[EMAIL VERIFICATION] Town data found: ${townData ? 'YES' : 'NO'}`);
            
            if (!personData || !townData) {
              console.error(`[EMAIL VERIFICATION] ERROR: No person data found for comment: ${comment.id}`);
              console.error(`[EMAIL VERIFICATION] Comment person: ${comment.person ? 'exists' : 'null'}`);
              console.error(`[EMAIL VERIFICATION] Comment personHistory: ${comment.personHistory ? 'exists' : 'null'}`);
              continue; // Skip this comment if no person data
            }

            const urls = generateVerificationUrls(
              baseUrl,
              token,
              personData.slug,
              townData.slug,
              comment.id
            );
            
            console.log(`[EMAIL VERIFICATION] Generated URLs:`, {
              token: token.substring(0, 10) + '...',
              hideUrl: urls.hideUrl,
            });

            // Find if there's a user with this email to generate opt-out tokens
            const emailUser = await prisma.user.findUnique({
              where: { email: comment.email },
              select: { id: true },
            });
            
            // Generate opt-out tokens if user exists
            let personUnsubscribeUrl = urls.manageUrl; // Default to manage URL
            let allUnsubscribeUrl = urls.manageUrl; // Default to manage URL
            
            if (emailUser) {
              const personOptOutToken = await generateOptOutToken(emailUser.id, personData.id);
              const allOptOutToken = await generateOptOutToken(emailUser.id);
              personUnsubscribeUrl = `${baseUrl}/unsubscribe?token=${personOptOutToken}`;
              allUnsubscribeUrl = `${baseUrl}/unsubscribe?token=${allOptOutToken}`;
            }
            
            const templateData = {
              // Template expects these specific variable names
              commenterName: `${comment.firstName || ''} ${comment.lastName || ''}`.trim() || 'Supporter',
              personName: `${personData.firstName} ${personData.lastName}`,
              verificationUrl: urls.verificationUrl,
              personUrl: urls.verificationUrl, // Links to the person's page
              hideUrl: urls.hideUrl,
              manageUrl: urls.manageUrl,
              personUnsubscribeUrl,
              allUnsubscribeUrl,
              // Additional fields needed for unsubscribe processing
              personOptOutUrl: personUnsubscribeUrl,
              allOptOutUrl: allUnsubscribeUrl,
              // Additional data the template might use
              recipientName: `${comment.firstName || ''} ${comment.lastName || ''}`.trim() || 'Supporter',
              recipientEmail: comment.email,
              personFirstName: personData.firstName,
              personLastName: personData.lastName,
              townName: townData.name,
              commentContent: comment.content ? comment.content.substring(0, 200) + (comment.content.length > 200 ? '...' : '') : 'Your support message',
              commentDate: new Date().toLocaleDateString(),
              currentDate: new Date().toLocaleDateString(),
              siteUrl: baseUrl,
            };

            const subject = replaceTemplateVariables(template.subject, templateData);
            const processedContent = replaceTemplateVariablesWithUnsubscribe(
              template.htmlContent,
              template.textContent || null,
              templateData
            );
            const htmlContent = processedContent.html;
            const textContent = processedContent.text;

            console.log(`[EMAIL VERIFICATION] Creating email notification for ${comment.email}`);
            console.log(`[EMAIL VERIFICATION] PersonId: ${personData.id}, PersonHistoryId: ${comment.personHistoryId || 'none'}`);
            
            // Queue the verification email instead of sending directly
            const emailNotification = await prisma.emailNotification.create({
              data: {
                userId: emailUser?.id || userId, // Use the commenter's user ID if they have an account, otherwise current user
                personId: personData.id,
                personHistoryId: comment.personHistoryId,
                subject,
                htmlContent,
                textContent,
                status: EmailStatus.QUEUED,
                templateId: template.id,
                sentTo: comment.email,
              }
            });
            console.log(`[EMAIL VERIFICATION] Email notification created successfully with ID: ${emailNotification.id}`);
          } else {
            console.error(`[EMAIL VERIFICATION] ERROR: No email template found with name 'comment_verification'`);
          }
        } catch (error) {
          console.error('[EMAIL VERIFICATION] ERROR: Failed to process verification email:', error);
          // Don't fail the approval if email fails
        }
      } else {
        console.log(`[EMAIL VERIFICATION] Comment ${comment.id} has no email address, skipping verification email`);
      }
    }

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

export async function getCommentsByPersonHistoryId(personHistoryId: string) {
  try {
    const comments = await prisma.comment.findMany({
      where: {
        personHistoryId,
        isApproved: true,
        isActive: true,
        privacyRequiredDoNotShowPublicly: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        content: true,
        showComment: true,
        displayNameOnly: true,
        showOccupation: true,
        showBirthdate: true,
        showCityState: true,
        occupation: true,
        birthdate: true,
        city: true,
        state: true,
        createdAt: true,
      },
    });

    return comments;
  } catch (error) {
    console.error('Error fetching comments for PersonHistory:', error);
    return [];
  }
}

export async function getCommentCountsByPersonHistoryIds(personHistoryIds: string[]) {
  try {
    const counts = await prisma.comment.groupBy({
      by: ['personHistoryId'],
      where: {
        personHistoryId: { in: personHistoryIds },
        isApproved: true,
        isActive: true,
        privacyRequiredDoNotShowPublicly: false,
      },
      _count: {
        id: true,
      },
    });

    // Convert to a map for easy lookup
    const countMap = new Map<string, number>();
    counts.forEach(count => {
      if (count.personHistoryId) {
        countMap.set(count.personHistoryId, count._count.id);
      }
    });

    return countMap;
  } catch (error) {
    console.error('Error fetching comment counts for PersonHistory:', error);
    return new Map<string, number>();
  }
}

export async function getAllCommentsByPersonHistoryId(personHistoryId: string) {
  try {
    const session = await getServerSession(authOptions);
    
    // Only allow admins to see all comments including unapproved ones
    if (!session?.user?.roles?.some(role => ['site-admin', 'town-admin', 'person-admin'].includes(role.name))) {
      return [];
    }
    
    const comments = await prisma.comment.findMany({
      where: {
        personHistoryId,
        isActive: true,
      },
      select: {
        id: true,
        isApproved: true,
      },
    });

    return comments;
  } catch (error) {
    console.error('Error fetching all comments by person history ID:', error);
    return [];
  }
}
