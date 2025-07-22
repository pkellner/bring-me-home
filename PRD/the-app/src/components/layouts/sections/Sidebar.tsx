import Link from '@/components/OptimizedLink';
import Image from 'next/image';
import { formatDate } from '@/lib/utils';
import { SerializedPerson } from '../LayoutRenderer';
import { useImageUrl } from '@/hooks/useImageUrl';

// Helper function to get detention center image ID
function getDetentionCenterImageId(person: SerializedPerson): string | null | undefined {
  if (!person.detentionCenter) return null;
  return person.detentionCenter.detentionCenterImage?.imageId || person.detentionCenter.imageId;
}

interface SidebarProps {
  person: SerializedPerson;
  isAdmin: boolean;
}

export default function Sidebar({ person, isAdmin }: SidebarProps) {
  const { generateUrl } = useImageUrl();
  
  return (
    <div className="sidebar space-y-6">
      {/* Basic info */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-semibold mb-3">Information</h3>
        <dl className="space-y-2 text-sm">
          {person.detentionDate && (
            <div>
              <dt className="font-medium">Detention Date:</dt>
              <dd>{formatDate(person.detentionDate)}</dd>
            </div>
          )}
          {person.lastHeardFromDate && (
            <div>
              <dt className="font-medium">Last Contact:</dt>
              <dd>{formatDate(person.lastHeardFromDate)}</dd>
            </div>
          )}
          <div>
            <dt className="font-medium">Legal Representation:</dt>
            <dd>{person.representedByLawyer ? 'Yes' : 'No'}</dd>
          </div>
        </dl>
      </div>

      {/* Detention info if available */}
      {person.detentionCenter && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="font-semibold text-red-800 mb-2">Detention Center</h3>
          {(() => {
            const imageId = getDetentionCenterImageId(person);
            
            if (imageId) {
              return (
                <div className="mb-3 relative w-full aspect-[3/2]">
                  <Image
                    src={generateUrl(imageId, { width: 300, height: 200, quality: 90 })}
                    alt={person.detentionCenter.name}
                    fill
                    sizes="(max-width: 640px) 100vw, 260px"
                    className="rounded-lg object-cover shadow-sm"
                  />
                </div>
              );
            }
            return null;
          })()}
          <p className="text-sm text-red-700">{person.detentionCenter.name}</p>
          <p className="text-sm text-red-700">
            {person.detentionCenter.city}, {person.detentionCenter.state}
          </p>
        </div>
      )}

      {/* Admin link */}
      {isAdmin && (
        <Link
          href={`/admin/persons/${person.id}/edit`}
          className="block text-center bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
        >
          Edit Person
        </Link>
      )}
    </div>
  );
}