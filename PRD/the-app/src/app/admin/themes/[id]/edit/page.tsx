import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import ThemeForm from '../../ThemeForm';

export default async function EditThemePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/auth/signin');
  }

  if (!hasPermission(session, 'system', 'config')) {
    redirect('/admin');
  }

  const theme = await prisma.theme.findUnique({
    where: { id },
  });

  if (!theme) {
    redirect('/admin/themes');
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Theme</h1>
      <ThemeForm theme={theme} />
    </div>
  );
}