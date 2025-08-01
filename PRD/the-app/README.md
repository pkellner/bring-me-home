# Bring Me Home - Phase 2 Complete

This is the foundational setup for the Bring Me Home application, a platform designed to help families connect with missing persons.

## Phase 2 Implementation Complete ✅

### Authentication & Authorization System

1. **NextAuth.js Integration** with credentials provider
2. **User Registration & Login** forms with validation
3. **Role-Based Access Control** (Site Admin, Town Admin, Person Admin, Viewer)
4. **Route Protection** with middleware
5. **Permission System** with granular access controls
6. **Session Management** with JWT tokens
7. **Password Security** with bcrypt hashing
8. **Admin Dashboard** with role-specific navigation
9. **Public Homepage** displaying towns and missing persons

### User Management Features

- **User CRUD Operations** with audit logging
- **Role Assignment System** 
- **Town/Person Access Controls**
- **Password Reset Functionality** with email verification
- **User Profile Management**
- **GDPR-compliant Cookie Banner** with persistent consent
- **Modern Authentication UI** with gradient styling

## Phase 1 Implementation Complete ✅

### What's Been Implemented

1. **Next.js 15 Project Setup** with TypeScript and TailwindCSS
2. **ESLint and Prettier** configuration for code quality
3. **Prisma ORM** with MySQL database schema
4. **Complete Database Schema** with all required models:
   - Users, Roles, UserRoles (authentication & authorization)
   - Towns, Persons (core entities)
   - Comments, Attachments (community engagement)
   - TownAccess, PersonAccess (permission system)
   - Layouts, Themes (customization)
   - SystemConfig, AuditLog (administration)

5. **Database Seeding** with sample California towns and persons
6. **Zod Validation Schemas** for type-safe operations
7. **Docker Configuration** with version tracking
8. **Core Dependencies** installed and configured

### Sample Data Included

- **5 California Towns**: Borrego Springs, Mendocino, Julian, Cambria, Ferndale
- **3 Sample Persons** with detailed profiles and stories
- **Multiple Comments** for community engagement testing
- **Admin Users** with proper role assignments
- **Themes and Layouts** for visual customization

### Database Setup Instructions

1. **Set up MySQL database** and update the `DATABASE_URL` in `.env`
2. **Generate Prisma client**: `npm run db:generate`
3. **Push schema to database**: `npm run db:push`
4. **Seed the database**: `npm run db:seed`

### Available Scripts

```bash
npm run dev          # Start development server with Turbopack
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema to database
npm run db:migrate   # Create and apply migrations
npm run db:seed      # Seed database with sample data
npm run db:reset     # Reset database and reseed
```

### Default Admin Credentials

- **Username**: `admin`
- **Password**: `admin123`
- **Role**: Site Administrator

### Town Admin Credentials

- **Username**: `town_admin_1` to `town_admin_5`
- **Password**: `town1123` to `town5123`
- **Role**: Town Administrator for their respective towns

### Password Reset Feature

The application includes a complete password reset flow:

1. **Request Reset**: Users can request a password reset from the login page
2. **Email Verification**: Reset link sent to user's email (requires SMTP configuration)
3. **Secure Tokens**: Reset tokens expire after 1 hour for security
4. **Rate Limiting**: 5-minute cooldown between reset requests to prevent abuse

To enable password reset functionality, configure SMTP settings in your `.env` file:
- Gmail users need to create an App Password (not regular password)
- Other providers: Check their SMTP documentation
- In development: Emails are logged to console if SMTP not configured

### Next Steps - Phase 2

The next phase will implement:
1. Authentication system with NextAuth.js
2. User registration and login
3. Role-based access control middleware
4. Basic user management interface

### Environment Variables

Copy and modify the `.env` file with your database credentials:

```bash
DATABASE_URL="mysql://username:password@localhost:3306/bring_me_home"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-change-this-in-production"
NEXT_PUBLIC_ENABLE_COOKIE_BANNER="false"  # Set to "true" to enable GDPR cookie consent

# Email Configuration (for password reset)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"  # For Gmail, use App Password not regular password
```

### Docker Deployment

Build and run with Docker:

```bash
docker build -t bring-me-home .
docker run -p 3000:3000 bring-me-home
```

### Project Structure

```
the-app/
├── src/
│   ├── app/          # Next.js app directory
│   ├── lib/          # Utility libraries (Prisma client)
│   └── schemas/      # Zod validation schemas
├── prisma/
│   ├── schema.prisma # Database schema
│   └── seed.ts       # Database seeding script
├── Dockerfile        # Docker configuration
└── baseversion       # Version tracking for Docker builds
```

### Database Seeding

The seed script (`prisma/seed.ts`) creates comprehensive test data including:

- **IP Address and User Agent Data**: Comments and anonymous support records are seeded with realistic IP addresses from various countries and authentic user agent strings
- **Partial Data Population**: Only 50% of comments and anonymous support records have IP/user agent data, leaving room for the geolocation processing feature to demonstrate its functionality
- **Geographic Diversity**: IP addresses represent users from USA, Mexico, Central/South America, Europe, Asia, Africa, and Australia

Run the seed script:
```bash
npm run db:seed
```

This completes Phase 1 of the implementation plan. The foundation is now ready for Phase 2 development.


### Peter Notes:

On a clean empty server, here are the steps to set up the Bring Me Home application database.




1. Alter prisma/schema.prisma file
2. npx prisma migrate dev --name devNumberX
3. npx prisma migrate deploy     {this is not need after above, but is needed on other connections like production}
4. npx prisma generate

npm run db:seed


