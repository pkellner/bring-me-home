import { PrismaClient, Layout } from '@prisma/client';

export async function seedLayouts(prisma: PrismaClient): Promise<Layout[]> {
  const layoutsData = [
    {
      name: 'Grid Layout',
      description: 'Two or three column responsive grid',
      template: JSON.stringify({
        sections: [
          { type: 'hero-image', grid: 'col-span-full' },
          { type: 'basic-info', grid: 'col-span-full md:col-span-1' },
          { type: 'detention-info', grid: 'col-span-full md:col-span-1' },
          { type: 'story', grid: 'col-span-full' },
          { type: 'advocacy-actions', grid: 'col-span-full' },
          { type: 'comments', grid: 'col-span-full' }
        ],
        containerClass: 'grid grid-cols-1 md:grid-cols-2 gap-6'
      }),
      cssClasses: 'layout-grid',
      isActive: true
    },
    {
      name: 'Stack Layout',
      description: 'Vertical stacked sections',
      template: JSON.stringify({
        sections: [
          { type: 'hero-image' },
          { type: 'basic-info' },
          { type: 'detention-info' },
          { type: 'story' },
          { type: 'advocacy-actions' },
          { type: 'comments' }
        ],
        containerClass: 'flex flex-col gap-6'
      }),
      cssClasses: 'layout-stack',
      isActive: true
    },
    {
      name: 'Hero Layout',
      description: 'Large hero image with content below',
      template: JSON.stringify({
        sections: [
          { type: 'hero-image', class: 'h-96 w-full object-cover' },
          { type: 'basic-info' },
          { type: 'detention-info' },
          { type: 'story' },
          { type: 'advocacy-actions' },
          { type: 'comments' }
        ],
        containerClass: 'flex flex-col gap-8'
      }),
      cssClasses: 'layout-hero',
      isActive: true
    },
    {
      name: 'Sidebar Left',
      description: 'Main content with left sidebar',
      template: JSON.stringify({
        sections: [
          {
            type: 'container',
            class: 'flex flex-col md:flex-row gap-6',
            children: [
              {
                type: 'sidebar',
                class: 'md:w-1/3',
                children: [
                  { type: 'image' },
                  { type: 'basic-info' },
                  { type: 'detention-info' }
                ]
              },
              {
                type: 'main',
                class: 'md:w-2/3',
                children: [
                  { type: 'story' },
                  { type: 'advocacy-actions' },
                  { type: 'comments' }
                ]
              }
            ]
          }
        ]
      }),
      cssClasses: 'layout-sidebar-left',
      isActive: true
    },
    {
      name: 'Sidebar Right',
      description: 'Main content with right sidebar',
      template: JSON.stringify({
        sections: [
          {
            type: 'container',
            class: 'flex flex-col md:flex-row-reverse gap-6',
            children: [
              {
                type: 'sidebar',
                class: 'md:w-1/3',
                children: [
                  { type: 'image' },
                  { type: 'basic-info' },
                  { type: 'detention-info' }
                ]
              },
              {
                type: 'main',
                class: 'md:w-2/3',
                children: [
                  { type: 'story' },
                  { type: 'advocacy-actions' },
                  { type: 'comments' }
                ]
              }
            ]
          }
        ]
      }),
      cssClasses: 'layout-sidebar-right',
      isActive: true
    },
    {
      name: 'Magazine Layout',
      description: 'Magazine-style multi-column',
      template: JSON.stringify({
        sections: [
          { type: 'hero-image', class: 'col-span-full' },
          { type: 'basic-info', class: 'col-span-full md:col-span-2' },
          { type: 'image', class: 'col-span-full md:col-span-1' },
          { type: 'story', class: 'col-span-full md:col-span-2' },
          { type: 'detention-info', class: 'col-span-full md:col-span-1' },
          { type: 'advocacy-actions', class: 'col-span-full' },
          { type: 'comments', class: 'col-span-full' }
        ],
        containerClass: 'grid grid-cols-1 md:grid-cols-3 gap-6'
      }),
      cssClasses: 'layout-magazine',
      isActive: true
    },
    {
      name: 'Card Layout',
      description: 'Card-based component layout',
      template: JSON.stringify({
        sections: [
          { type: 'hero-image', cardClass: 'rounded-lg overflow-hidden shadow-lg' },
          { type: 'basic-info', cardClass: 'bg-white rounded-lg shadow-md p-6' },
          { type: 'detention-info', cardClass: 'bg-white rounded-lg shadow-md p-6' },
          { type: 'story', cardClass: 'bg-white rounded-lg shadow-md p-6' },
          { type: 'advocacy-actions', cardClass: 'bg-white rounded-lg shadow-md p-6' },
          { type: 'comments', cardClass: 'bg-white rounded-lg shadow-md p-6' }
        ],
        containerClass: 'flex flex-col gap-6'
      }),
      cssClasses: 'layout-card bg-gray-50',
      isActive: true
    },
    {
      name: 'Minimal Layout',
      description: 'Clean, minimal design',
      template: JSON.stringify({
        sections: [
          { type: 'basic-info', class: 'text-center mb-8' },
          { type: 'image', class: 'max-w-md mx-auto mb-8' },
          { type: 'story', class: 'max-w-prose mx-auto' },
          { type: 'detention-info', class: 'max-w-prose mx-auto mt-8' },
          { type: 'advocacy-actions', class: 'max-w-prose mx-auto mt-8' },
          { type: 'comments', class: 'max-w-prose mx-auto mt-12' }
        ],
        containerClass: 'max-w-4xl mx-auto px-4'
      }),
      cssClasses: 'layout-minimal',
      isActive: true
    },
    {
      name: 'Gallery Layout',
      description: 'Photo gallery focused',
      template: JSON.stringify({
        sections: [
          { type: 'gallery-grid', class: 'grid grid-cols-2 md:grid-cols-3 gap-4 mb-8' },
          { type: 'basic-info' },
          { type: 'detention-info' },
          { type: 'story' },
          { type: 'advocacy-actions' },
          { type: 'comments' }
        ],
        containerClass: 'flex flex-col gap-6'
      }),
      cssClasses: 'layout-gallery',
      isActive: true
    },
    {
      name: 'Full Width Layout',
      description: 'Edge-to-edge content',
      template: JSON.stringify({
        sections: [
          { type: 'hero-image', class: 'w-full h-screen object-cover' },
          { 
            type: 'container',
            class: 'max-w-7xl mx-auto px-4',
            children: [
              { type: 'basic-info' },
              { type: 'detention-info' },
              { type: 'story' },
              { type: 'advocacy-actions' },
              { type: 'comments' }
            ]
          }
        ],
        containerClass: 'w-full'
      }),
      cssClasses: 'layout-full-width',
      isActive: true
    }
  ];

  const createdLayouts: Layout[] = [];

  for (const layoutData of layoutsData) {
    const layout = await prisma.layout.create({
      data: layoutData
    });
    createdLayouts.push(layout);
    console.log(`  ✓ Created layout: ${layout.name}`);
  }

  return createdLayouts;
}