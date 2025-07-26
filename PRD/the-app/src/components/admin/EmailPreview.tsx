'use client';

import { useState } from 'react';
import { replaceTemplateVariables } from '@/lib/email-template-variables';
import { 
  EnvelopeIcon, 
  UserIcon, 
  CalendarIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

interface EmailPreviewProps {
  subject: string;
  htmlContent: string;
  textContent?: string | null;
  isOpen: boolean;
  onClose: () => void;
  sampleData?: Record<string, unknown>;
  onRefresh?: () => void;
}

export default function EmailPreview({ 
  subject, 
  htmlContent, 
  textContent,
  isOpen,
  onClose,
  sampleData = getDefaultSampleData(),
  onRefresh,
}: EmailPreviewProps) {
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [showPlainText, setShowPlainText] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  
  // Process the template with sample data
  const processedSubject = replaceTemplateVariables(subject, sampleData);
  const processedHtml = replaceTemplateVariables(htmlContent, sampleData);
  const processedText = textContent ? replaceTemplateVariables(textContent, sampleData) : null;
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Email Client Header */}
        <div className="bg-gray-100 border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h3 className="text-lg font-semibold text-gray-900">Email Preview</h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setViewMode('desktop')}
                  className={`px-3 py-1 text-sm font-medium rounded ${
                    viewMode === 'desktop' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Desktop
                </button>
                <button
                  onClick={() => setViewMode('mobile')}
                  className={`px-3 py-1 text-sm font-medium rounded ${
                    viewMode === 'mobile' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Mobile
                </button>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {onRefresh && (
                <button
                  onClick={onRefresh}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded"
                  title="Refresh preview"
                >
                  <ArrowPathIcon className="h-5 w-5" />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Email Metadata */}
        <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
          <div className="space-y-3">
            {/* Subject */}
            <div>
              <h4 className="text-xl font-semibold text-gray-900">{processedSubject}</h4>
            </div>
            
            {/* From/To/Date */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6 text-sm">
                <div className="flex items-center space-x-2">
                  <UserIcon className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">From:</span>
                  <span className="font-medium">Bring Me Home &lt;noreply@bring-me-home.com&gt;</span>
                </div>
                <div className="flex items-center space-x-2">
                  <EnvelopeIcon className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">To:</span>
                  <span className="font-medium">{sampleData.recipientEmail as string}</span>
                </div>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <CalendarIcon className="h-4 w-4 text-gray-400" />
                <span>{new Date().toLocaleString()}</span>
              </div>
            </div>
            
            {/* Toggle Details */}
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-800"
            >
              {showDetails ? (
                <ChevronUpIcon className="h-4 w-4" />
              ) : (
                <ChevronDownIcon className="h-4 w-4" />
              )}
              <span>{showDetails ? 'Hide' : 'Show'} details</span>
            </button>
            
            {/* Additional Details */}
            {showDetails && (
              <div className="bg-white rounded border border-gray-200 p-3 text-sm space-y-1">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-gray-600">Reply-To:</span>
                    <span className="ml-2 font-medium">support@bring-me-home.com</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Template Variables:</span>
                    <span className="ml-2 font-medium">{Object.keys(sampleData).length} active</span>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* View Toggle */}
          <div className="mt-4 flex items-center space-x-4">
            <button
              onClick={() => setShowPlainText(false)}
              className={`text-sm font-medium ${
                !showPlainText 
                  ? 'text-blue-600 border-b-2 border-blue-600 pb-1' 
                  : 'text-gray-600 hover:text-gray-900 pb-1'
              }`}
            >
              HTML Version
            </button>
            {processedText && (
              <button
                onClick={() => setShowPlainText(true)}
                className={`text-sm font-medium ${
                  showPlainText 
                    ? 'text-blue-600 border-b-2 border-blue-600 pb-1' 
                    : 'text-gray-600 hover:text-gray-900 pb-1'
                }`}
              >
                Plain Text Version
              </button>
            )}
          </div>
        </div>

        {/* Email Content */}
        <div className="flex-1 overflow-hidden bg-gray-100 p-6">
          <div className={`mx-auto h-full ${viewMode === 'mobile' ? 'max-w-sm' : 'max-w-3xl'}`}>
            <div className="bg-white rounded-lg shadow-lg h-full overflow-hidden">
              {showPlainText && processedText ? (
                <div className="p-6 overflow-y-auto h-full">
                  <pre className="whitespace-pre-wrap font-sans text-sm text-gray-800">
                    {processedText}
                  </pre>
                </div>
              ) : (
                <div className="overflow-y-auto h-full">
                  {/* Email iframe for better isolation */}
                  <iframe
                    srcDoc={wrapEmailContent(processedHtml, viewMode)}
                    className="w-full h-full border-0"
                    sandbox="allow-same-origin"
                    title="Email Preview"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer with Mock Actions */}
        <div className="bg-gray-50 border-t border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              <span className="font-medium">Preview Only</span> - Links and buttons are disabled
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Close Preview
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Wrap email content with styles to prevent interaction
function wrapEmailContent(html: string, viewMode: 'desktop' | 'mobile' = 'desktop') {
  const maxWidth = viewMode === 'mobile' ? '375px' : '600px';
  const fontSize = viewMode === 'mobile' ? '14px' : '16px';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        /* Disable all interactions */
        body {
          margin: 0;
          padding: 0;
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
          pointer-events: none;
          font-size: ${fontSize};
        }
        
        /* Apply max-width to email container */
        body > * {
          max-width: ${maxWidth} !important;
          margin: 0 auto !important;
        }
        
        /* Adjust table and image widths for mobile */
        ${viewMode === 'mobile' ? `
          table {
            width: 100% !important;
          }
          img {
            max-width: 100% !important;
            height: auto !important;
          }
          .button, a.button {
            display: block !important;
            width: 100% !important;
            text-align: center !important;
          }
        ` : ''}
        
        /* Show visual feedback for links */
        a {
          cursor: not-allowed !important;
          position: relative;
        }
        
        a::after {
          content: '';
          position: absolute;
          inset: 0;
          background: transparent;
          pointer-events: none;
        }
        
        /* Highlight interactive elements */
        a:hover,
        button:hover {
          opacity: 0.8;
        }
        
        /* Ensure buttons look clickable but aren't */
        button, 
        input[type="button"], 
        input[type="submit"],
        .button {
          cursor: not-allowed !important;
        }
      </style>
    </head>
    <body>
      ${html}
    </body>
    </html>
  `;
}

function getDefaultSampleData(): Record<string, unknown> {
  return {
    recipientName: 'John Doe',
    recipientEmail: 'john.doe@example.com',
    personName: 'Maria Rodriguez',
    personFirstName: 'Maria',
    personLastName: 'Rodriguez',
    townName: 'El Paso',
    updateDescription: 'Maria has been successfully reunited with her family after 3 months. The family is deeply grateful for all the support and prayers during this difficult time.',
    updateDate: new Date().toLocaleDateString(),
    commentContent: 'Sending prayers and support to Maria and her family. Stay strong!',
    commentDate: new Date().toLocaleDateString(),
    profileUrl: 'https://bring-me-home.com/el-paso/maria-rodriguez',
    verificationUrl: 'https://bring-me-home.com/verify/comments?token=abc123',
    hideUrl: 'https://bring-me-home.com/verify/comments?token=abc123&action=hide',
    manageUrl: 'https://bring-me-home.com/profile',
    personOptOutUrl: 'https://bring-me-home.com/unsubscribe?person=maria-rodriguez',
    allOptOutUrl: 'https://bring-me-home.com/unsubscribe?all=true',
    currentDate: new Date().toLocaleDateString(),
    siteUrl: 'https://bring-me-home.com',
  };
}