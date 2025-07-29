'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isSiteAdmin } from '@/lib/permissions';
import { 
  addToSuppressionList as addToSuppressionListLib, 
  removeFromSuppressionList as removeFromSuppressionListLib,
  SUPPRESSION_SOURCES,
  type AddSuppressionOptions
} from '@/lib/email-suppression';

export async function addToSuppressionList(options: Omit<AddSuppressionOptions, 'source'>) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id || !isSiteAdmin(session)) {
    return { success: false, error: 'Unauthorized' };
  }
  
  try {
    const suppression = await addToSuppressionListLib({
      ...options,
      source: SUPPRESSION_SOURCES.ADMIN_ACTION,
    });
    
    return { success: true, suppression };
  } catch (error) {
    console.error('Error adding to suppression list:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to add to suppression list' 
    };
  }
}

export async function removeFromSuppressionList(email: string) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id || !isSiteAdmin(session)) {
    return { success: false, error: 'Unauthorized' };
  }
  
  try {
    const removed = await removeFromSuppressionListLib(email);
    
    if (!removed) {
      return { success: false, error: 'Email not found in suppression list' };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error removing from suppression list:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to remove from suppression list' 
    };
  }
}