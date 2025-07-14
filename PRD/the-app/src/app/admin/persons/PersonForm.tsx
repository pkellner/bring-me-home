'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import MultiLanguageStoryEditor from '@/components/admin/MultiLanguageStoryEditor';
import {
  DetentionCenter,
  Person,
  ImageStorage,
  Story,
  Town,
  PersonImage,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TabsProvider, useTabs } from '@/app/admin/persons/[id]/edit/TabsProvider';
import { PersonImageTab } from '@/app/admin/persons/[id]/edit/PersonImageTab';
import { GalleryImagesTab } from '@/app/admin/persons/[id]/edit/GalleryImagesTab';

// Serialized version of Person for client components
type SerializedPerson = Omit<Person, 'bondAmount'> & {
  bondAmount: string | null;
  town: Town;
  detentionCenter?: DetentionCenter | null;
  stories?: Story[];
  images?: ImageStorage[];
  personImages?: (PersonImage & { image: ImageStorage })[];
};

interface PersonFormProps {
  person?: SerializedPerson;
  towns: Town[];
  session?: Session | null;
}

function PersonFormContent({ person, towns, session }: PersonFormProps) {
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
  // Image state removed - display only
  const [primaryImageFile, setPrimaryImageFile] = useState<File | null>(null);
  const [galleryImages, setGalleryImages] = useState<Array<{
    id: string;
    caption: string;
    toDelete?: boolean;
    isNew?: boolean;
    file?: File;
  }>>([]);


  async function handleSubmit(formData: FormData) {

    setIsSubmitting(true);
    setErrors({});

    try {
      // Sequential update of all three tabs
      let finalResult: { success?: boolean; errors?: Record<string, string[]>; person?: { id: string; slug: string; townSlug: string } } = { success: true };

      // 1. Update details tab (but not images)
      const detailsFormData = new FormData();
      
      // Copy all form fields except image-related ones
      for (const [key, value] of formData.entries()) {
        if (!key.startsWith('primaryPicture') && !key.startsWith('galleryImage')) {
          detailsFormData.append(key, value);
        }
      }
      
      // Add stories and detention center
      console.log('Saving stories:', stories);
      detailsFormData.set('stories', JSON.stringify(stories));
      if (selectedDetentionCenterId) {
        detailsFormData.append('detentionCenterId', selectedDetentionCenterId);
      } else {
        detailsFormData.append('detentionCenterId', '');
      }

      const detailsResult = person
        ? await updatePerson(person.id, detailsFormData)
        : await createPerson(detailsFormData);

      if (detailsResult.errors) {
        setErrors(detailsResult.errors);
        finalResult = detailsResult;
      } else {
        // If creating new person, get the ID for subsequent updates
        const personId = person?.id || (detailsResult as { person?: { id: string } }).person?.id;
        
        if (personId) {
          // 2. Update person image
          if (primaryImageFile) {
            const imageFormData = new FormData();
            imageFormData.set('primaryPicture', primaryImageFile);
            
            const imageResult = await updatePerson(personId, imageFormData);
            if (imageResult.errors) {
              setErrors(prev => ({ ...prev, ...imageResult.errors }));
              showErrorAlert('Failed to update person image', 3000);
            } else {
              showSuccessAlert('Person image updated successfully', 2000);
              triggerImageUpdate(); // Trigger image reload for other tabs
            }
          }

          // 3. Update gallery images
          if (galleryImages.length > 0) {
            const galleryFormData = new FormData();
            const galleryData = galleryImages.map((img, index) => {
              if (img.file) {
                galleryFormData.append(`galleryImage_${index}`, img.file);
              }
              return {
                id: img.id,
                caption: img.caption,
                toDelete: img.toDelete,
                isNew: img.isNew
              };
            });
            galleryFormData.set('additionalImages', JSON.stringify(galleryData));
            
            const galleryResult = await updatePerson(personId, galleryFormData);
            if (galleryResult.errors) {
              setErrors(prev => ({ ...prev, ...galleryResult.errors }));
              showErrorAlert('Failed to update gallery images', 3000);
            } else {
              showSuccessAlert('Gallery images updated successfully', 2000);
              triggerImageUpdate(); // Trigger image reload for other tabs
            }
          }
        }
        
        finalResult = detailsResult;
      }

      const result = finalResult;

      if (result.errors) {
        setIsSubmitting(false);
        setErrors(result.errors);

        // Show error alert with details
        const errorDetails: string[] = [];
        Object.entries(result.errors).forEach(([field, messages]) => {
          if (field === '_form' && Array.isArray(messages)) {
            errorDetails.push(...messages);
          } else if (Array.isArray(messages)) {
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

  // Image change handler removed - display only
  const { activeTab, setActiveTab, triggerImageUpdate } = useTabs();

  const primaryImage = person?.personImages?.find(pi => pi.imageType === 'primary');
  const galleryImagesList = person?.personImages?.filter(pi => pi.imageType === 'gallery') || [];

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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="person-image">Person Image</TabsTrigger>
            <TabsTrigger value="gallery-images">Gallery Images</TabsTrigger>
          </TabsList>
          
          <TabsContent value="details" className="space-y-6">
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

            <VisibilitySettings person={person} />
          </TabsContent>
          
          <TabsContent value="person-image" className="space-y-6">
            <PersonImageTab
              personId={person?.id || ''}
              currentImage={primaryImage}
              onImageChange={setPrimaryImageFile}
            />
          </TabsContent>
          
          <TabsContent value="gallery-images" className="space-y-6">
            <GalleryImagesTab
              personId={person?.id || ''}
              currentImages={galleryImagesList}
              onImagesChange={setGalleryImages}
            />
          </TabsContent>
        </Tabs>

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

export default function PersonForm(props: PersonFormProps) {
  return (
    <TabsProvider>
      <PersonFormContent {...props} />
    </TabsProvider>
  );
}
