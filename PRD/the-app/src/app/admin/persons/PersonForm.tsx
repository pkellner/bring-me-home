'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import MultiLanguageStoryEditor from '@/components/admin/MultiLanguageStoryEditor';
import { createPerson, updatePerson } from '@/app/actions/persons';
import DetentionCenterSelector from '@/components/DetentionCenterSelector';
import PersonBasicInfo from './components/PersonBasicInfo';
import PersonDetentionInfo from './components/PersonDetentionInfo';
import VisibilitySettings from './components/VisibilitySettings';
import FormActions from './components/FormActions';
import { Session } from 'next-auth';
import LoadingOverlay from './components/LoadingOverlay';
import { showSuccessAlert, showErrorAlert } from '@/lib/alertBox';
import type { 
  SerializedPerson, 
  SanitizedTown,
  SanitizedDetentionCenter,
  SimplifiedStory
} from '@/types/sanitized';

interface PersonFormProps {
  person?: SerializedPerson;
  towns: SanitizedTown[];
  session?: Session | null;
}

export default function PersonForm({ person, towns, session }: PersonFormProps) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [detentionModalOpen, setDetentionModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDetentionCenterId, setSelectedDetentionCenterId] = useState<string | null>(
    person?.detentionCenterId || null
  );
  const [selectedDetentionCenter, setSelectedDetentionCenter] = useState<SanitizedDetentionCenter | null>(
    person?.detentionCenter || null
  );
  const [stories, setStories] = useState<SimplifiedStory[]>(
    person?.stories?.map(story => ({
      language: story.language,
      storyType: story.storyType,
      content: story.content
    })) || []
  );

  const formRef = useRef<HTMLFormElement>(null);

  // Handle stories change
  const handleStoriesChange = useCallback((newStories: typeof stories) => {
    setStories(newStories);
  }, []);

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
  }, []);

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true);
    setErrors({});

    try {
      // Add stories and detention center to form data
      formData.append('stories', JSON.stringify(stories));
      if (selectedDetentionCenterId) {
        formData.append('detentionCenterId', selectedDetentionCenterId);
      } else {
        formData.append('detentionCenterId', '');
      }

      const result: {
        success?: boolean;
        errors?: Record<string, string[]>;
        person?: { id: string; slug: string; townSlug: string };
      } = person
        ? await updatePerson(person.id, formData)
        : await createPerson(formData);

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
        showSuccessAlert('Person details updated successfully!', 3000);
        setIsSubmitting(false);
        
        if (!person && result.person) {
          router.push(`/admin/persons/${result.person.id}/edit`);
        } else {
          router.refresh();
        }
      }
    } catch (error) {
      setIsSubmitting(false);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      showErrorAlert(`Unexpected error: ${errorMessage}`, 5000);
    }
  }

  return (
    <>
      <form ref={formRef} onSubmit={async (e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        await handleSubmit(formData);
      }} className="space-y-6 relative">
        <LoadingOverlay
          isLoading={isSubmitting}
          message={person ? 'Updating person...' : 'Creating person...'}
        />
        
        <div className="space-y-6">
          <PersonBasicInfo
            person={person}
            towns={towns}
            errors={errors}
          />

          <PersonDetentionInfo
            person={person}
            selectedDetentionCenter={selectedDetentionCenter}
            selectedDetentionCenterId={selectedDetentionCenterId}
            onOpenModal={() => setDetentionModalOpen(true)}
          />

          <MultiLanguageStoryEditor
            onChange={handleStoriesChange}
          />

          <VisibilitySettings person={person} />
        </div>

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
        onSelect={handleDetentionCenterChange}
        currentDetentionCenterId={selectedDetentionCenterId}
      />
    </>
  );
}