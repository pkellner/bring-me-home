# Implementation Plan for Bring Them Home Application

**Note: This document contains the plan for implementation and does not contain any code. All sample code can be found in the CODE_EXAMPLES.md file.**

## Overview
This document outlines the implementation plan for building the "Bring Them Home" application, a web platform designed to bring attention to individuals detained by ICE, enabling families and communities to share stories, gather support, and organize advocacy efforts.

## Current Status

### ✅ Completed Components
1. **Database Schema** - Complete with Person, Story (multi-language), Comment models
2. **User Authentication** - NextAuth implementation with role-based access
3. **Basic CRUD Operations** - Towns, Persons, Comments
4. **Multi-Language Story System** - Stories with language toggle UI
5. **Anonymous Comment System** - Full implementation with moderation
6. **Theme & Layout System** - 10 themes, 10 layouts with admin management
7. **Admin Interface** - Comprehensive grids for all models
8. **Comment Moderation** - Admin approval workflow with editing
9. **Health Check System** - Redis and database connectivity tests
10. **Build Configuration** - Version tracking and config display
11. **Seed Data** - Multi-language examples (English, Spanish, French)
12. **Detainee Tracking Fields** - Added detention-focused fields to Person model

### ❌ Not Yet Implemented
1. **Detention Center Features** - Model exists but no UI/functionality
2. **WYSIWYG Editor** - Story content is plain text only
3. **Google reCAPTCHA** - No spam protection
4. **Enhanced Security** - Environment override credentials
5. **Live Theme Editor** - On-page theme editing
6. **Search Functionality** - No search implementation
7. **Image Processing Limits** - Configurable upload/storage limits
8. **Docker Production Setup** - Full docker-compose configuration

## Phase 1: Core Infrastructure ✅ COMPLETED

### Goals
- Project setup with Next.js 15, TypeScript, TailwindCSS
- Database infrastructure with Prisma and MySQL
- Authentication system with NextAuth
- Role-based access control
- Basic CRUD operations

### Implementation Details
All core infrastructure has been successfully implemented including:
- Next.js 15 project with TypeScript
- Prisma ORM with MySQL database
- NextAuth with bcrypt password hashing
- Role-based permissions (site-admin, town-admin, person-admin)
- Complete CRUD operations for all models

## Phase 2: Comment System Enhancement ✅ COMPLETED

### Goals
- ✅ Implement anonymous comment system (no auth required)
- ✅ Add required name fields and optional contact info
- ✅ Add support preference checkboxes
- ✅ Create comment moderation interface
- ✅ Add ability to edit comments before approval
- ❌ Add Google reCAPTCHA (not implemented)
- ❌ Add file upload to comments (not in anonymous form)

### 2.1 Anonymous Comment Implementation ✅ COMPLETED
- Created AnonymousCommentForm component with required name fields
- Added optional email and phone fields
- Implemented three support preference checkboxes
- Used React Server Actions for form submission
- No authentication required for comment submission
- All form data stored in Comment model
  The anonymous comment form implementation includes fields for first name, last name, optional email and phone, comment content, and three checkboxes for support preferences. The form uses React Server Actions for submission without requiring authentication.

### 2.2 Comment Moderation Enhancement ✅ COMPLETED
The comment moderation modal provides an interface for admins to review, edit, and either approve or reject comments. It displays commenter information (name, email, phone), allows editing of comment content before approval, requires moderator notes for rejections, and provides approve/reject actions with success/error notifications.

## Phase 3: Story Enhancement ✅ PARTIALLY COMPLETED

### Goals
- ✅ Implement multi-language story support
- ✅ Create Story model with language codes
- ✅ Add language toggle UI (only shows with multiple languages)
- ✅ Create multi-language story editor
- ✅ Add story type support (personal, detention, family)
- ❌ Implement TinyMCE WYSIWYG editor
- ❌ Add HTML content support
- ❌ Create story versioning system
- ❌ Add media embedding

### 3.1 Multi-Language Story Implementation ✅ COMPLETED
The multi-language story system includes:
- **StorySection Component**: Displays stories with automatic language detection and a language toggle that only appears when multiple languages are available. It handles story rendering with proper paragraph formatting and shows appropriate messages when stories aren't available in the selected language.
- **MultiLanguageStoryEditor Component**: Provides an admin interface for creating and editing stories in multiple languages (English, Spanish, French) with three story types (personal, detention, family). It automatically loads existing content when switching between languages or story types and saves stories using server actions.

## Phase 3.5: Person Visibility Management

