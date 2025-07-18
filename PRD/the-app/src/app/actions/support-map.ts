'use server';

export async function isSupportMapEnabled(): Promise<boolean> {
  return process.env.ENABLE_SUPPORT_MAP === 'true';
}