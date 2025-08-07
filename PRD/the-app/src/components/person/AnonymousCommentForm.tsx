'use client';

import {
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useSafeRecaptcha } from '@/hooks/useRecaptcha';
import CommentConfirmationModal from './CommentConfirmationModal';

const DEBUG_RECAPTCHA = process.env.NEXT_PUBLIC_DEBUG_RECAPTCHA === 'true';

export interface AnonymousCommentFormProps {
  personId: string;
  personHistoryId?: string; // New optional field for history comments
  onSubmit: (formData: FormData) => void;
  isPending: boolean;
  state?: {
    success?: boolean;
    error?: string;
    errors?: Record<string, string[]>;
    warning?: string;
    recaptchaScore?: number;
    recaptchaDetails?: {
      success: boolean;
      score: number;
      action: string;
      hostname: string;
      challenge_ts: string;
      'error-codes'?: string[];
    };
  };
  onCancel?: () => void;
  title?: string;
  submitButtonText?: string;
  isMapExpanded?: boolean;
  onContractMap?: () => void;
  magicLinkData?: {
    user: { email: string };
    previousComment?: {
      email: string;
      firstName: string;
      lastName: string;
      phone?: string | null;
      occupation?: string | null;
      birthdate?: Date | null;
      city?: string | null;
      state?: string | null;
      wantsToHelpMore?: boolean;
      displayNameOnly?: boolean;
      showOccupation?: boolean;
      showBirthdate?: boolean;
      showCityState?: boolean;
      showComment?: boolean;
      privacyRequiredDoNotShowPublicly?: boolean;
    };
  };
  magicToken?: string | null;
}

