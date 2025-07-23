import TownPageWrapper from './TownPageWrapper';

interface TownPageProps {
  params: Promise<{ townSlug: string }>;
}

export default async function TownPage({ params }: TownPageProps) {
  const { townSlug } = await params;
  
  return <TownPageWrapper townSlug={townSlug} />;
}