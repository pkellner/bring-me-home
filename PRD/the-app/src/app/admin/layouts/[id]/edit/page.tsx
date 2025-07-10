import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import LayoutForm from '../../LayoutForm';

export default async function EditLayoutPage({
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

  const layout = await prisma.layout.findUnique({
    where: { id },
  });

  if (!layout) {
    redirect('/admin/layouts');
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Layout</h1>
      <LayoutForm layout={layout} />
    </div>
  );
}
