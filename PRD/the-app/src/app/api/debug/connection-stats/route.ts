import { NextResponse } from 'next/server';
import { getConnectionStats } from '@/lib/prisma';
import { getConnectionCounts, poolSettingsFromUrl } from '@/lib/database-health';

export async function GET() {
  try {
    // Get current connection stats
    const stats = getConnectionStats();

    // Try to get database connection info
    let dbConnectionInfo = null;
    try {
      dbConnectionInfo = await getConnectionCounts();
    } catch (error) {
      console.error('Error fetching DB connection info:', error);
    }

    const { connectionLimit, poolTimeout } = poolSettingsFromUrl(process.env.DATABASE_URL);
    const response = {
      timestamp: new Date().toISOString(),
      prismaStats: stats,
      databaseInfo: dbConnectionInfo,
      environment: {
        nodeEnv: process.env.NODE_ENV,
        connectionLimit: connectionLimit === null ? 'not set' : String(connectionLimit),
        poolTimeout: poolTimeout === null ? 'not set' : String(poolTimeout),
      },
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Error in connection stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch connection stats' },
      { status: 500 }
    );
  }
}
