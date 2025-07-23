import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasRole } from '@/lib/permissions';

export default async function TestAuthPage() {
  const session = await getServerSession(authOptions);
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Authentication Test Page</h1>
      
      <div className="space-y-4">
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-semibold">Session Status:</h2>
          <pre className="mt-2 text-sm">{JSON.stringify({ sessionExists: !!session }, null, 2)}</pre>
        </div>
        
        {session && (
          <>
            <div className="bg-gray-100 p-4 rounded">
              <h2 className="font-semibold">User Info:</h2>
              <pre className="mt-2 text-sm">{JSON.stringify({
                id: session.user.id,
                username: session.user.username,
                email: session.user.email,
                firstName: session.user.firstName,
                lastName: session.user.lastName,
              }, null, 2)}</pre>
            </div>
            
            <div className="bg-gray-100 p-4 rounded">
              <h2 className="font-semibold">Roles:</h2>
              <pre className="mt-2 text-sm">{JSON.stringify(session.user.roles, null, 2)}</pre>
            </div>
            
            <div className="bg-gray-100 p-4 rounded">
              <h2 className="font-semibold">Role Checks:</h2>
              <pre className="mt-2 text-sm">{JSON.stringify({
                'site-admin': hasRole(session, 'site-admin'),
                'town-admin': hasRole(session, 'town-admin'),
                'person-admin': hasRole(session, 'person-admin'),
              }, null, 2)}</pre>
            </div>
            
            <div className="bg-gray-100 p-4 rounded">
              <h2 className="font-semibold">Town Access:</h2>
              <pre className="mt-2 text-sm">{JSON.stringify(session.user.townAccess, null, 2)}</pre>
            </div>
            
            <div className="bg-gray-100 p-4 rounded">
              <h2 className="font-semibold">Person Access:</h2>
              <pre className="mt-2 text-sm">{JSON.stringify(session.user.personAccess, null, 2)}</pre>
            </div>
          </>
        )}
        
        <div className="mt-6">
          <a href="/admin" className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
            Try to Access /admin
          </a>
        </div>
      </div>
    </div>
  );
}