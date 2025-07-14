'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
import { UnsavedChangesIndicator } from '@/app/admin/persons/[id]/edit/UnsavedChangesIndicator';
import { TabSwitchDialog } from '@/app/admin/persons/[id]/edit/TabSwitchDialog';

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
  const [showTabSwitchDialog, setShowTabSwitchDialog] = useState(false);
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
  const [galleryImages, setGalleryImages] = useState<Array<{
    id: string;
    caption: string;
    originalCaption?: string;
    toDelete?: boolean;
    isNew?: boolean;
    file?: File;
  }>>([]);

  const { 
    activeTab, 
    setActiveTab, 
    triggerImageUpdate, 
    hasChanges, 
    setHasChanges, 
    pendingTabSwitch,
    setPendingTabSwitch,
    resetTabChanges
  } = useTabs();

  // Store original values for comparison
  const originalValues = useRef({
    stories: JSON.stringify(person?.stories || []),
    detentionCenterId: person?.detentionCenterId || null,
    formFields: {} as Record<string, string>
  });

  // Form ref to track changes
  const formRef = useRef<HTMLFormElement>(null);

  // Initialize original form values after mount
  useEffect(() => {
    // Use a small timeout to ensure form is fully rendered
    const timer = setTimeout(() => {
      if (formRef.current) {
        const formData = new FormData(formRef.current);
        const fields: Record<string, string> = {};
        
        for (const [key, value] of formData.entries()) {
          if (key !== 'stories' && key !== 'detentionCenterId') {
            fields[key] = String(value);
          }
        }
        
        originalValues.current.formFields = fields;
      }
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  const primaryImage = person?.personImages?.find(pi => pi.imageType === 'primary');
  const galleryImagesList = person?.personImages?.filter(pi => pi.imageType === 'gallery') || [];

  // Check if form fields have changed
  const checkFormFieldsChanged = useCallback(() => {
    if (!formRef.current) return false;
    
    const formData = new FormData(formRef.current);
    for (const [key, value] of formData.entries()) {
      if (key !== 'stories' && key !== 'detentionCenterId') {
        const originalValue = originalValues.current.formFields[key];
        if (originalValue !== undefined && String(originalValue) !== String(value)) {
          return true;
        }
      }
    }
    return false;
  }, []);

  // Handle stories change
  const handleStoriesChange = useCallback((newStories: typeof stories) => {
    setStories(newStories);
    if (activeTab === 'details') {
      const hasChanged = JSON.stringify(newStories) !== originalValues.current.stories;
      setHasChanges('details', hasChanged || 
        selectedDetentionCenterId !== originalValues.current.detentionCenterId ||
        checkFormFieldsChanged());
    }
  }, [activeTab, selectedDetentionCenterId, setHasChanges, checkFormFieldsChanged]);

  // Handle form field changes
  const handleFormChange = useCallback(() => {
    if (activeTab === 'details') {
      const hasFormChanges = checkFormFieldsChanged();
      const hasStoriesChanged = JSON.stringify(stories) !== originalValues.current.stories;
      const hasDetentionChanged = selectedDetentionCenterId !== originalValues.current.detentionCenterId;
      
      setHasChanges('details', hasFormChanges || hasStoriesChanged || hasDetentionChanged);
    }
  }, [activeTab, stories, selectedDetentionCenterId, checkFormFieldsChanged, setHasChanges]);

  // Handle detention center change
  const handleDetentionCenterChange = useCallback(async (centerId: string | null) => {
    setSelectedDetentionCenterId(centerId);

    if (centerId) {
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

    if (activeTab === 'details') {
      const hasChanged = centerId !== originalValues.current.detentionCenterId;
      setHasChanges('details', hasChanged || 
        JSON.stringify(stories) !== originalValues.current.stories ||
        checkFormFieldsChanged());
    }
  }, [activeTab, stories, checkFormFieldsChanged, setHasChanges]);

  // Handle primary image change
  const handlePrimaryImageChange = useCallback((file: File | null) => {
    setPrimaryImageFile(file);
    if (activeTab === 'person-image') {
      setHasChanges('person-image', file !== null);
    }
  }, [activeTab, setHasChanges]);

  // Handle gallery images change
  const handleGalleryImagesChange = useCallback((images: typeof galleryImages) => {
    setGalleryImages(images);
    if (activeTab === 'gallery-images') {
      const hasChanges = images.some(img => img.isNew || img.toDelete || img.caption !== img.originalCaption);
      setHasChanges('gallery-images', hasChanges);
    }
  }, [activeTab, setHasChanges]);

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true);
    setErrors({});

    try {
      let result: { success?: boolean; errors?: Record<string, string[]>; person?: { id: string; slug: string; townSlug: string } };

      // Only update the current tab
      if (activeTab === 'details') {
        // Update details only
        console.log('Saving stories:', stories);
        formData.set('stories', JSON.stringify(stories));
        if (selectedDetentionCenterId) {
          formData.append('detentionCenterId', selectedDetentionCenterId);
        } else {
          formData.append('detentionCenterId', '');
        }

        result = person
          ? await updatePerson(person.id, formData)
          : await createPerson(formData);

        if (result.success) {
          // Update original values after successful save
          originalValues.current.stories = JSON.stringify(stories);
          originalValues.current.detentionCenterId = selectedDetentionCenterId;
          
          if (formRef.current) {
            const newFormData = new FormData(formRef.current);
            const fields: Record<string, string> = {};
            
            for (const [key, value] of newFormData.entries()) {
              if (key !== 'stories' && key !== 'detentionCenterId') {
                fields[key] = String(value);
              }
            }
            
            originalValues.current.formFields = fields;
          }
          
          resetTabChanges('details');
        }
      } else if (activeTab === 'person-image' && person) {
        // Update person image only
        const imageFormData = new FormData();
        if (primaryImageFile) {
          imageFormData.set('primaryPicture', primaryImageFile);
        }
        
        result = await updatePerson(person.id, imageFormData);
        
        if (result.success) {
          setPrimaryImageFile(null);
          resetTabChanges('person-image');
          triggerImageUpdate();
        }
      } else if (activeTab === 'gallery-images' && person) {
        // Update gallery images only
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
        
        result = await updatePerson(person.id, galleryFormData);
        
        if (result.success) {
          setGalleryImages([]);
          resetTabChanges('gallery-images');
          triggerImageUpdate();
        }
      } else {
        result = { errors: { _form: ['No changes to save'] } };
      }

      if (result.errors) {
        setIsSubmitting(false);
        setErrors(result.errors);

        const errorDetails: string[] = [];
        Object.entries(result.errors).forEach(([field, messages]) => {
          if (field === '_form') {
            errorDetails.push(...messages);
          } else {
            errorDetails.push(`${field}: ${messages.join(', ')}`);
          }
        });

        const message = `Failed to update: ${errorDetails.join(', ')}`;
        showErrorAlert(message, 5000);
      } else if (result.success) {
        const tabName = activeTab === 'details' ? 'Details' : 
                       activeTab === 'person-image' ? 'Person image' : 
                       'Gallery images';
        showSuccessAlert(`${tabName} updated successfully!`, 3000);
        
        setIsSubmitting(false);
        router.refresh();
      }
    } catch (error) {
      setIsSubmitting(false);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      showErrorAlert(`Unexpected error: ${errorMessage}`, 5000);
    }
  }


  const handleTabChange = (newTab: string) => {
    const currentTabHasChanges = hasChanges[activeTab as keyof typeof hasChanges];
    
    if (currentTabHasChanges) {
      setPendingTabSwitch(newTab);
      setShowTabSwitchDialog(true);
    } else {
      setActiveTab(newTab);
    }
  };

  const handleSaveAndSwitch = async () => {
    setShowTabSwitchDialog(false);
    if (formRef.current) {
      const formData = new FormData(formRef.current);
      await handleSubmit(formData);
    }
    if (pendingTabSwitch) {
      setActiveTab(pendingTabSwitch);
      setPendingTabSwitch(null);
    }
  };

  const handleDiscardAndSwitch = () => {
    setShowTabSwitchDialog(false);
    resetTabChanges(activeTab as keyof typeof hasChanges);
    
    // Reset state based on current tab
    if (activeTab === 'details') {
      // Reset to original values
      setStories(person?.stories?.map(story => ({
        language: story.language,
        storyType: story.storyType,
        content: story.content
      })) || []);
      setSelectedDetentionCenterId(person?.detentionCenterId || null);
      setSelectedDetentionCenter(person?.detentionCenter || null);
    } else if (activeTab === 'person-image') {
      setPrimaryImageFile(null);
    } else if (activeTab === 'gallery-images') {
      setGalleryImages([]);
    }
    
    if (pendingTabSwitch) {
      setActiveTab(pendingTabSwitch);
      setPendingTabSwitch(null);
    }
  };

  const getTabDisplayName = (tab: string) => {
    return tab === 'details' ? 'Details' :
           tab === 'person-image' ? 'Person Image' :
           'Gallery Images';
  };

  const currentTabHasChanges = hasChanges[activeTab as keyof typeof hasChanges];

  return (
    <>
      <UnsavedChangesIndicator />
      
      <form ref={formRef} onSubmit={async (e) => {
        e.preventDefault();
        if (isSubmitting) return;
        const formData = new FormData(e.currentTarget);
        await handleSubmit(formData);
      }} onChange={handleFormChange} className="space-y-6 relative">
        <LoadingOverlay
          isLoading={isSubmitting}
          message={person ? 'Updating person...' : 'Creating person...'}
        />
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
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
                onChange={handleStoriesChange}
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
              currentImage={primaryImage}
              onImageChange={handlePrimaryImageChange}
            />
          </TabsContent>
          
          <TabsContent value="gallery-images" className="space-y-6">
            <GalleryImagesTab
              currentImages={galleryImagesList}
              onImagesChange={handleGalleryImagesChange}
            />
          </TabsContent>
        </Tabs>

        <FormActions 
          isSubmitting={isSubmitting} 
          isEditMode={!!person} 
          person={person}
          session={session}
          disabled={!currentTabHasChanges}
        />
      </form>

      <DetentionCenterSelector
        isOpen={detentionModalOpen}
        onClose={() => setDetentionModalOpen(false)}
        onSelect={handleDetentionCenterChange}
        currentDetentionCenterId={selectedDetentionCenterId}
      />
      
      <TabSwitchDialog
        isOpen={showTabSwitchDialog}
        onSave={handleSaveAndSwitch}
        onDiscard={handleDiscardAndSwitch}
        onCancel={() => {
          setShowTabSwitchDialog(false);
          setPendingTabSwitch(null);
        }}
        currentTabName={getTabDisplayName(activeTab)}
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