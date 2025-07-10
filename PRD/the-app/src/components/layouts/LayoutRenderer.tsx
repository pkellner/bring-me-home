'use client';

import { Comment, Person, Town } from '@prisma/client';
import Image from 'next/image';
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
}

export default function LayoutRenderer({
  person,
  layout,
  theme,
}: LayoutRendererProps) {
  const template = JSON.parse(layout.template);

  // Apply theme CSS variables if provided
  const themeStyles = theme?.cssVars ? (
    <style dangerouslySetInnerHTML={{ __html: theme.cssVars }} />
  ) : null;

  // Common components that can be used in layouts
  const components = {
    'hero-image': () => (
      <div className="hero-image relative h-96 w-full overflow-hidden rounded-lg">
        {person.primaryPicture ? (
          <Image
            src={person.primaryPicture}
            alt={`${person.firstName} ${person.lastName}`}
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gray-200">
            <span className="text-4xl text-gray-400">No Photo Available</span>
          </div>
        )}
      </div>
    ),

    image: () => (
      <div className="image-section">
        {person.primaryPicture ? (
          <Image
            src={person.primaryPicture}
            alt={`${person.firstName} ${person.lastName}`}
            width={400}
            height={400}
            className="rounded-lg object-cover"
          />
        ) : (
          <div className="flex h-96 w-full items-center justify-center rounded-lg bg-gray-200">
            <span className="text-2xl text-gray-400">No Photo Available</span>
          </div>
        )}
      </div>
    ),

    info: () => (
      <div className="info-section space-y-4">
        <h1 className="text-3xl font-bold">
          {person.firstName} {person.middleName ? `${person.middleName} ` : ''}
          {person.lastName}
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
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <h3 className="text-lg font-bold text-red-800 mb-3">
              Detention Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
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
                {person.detentionStatus && (
                  <div>
                    <span className="font-semibold text-red-700">Status:</span>{' '}
                    <span className="text-red-800 capitalize">
                      {person.detentionStatus.replace(/-/g, ' ')}
                    </span>
                  </div>
                )}
                {person.caseNumber && (
                  <div>
                    <span className="font-semibold text-red-700">
                      Case Number:
                    </span>{' '}
                    <span className="text-red-800">{person.caseNumber}</span>
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
              <div className="flex items-center justify-center">
                {person.detentionCenter.thumbnailImageId ? (
                  <Image
                    src={`/api/images/${person.detentionCenter.thumbnailImageId}`}
                    alt={person.detentionCenter.name}
                    width={300}
                    height={200}
                    className="rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-full h-48 bg-gray-200 rounded-lg flex items-center justify-center">
                    <span className="text-4xl text-gray-400">🏢</span>
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
        <CommentSection personId={person.id} comments={person.comments} />
      </div>
    ),

    'basic-info': () => (
      <div className="basic-info text-center">
        <h1 className="mb-2 text-4xl font-bold">
          {person.firstName} {person.middleName ? `${person.middleName} ` : ''}
          {person.lastName}
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
      const additionalImages = person.personImages || [];
      const allImages = [];

      // Add primary picture first if it exists
      if (person.primaryPicture) {
        allImages.push({
          imageUrl: person.primaryPicture,
          caption: 'Primary Photo',
          isPrimary: true,
        });
      }

      // Add additional images that are public
      allImages.push(...additionalImages.filter(img => img.displayPublicly));

      // Add legacy images if no new images exist
      if (additionalImages.length === 0) {
        if (person.secondaryPic1)
          allImages.push({
            imageUrl: person.secondaryPic1,
            caption: 'Secondary 1',
          });
        if (person.secondaryPic2)
          allImages.push({
            imageUrl: person.secondaryPic2,
            caption: 'Secondary 2',
          });
      }

      return (
        <div className="gallery-grid grid grid-cols-2 gap-4 md:grid-cols-3">
          {allImages.map((image, index) => (
            <div
              key={'id' in image && image.id ? image.id : `image-${index}`}
              className="relative aspect-square overflow-hidden rounded-lg group"
            >
              <Image
                src={image.imageUrl}
                alt={image.caption || `Image ${index + 1}`}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
              {image.caption && (
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-sm p-2">
                  {image.caption}
                </div>
              )}
              {image.isPrimary && (
                <div className="absolute top-2 left-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded">
                  Primary
                </div>
              )}
            </div>
          ))}
          {allImages.length === 0 && (
            <div className="col-span-full text-center text-gray-500 py-8">
              No images available
            </div>
          )}
        </div>
      );
    },
  };

  // Render layout based on type
  const renderLayout = () => {
    switch (template.type) {
      case 'grid':
        return (
          <div className={`grid gap-6 md:grid-cols-${template.columns || 2}`}>
            {template.sections.map((section: string) => (
              <div key={section} className="layout-section">
                {components[section as keyof typeof components]?.()}
              </div>
            ))}
          </div>
        );

      case 'stack':
        return (
          <div className="space-y-6">
            {template.sections.map((section: string) => (
              <div key={section} className="layout-section">
                {components[section as keyof typeof components]?.()}
              </div>
            ))}
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
