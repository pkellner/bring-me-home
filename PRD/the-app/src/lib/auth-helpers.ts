import { getServerSession } from 'next-auth';
import { authOptions } from './auth';

// Get current user
export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  return session?.user || null;
}
