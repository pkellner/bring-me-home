import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import UserForm from '../../UserForm';

interface EditUserPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditUserPage({ params }: EditUserPageProps) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/auth/signin');
  }

  if (!hasPermission(session, 'users', 'update')) {
    redirect('/admin/users');
  }

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      userRoles: {
        include: {
          role: true,
        },
      },
      townAccess: {
        include: {
          town: true,
        },
      },
      personAccess: {
        include: {
          person: true,
        },
      },
    },
  });

  if (!user) {
    notFound();
  }

  // Get available roles for the form
  const roles = await prisma.role.findMany({
    orderBy: { name: 'asc' },
  });

  // Get available towns for the form
  const towns = await prisma.town.findMany({
    orderBy: { name: 'asc' },
  });

  // Get available persons for the form
  const persons = await prisma.person.findMany({
    include: {
      town: true,
    },
    orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
  });

  // Convert Decimal bondAmount to string for client components
  const serializedPersons = persons.map(person => ({
    ...person,
    bondAmount: person.bondAmount ? person.bondAmount.toString() : null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Edit User</h1>
        <p className="mt-1 text-sm text-gray-600">
          Edit user account information, roles, and permissions.
        </p>
      </div>

      <UserForm
        mode="edit"
        user={user}
        roles={roles}
        towns={towns}
        persons={serializedPersons}
      />
    </div>
  );
}
