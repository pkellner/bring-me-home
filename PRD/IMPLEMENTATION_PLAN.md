# Implementation Plan for Bring Them Home Application

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
```typescript
// components/person/AnonymousCommentForm.tsx
export default function AnonymousCommentForm({ personId }: { personId: string }) {
  const [state, formAction] = useFormState(submitComment, {
    success: false,
  });

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="personId" value={personId} />
      
      {/* Required Fields */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="firstName">First Name *</label>
          <input type="text" id="firstName" name="firstName" required />
        </div>
        <div>
          <label htmlFor="lastName">Last Name *</label>
          <input type="text" id="lastName" name="lastName" required />
        </div>
      </div>

      {/* Optional Contact */}
      <div>
        <label htmlFor="email">Email (optional)</label>
        <input type="email" id="email" name="email" />
      </div>
      
      {/* Support Preferences */}
      <div className="space-y-4">
        <label>
          <input type="checkbox" name="wantsToHelpMore" value="true" />
          I want to help more, please contact me
        </label>
        <label>
          <input type="checkbox" name="displayNameOnly" value="true" />
          Display just my name as supporting
        </label>
        <label>
          <input type="checkbox" name="requiresFamilyApproval" value="true" />
          Display my name and comment if family approves
        </label>
      </div>

      <button type="submit">Submit Support</button>
    </form>
  );
}
```

