import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission, isSiteAdmin, isTownAdmin } from '@/lib/permissions';
import { notFound, redirect } from 'next/navigation';
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
  
  // Check if current user is system or town admin
  const canManageTokens = isSiteAdmin(session) || isTownAdmin(session);

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
  
  // Get comment verification tokens if user has email and current user can manage tokens
  let hasCommentToken = false;
  if (user.email && canManageTokens) {
    const tokens = await prisma.commentVerificationToken.findMany({
      where: { 
        email: user.email,
        isActive: true,
      },
      take: 1,
    });
    hasCommentToken = tokens.length > 0;
  }

  // Also serialize bondAmount in user's personAccess and dates
  const serializedUser = {
    ...user,
    optOutDate: user.optOutDate?.toISOString() || null,
    personAccess: user.personAccess.map(access => ({
      ...access,
      person: {
        ...access.person,
        bondAmount: access.person.bondAmount ? access.person.bondAmount.toString() : null,
      },
    })),
  };

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
        user={serializedUser}
        roles={roles}
        towns={towns}
        persons={serializedPersons}
        canManageTokens={canManageTokens}
        hasCommentToken={hasCommentToken}
      />
    </div>
  );
}
