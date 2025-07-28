export interface EmailTemplate {
  name: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  variables: Record<string, string>;
  isActive?: boolean;
  trackingEnabled?: boolean;
  webhookUrl?: string | null;
  webhookHeaders?: Record<string, string> | null;
}

export const emailTemplates: EmailTemplate[] = [
  {
    name: 'person_history_update',
    subject: 'Update about {{personName}}: {{updateDescription}}',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Update about {{personName}}</h2>
        <p>Hi {{recipientName}},</p>
        <p>The family of <strong>{{personName}}</strong> has posted a new update.</p>
        
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #333;">Update from {{updateDate}}:</h3>
          <p style="white-space: pre-wrap; margin: 0;">{{updateText}}</p>
        </div>

        <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #1976d2;">Show Your Support</h3>
          <p style="margin-bottom: 15px;">Your messages of support mean a lot to {{personName}}'s family during this difficult time. Would you like to send them a message of encouragement?</p>
          <a href="{{commentLink}}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Leave a Support Message</a>
        </div>

        <div style="margin: 30px 0;">
          <a href="{{profileUrl}}" style="display: inline-block; background-color: #6B7280; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View {{personName}}'s Full Profile</a>
        </div>

        <div style="background-color: #FEF3C7; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 0; color: #92400E;"><strong>Someone may have used your email address by mistake. Take action now:</strong></p>
          <ul style="margin: 10px 0; color: #92400E;">
            <li><a href="{{hideUrl}}" style="color: #92400E;">Hide all my messages from public view</a></li>
            <li><a href="{{manageUrl}}" style="color: #92400E;">Manage all my messages</a></li>
          </ul>
        </div>
        
        {{UNSUBSCRIBE_FULL}}
      </div>
    `,
    textContent: `Update about {{personName}}

Hi {{recipientName}},

The family of {{personName}} has posted a new update.

Update from {{updateDate}}:
{{updateText}}

Show Your Support
Your messages of support mean a lot to {{personName}}'s family during this difficult time. Would you like to send them a message of encouragement?

Leave a Support Message: {{commentLink}}

View {{personName}}'s Full Profile: {{profileUrl}}

Someone may have used your email address by mistake. Take action now:
- Hide all my messages from public view: {{hideUrl}}
- Manage all my messages: {{manageUrl}}

{{UNSUBSCRIBE_FULL}}`,
    variables: {
      recipientName: 'Recipient first name',
      recipientEmail: 'Recipient email address',
      personName: 'Person being updated',
      personFirstName: 'Person first name',
      personLastName: 'Person last name',
      townName: 'Town name',
      updateDescription: 'Brief update description for subject',
      updateText: 'Full update text',
      updateDate: 'Update date formatted',
      updateId: 'Update ID for deep linking',
      commentLink: 'Magic link to pre-filled comment form',
      profileUrl: 'Person profile URL',
      hideUrl: 'URL to hide all messages',
      manageUrl: 'URL to manage messages',
      personOptOutUrl: 'URL to unsubscribe from this person',
      allOptOutUrl: 'URL to unsubscribe from all emails'
    },
    isActive: true,
    trackingEnabled: true
  },
  {
    name: 'comment_submission',
    subject: 'Your support message for {{personName}} has been received',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Thank you for your support message</h2>
        <p>Hi {{firstName}},</p>
        <p>We've received your message of support for <strong>{{personName}}</strong> in {{townName}}.</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 0;"><strong>What happens next?</strong></p>
          <ul style="margin: 10px 0;">
            <li>Your message is awaiting approval from the family</li>
            <li>Once approved, you'll receive another email notification</li>
            <li>Your message will then be visible on the public page</li>
          </ul>
        </div>
        <div style="margin: 30px 0;">
          <p><strong>Email Verification (Recommended)</strong></p>
          <p>While not required, verifying your email helps families know that messages are genuine. This is especially helpful when approving your messages.</p>
          <a href="{{verificationUrl}}" style="display: inline-block; background-color: #10B981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 10px 0;">Verify Your Email</a>
        </div>
        <div style="margin: 30px 0;">
          <a href="{{personUrl}}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View {{personName}}'s Page</a>
        </div>
        <div style="background-color: #FEF3C7; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 0; color: #92400E;"><strong>Someone may have used your email address by mistake. Take action now:</strong></p>
          <ul style="margin: 10px 0; color: #92400E;">
            <li><a href="{{hideUrl}}" style="color: #92400E;">Hide all my messages from public view</a></li>
            <li><a href="{{manageUrl}}" style="color: #92400E;">Manage all my messages</a></li>
          </ul>
        </div>
        {{UNSUBSCRIBE_FULL}}
      </div>
    `,
    textContent: `Thank you for your support message
Hi {{firstName}},
We've received your message of support for {{personName}} in {{townName}}.
What happens next?
- Your message is awaiting approval from the family
- Once approved, you'll receive another email notification
- Your message will then be visible on the public page
Email Verification (Recommended)
While not required, verifying your email helps families know that messages are genuine. This is especially helpful when approving your messages.
Verify Your Email: {{verificationUrl}}
View {{personName}}'s page: {{personUrl}}
Someone may have used your email address by mistake. Take action now:
- Hide all my messages from public view: {{hideUrl}}
- Manage all my messages: {{manageUrl}}
{{UNSUBSCRIBE_FULL}}`,
    variables: {
      firstName: 'Commenter first name',
      personName: 'Person being supported',
      townName: 'Town name',
      personUrl: 'Person profile URL',
      verificationUrl: 'Email verification URL',
      hideUrl: 'URL to hide all messages',
      manageUrl: 'URL to manage messages',
      personOptOutUrl: 'URL to unsubscribe from this person',
      allOptOutUrl: 'URL to unsubscribe from all emails'
    },
    isActive: true,
    trackingEnabled: true
  },
  {
    name: 'email_verification',
    subject: 'Verify your email address',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Verify Your Email Address</h2>
        <p>Hi {{firstName}},</p>
        <p>Please verify your email address to help us ensure secure communication.</p>
        
        <div style="margin: 30px 0;">
          <a href="{{verificationUrl}}" style="display: inline-block; background-color: #10B981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Verify Email Address</a>
        </div>
        
        <p style="color: #666;">Or copy and paste this link into your browser:</p>
        <p style="color: #4F46E5; word-break: break-all;">{{verificationUrl}}</p>
        
        <div style="background-color: #FEF3C7; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 0; color: #92400E;"><strong>Why verify your email?</strong></p>
          <p style="margin: 10px 0 0 0; color: #92400E;">Verifying your email helps families know that messages of support are genuine and from real people who care about their loved ones.</p>
        </div>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        
        <p style="font-size: 12px; color: #666;">
          If you didn't create an account, you can safely ignore this email.<br>
          {{UNSUBSCRIBE_PROFILE_LINK}}
        </p>
      </div>
    `,
    textContent: `Verify Your Email Address

Hi {{firstName}},

Please verify your email address to help us ensure secure communication.

Verify your email: {{verificationUrl}}

Why verify your email?
Verifying your email helps families know that messages of support are genuine and from real people who care about their loved ones.

---
If you didn't create an account, you can safely ignore this email.
{{UNSUBSCRIBE_PROFILE_LINK}}`,
    variables: {
      firstName: 'User first name',
      verificationUrl: 'Email verification URL',
      profileUrl: 'Profile URL',
      allOptOutUrl: 'URL to unsubscribe from all emails'
    },
    isActive: true,
    trackingEnabled: true
  },
  {
    name: 'welcome_registration',
    subject: 'Welcome to Bring Me Home',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome to Bring Me Home</h2>
        <p>Hi {{firstName}},</p>
        <p>Thank you for creating an account. Your support means a lot to families with loved ones in detention.</p>
        
        <div style="background-color: #F3F4F6; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0;">What you can do now:</h3>
          <ul style="margin: 0; padding-left: 20px;">
            <li>Show support for detained community members</li>
            <li>Receive updates about people you're following</li>
            <li>Help amplify their stories and needs</li>
          </ul>
        </div>

        <div style="margin: 30px 0;">
          <p><strong>Verify Your Email (Recommended)</strong></p>
          <p>While not required, verifying your email helps build trust with families and ensures you receive important updates.</p>
          <a href="{{verificationUrl}}" style="display: inline-block; background-color: #10B981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 10px 0;">Verify Email Address</a>
        </div>

        <div style="margin: 30px 0;">
          <a href="{{profileUrl}}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Manage Your Profile</a>
        </div>
        
        {{UNSUBSCRIBE_PROFILE_LINK}}
      </div>
    `,
    textContent: `Welcome to Bring Me Home

Hi {{firstName}},

Thank you for creating an account. Your support means a lot to families with loved ones in detention.

What you can do now:
- Show support for detained community members
- Receive updates about people you're following
- Help amplify their stories and needs

Verify Your Email (Recommended)
While not required, verifying your email helps build trust with families and ensures you receive important updates.
Verify your email: {{verificationUrl}}

Manage your profile: {{profileUrl}}

{{UNSUBSCRIBE_PROFILE_LINK}}`,
    variables: {
      firstName: 'User first name',
      verificationUrl: 'Email verification URL',
      profileUrl: 'Profile URL',
      allOptOutUrl: 'URL to unsubscribe from all emails'
    },
    isActive: true,
    trackingEnabled: true
  },
  {
    name: 'password_reset',
    subject: 'Password Reset Request',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>Hi {{firstName}},</p>
        <p>We received a request to reset the password for your account.</p>
        
        <div style="margin: 30px 0;">
          <a href="{{resetUrl}}" style="display: inline-block; background-color: #DC2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
        </div>
        
        <p style="color: #666;">Or copy and paste this link into your browser:</p>
        <p style="color: #4F46E5; word-break: break-all;">{{resetUrl}}</p>
        
        <div style="background-color: #FEE2E2; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 0; color: #991B1B;"><strong>Important:</strong></p>
          <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #991B1B;">
            <li>This link will expire in 1 hour</li>
            <li>If you didn't request this reset, please ignore this email</li>
            <li>Your password won't change until you create a new one</li>
          </ul>
        </div>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        
        <p style="font-size: 12px; color: #666;">
          If you didn't request a password reset, you can safely ignore this email.
        </p>
        {{UNSUBSCRIBE_NONE}}
      </div>
    `,
    textContent: `Password Reset Request

Hi {{firstName}},

We received a request to reset the password for your account.

Reset your password: {{resetUrl}}

Important:
- This link will expire in 1 hour
- If you didn't request this reset, please ignore this email
- Your password won't change until you create a new one

---
If you didn't request a password reset, you can safely ignore this email.
{{UNSUBSCRIBE_NONE}}`,
    variables: {
      firstName: 'User first name or "there"',
      resetUrl: 'Password reset URL',
      allOptOutUrl: 'URL to unsubscribe from all emails'
    },
    isActive: true,
    trackingEnabled: true
  },
  {
    name: 'comment_verification',
    subject: 'Verify your support for {{personName}}',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Your message of support has been approved!</h2>
        <p>Hi {{commenterName}},</p>
        <p>Great news! The family has approved your message of support for <strong>{{personName}}</strong>.</p>
        
        <div style="background-color: #F0FDF4; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 0; color: #166534;"><strong>Your message is now visible</strong></p>
          <p style="margin: 10px 0 0 0; color: #166534;">Your support is now publicly displayed on {{personName}}'s page, where it can provide hope and encouragement.</p>
        </div>

        <div style="margin: 30px 0;">
          <p><strong>Verify this message (Optional but helpful)</strong></p>
          <p>Help the family and community know this message is genuine by verifying it was you:</p>
          <a href="{{verificationUrl}}" style="display: inline-block; background-color: #10B981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 10px 0;">Yes, I wrote this message</a>
        </div>

        <div style="margin: 30px 0;">
          <a href="{{personUrl}}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View {{personName}}'s Page</a>
        </div>
        
        <div style="background-color: #FEF3C7; padding: 15px; border-radius: 5px; margin: 30px 0;">
          <p style="margin: 0; font-weight: bold; color: #92400E;">If this wasn't you:</p>
          <p style="margin: 10px 0; color: #92400E;">If you didn't write this message, someone may have used your email address by mistake. You can hide all messages associated with your email:</p>
          <a href="{{hideUrl}}" style="display: inline-block; background-color: #DC2626; color: white; padding: 8px 16px; text-decoration: none; border-radius: 5px; margin: 10px 0;">Hide My Messages</a>
        </div>

        <div style="margin: 30px 0;">
          <p><strong>Privacy Options</strong></p>
          <p>Control how your messages appear:</p>
          <a href="{{manageUrl}}" style="display: inline-block; background-color: #6B7280; color: white; padding: 8px 16px; text-decoration: none; border-radius: 5px;">Manage Message Settings</a>
        </div>
        
        {{UNSUBSCRIBE_FULL}}
      </div>
    `,
    textContent: `Your message of support has been approved!

Hi {{commenterName}},

Great news! The family has approved your message of support for {{personName}}.

Your message is now visible
Your support is now publicly displayed on {{personName}}'s page, where it can provide hope and encouragement.

Verify this message (Optional but helpful)
Help the family and community know this message is genuine by verifying it was you:
{{verificationUrl}}

View {{personName}}'s page: {{personUrl}}

---
If this wasn't you:
If you didn't write this message, someone may have used your email address by mistake.
Hide all your messages: {{hideUrl}}

Manage all your messages: {{manageUrl}}

---
{{UNSUBSCRIBE_FULL}}`,
    variables: {
      commenterName: 'Commenter name',
      personName: 'Person being supported',
      verificationUrl: 'Comment verification URL',
      personUrl: 'Person profile URL',
      hideUrl: 'URL to hide all messages from this email',
      manageUrl: 'URL to manage all messages',
      personOptOutUrl: 'URL to unsubscribe from this person',
      allOptOutUrl: 'URL to unsubscribe from all emails'
    },
    isActive: true,
    trackingEnabled: true
  },
  {
    name: 'anonymous_verification',
    subject: 'Action needed: Verify your support message for {{personName}}',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Your message has been submitted</h2>
        <p>Hi {{firstName}},</p>
        <p>We received a message of support for <strong>{{personName}}</strong> using your email address.</p>
        
        <div style="background-color: #E0F2FE; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 0; color: #075985;"><strong>What happens next:</strong></p>
          <ol style="margin: 10px 0 0 20px; padding-left: 10px; color: #075985;">
            <li>Your message is currently pending family approval</li>
            <li>To help prevent spam, please verify your email below</li>
            <li>Once approved by the family, your message will be visible on the public page</li>
          </ol>
        </div>

        <div style="margin: 30px 0; text-align: center;">
          <a href="{{verificationUrl}}" style="display: inline-block; background-color: #10B981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Verify My Email</a>
          <p style="margin: 10px 0 0 0; font-size: 12px; color: #666;">This confirms you're a real person, not spam</p>
        </div>

        <div style="margin: 30px 0;">
          <p style="font-size: 14px; color: #666;"><strong>Note:</strong> You do not need to create an account. We only need to verify your email to prevent spam and ensure families receive genuine messages of support.</p>
        </div>

        <div style="background-color: #FEE2E2; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 0; font-weight: bold; color: #991B1B;">⚠️ If this wasn't you:</p>
          <p style="margin: 10px 0; color: #991B1B;">Someone may have used your email address by mistake. Take action now:</p>
          <ul style="margin: 15px 0;">
            <li><a href="{{hideUrl}}" style="color: #991B1B;">Hide all my messages from public view</a></li>
            <li><a href="{{manageUrl}}" style="color: #991B1B;">Manage all my messages</a></li>
          </ul>
          <p style="margin: 10px 0 0 0; font-size: 12px; color: #991B1B;">This will immediately hide any messages using your email and prevent future ones.</p>
        </div>
        
        {{UNSUBSCRIBE_FULL}}
      </div>
    `,
    textContent: `Your message has been submitted

Hi {{firstName}},

We received a message of support for {{personName}} using your email address.

What happens next:
1. Your message is currently pending family approval
2. To help prevent spam, please verify your email below
3. Once approved by the family, your message will be visible on the public page

Verify your email: {{verificationUrl}}

Note: You do not need to create an account. We only need to verify your email to prevent spam and ensure families receive genuine messages of support.

⚠️ If this wasn't you:
Someone may have used your email address by mistake. Take action now:

Hide all my messages: {{hideUrl}}
Manage my privacy: {{manageUrl}}

This will immediately hide any messages using your email and prevent future ones.

---
{{UNSUBSCRIBE_FULL}}`,
    variables: {
      firstName: 'Sender first name',
      personName: 'Person being supported',
      verificationUrl: 'Email verification URL',
      hideUrl: 'URL to hide all messages from this email',
      manageUrl: 'URL to manage all messages',
      personOptOutUrl: 'URL to unsubscribe from this person',
      allOptOutUrl: 'URL to unsubscribe from all emails'
    },
    isActive: true,
    trackingEnabled: true
  },
  {
    name: 'comment_submission_verified',
    subject: 'Your support message for {{personName}} has been received',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Thank you for your support message</h2>
        <p>Hi {{firstName}},</p>
        <p>We've received your message of support for <strong>{{personName}}</strong> in {{townName}}.</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 0;"><strong>What happens next?</strong></p>
          <ul style="margin: 10px 0;">
            <li>Your message is awaiting approval from the family</li>
            <li>Once approved, you'll receive another email notification</li>
            <li>Your message will then be visible on the public page</li>
          </ul>
        </div>

        <div style="margin: 30px 0;">
          <a href="{{personUrl}}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View {{personName}}'s Page</a>
        </div>

        <div style="background-color: #FEF3C7; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 0; color: #92400E;"><strong>Someone may have used your email address by mistake. Take action now:</strong></p>
          <ul style="margin: 10px 0; color: #92400E;">
            <li><a href="{{hideUrl}}" style="color: #92400E;">Hide all my messages from public view</a></li>
            <li><a href="{{manageUrl}}" style="color: #92400E;">Manage all my messages</a></li>
          </ul>
        </div>

        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        <p style="font-size: 12px; color: #666;">
          Don't want to receive emails about {{personName}}? <a href="{{personUnsubscribeUrl}}" style="color: #4F46E5;">Unsubscribe from this person</a><br>
          Don't want to receive any emails from this site? <a href="{{allUnsubscribeUrl}}" style="color: #4F46E5;">Unsubscribe from all emails</a>
        </p>
      </div>
    `,
    textContent: `Thank you for your support message

Hi {{firstName}},

We've received your message of support for {{personName}} in {{townName}}.

What happens next?
- Your message is awaiting approval from the family
- Once approved, you'll receive another email notification  
- Your message will then be visible on the public page

View {{personName}}'s page: {{personUrl}}

Someone may have used your email address by mistake. Take action now:
- Hide all my messages: {{hideUrl}}
- Manage all my messages: {{manageUrl}}

---
Don't want to receive emails about {{personName}}? Unsubscribe: {{personUnsubscribeUrl}}
Don't want to receive any emails? Unsubscribe from all: {{allUnsubscribeUrl}}`,
    variables: {
      firstName: 'Sender first name',
      personName: 'Person being supported',
      townName: 'Town name',
      personUrl: 'Person profile URL',
      hideUrl: 'URL to hide all messages',
      manageUrl: 'URL to manage messages',
      personOptOutUrl: 'URL to unsubscribe from this person',
      allOptOutUrl: 'URL to unsubscribe from all emails'
    },
    isActive: true,
    trackingEnabled: true
  },
  {
    name: 'comment_submission_blocked',
    subject: 'Your support message for {{personName}} requires account access',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Your support message has been saved</h2>
        <p>Hi {{firstName}},</p>
        <p>We've received your message of support for <strong>{{personName}}</strong> in {{townName}}.</p>
        
        <div style="background-color: #FEF3C7; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 0; color: #92400E;"><strong>Important: Your messages are currently blocked</strong></p>
          <p style="margin: 10px 0 0 0; color: #92400E;">All your support messages are being saved but won't be shown publicly, even after family approval.</p>
          <p style="margin: 10px 0 0 0; color: #92400E;">You can change this setting without logging in by clicking the button below.</p>
        </div>

        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 0;"><strong>About your message:</strong></p>
          <ul style="margin: 10px 0;">
            <li>Your message has been saved and is awaiting family approval</li>
            <li>However, it will remain private unless you change your privacy preference</li>
            <li>The family will still see your message for approval</li>
          </ul>
        </div>

        <div style="margin: 30px 0;">
          <a href="{{showUrl}}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Allow My Messages to Be Shown</a>
        </div>

        <div style="background-color: #E0F2FE; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 0; color: #075985;"><strong>Privacy Options</strong></p>
          <p style="margin: 10px 0 0 0; color: #075985;">You can manage your message settings without logging in:</p>
          <ul style="margin: 10px 0; color: #075985;">
            <li><a href="{{showUrl}}" style="color: #075985;">Allow my messages to be shown publicly</a></li>
            <li><a href="{{hideUrl}}" style="color: #075985;">Keep all my messages private</a></li>
          </ul>
        </div>

        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        <p style="font-size: 12px; color: #666;">
          Don't want to receive emails about {{personName}}? <a href="{{personUnsubscribeUrl}}" style="color: #4F46E5;">Unsubscribe from this person</a><br>
          Don't want to receive any emails from this site? <a href="{{allUnsubscribeUrl}}" style="color: #4F46E5;">Unsubscribe from all emails</a>
        </p>
      </div>
    `,
    textContent: `Your message requires account access

Hi {{firstName}},

We've received your message of support for {{personName}} in {{townName}}.

IMPORTANT: Your messages are currently blocked
All your support messages are being saved but won't be shown publicly, even after family approval.

You can change this setting without logging in using the links below.

About your message:
- Your message has been saved and is awaiting family approval
- However, it will remain private unless you change your privacy preference
- The family will still see your message for approval

Privacy Options - manage without logging in:
- Allow my messages to be shown: {{showUrl}}
- Keep all my messages private: {{hideUrl}}

---
Don't want to receive emails about {{personName}}? Unsubscribe: {{personUnsubscribeUrl}}
Don't want to receive any emails? Unsubscribe from all: {{allUnsubscribeUrl}}`,
    variables: {
      firstName: 'Sender first name',
      personName: 'Person being supported',
      townName: 'Town name',
      showUrl: 'URL to allow messages to be shown',
      hideUrl: 'URL to hide all messages',
      personOptOutUrl: 'URL to unsubscribe from this person',
      allOptOutUrl: 'URL to unsubscribe from all emails'
    },
    isActive: true,
    trackingEnabled: true
  },
  {
    name: 'admin_new_comment_notification',
    subject: 'New comment on {{personName}} by {{commenterFirstName}} {{commenterLastName}}',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">New comment notification</h2>
        <p>Hello,</p>
        <p>A new comment has been posted by <strong>{{commenterName}}</strong> at <strong>{{commenterEmail}}</strong>.</p>
        <p>This comment was posted for <strong>{{personName}}</strong>.</p>
        
        <div style="margin: 30px 0; text-align: center;">
          <a href="{{commentLink}}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 0 10px;">View Comment</a>
          <a href="{{manageCommentsLink}}" style="display: inline-block; background-color: #6B7280; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 0 10px;">Manage Comments</a>
        </div>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        
        <p style="font-size: 12px; color: #666;">
          You are receiving this notification because you have comment notifications enabled for this person.
          To manage your notification settings, <a href="{{profileLink}}" style="color: #4F46E5;">visit your profile</a>.
        </p>
        
        <p style="font-size: 12px; color: #666; margin-top: 10px;">
          {{UNSUBSCRIBE_FULL}}
        </p>
      </div>
    `,
    textContent: `New comment notification

A new comment has been posted by {{commenterName}} at {{commenterEmail}}.
This comment was posted for {{personName}}.

View Comment: {{commentLink}}
Manage Comments: {{manageCommentsLink}}

---
You are receiving this notification because you have comment notifications enabled for this person.
To manage your notification settings, visit: {{profileLink}}

{{UNSUBSCRIBE_FULL}}`,
    variables: {
      personName: 'Full name of the person',
      commenterName: 'Name of the person who posted the comment',
      commenterEmail: 'Email of the commenter',
      commenterFirstName: 'First name of the commenter',
      commenterLastName: 'Last name of the commenter',
      commentDate: 'Date and time in multiple timezones (EST/PST/UTC)',
      commentDateISO: 'ISO 8601 format for email client timezone detection',
      commentLink: 'Direct link to view the comment',
      manageCommentsLink: 'Link to manage comments',
      profileLink: 'Link to user profile for notification settings',
      personOptOutUrl: 'URL to unsubscribe from this person',
      allOptOutUrl: 'URL to unsubscribe from all emails'
    },
    isActive: true,
    trackingEnabled: true
  }
];