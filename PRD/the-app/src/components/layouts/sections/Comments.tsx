import Link from '@/components/OptimizedLink';
import CommentSection from '@/components/person/CommentSection';
import { SerializedPerson } from '../LayoutRenderer';

interface CommentsProps {
  person: SerializedPerson;
  isAdmin: boolean;
  isSiteAdmin?: boolean;
  supportMapMetadata?: {
    hasIpAddresses: boolean;
    messageLocationCount: number;
    supportLocationCount: number;
  };
  searchParams?: { [key: string]: string | string[] | undefined };
}

export default function Comments({ person, isAdmin, isSiteAdmin = false, supportMapMetadata, searchParams }: CommentsProps) {
  return (
    <div className="comments-section">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Community Support</h2>
        {isAdmin && (
          <Link
            href={`/admin/comments/${person.town.slug}/${person.slug}`}
            className="text-sm text-indigo-600 hover:text-indigo-500"
          >
            [Manage Comments]
          </Link>
        )}
      </div>
      <CommentSection personId={person.id} comments={person.comments} isAdmin={isAdmin} isSiteAdmin={isSiteAdmin} supportMapMetadata={supportMapMetadata} searchParams={searchParams} />
    </div>
  );
}