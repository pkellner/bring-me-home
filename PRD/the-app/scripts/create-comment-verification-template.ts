#!/usr/bin/env tsx
import { prisma } from '../src/lib/prisma';

async function main() {
  try {
    // Check if template already exists
    const existing = await prisma.emailTemplate.findUnique({
      where: { name: 'comment_verification' },
    });

    if (existing) {
      console.log('Comment verification template already exists');
      return;
    }

    // Create the template
    const template = await prisma.emailTemplate.create({
      data: {
        name: 'comment_verification',
        subject: 'Your comment on {{personName}} has been approved',
        htmlContent: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Comment Approved</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background-color: #f4f4f4;
      padding: 20px;
      text-align: center;
      border-radius: 5px;
    }
    .content {
      padding: 20px 0;
    }
    .comment-preview {
      background-color: #f9f9f9;
      padding: 15px;
      border-left: 4px solid #007bff;
      margin: 20px 0;
      font-style: italic;
    }
    .button {
      display: inline-block;
      padding: 10px 20px;
      margin: 10px 0;
      background-color: #007bff;
      color: white;
      text-decoration: none;
      border-radius: 5px;
    }
    .warning {
      background-color: #fff3cd;
      border: 1px solid #ffeaa7;
      color: #856404;
      padding: 15px;
      border-radius: 5px;
      margin: 20px 0;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      text-align: center;
      font-size: 14px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Your Comment Has Been Approved</h1>
  </div>
  
  <div class="content">
    <p>Hello {{recipientName}},</p>
    
    <p>Your comment on <strong>{{personFirstName}}'s</strong> page has been approved and is now visible to the community.</p>
    
    <div class="comment-preview">
      <p>"{{commentContent}}"</p>
    </div>
    
    <p><a href="{{verificationUrl}}" class="button">View Your Comment</a></p>
    
    <div class="warning">
      <p><strong>Important Security Notice:</strong></p>
      <p>If you did NOT write this comment, someone may be using your email address without permission.</p>
      <p><a href="{{hideUrl}}">Click here to hide all comments associated with your email</a></p>
    </div>
    
    <p>You can manage your comment visibility at any time using this link:</p>
    <p><a href="{{manageUrl}}">Manage My Comments</a></p>
    
    <p>This link is permanent and can be bookmarked for future use.</p>
  </div>
  
  <div class="footer">
    <p>Thank you for supporting {{personFirstName}} and the {{townName}} community.</p>
    <p>&copy; {{currentDate}} Bring Me Home</p>
  </div>
</body>
</html>
        `.trim(),
        textContent: `
Your Comment Has Been Approved

Hello {{recipientName}},

Your comment on {{personFirstName}}'s page has been approved and is now visible to the community.

Your comment:
"{{commentContent}}"

View your comment: {{verificationUrl}}

IMPORTANT SECURITY NOTICE:
If you did NOT write this comment, someone may be using your email address without permission.
Hide all comments associated with your email: {{hideUrl}}

You can manage your comment visibility at any time: {{manageUrl}}

This link is permanent and can be bookmarked for future use.

Thank you for supporting {{personFirstName}} and the {{townName}} community.

© {{currentDate}} Bring Me Home
        `.trim(),
        variables: {
          recipientName: 'Name of the comment author',
          recipientEmail: 'Email of the comment author',
          personName: 'Full name of the person being supported',
          personFirstName: 'First name of the person',
          personLastName: 'Last name of the person',
          townName: 'Name of the town',
          commentContent: 'Preview of the comment content',
          commentDate: 'Date the comment was made',
          verificationUrl: 'URL to view the comment',
          hideUrl: 'URL to hide all comments from this email',
          manageUrl: 'URL to manage comment visibility',
          currentDate: 'Current date',
          siteUrl: 'Base URL of the site',
        },
        isActive: true,
      },
    });

    console.log('Comment verification template created successfully:', template.name);
  } catch (error) {
    console.error('Error creating template:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();