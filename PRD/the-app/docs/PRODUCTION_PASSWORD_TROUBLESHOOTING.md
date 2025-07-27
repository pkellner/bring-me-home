# Production Password Reset Troubleshooting

## Issue Summary
Password reset works in development but fails in production. Users can log in with seed passwords but not with passwords reset through the UI.

## Common Issues and Solutions

### 1. Check NextAuth Configuration
Ensure these environment variables are set correctly in production:

```env
NEXTAUTH_URL=https://your-production-domain.com
NEXTAUTH_SECRET=your-production-secret-key
NODE_ENV=production
```

### 2. Cookie Configuration Issues
In production with HTTPS, NextAuth cookies need proper configuration. Check if your `authOptions` in `/src/lib/auth.ts` has the correct cookie settings.

### 3. Database Connection
Verify the production database connection:
- Check if `DATABASE_URL` is correctly set
- Ensure the database user has proper permissions
- Verify network connectivity to the database

### 4. Server Action Issues
Server actions might behave differently in production due to:
- CSRF protection
- Different headers
- Reverse proxy configuration

## Debugging Steps

1. **Check Browser Console**
   - Open DevTools and check for any JavaScript errors
   - Look for failed network requests in the Network tab

2. **Check Server Logs**
   - Look for any error messages in your production logs
   - Check for database connection errors

3. **Test Authentication Flow**
   - Try logging in with a seed user (admin, demo users)
   - If seed users work but reset passwords don't, it's likely a password reset issue
   - If no users can log in, it's likely a NextAuth configuration issue

4. **Verify Password Reset Process**
   - Check if the password reset modal opens correctly
   - Verify the success message appears
   - Check if the database is actually being updated

## Temporary Production Debug Script

Create this script to test password functionality directly in production:

```typescript
// scripts/test-production-auth.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function testAuth() {
  // Test if we can connect to the database
  try {
    const userCount = await prisma.user.count();
    console.log(`✅ Database connection successful. Found ${userCount} users.`);
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return;
  }

  // Test password hashing
  const testPassword = 'TestPassword123';
  const hash = await bcrypt.hash(testPassword, 12);
  const verify = await bcrypt.compare(testPassword, hash);
  console.log(`✅ Password hashing test: ${verify ? 'PASSED' : 'FAILED'}`);

  await prisma.$disconnect();
}

testAuth();
```

## Common Production Fixes

### Fix 1: Update Cookie Configuration
If using a subdomain or different domain in production, update the auth configuration:

```typescript
// In src/lib/auth.ts
export const authOptions: NextAuthOptions = {
  // ... other config
  cookies: {
    sessionToken: {
      name: `${process.env.NODE_ENV === 'production' ? '__Secure-' : ''}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        domain: process.env.NODE_ENV === 'production' ? '.yourdomain.com' : undefined,
      },
    },
  },
};
```

### Fix 2: Add Explicit Server Action Headers
Sometimes production environments need explicit headers:

```typescript
// In server actions
export async function resetUserPassword(userId: string, newPassword: string) {
  'use server';
  
  // Add headers if needed
  const headers = {
    'Content-Type': 'application/json',
  };
  
  // ... rest of the function
}
```

### Fix 3: Check Reverse Proxy Configuration
If using Nginx or another reverse proxy, ensure it's properly forwarding headers:

```nginx
location / {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
}
```

## Debug Tools Created

### 1. Production Test Script
```bash
# Run on production server
npx tsx scripts/test-production-password.ts chema Wj72n8Tz4H1
```

### 2. Debug Production Password Script
```bash
# More comprehensive debugging
npx tsx scripts/debug-production-password.ts chema Wj72n8Tz4H1
```

### 3. Environment Check Script
```bash
# Check production environment
npx tsx scripts/check-production-env.ts
```

### 4. Debug UI Page
Visit `/admin/debug-password` in production to test password actions directly.

## Debug Logging Added

1. **Client Side (UsersGrid.tsx)**:
   - Logs password value, length, and character codes
   - Logs before and after server action call

2. **Modal (PasswordResetModal.tsx)**:
   - Logs password on submit

3. **Server Action (users.ts)**:
   - Logs password receipt and validation
   - Logs hash creation and verification
   - Logs database update result

4. **Auth (auth.ts)**:
   - Logs login attempts with password details
   - Logs password comparison results

## Next Steps

1. **Deploy the updated code** with all the debug logging

2. **Test password reset** in production and check console logs:
   ```bash
   # On production server, watch logs
   pm2 logs
   # or
   journalctl -u your-app-name -f
   ```

3. **Use the debug page** at `/admin/debug-password` to:
   - Test if server actions work at all
   - Test password hashing directly
   - Get user IDs for testing

4. **Run the debug scripts** on production server:
   ```bash
   # First check environment
   npx tsx scripts/check-production-env.ts
   
   # Then test password functionality
   npx tsx scripts/debug-production-password.ts chema Wj72n8Tz4H1
   ```

5. **Check for these specific issues**:
   - Character encoding differences
   - Server action serialization problems
   - Environment variable issues
   - Database connection timeouts
   - Reverse proxy header issues

## Most Likely Causes

1. **NextAuth Configuration**:
   - Missing or incorrect `NEXTAUTH_URL`
   - Missing `NEXTAUTH_SECRET`
   - Cookie domain mismatch

2. **Server Action Issues**:
   - Data serialization between client and server
   - CSRF token validation
   - Headers being stripped by proxy

3. **Environment Differences**:
   - Different Node.js versions
   - Different bcrypt implementations
   - Character encoding issues

4. **Database Issues**:
   - Connection pool exhaustion
   - Transaction timeouts
   - Replication lag