// Detention Status Types and Configurations

export const DETENTION_STATUSES = {
  // Initial status
  CURRENTLY_DETAINED: 'currently_detained',

  // Intermediate statuses
  BAIL_POSTED: 'bail_posted',
  AWAITING_HEARING: 'awaiting_hearing',
  IN_PROCEEDINGS: 'in_proceedings',
  RELEASED_MONITORING: 'released_monitoring', // Released but under monitoring (ankle bracelet, check-ins, etc.)

  // Final outcomes - positive
  ASYLUM_GRANTED: 'asylum_granted',
  VISA_GRANTED: 'visa_granted',
  STATUS_ADJUSTED: 'status_adjusted', // Legal status adjusted
  CASE_DISMISSED: 'case_dismissed',
  VOLUNTARY_DEPARTURE: 'voluntary_departure',

  // Final outcomes - negative
  DEPORTED: 'deported',
  REMOVAL_ORDER: 'removal_order', // Ordered to be removed but not yet deported

  // Other statuses
  TRANSFERRED: 'transferred', // Transferred to another facility
  ABSCONDED: 'absconded', // Failed to appear, whereabouts unknown
  DECEASED: 'deceased',
  UNKNOWN: 'unknown',
} as const;

export type DetentionStatus = typeof DETENTION_STATUSES[keyof typeof DETENTION_STATUSES];

// Status metadata for display
export const STATUS_DISPLAY_INFO: Record<DetentionStatus, {
  label: string;
  color: string; // Tailwind color class prefix
  bgColor: string; // Background color class
  borderColor: string; // Border color class
  icon?: string; // Optional emoji/icon
  description: string;
  isFinal: boolean; // Whether this is a final status
}> = {
  [DETENTION_STATUSES.CURRENTLY_DETAINED]: {
    label: 'Currently Detained',
    color: 'red',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    icon: '🔒',
    description: 'Person is currently in detention',
    isFinal: false,
  },
  [DETENTION_STATUSES.BAIL_POSTED]: {
    label: 'Released on Bail',
    color: 'yellow',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    icon: '💰',
    description: 'Bail has been posted and person has been released pending hearing',
    isFinal: false,
  },
  [DETENTION_STATUSES.AWAITING_HEARING]: {
    label: 'Awaiting Hearing',
    color: 'amber',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    icon: '⏳',
    description: 'Waiting for court hearing date',
    isFinal: false,
  },
  [DETENTION_STATUSES.IN_PROCEEDINGS]: {
    label: 'In Legal Proceedings',
    color: 'blue',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    icon: '⚖️',
    description: 'Currently in immigration court proceedings',
    isFinal: false,
  },
  [DETENTION_STATUSES.RELEASED_MONITORING]: {
    label: 'Released with Monitoring',
    color: 'indigo',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    icon: '📍',
    description: 'Released but under monitoring requirements',
    isFinal: false,
  },
  [DETENTION_STATUSES.ASYLUM_GRANTED]: {
    label: 'Asylum Granted',
    color: 'green',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    icon: '✅',
    description: 'Asylum application has been approved',
    isFinal: true,
  },
  [DETENTION_STATUSES.VISA_GRANTED]: {
    label: 'Visa Granted',
    color: 'green',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    icon: '📄',
    description: 'Visa has been granted',
    isFinal: true,
  },
  [DETENTION_STATUSES.STATUS_ADJUSTED]: {
    label: 'Status Adjusted',
    color: 'green',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    icon: '✔️',
    description: 'Legal status has been adjusted',
    isFinal: true,
  },
  [DETENTION_STATUSES.CASE_DISMISSED]: {
    label: 'Case Dismissed',
    color: 'teal',
    bgColor: 'bg-teal-50',
    borderColor: 'border-teal-200',
    icon: '📋',
    description: 'Immigration case has been dismissed',
    isFinal: true,
  },
  [DETENTION_STATUSES.VOLUNTARY_DEPARTURE]: {
    label: 'Voluntary Departure',
    color: 'gray',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    icon: '🚶',
    description: 'Person has agreed to voluntary departure',
    isFinal: true,
  },
  [DETENTION_STATUSES.DEPORTED]: {
    label: 'Deported',
    color: 'red',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    icon: '✈️',
    description: 'Person has been deported',
    isFinal: true,
  },
  [DETENTION_STATUSES.REMOVAL_ORDER]: {
    label: 'Removal Order Issued',
    color: 'orange',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    icon: '📝',
    description: 'Order for removal has been issued',
    isFinal: false,
  },
  [DETENTION_STATUSES.TRANSFERRED]: {
    label: 'Transferred',
    color: 'purple',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    icon: '🚐',
    description: 'Transferred to another facility',
    isFinal: false,
  },
  [DETENTION_STATUSES.ABSCONDED]: {
    label: 'Whereabouts Unknown',
    color: 'gray',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    icon: '❓',
    description: 'Failed to appear, current location unknown',
    isFinal: false,
  },
  [DETENTION_STATUSES.DECEASED]: {
    label: 'Deceased',
    color: 'gray',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-300',
    icon: '🕊️',
    description: 'Person has passed away',
    isFinal: true,
  },
  [DETENTION_STATUSES.UNKNOWN]: {
    label: 'Status Unknown',
    color: 'gray',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    icon: '❔',
    description: 'Current status is unknown',
    isFinal: false,
  },
};

// Helper function to get display info for a status
export function getStatusDisplayInfo(status: string | null | undefined): typeof STATUS_DISPLAY_INFO[DetentionStatus] {
  if (!status || !(status in STATUS_DISPLAY_INFO)) {
    return STATUS_DISPLAY_INFO[DETENTION_STATUSES.UNKNOWN];
  }
  return STATUS_DISPLAY_INFO[status as DetentionStatus];
}

// Helper to determine if we should show detention center info
export function shouldShowDetentionCenter(status: string | null | undefined): boolean {
  if (!status) return true; // Show by default if no status

  const nonDetentionStatuses = [
    DETENTION_STATUSES.BAIL_POSTED,
    DETENTION_STATUSES.RELEASED_MONITORING,
    DETENTION_STATUSES.ASYLUM_GRANTED,
    DETENTION_STATUSES.VISA_GRANTED,
    DETENTION_STATUSES.STATUS_ADJUSTED,
    DETENTION_STATUSES.CASE_DISMISSED,
    DETENTION_STATUSES.VOLUNTARY_DEPARTURE,
    DETENTION_STATUSES.DEPORTED,
    DETENTION_STATUSES.ABSCONDED,
    DETENTION_STATUSES.DECEASED,
  ];

  return !(nonDetentionStatuses as readonly string[]).includes(status);
}

// Type for status details JSON field
export interface StatusDetailsJson {
  previousStatus?: string;
  statusChangedBy?: string;
  statusChangedAt?: string;
  notes?: string;
  [key: string]: unknown; // Allow for future expansion
}