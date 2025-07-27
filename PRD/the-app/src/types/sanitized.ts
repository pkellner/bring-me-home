/**
 * ⚠️ CRITICAL: Sanitized types to prevent circular references
 * 
 * These types are used when passing data from server to client components.
 * Prisma models often contain circular references through their relations:
 * - Person → Town → Persons[]
 * - Person → DetentionCenter → Detainees[]
 * - Person → Stories → Person
 * 
 * Using the full Prisma types in client components causes "Maximum call stack size exceeded"
 * errors during Next.js serialization. These sanitized types exclude all relation fields
 * that could create circular references.
 * 
 * ALWAYS use these types instead of Prisma types when:
 * 1. Passing data to client components
 * 2. Storing Prisma data in React state
 * 3. Serializing data for API responses
 * 
 * 🔧 MAINTENANCE REQUIREMENT 🔧
 * When you modify the Prisma schema, you MUST update these types to match!
 * 1. Add/remove fields in the sanitized types below
 * 2. Update ALL serialization logic that uses these types:
 *    - /src/app/admin/persons/[id]/edit/page.tsx (lines 49-66, 74-121)
 *    - Any other files that serialize Prisma data for client components
 * 3. Test the person edit page after changes: /admin/persons/[id]/edit
 * 
 * Failing to update these types after schema changes will cause TypeScript errors
 * or missing data in the UI.
 */

export type SanitizedTown = {
  id: string;
  name: string;
  slug: string;
  state: string;
  county: string | null;
  zipCode: string | null;
  fullAddress: string;
  description: string | null;
  isActive: boolean;
  latitude: number | null;
  longitude: number | null;
  defaultThemeId: string | null;
  createdAt: Date;
  updatedAt: Date;
  // Excluded: persons, townAccess, theme relations
};

export type SanitizedDetentionCenter = {
  id: string;
  name: string;
  facilityType: string;
  operatedBy: string | null;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phoneNumber: string | null;
  faxNumber: string | null;
  emailAddress: string | null;
  website: string | null;
  capacity: number | null;
  currentPopulation: number | null;
  latitude: number | null;
  longitude: number | null;
  isActive: boolean;
  isICEFacility: boolean;
  notes: string | null;
  transportInfo: string | null;
  visitingHours: string | null;
  createdAt: Date;
  updatedAt: Date;
  imageId: string | null;
  // Excluded: detainees, detentionCenterImage relations
};

export type SanitizedStory = {
  id: string;
  personId: string;
  language: string;
  storyType: string;
  content: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  // Excluded: person relation
};

export type ImageData = {
  id: string;
  imageType: string;
  sequenceNumber: number;
  caption?: string | null;
  mimeType: string;
  size: number;
  width?: number | null;
  height?: number | null;
  createdAt: Date;
  updatedAt: Date;
};

// Type for simplified story used in forms
export type SimplifiedStory = {
  language: string;
  storyType: string;
  content: string;
};

// Type for serialized person with sanitized relations
// ⚠️ IMPORTANT: Do NOT use Prisma's Person type as base to avoid circular references
export type SerializedPerson = {
  id: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  alienIdNumber: string | null;
  ssn: string | null;
  dateOfBirth: Date | null;
  placeOfBirth: string | null;
  height: string | null;
  weight: string | null;
  eyeColor: string | null;
  hairColor: string | null;
  lastKnownAddress: string;
  currentAddress: string | null;
  phoneNumber: string | null;
  emailAddress: string | null;
  story: string | null;
  lastSeenDate: Date | null;
  lastSeenLocation: string | null;
  isActive: boolean;
  isFound: boolean;
  status: string;
  themeId: string | null;
  townId: string;
  createdAt: Date;
  updatedAt: Date;
  bondAmount: string | null;
  bondStatus: string | null;
  caseNumber: string | null;
  countryOfOrigin: string | null;
  courtLocation: string | null;
  detentionCenterId: string | null;
  detentionDate: Date | null;
  detentionStatus: string | null;
  internationalAddress: string | null;
  legalRepEmail: string | null;
  legalRepFirm: string | null;
  legalRepName: string | null;
  legalRepPhone: string | null;
  nextCourtDate: Date | null;
  releaseDate: Date | null;
  detentionStory: string | null;
  familyMessage: string | null;
  lastHeardFromDate: Date | null;
  notesFromLastContact: string | null;
  representedByLawyer: boolean;
  representedByNotes: string | null;
  slug: string;
  showDetentionInfo: boolean;
  showLastHeardFrom: boolean;
  showDetentionDate: boolean;
  showCommunitySupport: boolean;
  // Relations (sanitized)
  town: SanitizedTown;
  detentionCenter?: SanitizedDetentionCenter | null;
  stories?: SanitizedStory[];
  images?: ImageData[];
};


export type SanitizedTheme = {
  id: string;
  name: string;
  description: string | null;
  colors: string;
  cssVars: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  // Excluded: persons, towns relations
};

export type SanitizedComment = {
  id: string;
  content: string;
  isActive: boolean;
  isApproved: boolean;
  moderatorNotes: string | null;
  personId: string;
  createdAt: Date;
  updatedAt: Date;
  familyVisibilityOverride: string | null;
  type: string;
  visibility: string;
  approvedAt: Date | null;
  approvedBy: string | null;
  birthdate: Date | null;
  displayNameOnly: boolean;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  occupation: string | null;
  phone: string | null;
  privacyRequiredDoNotShowPublicly: boolean;
  requiresFamilyApproval: boolean;
  showBirthdate: boolean;
  showOccupation: boolean;
  wantsToHelpMore: boolean;
  city: string | null;
  showCityState: boolean;
  state: string | null;
  streetAddress: string | null;
  zipCode: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  geoCity: string | null;
  geoState: string | null;
  geoCountry: string | null;
  geoLatitude: number | null;
  geoLongitude: number | null;
  privateNoteToFamily: string | null;
  showComment: boolean;
  // Excluded: person, approver relations
};

export type SanitizedImageStorage = {
  id: string;
  data: Uint8Array | null;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  caption: string | null;
  uploadedById: string | null;
  storageType: string;
  s3Key: string | null;
  createdAt: Date;
  updatedAt: Date;
  // Excluded: detentionCenterImages, uploadedBy, personImages relations
};

export type SanitizedPersonImage = {
  id: string;
  personId: string;
  imageId: string;
  imageType: string;
  sequenceNumber: number;
  createdAt: Date;
  updatedAt: Date;
  // Can include the image data when needed
  image?: SanitizedImageStorage;
  // Excluded: person relation
};

export type SanitizedPersonHistory = {
  id: string;
  description: string;
  date: string; // ISO string for SSR
  visible: boolean;
  sendNotifications: boolean;
  createdByUsername: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  // Excluded: person, createdBy relations
};