export default function AnonymousCommentForm({
  personId,
  personHistoryId,
  onSubmit,
  isPending,
  state,
  onCancel,
  title = 'Add Your Support',
  submitButtonText = 'Submit Support',
  isMapExpanded = false,
  onContractMap,
  magicLinkData,
  magicToken,
}: AnonymousCommentFormProps) {
  // Generate a unique form ID to avoid conflicts when multiple forms exist
  const formId = personHistoryId ? `comment-form-${personHistoryId}` : `support-form-${personId}`;
  
  // ---- Visual tokens (kept simple & consistent) -----------------------------
  const sectionCard =
    'rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900';
  const labelClass =
    'block text-sm font-medium text-slate-800 dark:text-slate-200';
  const helpClass = 'mt-1 text-xs text-slate-500';
  const errorText = 'mt-1 text-sm text-red-600';
  // Single-source input style: ONLY the input gets focus styles
  const inputBase =
    'mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm ' +
    'placeholder:text-slate-400 ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:border-blue-600 ' +
    'dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500';
  const inputInvalid =
    'border-red-300 focus-visible:ring-red-600 focus-visible:border-red-600 dark:border-red-800';

  const checkboxBase =
    'h-4 w-4 rounded border-slate-300 text-blue-600 focus-visible:ring-blue-600 dark:border-slate-700 accent-blue-600';

  // ---- State (unchanged behavior) -------------------------------------------
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<FormData | null>(null);
  const [commentLength, setCommentLength] = useState(0);
  const [privateNoteLength, setPrivateNoteLength] = useState(0);
  const [displayNameOnly, setDisplayNameOnly] = useState(false);
  const [showCityState, setShowCityState] = useState(true);
  const [privacyRequired, setPrivacyRequired] = useState(false);
  const [recaptchaError, setRecaptchaError] = useState<string | null>(null);
  const [recaptchaSuccess, setRecaptchaSuccess] = useState<string | null>(null);
  const [isExecutingRecaptcha, setIsExecutingRecaptcha] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [savedFormData, setSavedFormData] = useState<Record<string, string>>(
    {}
  );
  const [showOccupation, setShowOccupation] = useState(true);
  const [showBirthdate, setShowBirthdate] = useState(true);
  const [showComment, setShowComment] = useState(true);
  const [wantsToHelpMore, setWantsToHelpMore] = useState(false);
  const [emailBlockWarning, setEmailBlockWarning] = useState<string | null>(
    null
  );
  const [fetchedMagicLinkData, setFetchedMagicLinkData] = useState<
    typeof magicLinkData | null
  >(null);
  const [isLoadingMagicLink, setIsLoadingMagicLink] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const { executeRecaptcha, isReady } = useSafeRecaptcha();

  const getFieldError = useCallback(
    (name: string) => state?.errors?.[name]?.[0],
    [state?.errors]
  );

  // ---- Magic link fetch (unchanged) -----------------------------------------
  useEffect(() => {
    if (magicToken) {
      setIsLoadingMagicLink(true);
      import('@/app/actions/magic-links')
        .then(({ verifyMagicLink }) =>
          verifyMagicLink(magicToken)
            .then(result => {
              if (result.success && result.data)
                setFetchedMagicLinkData(result.data);
              setIsLoadingMagicLink(false);
            })
            .catch(() => setIsLoadingMagicLink(false))
        )
        .catch(() => setIsLoadingMagicLink(false));
    }
  }, [magicToken]);

  const effectiveMagicLinkData = fetchedMagicLinkData || magicLinkData;

  // ---- Initialize from previous comment (unchanged) -------------------------
  useEffect(() => {
    if (effectiveMagicLinkData?.previousComment) {
      const pc = effectiveMagicLinkData.previousComment;
      setWantsToHelpMore(pc.wantsToHelpMore || false);
      setDisplayNameOnly(pc.displayNameOnly || false);
      setShowOccupation(pc.showOccupation ?? true);
      setShowBirthdate(pc.showBirthdate ?? true);
      setShowCityState(pc.showCityState ?? true);
      setShowComment(pc.showComment ?? true);
      setPrivacyRequired(pc.privacyRequiredDoNotShowPublicly || false);
    }
  }, [effectiveMagicLinkData]);

  // ---- Dirtiness tracking (unchanged) ---------------------------------------
  const handleFormChange = useCallback(() => {
    if (!formRef.current) return;
    const currentFormData = new FormData(formRef.current);
    const formValues: Record<string, string> = {};
    for (const [key, val] of currentFormData.entries()) {
      if (typeof val === 'string') formValues[key] = val;
    }
    const hasChanges = Object.keys(formValues).some(key => {
      if (key === 'personId' || key === 'recaptchaToken') return false;
      return formValues[key] !== (savedFormData[key] || '');
    });
    setIsDirty(hasChanges);
  }, [savedFormData]);

  const handleCancel = useCallback(() => {
    setCommentLength(0);
    setPrivateNoteLength(0);
    setDisplayNameOnly(false);
    setShowCityState(true);
    setPrivacyRequired(false);
    setShowOccupation(true);
    setShowBirthdate(true);
    setShowComment(true);
    setWantsToHelpMore(false);
    setIsDirty(false);
    setSavedFormData({});
    formRef.current?.reset();
    onCancel?.();
  }, [onCancel]);

  // ---- Error auto-scroll (unchanged) ----------------------------------------
  const scrollToError = useCallback(() => {
    if (!state?.errors) return;
    const errorFields = Object.keys(state.errors);
    if (errorFields.length > 0) {
      const first = document.getElementById(errorFields[0]);
      if (first) {
        first.scrollIntoView({ behavior: 'smooth', block: 'center' });
        (first as HTMLElement).focus?.();
      }
    }
  }, [state?.errors]);

  useEffect(() => {
    if (state?.errors) scrollToError();
  }, [state?.errors, scrollToError]);

  useEffect(() => {
    if (state?.success) setIsDirty(false);
  }, [state?.success]);

  // ---- Loading state (unchanged) --------------------------------------------
  if (isLoadingMagicLink) {
    return (
      <div className="mb-8 rounded-xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900/40">
        <div className="flex items-center justify-center py-6">
          <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-blue-600" />
          <span className="ml-3 text-slate-600 dark:text-slate-300">
            Loading your information…
          </span>
        </div>
      </div>
    );
  }

  // ---- Helpers --------------------------------------------------------------
  const cls = (name: string) =>
    `${inputBase} ${getFieldError(name) ? inputInvalid : ''}`;

  // ---- View -----------------------------------------------------------------
  return (
    <div className="mb-8 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          {title}
        </h3>
      </div>

      {/* Error summary */}
      {state?.errors && Object.keys(state.errors).length > 0 && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
          <p className="text-sm font-medium">Please fix the following:</p>
          <ul className="mt-1 list-inside list-disc text-sm">
            {Object.entries(state.errors)
              .slice(0, 4)
              .map(([field, messages]) => (
                <li key={field}>
                  <a
                    href={`#${field}`}
                    className="underline decoration-red-400 underline-offset-2"
                  >
                    {messages?.[0] ?? 'Invalid value'}
                  </a>
                </li>
              ))}
          </ul>
        </div>
      )}

      <form
        ref={formRef}
        id={formId}
        onChange={handleFormChange}
        onSubmit={async (e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          setRecaptchaError(null);
          setRecaptchaSuccess(null);
          if (!isReady) {
            setRecaptchaError(
              'reCAPTCHA not loaded. Please refresh the page and try again.'
            );
            return;
          }
          setIsExecutingRecaptcha(true);
          try {
            const token = await executeRecaptcha('submit_comment');
            if (token) {
              formData.append('recaptchaToken', token);
              if (DEBUG_RECAPTCHA) {
                setRecaptchaSuccess(
                  `reCAPTCHA success! Token: ${token.substring(0, 20)}...`
                );
              }
            } else {
              throw new Error('Failed to get reCAPTCHA token');
            }

            const emailValue = formData.get('email') as string;
            if (emailValue) {
              try {
                const response = await fetch(
                  '/api/profile/anonymous-comments?' +
                    new URLSearchParams({ email: emailValue })
                );
                if (response.ok) {
                  const data = await response.json();
                  if (!data.allowAnonymousComments) {
                    setEmailBlockWarning(
                      'This comment from this email will be hidden. The owner of this email address has disabled new comments associated with email. That owner must check their email for a link to manage their comments in order for this comment to be shown.'
                    );
                  } else {
                    setEmailBlockWarning(null);
                  }
                }
              } catch (error) {
                console.error('Failed to check email status:', error);
              }
            }

            // Check if map is expanded and contract it before showing modal
            if (isMapExpanded && onContractMap) {
              onContractMap();
              // Wait 2 seconds for the map animation to complete
              await new Promise(resolve => setTimeout(resolve, 2000));
            }

            setPendingFormData(formData);
            setShowConfirmModal(true);
          } catch (err) {
            const message =
              err instanceof Error
                ? err.message
                : 'reCAPTCHA verification failed. Please try again.';
            setRecaptchaError(message);
          } finally {
            setIsExecutingRecaptcha(false);
          }
        }}
        className="space-y-6"
      >
        <input type="hidden" name="personId" value={personId} />
        {personHistoryId && <input type="hidden" name="personHistoryId" value={personHistoryId} />}
        <input type="hidden" name="requiresFamilyApproval" value="true" />

        {/* Your Info */}
        <section className={sectionCard} aria-labelledby="your-info">
          <h4
            id="your-info"
            className="mb-4 text-sm font-semibold text-slate-900 dark:text-slate-100"
          >
            Your Information
          </h4>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="firstName" className={labelClass}>
                First Name <span className="text-red-600">*</span>
              </label>
              <input
                id="firstName"
                name="firstName"
                required
                autoComplete="given-name"
                defaultValue={
                  effectiveMagicLinkData?.previousComment?.firstName || ''
                }
                className={cls('firstName')}
                aria-invalid={Boolean(getFieldError('firstName'))}
                aria-describedby={
                  getFieldError('firstName') ? 'firstName-error' : undefined
                }
                type="text"
              />
              {getFieldError('firstName') && (
                <p id="firstName-error" className={errorText}>
                  {getFieldError('firstName')}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="lastName" className={labelClass}>
                Last Name <span className="text-red-600">*</span>
              </label>
              <input
                id="lastName"
                name="lastName"
                required
                autoComplete="family-name"
                defaultValue={
                  effectiveMagicLinkData?.previousComment?.lastName || ''
                }
                className={cls('lastName')}
                aria-invalid={Boolean(getFieldError('lastName'))}
                aria-describedby={
                  getFieldError('lastName') ? 'lastName-error' : undefined
                }
                type="text"
              />
              {getFieldError('lastName') && (
                <p id="lastName-error" className={errorText}>
                  {getFieldError('lastName')}
                </p>
              )}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="email" className={labelClass}>
                Email (Optional)
              </label>
              <input
                id="email"
                name="email"
                autoComplete="email"
                defaultValue={
                  effectiveMagicLinkData?.previousComment?.email ||
                  effectiveMagicLinkData?.user?.email ||
                  ''
                }
                className={cls('email')}
                placeholder="you@example.com"
                type="email"
              />
              {getFieldError('email') && (
                <p id="email-error" className={errorText}>
                  {getFieldError('email')}
                </p>
              )}
            </div>

            <div className="flex items-end">
              <label className="inline-flex items-center">
                <input
                  id="keepMeUpdated"
                  name="keepMeUpdated"
                  defaultChecked={true}
                  className={checkboxBase}
                  type="checkbox"
                />
                <span className="ml-2 text-sm text-slate-800 dark:text-slate-200">
                  Keep me updated
                </span>
              </label>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="phone" className={labelClass}>
                Phone (Optional)
              </label>
              <input
                id="phone"
                name="phone"
                autoComplete="tel"
                defaultValue={
                  effectiveMagicLinkData?.previousComment?.phone || ''
                }
                className={cls('phone')}
                placeholder="(555) 123-4567"
                type="tel"
              />
              {getFieldError('phone') && (
                <p id="phone-error" className={errorText}>
                  {getFieldError('phone')}
                </p>
              )}
            </div>
            <div aria-hidden />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="occupation" className={labelClass}>
                Occupation (Optional)
              </label>
              <input
                id="occupation"
                name="occupation"
                defaultValue={
                  effectiveMagicLinkData?.previousComment?.occupation || ''
                }
                className={cls('occupation')}
                placeholder="e.g., Teacher, Engineer, Retired"
                type="text"
              />
              {getFieldError('occupation') && (
                <p id="occupation-error" className={errorText}>
                  {getFieldError('occupation')}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="birthdate" className={labelClass}>
                Birth Date (Optional)
              </label>
              <input
                id="birthdate"
                name="birthdate"
                defaultValue={
                  effectiveMagicLinkData?.previousComment?.birthdate
                    ? new Date(effectiveMagicLinkData.previousComment.birthdate)
                        .toISOString()
                        .split('T')[0]
                    : ''
                }
                className={cls('birthdate')}
                type="date"
              />
              {getFieldError('birthdate') && (
                <p id="birthdate-error" className={errorText}>
                  {getFieldError('birthdate')}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Address */}
        <section className={sectionCard} aria-labelledby="address">
          <h4
            id="address"
            className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-100"
          >
            Your Address (Optional)
          </h4>
          <p className={helpClass}>
            <strong>Privacy Note:</strong> Your full address will never be shown
            publicly. Only city and state can be displayed if you choose.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="streetAddress" className={labelClass}>
                Street Address
              </label>
              <input
                id="streetAddress"
                name="streetAddress"
                autoComplete="street-address"
                className={inputBase}
                placeholder="123 Main Street"
                type="text"
              />
            </div>

            <div>
              <label htmlFor="city" className={labelClass}>
                City
              </label>
              <input
                id="city"
                name="city"
                autoComplete="address-level2"
                defaultValue={
                  effectiveMagicLinkData?.previousComment?.city || ''
                }
                className={inputBase}
                placeholder="San Diego"
                type="text"
              />
            </div>

            <div>
              <label htmlFor="state" className={labelClass}>
                State
              </label>
              <input
                id="state"
                name="state"
                maxLength={2}
                autoComplete="address-level1"
                defaultValue={
                  effectiveMagicLinkData?.previousComment?.state || ''
                }
                className={inputBase + ' uppercase'}
                placeholder="CA"
                type="text"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="zipCode" className={labelClass}>
                ZIP Code
              </label>
              <input
                id="zipCode"
                name="zipCode"
                maxLength={10}
                autoComplete="postal-code"
                className={inputBase}
                placeholder="92101"
                type="text"
              />
            </div>
          </div>
        </section>

        {/* Message */}
        <section className={sectionCard} aria-labelledby="message">
          <h4
            id="message"
            className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-100"
          >
            {personHistoryId ? 'Your Comment (Optional)' : 'Your Message of Support (Optional)'}
          </h4>
          <p className={helpClass}>
            This may be shown publicly on the site if you choose below.
          </p>

          <div className="mt-4">
            <label htmlFor="content" className={labelClass}>
              {personHistoryId ? 'Comment' : 'Message'}
            </label>
            <textarea
              id="content"
              name="content"
              rows={4}
              maxLength={500}
              onChange={e => setCommentLength(e.target.value.length)}
              className={inputBase + ' min-h-[120px]'}
              placeholder={personHistoryId 
                ? "Share your thoughts on this update..."
                : "Share why you support this person, your relationship to them, or any message of encouragement…"}
              aria-invalid={Boolean(getFieldError('content'))}
              aria-describedby={
                getFieldError('content') ? 'content-error' : undefined
              }
            />
            <div className="mt-1 flex items-center justify-between">
              <div>
                {getFieldError('content') && (
                  <p id="content-error" className={errorText}>
                    {getFieldError('content')}
                  </p>
                )}
              </div>
              <p
                className={`text-xs tabular-nums ${
                  commentLength >= 500 ? 'text-red-600' : 'text-slate-500'
                }`}
                aria-live="polite"
              >
                {commentLength}/500
              </p>
            </div>
          </div>

          <div className="mt-4">
            <label htmlFor="privateNoteToFamily" className={labelClass}>
              Private Note to Family (Optional)
            </label>
            <textarea
              id="privateNoteToFamily"
              name="privateNoteToFamily"
              rows={3}
              maxLength={1500}
              onChange={e => setPrivateNoteLength(e.target.value.length)}
              className={inputBase + ' min-h-[100px]'}
              placeholder="Share a private message with the family that will not be shown publicly…"
              aria-invalid={Boolean(getFieldError('privateNoteToFamily'))}
              aria-describedby={
                getFieldError('privateNoteToFamily')
                  ? 'privateNoteToFamily-error'
                  : undefined
              }
            />
            <div className="mt-1 flex items-center justify-between">
              <div>
                {getFieldError('privateNoteToFamily') && (
                  <p id="privateNoteToFamily-error" className={errorText}>
                    {getFieldError('privateNoteToFamily')}
                  </p>
                )}
                <p className={helpClass}>
                  This message will only be visible to the family members.
                </p>
              </div>
              <p
                className={`text-xs tabular-nums ${
                  privateNoteLength >= 1500 ? 'text-red-600' : 'text-slate-500'
                }`}
                aria-live="polite"
              >
                {privateNoteLength}/1500
              </p>
            </div>
          </div>
        </section>

        {/* Preferences */}
        <section className={sectionCard} aria-labelledby="preferences">
          <h4
            id="preferences"
            className="mb-4 text-sm font-semibold text-slate-900 dark:text-slate-100"
          >
            How would you like to show your support?
          </h4>

          <div className="space-y-3">
            <label className="flex items-start">
              <input
                name="wantsToHelpMore"
                value="true"
                checked={wantsToHelpMore}
                onChange={e => setWantsToHelpMore(e.target.checked)}
                className={checkboxBase + ' mt-1'}
                type="checkbox"
              />
              <span className="ml-2 text-sm text-slate-800 dark:text-slate-200">
                I want to help more. Please contact me and I will provide a
                letter of support along with my identification.
              </span>
            </label>

            <label className="flex items-start">
              <input
                name="displayNameOnly"
                value="true"
                checked={displayNameOnly}
                onChange={e => {
                  const isChecked = e.target.checked;
                  setDisplayNameOnly(isChecked);
                  if (isChecked) {
                    setShowOccupation(false);
                    setShowBirthdate(false);
                    setShowCityState(false);
                  }
                }}
                disabled={privacyRequired}
                className={checkboxBase + ' mt-1 disabled:opacity-50'}
                type="checkbox"
              />
              <span className="ml-2 text-sm text-slate-800 dark:text-slate-200">
                Display just my name as supporting (hide occupation, age, and
                location)
              </span>
            </label>

            <label className="flex items-start">
              <input
                name="showComment"
                value="true"
                checked={showComment}
                onChange={e => setShowComment(e.target.checked)}
                disabled={privacyRequired}
                className={checkboxBase + ' mt-1 disabled:opacity-50'}
                type="checkbox"
              />
              <span className="ml-2 text-sm text-slate-800 dark:text-slate-200">
                Display my comment text (requires family approval)
              </span>
            </label>

            <label className="flex items-start">
              <input
                name="privacyRequiredDoNotShowPublicly"
                value="true"
                checked={privacyRequired}
                onChange={e => {
                  const isChecked = e.target.checked;
                  setPrivacyRequired(isChecked);
                  if (isChecked) {
                    setDisplayNameOnly(false);
                    setShowOccupation(false);
                    setShowBirthdate(false);
                    setShowCityState(false);
                    setShowComment(false);
                  }
                }}
                className={checkboxBase + ' mt-1'}
                type="checkbox"
              />
              <span className="ml-2 text-sm text-slate-800 dark:text-slate-200">
                Please do not publicly show my name, just let the family know I
                support them
              </span>
            </label>
          </div>

          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
              Display preferences for optional information:
            </p>

            <label className="flex items-start">
              <input
                name="showOccupation"
                value="true"
                checked={showOccupation}
                onChange={e => setShowOccupation(e.target.checked)}
                disabled={displayNameOnly || privacyRequired}
                className={checkboxBase + ' mt-1 disabled:opacity-50'}
                type="checkbox"
              />
              <span className="ml-2 text-sm text-slate-800 dark:text-slate-200">
                Show my occupation publicly (if provided)
              </span>
            </label>

            <label className="flex items-start">
              <input
                name="showBirthdate"
                value="true"
                checked={showBirthdate}
                onChange={e => setShowBirthdate(e.target.checked)}
                disabled={displayNameOnly || privacyRequired}
                className={checkboxBase + ' mt-1 disabled:opacity-50'}
                type="checkbox"
              />
              <span className="ml-2 text-sm text-slate-800 dark:text-slate-200">
                Show my age publicly (if birthdate provided)
              </span>
            </label>

            <label className="flex items-start">
              <input
                name="showCityState"
                value="true"
                checked={showCityState}
                onChange={e => setShowCityState(e.target.checked)}
                disabled={displayNameOnly || privacyRequired}
                className={checkboxBase + ' mt-1 disabled:opacity-50'}
                type="checkbox"
              />
              <span className="ml-2 text-sm text-slate-800 dark:text-slate-200">
                Show my city and state publicly (if provided)
              </span>
            </label>
          </div>
        </section>

        {/* Privacy notice */}
        <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-yellow-900 dark:border-yellow-900/40 dark:bg-yellow-950/30 dark:text-yellow-100">
          <p className="text-sm">
            <strong>Privacy Notice:</strong> Your information will be kept
            confidential and only shared as you indicate above. Contact
            information will only be used if you volunteer to provide additional
            support.
          </p>
        </div>

        {/* State & reCAPTCHA errors */}
        {state?.error && (
          <div className="rounded-md bg-red-50 p-3 text-red-700 ring-1 ring-red-200 dark:bg-red-950/30 dark:text-red-200 dark:ring-red-900/40">
            <div className="text-sm">{state.error}</div>
          </div>
        )}
        {recaptchaError && (
          <div className="rounded-md bg-red-50 p-3 text-red-700 ring-1 ring-red-200 dark:bg-red-950/30 dark:text-red-200 dark:ring-red-900/40">
            <div className="text-sm">{recaptchaError}</div>
          </div>
        )}
        {DEBUG_RECAPTCHA && recaptchaSuccess && (
          <div className="rounded-md bg-green-50 p-3 text-green-700 ring-1 ring-green-200 dark:bg-green-950/30 dark:text-green-200 dark:ring-green-900/40">
            <div className="text-sm font-mono">{recaptchaSuccess}</div>
          </div>
        )}
        {DEBUG_RECAPTCHA && state?.recaptchaScore !== undefined && (
          <div className="rounded-md bg-blue-50 p-3 text-blue-700 ring-1 ring-blue-200 dark:bg-blue-950/30 dark:text-blue-200 dark:ring-blue-900/40">
            <div className="text-sm">
              <strong>reCAPTCHA Score:</strong> {state.recaptchaScore} (Spam likelihood: {state.recaptchaScore < 0.3 ? 'High' : state.recaptchaScore < 0.5 ? 'Medium' : 'Low'})
            </div>
            {state.recaptchaDetails && (
              <details className="mt-2">
                <summary className="cursor-pointer text-xs">Debug Details</summary>
                <pre className="mt-1 text-xs overflow-auto">{JSON.stringify(state.recaptchaDetails, null, 2)}</pre>
              </details>
            )}
          </div>
        )}

        {/* Footer actions */}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={handleCancel}
            className="rounded-md px-4 py-2 text-sm font-medium text-slate-700 ring-1 ring-inset ring-slate-300 transition hover:bg-slate-50 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-slate-800/60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!isDirty || isPending || isExecutingRecaptcha}
            className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isExecutingRecaptcha ? (
              <span className="inline-flex items-center gap-2">
                <svg
                  className="h-4 w-4 animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Verifying…</span>
              </span>
            ) : isPending ? (
              <span className="inline-flex items-center gap-2">
                <svg
                  className="h-4 w-4 animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Submitting…</span>
              </span>
            ) : (
              submitButtonText
            )}
          </button>
        </div>
      </form>

      {/* Confirmation Modal - different text based on comment type */}
      <CommentConfirmationModal
        isOpen={showConfirmModal}
        isSubmitting={isPending}
        title={personHistoryId ? 'Review Your Comment' : 'Review Your Support Message'}
        description={personHistoryId 
          ? 'Your comment on this update will be reviewed by the family before being displayed.'
          : 'Your message is being reviewed by the family to make sure it is OK with them.'}
        confirmButtonText={personHistoryId ? 'OK, Post My Comment' : 'OK, Post My Support'}
        warningMessage={emailBlockWarning}
        isHistoryComment={!!personHistoryId}
        onConfirm={() => {
          if (pendingFormData) {
            startTransition(() => {
              onSubmit(pendingFormData);
            });
            setShowConfirmModal(false);
            setPendingFormData(null);
            setEmailBlockWarning(null);
          }
        }}
        onCancel={() => {
          setShowConfirmModal(false);
          setPendingFormData(null);
          setEmailBlockWarning(null);
          formRef.current?.reset();
        }}
        commentData={{
          firstName: (pendingFormData?.get('firstName') as string) || '',
          lastName: (pendingFormData?.get('lastName') as string) || '',
          email: (pendingFormData?.get('email') as string) || undefined,
          phone: (pendingFormData?.get('phone') as string) || undefined,
          content: (pendingFormData?.get('content') as string) || undefined,
          occupation:
            (pendingFormData?.get('occupation') as string) || undefined,
          birthdate: (pendingFormData?.get('birthdate') as string) || undefined,
          streetAddress:
            (pendingFormData?.get('streetAddress') as string) || undefined,
          city: (pendingFormData?.get('city') as string) || undefined,
          state: (pendingFormData?.get('state') as string) || undefined,
          zipCode: (pendingFormData?.get('zipCode') as string) || undefined,
          wantsToHelpMore: pendingFormData?.get('wantsToHelpMore') === 'true',
          displayNameOnly: pendingFormData?.get('displayNameOnly') === 'true',
          requiresFamilyApproval: true,
          showOccupation: pendingFormData?.get('showOccupation') === 'true',
          showBirthdate: pendingFormData?.get('showBirthdate') === 'true',
          showCityState: pendingFormData?.get('showCityState') === 'true',
          showComment: pendingFormData?.get('showComment') === 'true',
          privateNoteToFamily:
            (pendingFormData?.get('privateNoteToFamily') as string) ||
            undefined,
        }}
      />
    </div>
  );
}
