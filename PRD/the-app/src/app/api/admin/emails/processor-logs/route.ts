import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isSiteAdmin } from '@/lib/permissions';

const DEFAULT_LOG_LIMIT = parseInt(process.env.EMAIL_PROCESSOR_LOG_LIMIT || '1000', 10);

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id || !isSiteAdmin(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || String(DEFAULT_LOG_LIMIT));
    const offset = parseInt(searchParams.get('offset') || '0');
    const level = searchParams.get('level');
    const category = searchParams.get('category');
    const processId = searchParams.get('processId');
    const batchId = searchParams.get('batchId');

    // Build where clause
    const where: Record<string, string> = {};
    if (level) where.level = level;
    if (category) where.category = category;
    if (processId) where.processId = processId;
    if (batchId) where.batchId = batchId;

    // Get logs
    const [logs, total] = await Promise.all([
      prisma.emailProcessorLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: Math.min(limit, 5000), // Cap at 5000
        skip: offset,
      }),
      prisma.emailProcessorLog.count({ where }),
    ]);

    // Get unique values for filters
    const [levels, categories, processIds] = await Promise.all([
      prisma.emailProcessorLog.findMany({
        select: { level: true },
        distinct: ['level'],
      }),
      prisma.emailProcessorLog.findMany({
        select: { category: true },
        distinct: ['category'],
      }),
      prisma.emailProcessorLog.findMany({
        select: { processId: true },
        where: { processId: { not: null } },
        distinct: ['processId'],
        orderBy: { timestamp: 'desc' },
        take: 20,
      }),
    ]);

    return NextResponse.json({
      logs,
      total,
      filters: {
        levels: levels.map(l => l.level),
        categories: categories.map(c => c.category),
        processIds: processIds.map(p => p.processId).filter(Boolean),
      },
    });
  } catch (error) {
    console.error('Error fetching processor logs:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to fetch logs',
    }, { status: 500 });
  }
}

// Clear old logs
export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id || !isSiteAdmin(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = request.nextUrl;
    const daysToKeep = parseInt(searchParams.get('daysToKeep') || '7');
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    const result = await prisma.emailProcessorLog.deleteMany({
      where: {
        timestamp: {
          lt: cutoffDate,
        },
      },
    });

    return NextResponse.json({
      success: true,
      deleted: result.count,
    });
  } catch (error) {
    console.error('Error clearing logs:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to clear logs',
    }, { status: 500 });
  }
}