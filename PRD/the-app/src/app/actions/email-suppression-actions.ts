'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isSiteAdmin } from '@/lib/permissions';
import { 
  addToSuppressionList as addToSuppressionListLib, 
  removeFromSuppressionList as removeFromSuppressionListLib,
  getSuppressionInfo,
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

export async function checkSuppressionStatus(email: string) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id || !isSiteAdmin(session)) {
    return { success: false, error: 'Unauthorized' };
  }
  
  try {
    const info = await getSuppressionInfo(email);
    
    if (info.isSuppressed && info.suppression) {
      // Convert Date objects to strings for client component
      return { 
        success: true, 
        suppression: {
          ...info.suppression,
          createdAt: info.suppression.createdAt.toISOString(),
          updatedAt: info.suppression.updatedAt.toISOString(),
        }
      };
    }
    
    return { success: true, suppression: null };
  } catch (error) {
    console.error('Error checking suppression status:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to check suppression status' 
    };
  }
}