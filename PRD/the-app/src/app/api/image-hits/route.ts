import { NextResponse } from 'next/server';
import { getImageHitStats, getTrackerUptime, resetImageHitTracking } from '@/lib/image-hit-tracking';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is site admin
    const isSiteAdmin = session?.user?.roles?.some(role => role.name === 'site-admin') || false;
    
    if (!isSiteAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const stats = getImageHitStats();
    const uptime = getTrackerUptime();
    
    return NextResponse.json({
      stats,
      uptime,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching image hit stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch image hit statistics' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is site admin
    const isSiteAdmin = session?.user?.roles?.some(role => role.name === 'site-admin') || false;
    
    if (!isSiteAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    resetImageHitTracking();
    
    return NextResponse.json({ success: true, message: 'Image hit tracking reset successfully' });
  } catch (error) {
    console.error('Error resetting image hit tracking:', error);
    return NextResponse.json(
      { error: 'Failed to reset image hit tracking' },
      { status: 500 }
    );
  }
}