### 2.2 Comment Moderation Enhancement ✅ COMPLETED
```typescript
// components/admin/CommentModerationModal.tsx
export default function CommentModerationModal({ 
  comment, 
  isOpen, 
  onClose 
}: CommentModerationModalProps) {
  const [content, setContent] = useState(comment.content || '');
  const [moderatorNotes, setModeratorNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      await updateCommentAndApprove(
        comment.id,
        content,
        moderatorNotes
      );
      toast.success('Comment approved successfully');
      onClose();
    } catch (error) {
      toast.error('Failed to approve comment');
    }
    setIsSubmitting(false);
  };

  const handleReject = async () => {
    if (!moderatorNotes.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await rejectComment(comment.id, moderatorNotes);
      toast.success('Comment rejected');
      onClose();
    } catch (error) {
      toast.error('Failed to reject comment');
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Moderate Comment</DialogTitle>
        </DialogHeader>
        
        {/* Comment details and editing form */}
        <div className="space-y-4">
          <div>
            <h3>Commenter Information</h3>
            <p>Name: {comment.firstName} {comment.lastName}</p>
            {comment.email && <p>Email: {comment.email}</p>}
            {comment.phone && <p>Phone: {comment.phone}</p>}
          </div>
          
          <div>
            <label>Comment Content</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full h-32"
            />
          </div>
          
          <div>
            <label>Moderator Notes</label>
            <textarea
              value={moderatorNotes}
              onChange={(e) => setModeratorNotes(e.target.value)}
              placeholder="Required for rejection"
              className="w-full h-20"
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button onClick={handleReject} variant="destructive">
            Reject
          </Button>
          <Button onClick={handleApprove} variant="default">
            Approve & Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

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
```typescript
// components/person/StorySection.tsx
export default function StorySection({ 
  stories, 
  storyType, 
  title 
}: StorySectionProps) {
  const availableLanguages = [...new Set(stories.map(s => s.language))];
  const [selectedLanguage, setSelectedLanguage] = useState(
    availableLanguages.includes('en') ? 'en' : availableLanguages[0] || 'en'
  );
  
  const currentStory = stories.find(s => s.language === selectedLanguage);
  
  if (!currentStory && stories.length === 0) return null;
  
  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">{title}</h3>
          
          {availableLanguages.length > 1 && (
            <LanguageToggle
              languages={availableLanguages}
              selectedLanguage={selectedLanguage}
              onLanguageChange={setSelectedLanguage}
            />
          )}
        </div>
        
        {currentStory ? (
          <div className="prose max-w-none">
            {currentStory.content.split('\n').map((paragraph, index) => (
              <p key={index} className="mb-4">
                {paragraph}
              </p>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 italic">
            No {title.toLowerCase()} available in {getLanguageName(selectedLanguage)}.
          </p>
        )}
      </div>
    </div>
  );
}

// components/admin/MultiLanguageStoryEditor.tsx
export default function MultiLanguageStoryEditor({ 
  personId, 
  stories 
}: Props) {
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [selectedType, setSelectedType] = useState<StoryType>('personal');
  const [content, setContent] = useState('');
  
  // Load existing story when language/type changes
  useEffect(() => {
    const existingStory = stories.find(
      s => s.language === selectedLanguage && s.storyType === selectedType
    );
    setContent(existingStory?.content || '');
  }, [selectedLanguage, selectedType, stories]);
  
  const handleSave = async () => {
    const formData = new FormData();
    formData.append('personId', personId);
    formData.append('language', selectedLanguage);
    formData.append('storyType', selectedType);
    formData.append('content', content);
    
    const result = await saveStory({}, formData);
    if (result.success) {
      toast.success('Story saved successfully');
    }
  };
  
  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <select 
          value={selectedLanguage} 
          onChange={(e) => setSelectedLanguage(e.target.value)}
        >
          <option value="en">English</option>
          <option value="es">Spanish</option>
          <option value="fr">French</option>
          {/* Add more languages as needed */}
        </select>
        
        <select 
          value={selectedType} 
          onChange={(e) => setSelectedType(e.target.value as StoryType)}
        >
          <option value="personal">Personal Story</option>
          <option value="detention">Detention Story</option>
          <option value="family">Family Story</option>
        </select>
      </div>
      
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="w-full h-64"
        placeholder={`Enter ${selectedType} story in ${getLanguageName(selectedLanguage)}...`}
      />
      
      <button onClick={handleSave} className="btn-primary">
        Save Story
      </button>
    </div>
  );
}
```

## Phase 3.5: Person Visibility Management

### Goals
- Implement individual visibility toggles for each person using the isActive field
- Add "Group By Town" checkbox for organized person listing
- Implement bulk visibility actions per town
- Add global visibility actions for all persons
- Use optimistic UI updates with rollback on failure
- Display real-time visibility status in admin grid

### 3.5.1 Create Visibility Toggle Component
```typescript
// components/admin/PersonVisibilityToggle.tsx
'use client';

import { useState, useTransition } from 'react';
import { togglePersonVisibility } from '@/app/actions/persons';

interface PersonVisibilityToggleProps {
  personId: string;
  initialIsActive: boolean;
  onUpdate?: (personId: string, isActive: boolean) => void;
}

export default function PersonVisibilityToggle({
  personId,
  initialIsActive,
  onUpdate
}: PersonVisibilityToggleProps) {
  const [isActive, setIsActive] = useState(initialIsActive);
  const [isPending, startTransition] = useTransition();

  const handleToggle = async () => {
    const newStatus = !isActive;
    
    // Optimistic update
    setIsActive(newStatus);
    if (onUpdate) {
      onUpdate(personId, newStatus);
    }

    startTransition(async () => {
      try {
        const result = await togglePersonVisibility(personId, newStatus);
        if (!result.success) {
          // Rollback on failure
          setIsActive(!newStatus);
          if (onUpdate) {
            onUpdate(personId, !newStatus);
          }
        }
      } catch (error) {
        // Rollback on error
        setIsActive(!newStatus);
        if (onUpdate) {
          onUpdate(personId, !newStatus);
        }
      }
    });
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
        isActive
          ? 'bg-green-100 text-green-800 hover:bg-green-200'
          : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
      } ${isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {isActive ? 'Visible' : 'Hidden'}
    </button>
  );
}
```

### 3.5.2 Update PersonsGrid with Visibility Management
```typescript
// Add to PersonsGrid component

// State for grouping by town
const [groupByTown, setGroupByTown] = useState(false);

// Handle bulk visibility updates
const handleBulkVisibilityUpdate = async (personIds: string[], isActive: boolean) => {
  // Optimistically update all persons
  const originalPersons = [...persons];
  setPersons(prev =>
    prev.map(person =>
      personIds.includes(person.id) ? { ...person, isActive } : person
    )
  );

  try {
    const result = await updateBulkPersonVisibility(personIds, isActive);
    if (!result.success) {
      // Rollback on failure
      setPersons(originalPersons);
      setError('Failed to update visibility');
    }
  } catch (error) {
    // Rollback on error
    setPersons(originalPersons);
    setError('Failed to update visibility');
  }
};

// Group persons by town if enabled
const groupedPersons = groupByTown
  ? persons.reduce((acc, person) => {
      const townKey = `${person.town.name}, ${person.town.state}`;
      if (!acc[townKey]) {
        acc[townKey] = [];
      }
      acc[townKey].push(person);
      return acc;
    }, {} as Record<string, Person[]>)
  : { 'All Persons': persons };

// Add visibility column to columns array
{
  key: 'isActive',
  label: 'Visibility',
  render: (value, record) => (
    <PersonVisibilityToggle
      personId={record.id}
      initialIsActive={record.isActive}
      onUpdate={handlePersonVisibilityUpdate}
    />
  ),
}
```

### 3.5.3 Add Bulk Action UI
```typescript
// components/admin/PersonBulkActions.tsx
interface PersonBulkActionsProps {
  onSetAllVisible: () => void;
  onSetAllInvisible: () => void;
  groupByTown: boolean;
  onGroupByTownChange: (checked: boolean) => void;
}

export default function PersonBulkActions({
  onSetAllVisible,
  onSetAllInvisible,
  groupByTown,
  onGroupByTownChange
}: PersonBulkActionsProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-4">
        <button
          onClick={onSetAllVisible}
          className="btn btn-primary"
        >
          Set All Visible
        </button>
        <button
          onClick={onSetAllInvisible}
          className="btn btn-secondary"
        >
          Set All Invisible
        </button>
      </div>
      
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={groupByTown}
          onChange={(e) => onGroupByTownChange(e.target.checked)}
          className="rounded"
        />
        <span>Group By Town</span>
      </label>
    </div>
  );
}
```

### 3.5.4 Server Actions
```typescript
// app/actions/persons.ts

