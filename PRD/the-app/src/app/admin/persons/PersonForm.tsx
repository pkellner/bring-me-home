'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import MultiLanguageStoryEditor from '@/components/admin/MultiLanguageStoryEditor';
import PersonImageManager from '@/components/admin/PersonImageManager';
import {
  DetentionCenter,
  Person,
  ImageStorage,
  Story,
  Town,
} from '@prisma/client';
import { createPerson, updatePerson } from '@/app/actions/persons';
import DetentionCenterSelector from '@/components/DetentionCenterSelector';
import PersonBasicInfo from './components/PersonBasicInfo';
import PersonDetentionInfo from './components/PersonDetentionInfo';
import VisibilitySettings from './components/VisibilitySettings';
import FormActions from './components/FormActions';
import { Session } from 'next-auth';
import LoadingOverlay from './components/LoadingOverlay';
import { showSuccessAlert, showErrorAlert } from '@/lib/alertBox';

// Serialized version of Person for client components
type SerializedPerson = Omit<Person, 'bondAmount'> & {
  bondAmount: string | null;
  town: Town;
  detentionCenter?: DetentionCenter | null;
  stories?: Story[];
  images?: ImageStorage[];
};

interface PersonFormProps {
  person?: SerializedPerson;
  towns: Town[];
  session?: Session | null;
}

