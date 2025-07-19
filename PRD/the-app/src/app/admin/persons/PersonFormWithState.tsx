'use client';

/**
 * ⚠️ CIRCULAR REFERENCE WARNING ⚠️
 *
 * This component receives Prisma objects that contain circular references:
 * - person.stories[].person (Story → Person)
 * - person.town.persons[] (Town → Persons[])
 * - person.detentionCenter.detainees[] (DetentionCenter → Persons[])
 *
 * NEVER pass these objects directly to child components or state!
 * Always extract only the fields you need to break circular references.
 *
 * See lines 46-56 for stories extraction example.
 * See lines 235-250 for critical MultiLanguageStoryEditor warning.
 */

import { useState, useRef, useCallback, useImperativeHandle, forwardRef } from 'react';
import { useRouter } from 'next/navigation';
import MultiLanguageStoryEditor from '@/components/admin/MultiLanguageStoryEditor';
import { createPerson, updatePerson } from '@/app/actions/persons';
import DetentionCenterSelector from '@/components/DetentionCenterSelector';
import PersonBasicInfo from './components/PersonBasicInfo';
import PersonDetentionInfo from './components/PersonDetentionInfo';
import VisibilitySettings from './components/VisibilitySettings';
import FormActions from './components/FormActions';
import LoadingOverlay from './components/LoadingOverlay';
import { showSuccessAlert, showErrorAlert } from '@/lib/alertBox';
import { Session } from 'next-auth';
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
  onChangeDetected?: (hasChanges: boolean) => void;
}

export interface PersonFormHandle {
  save: () => Promise<void>;
  hasChanges: () => boolean;
}

const PersonFormWithState = forwardRef<PersonFormHandle, PersonFormProps>(
  ({ person, towns, session, onChangeDetected }, ref) => {
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
  // ⚠️ CRITICAL: Extract only needed fields to avoid circular references
  // person.stories contains full Story objects with personId that reference back to Person
  // This creates circular references that break Next.js serialization
  // We MUST extract only the fields we need: language, storyType, content
  const [stories, setStories] = useState<SimplifiedStory[]>(
    person?.stories?.map(story => ({
      language: story.language,
      storyType: story.storyType,
      content: story.content
    })) || []
  );

  const formRef = useRef<HTMLFormElement>(null);
  const originalStateRef = useRef({
    stories: JSON.stringify(person?.stories || []),
    detentionCenterId: person?.detentionCenterId || null,
    formData: {} as Record<string, FormDataEntryValue>
  });

  // Initialize original form state
  useImperativeHandle(ref, () => ({
    save: handleSubmit,
    hasChanges: checkHasChanges
  }));

  const checkFormChanged = useCallback(() => {
    if (!formRef.current) return false;

    const formData = new FormData(formRef.current);
    for (const [key, value] of formData.entries()) {
      if (key !== 'stories' && key !== 'detentionCenterId') {
        const originalValue = originalStateRef.current.formData[key];
        if (originalValue !== undefined && String(originalValue) !== String(value)) {
          return true;
        }
      }
    }
    return false;
  }, []);

  const checkHasChanges = useCallback(() => {
    const storiesChanged = JSON.stringify(stories) !== originalStateRef.current.stories;
    const detentionChanged = selectedDetentionCenterId !== originalStateRef.current.detentionCenterId;
    const formChanged = checkFormChanged();

    return storiesChanged || detentionChanged || formChanged;
  }, [stories, selectedDetentionCenterId, checkFormChanged]);

  // Track changes
  const handleStoriesChange = useCallback((newStories: typeof stories) => {
    setStories(newStories);
    setTimeout(() => {
      onChangeDetected?.(checkHasChanges());
    }, 0);
  }, [checkHasChanges, onChangeDetected]);

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

    setTimeout(() => {
      onChangeDetected?.(checkHasChanges());
    }, 0);
  }, [checkHasChanges, onChangeDetected]);

  const handleFormChange = useCallback(() => {
    setTimeout(() => {
      onChangeDetected?.(checkHasChanges());
    }, 100);
  }, [checkHasChanges, onChangeDetected]);

  const handleSubmit = async () => {
    if (!formRef.current) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      const formData = new FormData(formRef.current);

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

        // Update original state after successful save
        originalStateRef.current = {
          stories: JSON.stringify(stories),
          detentionCenterId: selectedDetentionCenterId,
          formData: Object.fromEntries(new FormData(formRef.current))
        };

        setIsSubmitting(false);
        onChangeDetected?.(false);

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
  };

  return (
    <>
      <form ref={formRef} onChange={handleFormChange} className="space-y-6 relative">
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

          {/*
            ⚠️ CRITICAL: DO NOT pass person?.stories directly here!
            This causes a "Maximum call stack size exceeded" error due to circular references.
            The person object contains stories which reference back to the person (personId),
            creating Person → Stories → Person circular reference that breaks Next.js serialization.

            We MUST use the simplified 'stories' state that only contains the needed fields:
            { language, storyType, content } without the circular references.

            The state is initialized from person?.stories in lines 67-73, extracting only safe fields.
            This has been broken multiple times - please maintain this pattern!
          */}
          <MultiLanguageStoryEditor
            stories={stories}
            onChange={handleStoriesChange}
          />

          <VisibilitySettings person={person} />
        </div>

        <FormActions
          isSubmitting={isSubmitting}
          isEditMode={!!person}
          person={person}
          session={session}
          disabled={!checkHasChanges()}
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
});

PersonFormWithState.displayName = 'PersonFormWithState';

export default PersonFormWithState;