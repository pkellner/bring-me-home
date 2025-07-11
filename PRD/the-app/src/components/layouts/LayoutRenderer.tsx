'use client';

import { Comment, Person, Town } from '@prisma/client';
import Image from 'next/image';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import CommentSection from '@/components/person/CommentSection';
import StorySection from '@/components/person/StorySection';

type SerializedComment = Comment & {
  createdAt: string;
  updatedAt: string;
  birthdate?: string | null;
  approvedAt?: string | null;
};

type SerializedDetentionCenter = {
  id: string;
  name: string;
  facilityType: string;
  operatedBy?: string | null;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phoneNumber?: string | null;
  faxNumber?: string | null;
  emailAddress?: string | null;
  website?: string | null;
  capacity?: number | null;
  currentPopulation?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  isActive: boolean;
  isICEFacility: boolean;
  notes?: string | null;
  transportInfo?: string | null;
  visitingHours?: string | null;
  thumbnailImageId?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SerializedPerson = Omit<Person, 'bondAmount'> & {
  bondAmount: string | null;
  town: Town & {
    layout?: { id: string; name: string; template: string } | null;
    theme?: { id: string; name: string; cssVars: string | null } | null;
  };
  layout?: { id: string; name: string; template: string } | null;
  theme?: { id: string; name: string; cssVars: string | null } | null;
  comments: SerializedComment[];
  detentionCenter?: SerializedDetentionCenter;
  stories?: Array<{
    id: string;
    language: string;
    storyType: string;
    content: string;
  }>;
  personImages?: Array<{
    id: string;
    imageUrl: string;
    thumbnailUrl?: string | null;
    caption?: string | null;
    isPrimary: boolean;
    displayPublicly: boolean;
    isActive: boolean;
  }>;
};

interface LayoutRendererProps {
  person: SerializedPerson;
  layout: {
    id: string;
    name: string;
    template: string;
  };
  theme?: {
    id: string;
    name: string;
    cssVars: string | null;
  };
  isAdmin?: boolean;
}

export default function LayoutRenderer({
  person,
  layout,
  theme,
  isAdmin = false,
}: LayoutRendererProps) {
  const template = JSON.parse(layout.template);

  // Apply theme CSS variables if provided
  const themeStyles = theme?.cssVars ? (
    <style dangerouslySetInnerHTML={{ __html: theme.cssVars }} />
  ) : null;

  // Common components that can be used in layouts
  const components = {
    'hero-image': () => {
      const primaryImage = person.personImages?.find(img => img.isPrimary && img.displayPublicly);
      return (
        <div className="hero-image relative h-64 sm:h-80 md:h-96 w-full overflow-hidden rounded-lg">
          {primaryImage ? (
            <Image
              src={primaryImage.imageUrl}
              alt={`${person.firstName} ${person.lastName}`}
              fill
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gray-200">
              <span className="text-3xl text-gray-400">No Photo Available</span>
            </div>
          )}
        </div>
      );
    },

    image: () => {
      // Only use personImages for primary image
      const primaryImage = person.personImages?.find(img => img.isPrimary && img.displayPublicly);
      const imageUrl = primaryImage?.imageUrl;
      
      return (
        <div className="image-section flex justify-center">
          {imageUrl ? (
            <div className="relative rounded-xl shadow-lg overflow-hidden">
              <Image
                src={imageUrl}
                alt={`${person.firstName} ${person.lastName}`}
                width={600}
                height={600}
                className="max-w-full h-auto object-contain max-h-[600px]"
                style={{ width: 'auto', height: 'auto' }}
                priority
              />
            </div>
          ) : (
            <div className="flex h-64 w-full max-w-md mx-auto items-center justify-center rounded-xl bg-gray-100 shadow-inner">
              <span className="text-xl text-gray-400">No Photo Available</span>
            </div>
          )}
        </div>
      );
    },

    'top-row': () => {
      const primaryImage = person.personImages?.find(img => img.isPrimary && img.displayPublicly);
      const additionalImages = person.personImages?.filter(img => !img.isPrimary && img.displayPublicly) || [];
      
      return (
        <div className="top-row-section w-full">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Primary Image - max 300px */}
            <div className="flex-shrink-0 mx-auto lg:mx-0">
              {primaryImage ? (
                <div className="relative rounded-lg shadow-lg overflow-hidden w-full max-w-[300px] aspect-square">
                  <Image
                    src={primaryImage.imageUrl}
                    alt={`${person.firstName} ${person.lastName}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 300px) 100vw, 300px"
                    priority
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center rounded-lg bg-gray-100 shadow-inner w-full max-w-[300px] aspect-square">
                  <span className="text-xl text-gray-400">No Photo Available</span>
                </div>
              )}
            </div>

            {/* Person Information */}
            <div className="flex-grow min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold mb-2">
                {person.firstName} {person.middleName ? `${person.middleName} ` : ''}
                {person.lastName}
                {isAdmin && (
                  <Link
                    href={`/admin/persons/${person.id}/edit`}
                    className="ml-3 text-sm font-normal text-indigo-600 hover:text-indigo-500"
                  >
                    [Edit Person]
                  </Link>
                )}
              </h1>
              <div className="text-base sm:text-lg text-gray-600 mb-4">
                <span className="font-semibold">Home Town:</span> {person.town.name}, {person.town.state}
              </div>

              <div className="grid grid-cols-1 gap-3 text-sm sm:text-base">
                {person.detentionDate && (
                  <div>
                    <span className="font-semibold">Detention Date:</span> {formatDate(person.detentionDate)}
                  </div>
                )}
                {person.lastHeardFromDate && (
                  <div>
                    <span className="font-semibold">Last Heard From:</span> {formatDate(person.lastHeardFromDate)}
                  </div>
                )}
                <div>
                  <span className="font-semibold">Represented by Lawyer:</span> {person.representedByLawyer ? 'Yes' : 'No'}
                </div>
                {person.notesFromLastContact && (
                  <div className="mt-2">
                    <span className="font-semibold">Notes from Last Contact:</span>
                    <p className="mt-1 text-gray-700">{person.notesFromLastContact}</p>
                  </div>
                )}
              </div>

              {person.detentionCenter && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <h3 className="text-sm font-bold text-red-800 mb-2">Detention Information</h3>
                  <div className="space-y-1 text-sm">
                    <div>
                      <span className="font-semibold text-red-700">Detention Center:</span> 
                      <span className="text-red-800"> {person.detentionCenter.name}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-red-700">Location:</span> 
                      <span className="text-red-800"> {person.detentionCenter.city}, {person.detentionCenter.state}</span>
                    </div>
                    {person.bondAmount && (
                      <div>
                        <span className="font-semibold text-red-700">Bond Amount:</span> 
                        <span className="text-red-800"> ${person.bondAmount}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Additional Photos - max 150px each */}
            {additionalImages.length > 0 && (
              <div className="flex-shrink-0 w-full lg:w-auto">
                <h3 className="text-sm font-semibold mb-2">Additional Photos</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-2 max-w-full lg:max-w-[320px]">
                  {additionalImages.slice(0, 4).map((image, index) => (
                    <div
                      key={image.id}
                      className="relative rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow bg-gray-100 aspect-square w-full max-w-[150px]"
                    >
                      <Image
                        src={image.imageUrl}
                        alt={`Additional photo ${index + 1}`}
                        fill
                        className="object-cover"
                        sizes="150px"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      );
    },

    info: () => (
      <div className="info-section space-y-4">
        <h1 className="text-3xl font-bold">
          {person.firstName} {person.middleName ? `${person.middleName} ` : ''}
          {person.lastName}
          {isAdmin && (
            <Link
              href={`/admin/persons/${person.id}/edit`}
              className="ml-3 text-sm font-normal text-indigo-600 hover:text-indigo-500"
            >
              [Edit Person]
            </Link>
          )}
        </h1>
        <div className="text-lg text-gray-600">
          <span className="font-semibold">Home Town:</span> {person.town.name},{' '}
          {person.town.state}
        </div>

        <div className="grid grid-cols-1 gap-3 mt-4">
          {person.detentionDate && (
            <div>
              <span className="font-semibold">Detention Date:</span>{' '}
              {formatDate(person.detentionDate)}
            </div>
          )}
          {person.lastHeardFromDate && (
            <div>
              <span className="font-semibold">Last Heard From:</span>{' '}
              {formatDate(person.lastHeardFromDate)}
            </div>
          )}
          {person.notesFromLastContact && (
            <div className="mt-2">
              <span className="font-semibold">Notes from Last Contact:</span>
              <p className="mt-1 text-gray-700">
                {person.notesFromLastContact}
              </p>
            </div>
          )}
          <div>
            <span className="font-semibold">Represented by Lawyer:</span>{' '}
            {person.representedByLawyer ? 'Yes' : 'No'}
          </div>
        </div>

        {person.detentionCenter && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="flex-grow">
                <h3 className="text-sm font-bold text-red-800 mb-2">
                  Detention Information
                </h3>
                <div className="space-y-1 text-sm">
                  <div>
                    <span className="font-semibold text-red-700">
                      Detention Center:
                    </span>{' '}
                    <span className="text-red-800">
                      {person.detentionCenter.name}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold text-red-700">Location:</span>{' '}
                    <span className="text-red-800">
                      {person.detentionCenter.address},{' '}
                      {person.detentionCenter.city},{' '}
                      {person.detentionCenter.state}{' '}
                      {person.detentionCenter.zipCode}
                    </span>
                  </div>
                  {person.detentionCenter.phoneNumber && (
                    <div>
                      <span className="font-semibold text-red-700">Phone:</span>{' '}
                      <span className="text-red-800">
                        {person.detentionCenter.phoneNumber}
                      </span>
                    </div>
                  )}
                  {person.detentionDate && (
                    <div>
                      <span className="font-semibold text-red-700">
                        Detained Since:
                      </span>{' '}
                      <span className="text-red-800">
                        {formatDate(person.detentionDate)}
                      </span>
                    </div>
                  )}
                {person.bondAmount && (
                  <div>
                    <span className="font-semibold text-red-700">
                      Bond Amount:
                    </span>{' '}
                    <span className="text-red-800">${person.bondAmount}</span>
                  </div>
                )}
                </div>
              </div>
              <div className="flex-shrink-0">
                {person.detentionCenter.thumbnailImageId ? (
                  <Image
                    src={`/api/images/${person.detentionCenter.thumbnailImageId}`}
                    alt={person.detentionCenter.name}
                    width={80}
                    height={80}
                    className="rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center">
                    <span className="text-2xl text-gray-400">🏢</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    ),

    story: () => {
      if (!person.stories || person.stories.length === 0) {
        return (
          <div className="story-section">
            <h2 className="mb-4 text-2xl font-bold">Story</h2>
            <p className="text-gray-500 italic">No story has been added yet.</p>
          </div>
        );
      }

      return (
        <div className="space-y-8">
          <StorySection
            stories={person.stories}
            storyType="personal"
            title="Personal Story"
          />
          {person.stories.some(s => s.storyType === 'detention') && (
            <StorySection
              stories={person.stories}
              storyType="detention"
              title="Detention Circumstances"
            />
          )}
          {person.stories.some(s => s.storyType === 'family') && (
            <StorySection
              stories={person.stories}
              storyType="family"
              title="Message from Family"
            />
          )}
        </div>
      );
    },

    comments: () => (
      <div className="comments-section">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Community Support</h2>
          {isAdmin && (
            <Link
              href={`/admin/comments/${person.town.name.toLowerCase().replace(/\s+/g, '-')}/${person.firstName.toLowerCase()}-${person.lastName.toLowerCase()}`}
              className="text-sm text-indigo-600 hover:text-indigo-500"
            >
              [Manage Comments]
            </Link>
          )}
        </div>
        <CommentSection personId={person.id} comments={person.comments} />
      </div>
    ),

    'basic-info': () => (
      <div className="basic-info text-center">
        <h1 className="mb-2 text-4xl font-bold">
          {person.firstName} {person.middleName ? `${person.middleName} ` : ''}
          {person.lastName}
          {isAdmin && (
            <Link
              href={`/admin/persons/${person.id}/edit`}
              className="ml-3 text-sm font-normal text-indigo-600 hover:text-indigo-500"
            >
              [Edit Person]
            </Link>
          )}
        </h1>
        <p className="text-xl text-gray-600">
          Home Town: {person.town.name}, {person.town.state}
        </p>
      </div>
    ),

    'sidebar-info': () => (
      <div className="sidebar-info rounded-lg bg-gray-50 p-6">
        <h3 className="mb-4 text-lg font-semibold">Information</h3>
        <dl className="space-y-2 text-sm">
          <div>
            <dt className="font-semibold">Name</dt>
            <dd>
              {person.firstName}{' '}
              {person.middleName ? `${person.middleName} ` : ''}
              {person.lastName}
            </dd>
          </div>
          <div>
            <dt className="font-semibold">Home Town</dt>
            <dd>
              {person.town.name}, {person.town.state}
            </dd>
          </div>
          {person.detentionDate && (
            <div>
              <dt className="font-semibold">Detained Since</dt>
              <dd>{formatDate(person.detentionDate)}</dd>
            </div>
          )}
          {person.lastHeardFromDate && (
            <div>
              <dt className="font-semibold">Last Contact</dt>
              <dd>{formatDate(person.lastHeardFromDate)}</dd>
            </div>
          )}
          <div>
            <dt className="font-semibold">Legal Representation</dt>
            <dd>{person.representedByLawyer ? 'Yes' : 'No'}</dd>
          </div>
        </dl>
      </div>
    ),

    'main-content': () => (
      <div className="main-content space-y-6">
        {components['image']()}
        {components['story']()}
      </div>
    ),

    'gallery-grid': () => {
      // Use personImages, excluding the primary image
      const allImages = person.personImages?.filter(img => !img.isPrimary && img.displayPublicly) || [];
      
      // Don't show gallery if no additional images
      if (allImages.length === 0) {
        return null;
      }
      
      // Determine layout based on number of images - smaller images
      const getLayoutClass = () => {
        switch (allImages.length) {
          case 1:
            return "grid-cols-1 max-w-xs mx-auto";
          case 2:
            return "grid-cols-2 gap-3 max-w-sm mx-auto";
          case 3:
            return "grid-cols-3 gap-3 max-w-lg mx-auto";
          default:
            return "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-w-4xl mx-auto";
        }
      };

      return (
        <div className="gallery-section w-full mt-6 mb-6">
          <h3 className="text-lg font-semibold mb-3">Additional Photos</h3>
          <div className={`gallery-grid grid ${getLayoutClass()}`}>
            {allImages.map((image, index) => (
              <div
                key={`secondary-image-${index}`}
                className="relative group cursor-pointer"
              >
                <div className="aspect-square overflow-hidden rounded-lg bg-gray-50 shadow-sm hover:shadow-md transition-all duration-300">
                  <Image
                    src={image.imageUrl}
                    alt={`Photo ${index + 1} of ${person.firstName} ${person.lastName}`}
                    width={150}
                    height={150}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    },

    // Magazine layout components
    'featured-image': () => {
      const primaryImage = person.personImages?.find(img => img.isPrimary && img.displayPublicly);
      return (
        <div className="featured-image-section">
          {primaryImage ? (
            <div className="relative rounded-lg overflow-hidden shadow-xl">
              <Image
                src={primaryImage.imageUrl}
                alt={`${person.firstName} ${person.lastName}`}
                width={800}
                height={600}
                className="w-full h-auto object-cover"
                priority
              />
            </div>
          ) : (
            <div className="flex h-96 w-full items-center justify-center rounded-lg bg-gray-100">
              <span className="text-2xl text-gray-400">No Photo Available</span>
            </div>
          )}
        </div>
      );
    },

    'article-content': () => {
      return (
        <div className="article-content space-y-6">
          <div>
            <h1 className="text-4xl font-bold mb-2">
              {person.firstName} {person.middleName ? `${person.middleName} ` : ''}
              {person.lastName}
            </h1>
            <p className="text-xl text-gray-600">
              {person.town.name}, {person.town.state}
            </p>
          </div>
          
          {/* Story section */}
          {person.stories && person.stories.length > 0 && (
            <div className="prose max-w-none">
              <StorySection
                stories={person.stories}
                storyType="personal"
                title="Personal Story"
              />
            </div>
          )}

          {/* Gallery of additional images */}
          {person.personImages && person.personImages.filter(img => !img.isPrimary && img.displayPublicly).length > 0 && (
            <div className="mt-8">
              <h3 className="text-2xl font-semibold mb-4">Photos</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {person.personImages
                  .filter(img => !img.isPrimary && img.displayPublicly)
                  .map((image, index) => (
                    <div key={image.id} className="relative aspect-square overflow-hidden rounded-lg shadow-md">
                      <Image
                        src={image.imageUrl}
                        alt={`Photo ${index + 1}`}
                        fill
                        className="object-cover hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      );
    },

    'sidebar': () => {
      return (
        <div className="sidebar space-y-6">
          {/* Basic info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold mb-3">Information</h3>
            <dl className="space-y-2 text-sm">
              {person.detentionDate && (
                <div>
                  <dt className="font-medium">Detention Date:</dt>
                  <dd>{formatDate(person.detentionDate)}</dd>
                </div>
              )}
              {person.lastHeardFromDate && (
                <div>
                  <dt className="font-medium">Last Contact:</dt>
                  <dd>{formatDate(person.lastHeardFromDate)}</dd>
                </div>
              )}
              <div>
                <dt className="font-medium">Legal Representation:</dt>
                <dd>{person.representedByLawyer ? 'Yes' : 'No'}</dd>
              </div>
            </dl>
          </div>

          {/* Detention info if available */}
          {person.detentionCenter && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="font-semibold text-red-800 mb-2">Detention Center</h3>
              <p className="text-sm text-red-700">{person.detentionCenter.name}</p>
              <p className="text-sm text-red-700">
                {person.detentionCenter.city}, {person.detentionCenter.state}
              </p>
            </div>
          )}

          {/* Admin link */}
          {isAdmin && (
            <Link
              href={`/admin/persons/${person.id}/edit`}
              className="block text-center bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
            >
              Edit Person
            </Link>
          )}
        </div>
      );
    },
  };

  // Render layout based on type
  const renderLayout = () => {
    switch (template.type) {
      case 'grid':
        // Sections that should always be full width
        const fullWidthSections = ['gallery-grid', 'story', 'comments', 'top-row'];
        
        // Separate sections into grid and full-width
        const gridSections = template.sections.filter((s: string) => !fullWidthSections.includes(s));
        const fullSections = template.sections.filter((s: string) => fullWidthSections.includes(s));
        
        const gridCols = template.columns === 3 ? 'md:grid-cols-3' : 
                        template.columns === 4 ? 'md:grid-cols-4' : 
                        'md:grid-cols-2';
        
        return (
          <div className="space-y-8">
            {/* Grid sections (image, info, etc.) */}
            {gridSections.length > 0 && (
              <div className={`grid gap-6 ${gridCols}`}>
                {gridSections.map((section: string) => {
                  const component = components[section as keyof typeof components]?.();
                  if (!component) return null;
                  return (
                    <div key={section} className="layout-section">
                      {component}
                    </div>
                  );
                })}
              </div>
            )}
            
            {/* Full width sections (gallery, story, comments) */}
            {fullSections.map((section: string) => {
              const component = components[section as keyof typeof components]?.();
              if (!component) return null;
              return (
                <div key={section} className="layout-section w-full">
                  {component}
                </div>
              );
            })}
          </div>
        );

      case 'custom-person':
        // Custom layout with top row containing image, info, and additional photos
        return (
          <div className="space-y-8">
            {/* Top row with image, info, and additional photos */}
            <div className="layout-section w-full">
              {components['top-row']()}
            </div>
            
            {/* Stories section - full width */}
            <div className="layout-section w-full">
              {components['story']()}
            </div>
            
            {/* Community support section - full width */}
            <div className="layout-section w-full">
              {components['comments']()}
            </div>
          </div>
        );

      case 'stack':
        return (
          <div className="space-y-6">
            {template.sections.map((section: string) => {
              const component = components[section as keyof typeof components]?.();
              if (!component) return null;
              return (
                <div key={section} className="layout-section">
                  {component}
                </div>
              );
            })}
          </div>
        );

      case 'hero':
        return (
          <div className="space-y-6">
            {template.sections.map((section: string) => (
              <div key={section} className="layout-section">
                {components[section as keyof typeof components]?.()}
              </div>
            ))}
          </div>
        );

      case 'sidebar-left':
        return (
          <div className="grid gap-6 md:grid-cols-[300px_1fr]">
            <aside>
              {template.sections
                .filter((s: string) => s.includes('sidebar'))
                .map((section: string) => (
                  <div key={section} className="layout-section">
                    {components[section as keyof typeof components]?.()}
                  </div>
                ))}
            </aside>
            <main>
              {template.sections
                .filter((s: string) => !s.includes('sidebar'))
                .map((section: string) => (
                  <div key={section} className="layout-section mb-6">
                    {components[section as keyof typeof components]?.()}
                  </div>
                ))}
            </main>
          </div>
        );

      case 'sidebar-right':
        return (
          <div className="grid gap-6 md:grid-cols-[1fr_300px]">
            <main>
              {template.sections
                .filter((s: string) => !s.includes('sidebar'))
                .map((section: string) => (
                  <div key={section} className="layout-section mb-6">
                    {components[section as keyof typeof components]?.()}
                  </div>
                ))}
            </main>
            <aside>
              {template.sections
                .filter((s: string) => s.includes('sidebar'))
                .map((section: string) => (
                  <div key={section} className="layout-section">
                    {components[section as keyof typeof components]?.()}
                  </div>
                ))}
            </aside>
          </div>
        );

      case 'magazine':
        return (
          <div className="magazine-layout">
            <div className="grid gap-6 md:grid-cols-3">
              {template.sections.map((section: string) => (
                <div
                  key={section}
                  className={`layout-section ${
                    section === 'featured-image' ? 'md:col-span-2' : ''
                  }`}
                >
                  {components[section as keyof typeof components]?.()}
                </div>
              ))}
            </div>
          </div>
        );

      case 'minimal':
        return (
          <div className="minimal-layout mx-auto max-w-2xl space-y-8">
            {template.sections.map((section: string) => (
              <div key={section} className="layout-section">
                {components[section as keyof typeof components]?.()}
              </div>
            ))}
          </div>
        );

      case 'gallery':
        return (
          <div className="gallery-layout space-y-6">
            {template.sections.map((section: string) => (
              <div key={section} className="layout-section">
                {components[section as keyof typeof components]?.()}
              </div>
            ))}
          </div>
        );

      case 'full-width':
        return (
          <div className="full-width-layout">
            {template.sections.map((section: string) => (
              <div key={section} className="layout-section mb-8">
                {components[section as keyof typeof components]?.()}
              </div>
            ))}
          </div>
        );

      default:
        // Fallback to stack layout
        return (
          <div className="space-y-6">
            {template.sections.map((section: string) => (
              <div key={section} className="layout-section">
                {components[section as keyof typeof components]?.()}
              </div>
            ))}
          </div>
        );
    }
  };

  return (
    <>
      {themeStyles}
      <div className="layout-container">{renderLayout()}</div>
    </>
  );
}
