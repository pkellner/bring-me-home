#!/usr/bin/env tsx
import { prisma } from '../src/lib/prisma';
import { generateVerificationToken, hashToken, generateVerificationUrls } from '../src/lib/comment-verification';
import { sendEmail } from '../src/lib/email';
import { replaceTemplateVariables } from '../src/lib/email-template-variables';

async function main() {
  try {
    console.log('📧 Testing comment verification email...\n');

    // Find a specific comment with email
    const comment = await prisma.comment.findFirst({
      where: {
        email: 'roger@roger.com',
        person: {
          firstName: 'Joe',
          lastName: 'Plumber',
        }
      },
      include: {
        person: {
          include: {
            town: true,
          }
        }
      }
    });

    if (!comment) {
      console.error('❌ Comment not found!');
      return;
    }

    console.log('✅ Found comment:');
    console.log(`   ID: ${comment.id}`);
    console.log(`   Author: ${comment.firstName} ${comment.lastName}`);
    console.log(`   Email: ${comment.email}`);
    console.log(`   For: ${comment.person.firstName} ${comment.person.lastName}`);

    // Check for existing token
    let token = '';
    const existingToken = await prisma.commentVerificationToken.findFirst({
      where: {
        email: comment.email!,
        isActive: true,
      },
    });

    if (!existingToken) {
      console.log('\n🔑 No existing token found, creating new one...');
      token = generateVerificationToken();
      const tokenHash = hashToken(token);

      const newToken = await prisma.commentVerificationToken.create({
        data: {
          email: comment.email!,
          tokenHash,
        },
      });
      console.log(`   Created token with ID: ${newToken.id}`);
    } else {
      console.log(`\n🔑 Found existing token: ${existingToken.id}`);
      // Generate new token for existing record
      token = generateVerificationToken();
      const tokenHash = hashToken(token);

      await prisma.commentVerificationToken.update({
        where: { id: existingToken.id },
        data: {
          tokenHash,
          lastUsedAt: new Date(),
        },
      });
      console.log('   Updated existing token with new hash');
    }

    // Get email template
    console.log('\n📋 Getting email template...');
    const template = await prisma.emailTemplate.findUnique({
      where: { name: 'comment_verification' },
    });

    if (!template) {
      console.error('❌ Email template not found!');
      return;
    }

    console.log('✅ Found email template');

    // Generate URLs
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const urls = generateVerificationUrls(
      baseUrl,
      token,
      comment.person.slug,
      comment.person.town.slug,
      comment.id
    );

    console.log('\n🔗 Generated URLs:');
    console.log(`   Verification: ${urls.verificationUrl}`);
    console.log(`   Hide: ${urls.hideUrl}`);
    console.log(`   Manage: ${urls.manageUrl}`);

    // Prepare template data
    const templateData = {
      recipientName: `${comment.firstName || ''} ${comment.lastName || ''}`.trim() || 'Supporter',
      recipientEmail: comment.email!,
      personName: `${comment.person.firstName} ${comment.person.lastName}`,
      personFirstName: comment.person.firstName,
      personLastName: comment.person.lastName,
      townName: comment.person.town.name,
      commentContent: comment.content ? comment.content.substring(0, 200) + (comment.content.length > 200 ? '...' : '') : 'Your support message',
      commentDate: new Date().toLocaleDateString(),
      verificationUrl: urls.verificationUrl,
      hideUrl: urls.hideUrl,
      manageUrl: urls.manageUrl,
      currentDate: new Date().toLocaleDateString(),
      siteUrl: baseUrl,
    };

    const subject = replaceTemplateVariables(template.subject, templateData);
    const htmlContent = replaceTemplateVariables(template.htmlContent, templateData);
    const textContent = template.textContent ? replaceTemplateVariables(template.textContent, templateData) : undefined;

    console.log('\n📨 Sending email...');
    console.log(`   To: ${comment.email}`);
    console.log(`   Subject: ${subject}`);

    try {
      const result = await sendEmail({
        to: comment.email!,
        subject,
        html: htmlContent,
        text: textContent,
      });

      console.log('\n✅ Email sent successfully!');
      console.log(`   Provider: ${result.provider}`);
      console.log(`   Message ID: ${result.messageId}`);
      if (result.error) {
        console.log(`   ⚠️  Error: ${result.error}`);
      }

      // Update comment to mark email as sent
      await prisma.comment.update({
        where: { id: comment.id },
        data: {
          verificationEmailSentAt: new Date(),
        },
      });
      console.log('\n✅ Updated comment with verificationEmailSentAt');

    } catch (error) {
      console.error('\n❌ Failed to send email:', error);
    }

  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();