export default function PersonForm({ person, towns, session }: PersonFormProps) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [detentionModalOpen, setDetentionModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDetentionCenterId, setSelectedDetentionCenterId] = useState<
    string | null
  >(person?.detentionCenterId || null);
  const [selectedDetentionCenter, setSelectedDetentionCenter] =
    useState<DetentionCenter | null>(person?.detentionCenter || null);
  const [stories, setStories] = useState<
    { language: string; storyType: string; content: string }[]
  >(
    person?.stories?.map(story => ({
      language: story.language,
      storyType: story.storyType,
      content: story.content
    })) || []
  );
  const [primaryImageFile, setPrimaryImageFile] = useState<File | null>(null);
  const [additionalImages, setAdditionalImages] = useState<
    Array<{
      id?: string;
      imageUrl: string;
      thumbnailUrl?: string | null;
      caption?: string | null;
      file?: File;
      isNew?: boolean;
      toDelete?: boolean;
    }>
  >([]);


  async function handleSubmit(formData: FormData) {

    setIsSubmitting(true);
    setErrors({});


    // Add stories as JSON to form data
    console.log('Saving stories:', stories);
    formData.set('stories', JSON.stringify(stories));
    // Add detention center ID to form data
    if (selectedDetentionCenterId) {
      formData.append('detentionCenterId', selectedDetentionCenterId);
    } else {
      formData.append('detentionCenterId', '');
    }

    // Add primary image if new one selected
    if (primaryImageFile) {
      formData.append('primaryPicture', primaryImageFile);
    }

    // Add additional images data
    formData.set('additionalImages', JSON.stringify(additionalImages));

    // Add actual image files for new images
    additionalImages.forEach((image, index) => {
      if (image.isNew && image.file && !image.toDelete) {
        formData.append(`image_file_${index}`, image.file);
      }
    });

    try {
      const result = person
        ? await updatePerson(person.id, formData)
        : await createPerson(formData);

      if (result.errors) {
        setIsSubmitting(false);
        setErrors(result.errors);

        // Show error alert with details
        const errorDetails: string[] = [];
        Object.entries(result.errors).forEach(([field, messages]) => {
          if (field === '_form') {
            errorDetails.push(...messages);
          } else {
            errorDetails.push(`${field}: ${messages.join(', ')}`);
          }
        });

        const message = person
          ? `Failed to update ${person.firstName} ${person.lastName}: ${errorDetails.join(', ')}`
          : `Failed to create person: ${errorDetails.join(', ')}`;
        
        showErrorAlert(message, 5000); // Show error for 5 seconds
      } else if (result.success) {
        // Show success alert with details
        const details: string[] = [];
        if (person) {
          details.push(`Name: ${formData.get('firstName')} ${formData.get('lastName')}`);
          details.push(`Town: ${towns.find(t => t.id === formData.get('townId'))?.name || 'Unknown'}`);
          if (selectedDetentionCenter) {
            details.push(`Detention Center: ${selectedDetentionCenter.name}`);
          }
          if (stories.length > 0) {
            details.push(`Stories: ${stories.length} language(s)`);
          }
        }

        // Show success message
        const firstName = formData.get('firstName') as string;
        const lastName = formData.get('lastName') as string;
        const message = person 
          ? `${person.firstName} ${person.lastName} has been updated successfully!`
          : `${firstName} ${lastName} has been created successfully!`;
        
        showSuccessAlert(message, 4000); // Show success for 4 seconds
        
        // Navigate after a short delay to let user see the message
        setTimeout(() => {
          if (person) {
            router.refresh();
            setIsSubmitting(false);
          } else {
            // Check if this is a create result with person data
            type CreateResult = {
              success: boolean;
              person?: {
                id: string;
                slug: string;
                townSlug: string;
              };
            };
            const createResult = result as CreateResult;
            if (createResult.person?.townSlug && createResult.person?.slug) {
              // Redirect to the new person's page
              router.push(`/${createResult.person.townSlug}/${createResult.person.slug}`);
            } else {
              // Fallback to persons list
              router.push('/admin/persons');
            }
            // Note: Don't need to setIsSubmitting(false) for redirects as component will unmount
          }
        }, 1500);
      }
    } catch (error) {
      setIsSubmitting(false);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      showErrorAlert(`Unexpected error: ${errorMessage}`, 5000);
    }
  }


  async function handleDetentionCenterSelect(centerId: string | null) {
    setSelectedDetentionCenterId(centerId);

    if (centerId) {
      // Fetch the detention center details
      try {
        const response = await fetch(`/api/detention-centers/${centerId}`);
        if (response.ok) {
          const center = await response.json();
          setSelectedDetentionCenter(center);
        }
      } catch (error) {
        console.error('Failed to fetch detention center details:', error);
      }
    } else {
      setSelectedDetentionCenter(null);
    }
  }

  const handleImageChange = useCallback((primaryFile: File | null, images: typeof additionalImages) => {
    setPrimaryImageFile(primaryFile);
    setAdditionalImages(images);
  }, []);

  return (
    <>

      <form onSubmit={async (e) => {
        e.preventDefault();
        if (isSubmitting) return; // Prevent multiple submissions
        const formData = new FormData(e.currentTarget);
        await handleSubmit(formData);
      }} className="space-y-6 relative">
        <LoadingOverlay
          isLoading={isSubmitting}
          message={person ? 'Updating person...' : 'Creating person...'}
        />
        <PersonBasicInfo person={person} towns={towns} errors={errors} />

        <PersonDetentionInfo
          person={person}
          selectedDetentionCenter={selectedDetentionCenter}
          selectedDetentionCenterId={selectedDetentionCenterId}
          onOpenModal={() => setDetentionModalOpen(true)}
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Stories
          </label>
          <MultiLanguageStoryEditor
            stories={person?.stories}
            onChange={setStories}
          />
          <p className="mt-2 text-sm text-gray-500">
            Add stories in multiple languages. Visitors will be able to switch
            between available languages on the profile page.
          </p>
        </div>

        <div className="border-t pt-6">
          <PersonImageManager
            primaryImage={useMemo(() => {
              const profileImg = person?.images?.find(img => (img as ImageStorage & { imageType: string }).imageType === 'primary');
              if (!profileImg) return undefined;
              return `/api/images/${profileImg.id}`;
            }, [person?.images])}
            existingImages={useMemo(() => 
              person?.images?.filter(img => (img as ImageStorage & { imageType: string }).imageType === 'gallery')?.map(img => ({
                id: img.id,
                imageUrl: `/api/images/${img.id}`,
                caption: img.caption,
              })) || []
            , [person?.images])}
            onChange={handleImageChange}
          />
        </div>

        <VisibilitySettings person={person} />

        <FormActions 
          isSubmitting={isSubmitting} 
          isEditMode={!!person} 
          person={person}
          session={session}
        />
      </form>

      <DetentionCenterSelector
        isOpen={detentionModalOpen}
        onClose={() => setDetentionModalOpen(false)}
        onSelect={handleDetentionCenterSelect}
        currentDetentionCenterId={selectedDetentionCenterId}
      />
    </>
  );
}
