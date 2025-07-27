import PersonPageWrapper from './PersonPageWrapper';

interface PersonPageProps {
  params: Promise<{ townSlug: string; personSlug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function PersonPage({ params, searchParams }: PersonPageProps) {
  const { townSlug, personSlug } = await params;
  const searchParamsData = await searchParams;
  
  return <PersonPageWrapper townSlug={townSlug} personSlug={personSlug} searchParams={searchParamsData} />;
}