### Goals
- Implement individual visibility toggles for each person using the isActive field
- Add "Group By Town" checkbox for organized person listing
- Implement bulk visibility actions per town
- Add global visibility actions for all persons
- Use optimistic UI updates with rollback on failure
- Display real-time visibility status in admin grid

### 3.5.1 Create Visibility Toggle Component
The PersonVisibilityToggle component should be created as a client-side component that manages individual person visibility. It should:
- Accept personId, initialIsActive state, and an optional onUpdate callback
- Implement optimistic UI updates using React's useTransition hook
- Toggle between "Visible" (green) and "Hidden" (gray) states
- Call the togglePersonVisibility server action
- Handle rollback on failure to maintain UI consistency
- Show loading state during the transition

### 3.5.2 Update PersonsGrid with Visibility Management
The PersonsGrid component should be enhanced with:
- State management for grouping persons by town
- Bulk visibility update handler that implements optimistic updates with rollback on failure
- Logic to group persons by town when the groupByTown option is enabled
- A new visibility column in the grid that displays the PersonVisibilityToggle component
- Error handling and state management for failed visibility updates

### 3.5.3 Add Bulk Action UI
The PersonBulkActions component should provide:
- Buttons for "Set All Visible" and "Set All Invisible" bulk actions
- A checkbox to toggle "Group By Town" display mode
- Props for handling visibility actions and grouping state changes
- Proper styling with flexbox layout for responsive design

### 3.5.4 Server Actions
The server actions for person visibility should include:
- **togglePersonVisibility**: Updates a single person's isActive status, revalidates the admin persons page, and returns success/error status
- **updateBulkPersonVisibility**: Updates multiple persons' visibility status using Prisma's updateMany, revalidates the relevant paths, and handles errors appropriately

### 3.5.5 Implementation Notes
- Use the existing `isActive` field on the Person model
- Follow the optimistic UI pattern from comment moderation
- Ensure proper role-based permissions for visibility updates
- Add visual indicators for visibility status (green for visible, gray for hidden)
- Group by town should maintain sorting and filtering capabilities
- Bulk actions should show confirmation dialog for safety
- Consider adding a visibility filter to show only visible/hidden persons

## Phase 4: Detention Center Management (Week 4)

### Goals
- Create detention center UI components
- Implement web scraping integration
- Add admin management interface
- Create detainee listing functionality

### 4.1 Detention Center Model
The DetentionCenter model already exists in the schema with fields for id, name, facilityType, and other detention center-specific information. This model is ready for UI implementation.

### 4.2 Admin Interface
- Create detention center grid with CRUD operations
- Add import functionality by state
- Implement progress indicators
- Add facility image management

## Phase 5: Search & Navigation (Week 5)

### Goals
- Implement global search functionality
- Add filters for towns, persons, detention centers
- Create advanced search interface
- Add breadcrumb navigation

### 5.1 Search Implementation
The SearchBar component should implement:
- Text input for search queries
- Filter options for towns, detention centers, and status
- State management for search query and filters
- Callback prop to handle search execution
- Integration with the application's search functionality

## Phase 6: Database Schema Updates ✅ PARTIALLY COMPLETED

### Goals
- ✅ Add Story model for multi-language support
- ✅ Update Comment model to remove user dependencies
- ✅ Add anonymous commenter fields to Comment
- ✅ Implement proper Decimal type for bondAmount
- ❌ Add missing indexes
- ❌ Implement soft deletes where appropriate
- ❌ Add comprehensive audit logging

### 6.1 Schema Updates ✅ COMPLETED
The database schema has been updated with:
- **Story Model**: Supports multi-language content with ISO 639-1 language codes, three story types (personal, detention, family), active status tracking, and a unique constraint on personId/language/storyType combination
- **Comment Model**: Enhanced for anonymous support with fields for commenter information (firstName, lastName, email, phone), support preferences (wantsToHelpMore, displayNameOnly, requiresFamilyApproval), and moderation fields (isApproved, approvedAt, approvedBy, moderatorNotes)
- **Person Model**: Updated to include Decimal type for bondAmount and a relation to the Story model for multi-language support

## Phase 7: Performance & Security (Week 7)

### Goals
- Implement caching strategies
- Add rate limiting
- Optimize database queries
- Enhance security headers

### 7.1 Performance Optimizations
- Add Redis caching for frequently accessed data
- Implement query optimization
- Add CDN for static assets
- Optimize image delivery

### 7.2 Security Enhancements
- Implement CSRF protection
- Add rate limiting to API endpoints
- Enhance input validation
- Add security monitoring

## Phase 8: Testing & Documentation (Week 8)

### Goals
- Create comprehensive test suite
- Write API documentation
- Create user guides
- Implement monitoring

