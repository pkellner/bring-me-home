import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import UserForm from '../UserForm';

export default async function NewUserPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/auth/signin');
  }

  if (!hasPermission(session, 'users', 'create')) {
    redirect('/admin/users');
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
        <h1 className="text-2xl font-bold text-gray-900">Create New User</h1>
        <p className="mt-1 text-sm text-gray-600">
          Create a new user account with appropriate roles and permissions.
        </p>
      </div>

      <UserForm
        mode="create"
        roles={roles}
        towns={towns}
        persons={serializedPersons}
        canManageTokens={false}
      />
    </div>
  );
}