export async function togglePersonVisibility(personId: string, isActive: boolean) {
  try {
    await prisma.person.update({
      where: { id: personId },
      data: { isActive }
    });
    
    revalidatePath('/admin/persons');
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Failed to update visibility' };
  }
}

export async function updateBulkPersonVisibility(personIds: string[], isActive: boolean) {
  try {
    await prisma.person.updateMany({
      where: { id: { in: personIds } },
      data: { isActive }
    });
    
    revalidatePath('/admin/persons');
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Failed to update visibility' };
  }
}
```

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
```typescript
// Already exists in schema
model DetentionCenter {
  id                  String   @id @default(cuid())
  name                String
  facilityType        String
  // ... other fields
}
```

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
```typescript
// components/SearchBar.tsx
interface SearchBarProps {
  onSearch: (query: string, filters: SearchFilters) => void;
}

export function SearchBar({ onSearch }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({
    towns: [],
    detentionCenters: [],
    status: 'all'
  });
  
  // Implementation details...
}
```

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
```prisma
// Story model for multi-language support
model Story {
  id        String  @id @default(cuid())
  language  String  @default("en") // ISO 639-1 language code
  storyType String  @default("personal") // personal, detention, family
  content   String  @db.Text
  isActive  Boolean @default(true)
  personId  String
  person    Person  @relation(fields: [personId], references: [id], onDelete: Cascade)
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@unique([personId, language, storyType])
  @@map("stories")
}

// Updated Comment model for anonymous support
model Comment {
  id                     String    @id @default(cuid())
  personId               String
  person                 Person    @relation(fields: [personId], references: [id], onDelete: Cascade)
  
  // Anonymous commenter fields
  firstName              String?
  lastName               String?
  email                  String?
  phone                  String?
  
  // Support preferences
  wantsToHelpMore        Boolean   @default(false)
  displayNameOnly        Boolean   @default(false)
  requiresFamilyApproval Boolean   @default(true)
  
  content                String?   @db.Text
  type                   String    @default("support")
  visibility             String    @default("public")
  
  // Moderation fields
  isActive               Boolean   @default(true)
  isApproved             Boolean   @default(false)
  approvedAt             DateTime?
  approvedBy             String?
  moderatorNotes         String?   @db.Text
  
  createdAt              DateTime  @default(now())
  updatedAt              DateTime  @updatedAt
  
  @@index([personId])
  @@index([isApproved, isActive])
  @@map("comments")
}

// Updated Person model
model Person {
  // ... existing fields ...
  bondAmount      Decimal?     @db.Decimal(10, 2)
  stories         Story[]      // Relation to multi-language stories
  // ... other fields ...
}
```

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