import { NextResponse } from 'next/server';
import { getConnectionStats } from '@/lib/prisma';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Get current connection stats
    const stats = getConnectionStats();
    
    // Try to get database connection info
    let dbConnectionInfo = null;
    try {
      const result = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count 
        FROM information_schema.processlist 
        WHERE db = DATABASE()
      `;
      
      const maxConnResult = await prisma.$queryRaw<Array<{ value: string }>>`
        SHOW VARIABLES LIKE 'max_connections'
      `;
      
      dbConnectionInfo = {
        activeConnections: Number(result[0]?.count || 0),
        maxConnections: Number(maxConnResult[0]?.value || 0),
      };
    } catch (error) {
      console.error('Error fetching DB connection info:', error);
    }
    
    const response = {
      timestamp: new Date().toISOString(),
      prismaStats: stats,
      databaseInfo: dbConnectionInfo,
      environment: {
        nodeEnv: process.env.NODE_ENV,
        connectionLimit: process.env.DATABASE_URL?.match(/connection_limit=(\d+)/)?.[1] || 'not set',
        poolTimeout: process.env.DATABASE_URL?.match(/pool_timeout=(\d+)/)?.[1] || 'not set',
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