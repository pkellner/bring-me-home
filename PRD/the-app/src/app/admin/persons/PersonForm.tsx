'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import MultiLanguageStoryEditor from '@/components/admin/MultiLanguageStoryEditor';
import PersonImageManager from '@/components/admin/PersonImageManager';
import {
  DetentionCenter,
  Person,
  PersonImage,
  Story,
  Town,
} from '@prisma/client';
import { createPerson, updatePerson } from '@/app/actions/persons';
import DetentionCenterSelector from '@/components/DetentionCenterSelector';
import PersonBasicInfo from './components/PersonBasicInfo';
import PersonDetentionInfo from './components/PersonDetentionInfo';
import FormActions from './components/FormActions';
import LoadingOverlay from './components/LoadingOverlay';
import { showSuccessAlert, showErrorAlert } from '@/lib/alertBox';

// Serialized version of Person for client components
type SerializedPerson = Omit<Person, 'bondAmount'> & {
  bondAmount: string | null;
  town: Town;
  detentionCenter?: DetentionCenter | null;
  stories?: Story[];
  personImages?: PersonImage[];
};

interface PersonFormProps {
  person?: SerializedPerson;
  towns: Town[];
}

export default function PersonForm({ person, towns }: PersonFormProps) {
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
  >([]);
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

      setIsSubmitting(false);

      if (result.errors) {
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
        const message = person 
          ? `${person.firstName} ${person.lastName} has been updated successfully!`
          : `New person has been created successfully!`;
        
        showSuccessAlert(message, 4000); // Show success for 4 seconds
        
        // Navigate after a short delay to let user see the message
        setTimeout(() => {
          if (person) {
            router.refresh();
          } else {
            router.push('/admin/persons');
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

  return (
    <>

      <form onSubmit={async (e) => {
        e.preventDefault();
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
            primaryImage={person?.personImages?.find(img => img.isPrimary)?.imageUrl}
            existingImages={person?.personImages?.filter(img => !img.isPrimary)}
            onChange={(primaryFile, images) => {
              setPrimaryImageFile(primaryFile);
              setAdditionalImages(images);
            }}
          />
        </div>



        <FormActions isSubmitting={isSubmitting} isEditMode={!!person} />
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
