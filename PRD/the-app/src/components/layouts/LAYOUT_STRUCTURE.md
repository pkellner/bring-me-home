# Layout Structure Documentation

## Overview

The LayoutRenderer component dynamically renders person profile pages based on configurable layout templates. Each layout type has a specific structure and component arrangement.

## Component Directory Structure

```
src/components/layouts/
├── LayoutRenderer.tsx          # Main layout renderer with layout type logic
├── sections/                   # Individual section components
│   ├── index.ts               # Exports all section components
│   ├── TopRow.tsx             # Responsive top row with image, info, and additional photos
│   ├── PersonInfo.tsx         # Person information display
│   ├── PersonImage.tsx        # Primary person image
│   ├── HeroImage.tsx          # Hero banner image
│   ├── Story.tsx              # Person's stories section
│   ├── Comments.tsx           # Community support comments
│   ├── BasicInfo.tsx          # Basic person info (name, town)
│   ├── SidebarInfo.tsx        # Sidebar information panel
│   ├── GalleryGrid.tsx        # Additional photos gallery
│   ├── FeaturedImage.tsx      # Featured image for magazine layout
│   ├── ArticleContent.tsx     # Article-style content
│   ├── Sidebar.tsx            # Full sidebar component
│   └── MainContent.tsx        # Main content wrapper
└── LAYOUT_STRUCTURE.md        # This documentation file
```

## Layout Types and Flow

### 1. Custom Person Layout (`custom-person`)
The default layout with responsive design:

```
┌─────────────────────────────────────────────────────────┐
│                       TOP ROW                             │
│ ┌─────────┬──────────────────────┬───────────────────┐   │
│ │ Primary │   Person Info        │ Additional Photos │   │
│ │  Image  │   - Name             │ (up to 4 images)  │   │
│ │ (300px) │   - Town             │ (150px each)      │   │
│ │         │   - Detention Info   │                   │   │
│ └─────────┴──────────────────────┴───────────────────┘   │
│                                                           │
│                      STORY SECTION                        │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Personal Story                                      │ │
│ │ Detention Circumstances (if available)              │ │
│ │ Family Message (if available)                       │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                           │
│                  COMMUNITY SUPPORT                        │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Comments and support messages                       │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

**Responsive Behavior:**
- Mobile (<lg): All sections stack vertically
- Desktop (≥lg): Top row items arranged horizontally

### 2. Grid Layout (`grid`)
Flexible grid with configurable columns:

```
┌─────────────────────────────────────────────────────────┐
│              GRID SECTIONS (2-4 columns)                  │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│ │ Section 1 │ │ Section 2 │ │ Section 3 │ │ Section 4 │   │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘    │
│                                                           │
│              FULL WIDTH SECTIONS                          │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Gallery Grid / Story / Comments / Top Row           │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

**Full Width Sections:** `gallery-grid`, `story`, `comments`, `top-row`

### 3. Stack Layout (`stack`)
Simple vertical stacking:

```
┌─────────────────────────────────────────────────────────┐
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Section 1                                           │ │
│ └─────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Section 2                                           │ │
│ └─────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Section 3                                           │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### 4. Sidebar Layouts (`sidebar-left`, `sidebar-right`)

**Sidebar Left:**
```
┌─────────────────────────────────────────────────────────┐
│ ┌──────────┬──────────────────────────────────────────┐ │
│ │ Sidebar  │           Main Content                   │ │
│ │ (300px)  │                                          │ │
│ │          │                                          │ │
│ └──────────┴──────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### 5. Magazine Layout (`magazine`)
Editorial-style with featured image:

```
┌─────────────────────────────────────────────────────────┐
│ ┌────────────────────────────┬────────────────────────┐ │
│ │   Featured Image            │    Sidebar Content     │ │
│ │   (spans 2 columns)         │    (1 column)          │ │
│ └────────────────────────────┴────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## Component Mapping

The `components` object in LayoutRenderer maps section names to React components:

```typescript
const components = {
  'top-row': () => <sections.TopRow person={person} isAdmin={isAdmin} />,
  'info': () => <sections.PersonInfo person={person} isAdmin={isAdmin} />,
  'image': () => <sections.PersonImage person={person} />,
  'hero-image': () => <sections.HeroImage person={person} />,
  'story': () => <sections.Story person={person} />,
  'comments': () => <sections.Comments person={person} isAdmin={isAdmin} />,
  'basic-info': () => <sections.BasicInfo person={person} isAdmin={isAdmin} />,
  'sidebar-info': () => <sections.SidebarInfo person={person} />,
  'gallery-grid': () => <sections.GalleryGrid person={person} />,
  'featured-image': () => <sections.FeaturedImage person={person} />,
  'article-content': () => <sections.ArticleContent person={person} />,
  'sidebar': () => <sections.Sidebar person={person} isAdmin={isAdmin} />,
  'main-content': () => <sections.MainContent person={person} />,
};
```

## Adding New Sections

1. Create a new component in `src/components/layouts/sections/`
2. Export it from `sections/index.ts`
3. Add mapping in LayoutRenderer's `components` object
4. Update layout templates to include the new section name

## Layout Template Structure

Templates are JSON objects with:
```json
{
  "type": "grid|stack|sidebar-left|etc",
  "sections": ["section-name-1", "section-name-2"],
  "columns": 2 // For grid layouts
}
```