/**
 * Google Analytics helper functions
 */

export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

// Check if we're in production and have a measurement ID
export const isGAEnabled = Boolean(
  GA_MEASUREMENT_ID && process.env.NODE_ENV === 'production'
);

// Log the page view
export const pageview = (url: string) => {
  if (!isGAEnabled || typeof window === 'undefined') return;
  
  window.gtag('config', GA_MEASUREMENT_ID!, {
    page_path: url,
  });
};

// Log specific events
export const event = ({
  action,
  category,
  label,
  value,
}: {
  action: string;
  category: string;
  label?: string;
  value?: number;
}) => {
  if (!isGAEnabled || typeof window === 'undefined') return;
  
  window.gtag('event', action, {
    event_category: category,
    event_label: label,
    value: value,
  });
};

// Common events
export const trackButtonClick = (buttonName: string, location?: string) => {
  event({
    action: 'click',
    category: 'Button',
    label: buttonName,
    value: location ? 1 : undefined,
  });
};

export const trackFormSubmission = (formName: string) => {
  event({
    action: 'submit',
    category: 'Form',
    label: formName,
  });
};

export const trackSearch = (searchTerm: string) => {
  event({
    action: 'search',
    category: 'Search',
    label: searchTerm,
  });
};

export const trackSupportAction = (
  actionType: 'message' | 'anonymous_support',
  personId: string
) => {
  event({
    action: actionType,
    category: 'Support',
    label: personId,
  });
};

// TypeScript declaration for gtag
declare global {
  interface Window {
    gtag: (
      command: 'config' | 'event' | 'js' | 'set',
      targetId: string,
      config?: any
    ) => void;
  }
}