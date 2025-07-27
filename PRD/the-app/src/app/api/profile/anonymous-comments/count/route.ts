import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const email = searchParams.get('email');

  if (!email) {
    return NextResponse.json({ error: 'Email parameter is required' }, { status: 400 });
  }

  try {
    // Get comment statistics for this email
    const stats = await prisma.comment.groupBy({
      by: ['hideRequested'],
      where: { email },
      _count: true,
    });

    const hiddenCount = stats.find(s => s.hideRequested)?._count || 0;
    const visibleCount = stats.find(s => !s.hideRequested)?._count || 0;
    const totalCount = hiddenCount + visibleCount;

    return NextResponse.json({ 
      total: totalCount,
      hidden: hiddenCount,
      visible: visibleCount
    });
  } catch (error) {
    console.error('Error getting comment count:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}