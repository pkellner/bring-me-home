import PersonPageWrapper from './PersonPageWrapper';

interface PersonPageProps {
  params: Promise<{ townSlug: string; personSlug: string }>;
}

export default async function PersonPage({ params }: PersonPageProps) {
  const { townSlug, personSlug } = await params;
  
  return <PersonPageWrapper townSlug={townSlug} personSlug={personSlug} />;
}