### 8.1 Testing Strategy
- Unit tests for all components
- Integration tests for API endpoints
- E2E tests for critical user flows
- Performance testing

### 8.2 Documentation
- API documentation with examples
- Admin user guide
- Deployment documentation
- Security best practices

## Phase 9: Deployment & Launch (Week 9)

### Goals
- Finalize production configuration
- Set up monitoring and alerts
- Create backup strategies
- Launch preparation

### 9.1 Production Setup
- Configure production database
- Set up SSL certificates
- Implement backup systems
- Configure monitoring

### 9.2 Launch Checklist
- Security audit
- Performance testing
- Data migration
- User training

## Phase 10: Public Page Visibility Filtering

### Goals
- Implement visibility filtering on homepage for towns
- Filter "Recently Added" section to show only visible persons from visible towns
- Update detained person count to include only visible persons
- Ensure consistent visibility control throughout public interface

### 10.1 Homepage Visibility Filtering
The homepage town query should be updated to:
- Filter towns by isActive status to show only visible towns
- Include only active/visible persons when counting detained individuals per town
- Maintain alphabetical ordering by town name
- Select only necessary fields for performance optimization

### 10.2 Recently Added Section Update
The recently added persons query should:
- Filter to show only active/visible persons from active/visible towns
- Include town information for display
- Include only active personal stories
- Count only approved and active comments
- Order by creation date (newest first)
- Limit results to 6 most recent entries

### 10.3 Detained Person Count Update
The total detained person count should be calculated by:
- Counting only persons with isActive set to true
- Including only persons from towns that are also active/visible
- Using Prisma's count method for efficient database queries

### 10.4 Town Page Visibility
The town page person query should:
- Filter persons by townId and isActive status
- Include detention center information
- Include only active personal stories
- Count only approved and active comments
- Order by creation date (newest first)
- Ensure consistent visibility filtering across all public pages

### 10.5 Implementation Notes
- All public-facing pages must respect the visibility settings
- Admin pages show all items regardless of visibility (with visual indicators)
- Visibility changes take effect immediately on public pages
- Consider caching strategies for performance with visibility filters
- Ensure SEO implications are considered for hidden content

## Success Metrics

### Technical Metrics
- Page load times under 3 seconds
- 99.9% uptime
- Zero critical security vulnerabilities
- Mobile responsiveness score > 95%

### User Experience Metrics
- Intuitive navigation (user testing)
- Accessible to users with disabilities
- Cross-browser compatibility
- Clear and helpful error messages

### Business Metrics
- Successful advocacy campaigns for detainees
- Community support message volume
- Admin efficiency in managing content
- Multi-language content adoption rate
- Anonymous participation rate

## Next Steps

1. **Immediate Priority**: Implement detention center UI and functionality
2. **Short Term**: Add WYSIWYG editor for rich text stories
3. **Medium Term**: Implement Google reCAPTCHA and enhanced security
4. **Long Term**: Add search functionality and performance optimizations

## Risk Mitigation

### Technical Risks
- **Database Performance**: Already implemented proper indexing
- **Security**: Anonymous system reduces authentication complexity
- **Scalability**: Multi-language system designed for growth

### Project Risks
- **Scope Creep**: Focus on detention center features next
- **Timeline**: Core features completed, remaining are enhancements
- **Data Privacy**: Anonymous system protects user privacy

## Phase 11: Comprehensive Story Seeding

### Goals
- Create rich, authentic multi-language stories for all seeded persons
- Implement comprehensive stories for Borrego Springs as the featured town
- Support English and Spanish languages for all story types
- Ensure cultural sensitivity and authentic narratives

### 11.1 Story Content Requirements
- **Personal Stories**: Background, family life, dreams, and aspirations before detention
- **Detention Stories**: Circumstances of detention, current situation, legal challenges
- **Family Messages**: Messages from family members expressing support and hope
- **Language Coverage**: Full English and Spanish translations for all stories
- **Authenticity**: Stories should reflect realistic experiences while being respectful

### 11.2 Borrego Springs Focus
As the featured town in the application, Borrego Springs should have:
- More detailed and comprehensive stories for each person
- All three story types (personal, detention, family) for each person
- Rich narratives that showcase the human aspect of detention
- Stories that connect to the local community and culture
- Both English and Spanish versions to serve the bilingual community

### 11.3 Implementation Notes
- Update seed.ts to include comprehensive story data
- Ensure stories are properly associated with persons
- Maintain consistency between English and Spanish versions
- Use appropriate formatting for multi-paragraph stories
- Include emotional but respectful content that humanizes detainees