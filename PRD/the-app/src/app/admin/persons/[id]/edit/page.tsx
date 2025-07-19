import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { hasPermission } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { PersonEditClient } from './PersonEditClient';
import { PersonViewLinks } from './PersonViewLinks';
import type { SerializedPerson } from '@/types/sanitized';

export default async function EditPersonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session || !hasPermission(session, 'persons', 'update')) {
    redirect('/admin');
  }

  const person = await prisma.person.findUnique({
    where: { id },
    include: {
      town: true,
      detentionCenter: true,
      stories: {
        where: { isActive: true },
        orderBy: [{ language: 'asc' }, { storyType: 'asc' }],
      },
      personImages: {
        include: {
          image: true,
        },
        orderBy: [{ imageType: 'asc' }, { sequenceNumber: 'asc' }],
      },
    },
  });

  if (!person) {
    redirect('/admin/persons');
  }

  const townsFromDb = await prisma.town.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });

  // Sanitize towns to remove potential circular references
  const towns = townsFromDb.map(town => ({
    id: town.id,
    name: town.name,
    slug: town.slug,
    state: town.state,
    county: town.county,
    zipCode: town.zipCode,
    fullAddress: town.fullAddress,
    description: town.description,
    isActive: town.isActive,
    latitude: town.latitude,
    longitude: town.longitude,
    defaultLayoutId: town.defaultLayoutId,
    defaultThemeId: town.defaultThemeId,
    createdAt: town.createdAt,
    updatedAt: town.updatedAt,
    // Excluded: persons, townAccess, layout, theme relations
  }));

  // Get slugs for navigation
  const townSlug = person.town.slug;
  const personSlug = person.slug;

  // Transform personImages to the expected format
  const images = person.personImages?.map(pi => ({
    id: pi.image.id,
    imageType: pi.imageType,
    sequenceNumber: pi.sequenceNumber,
    caption: pi.image.caption,
    mimeType: pi.image.mimeType,
    size: pi.image.size,
    width: pi.image.width,
    height: pi.image.height,
    createdAt: pi.image.createdAt,
    updatedAt: pi.image.updatedAt,
  })) || [];

  // ⚠️ CRITICAL: Sanitize the person object to prevent circular references
  // The town object may contain a persons[] array that references back to this person
  // The detentionCenter may also have detainees[] that creates circular references
  // We must extract only the fields we need without the circular relations
  const serializedPerson: SerializedPerson = {
    // Copy all scalar fields from person
    id: person.id,
    firstName: person.firstName,
    middleName: person.middleName,
    lastName: person.lastName,
    alienIdNumber: person.alienIdNumber,
    ssn: person.ssn,
    dateOfBirth: person.dateOfBirth,
    placeOfBirth: person.placeOfBirth,
    height: person.height,
    weight: person.weight,
    eyeColor: person.eyeColor,
    hairColor: person.hairColor,
    lastKnownAddress: person.lastKnownAddress,
    currentAddress: person.currentAddress,
    phoneNumber: person.phoneNumber,
    emailAddress: person.emailAddress,
    story: person.story,
    lastSeenDate: person.lastSeenDate,
    lastSeenLocation: person.lastSeenLocation,
    isActive: person.isActive,
    isFound: person.isFound,
    status: person.status,
    layoutId: person.layoutId,
    themeId: person.themeId,
    townId: person.townId,
    createdAt: person.createdAt,
    updatedAt: person.updatedAt,
    bondAmount: person.bondAmount ? person.bondAmount.toString() : null,
    bondStatus: person.bondStatus,
    caseNumber: person.caseNumber,
    countryOfOrigin: person.countryOfOrigin,
    courtLocation: person.courtLocation,
    detentionCenterId: person.detentionCenterId,
    detentionDate: person.detentionDate,
    detentionStatus: person.detentionStatus,
    internationalAddress: person.internationalAddress,
    legalRepEmail: person.legalRepEmail,
    legalRepFirm: person.legalRepFirm,
    legalRepName: person.legalRepName,
    legalRepPhone: person.legalRepPhone,
    nextCourtDate: person.nextCourtDate,
    releaseDate: person.releaseDate,
    detentionStory: person.detentionStory,
    familyMessage: person.familyMessage,
    lastHeardFromDate: person.lastHeardFromDate,
    notesFromLastContact: person.notesFromLastContact,
    representedByLawyer: person.representedByLawyer,
    representedByNotes: person.representedByNotes,
    slug: person.slug,
    showDetentionInfo: person.showDetentionInfo,
    showLastHeardFrom: person.showLastHeardFrom,
    showDetentionDate: person.showDetentionDate,
    showCommunitySupport: person.showCommunitySupport,
    // Relations
    images,
    // Sanitize stories to remove circular reference (story.person → Person)
    stories: person.stories?.map(story => ({
      id: story.id,
      personId: story.personId,
      language: story.language,
      storyType: story.storyType,
      content: story.content,
      isActive: story.isActive,
      createdAt: story.createdAt,
      updatedAt: story.updatedAt,
      // Explicitly exclude: person relation
    })) || [],
    // Sanitize town to remove potential circular reference
    town: {
      id: person.town.id,
      name: person.town.name,
      slug: person.town.slug,
      state: person.town.state,
      county: person.town.county,
      zipCode: person.town.zipCode,
      fullAddress: person.town.fullAddress,
      description: person.town.description,
      isActive: person.town.isActive,
      latitude: person.town.latitude,
      longitude: person.town.longitude,
      defaultLayoutId: person.town.defaultLayoutId,
      defaultThemeId: person.town.defaultThemeId,
      createdAt: person.town.createdAt,
      updatedAt: person.town.updatedAt,
      // Explicitly exclude: persons, townAccess, layout, theme relations
    },
    // Sanitize detentionCenter to remove potential circular reference
    detentionCenter: person.detentionCenter ? {
      id: person.detentionCenter.id,
      name: person.detentionCenter.name,
      facilityType: person.detentionCenter.facilityType,
      operatedBy: person.detentionCenter.operatedBy,
      address: person.detentionCenter.address,
      city: person.detentionCenter.city,
      state: person.detentionCenter.state,
      zipCode: person.detentionCenter.zipCode,
      country: person.detentionCenter.country,
      phoneNumber: person.detentionCenter.phoneNumber,
      faxNumber: person.detentionCenter.faxNumber,
      emailAddress: person.detentionCenter.emailAddress,
      website: person.detentionCenter.website,
      capacity: person.detentionCenter.capacity,
      currentPopulation: person.detentionCenter.currentPopulation,
      latitude: person.detentionCenter.latitude,
      longitude: person.detentionCenter.longitude,
      isActive: person.detentionCenter.isActive,
      isICEFacility: person.detentionCenter.isICEFacility,
      notes: person.detentionCenter.notes,
      transportInfo: person.detentionCenter.transportInfo,
      visitingHours: person.detentionCenter.visitingHours,
      createdAt: person.detentionCenter.createdAt,
      updatedAt: person.detentionCenter.updatedAt,
      imageId: person.detentionCenter.imageId,
      // Explicitly exclude: detainees, detentionCenterImage relations
    } : null,
  };

  return (
    <>
      <PersonViewLinks townSlug={townSlug} personSlug={personSlug} />

      <PersonEditClient
        person={serializedPerson}
        towns={towns}
        session={session}
      />
    </>
  );
}
