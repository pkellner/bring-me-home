import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getMemoryCache, getRedisCache } from '@/lib/cache/cache-manager';
import { generateRedisKey, RedisNamespaces } from '@/lib/redis/redis-keys';

async function getCachedSupportStats(personId: string) {
  const cacheKey = generateRedisKey(RedisNamespaces.CACHE, 'support-stats', personId);
  const TTL_SECONDS = parseInt(process.env.CACHE_SUPPORT_STATS_TTL || '300');
  
  // Try memory cache (respects CACHE_MEMORY_ENABLE)
  const memoryCache = await getMemoryCache();
  const cached = await memoryCache.get(cacheKey);
  if (cached) return cached;
  
  // Try Redis cache (respects CACHE_REDIS_ENABLE)
  const redisCache = await getRedisCache();
  if (redisCache) {
    const redisCached = await redisCache.get(cacheKey);
    if (redisCached) {
      await memoryCache.set(cacheKey, redisCached, TTL_SECONDS * 1000);
      return redisCached;
    }
  }
  
  // Query database with error handling
  try {
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
    
    const [totalAnonymousSupport, recentAnonymousSupport, totalMessages, recentMessages] = 
      await Promise.all([
        prisma.anonymousSupport.count({ where: { personId } }),
        prisma.anonymousSupport.count({ 
          where: { personId, createdAt: { gte: twentyFourHoursAgo } } 
        }),
        prisma.comment.count({ where: { personId, isApproved: true, hideRequested: false } }),
        prisma.comment.count({ 
          where: { personId, isApproved: true, hideRequested: false, createdAt: { gte: twentyFourHoursAgo } } 
        }),
      ]);
    
    const stats = {
      anonymousSupport: { 
        total: totalAnonymousSupport, 
        last24Hours: recentAnonymousSupport 
      },
      messages: { 
        total: totalMessages, 
        last24Hours: recentMessages 
      }
    };
    
    // Cache result (respects cache enable settings)
    await memoryCache.set(cacheKey, stats, TTL_SECONDS * 1000);
    if (redisCache) {
      await redisCache.set(cacheKey, stats, TTL_SECONDS);
    }
    
    return stats;
  } catch (error) {
    console.error('Database query error in getCachedSupportStats:', error);
    // Return default stats if database is unavailable
    return {
      anonymousSupport: { total: 0, last24Hours: 0 },
      messages: { total: 0, last24Hours: 0 }
    };
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: personId } = await params;
    return NextResponse.json(await getCachedSupportStats(personId));
  } catch (error) {
    console.error('Error fetching support stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch support stats' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: personId } = await params;
    
    // Get IP address from headers
    const forwarded = request.headers.get('x-forwarded-for');
    const ipAddress = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';
    
    // Get user agent
    const userAgent = request.headers.get('user-agent') || undefined;
    
    // Verify person exists and is active
    const person = await prisma.person.findUnique({
      where: { id: personId, isActive: true },
      select: { id: true }
    });
    
    if (!person) {
      return NextResponse.json(
        { error: 'Person not found' },
        { status: 404 }
      );
    }
    
    // Create anonymous support record
    const support = await prisma.anonymousSupport.create({
      data: {
        personId,
        ipAddress,
        userAgent
      }
    });
    
    // Get total support count
    const totalSupport = await prisma.anonymousSupport.count({
      where: { personId }
    });
    
    return NextResponse.json({
      success: true,
      supportId: support.id,
      totalSupport
    });
  } catch (error) {
    console.error('Error creating anonymous support:', error);
    return NextResponse.json(
      { error: 'Failed to record support' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: personId } = await params;
    
    // Get IP address and user agent to find the exact support record
    const forwarded = request.headers.get('x-forwarded-for');
    const ipAddress = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || undefined;
    
    // Find and delete only the most recent anonymous support for this person from this exact IP and user agent
    const recentSupport = await prisma.anonymousSupport.findFirst({
      where: {
        personId,
        ipAddress,
        userAgent
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    let deletedCount = 0;
    if (recentSupport) {
      await prisma.anonymousSupport.delete({
        where: {
          id: recentSupport.id
        }
      });
      deletedCount = 1;
    }
    
    return NextResponse.json({
      success: true,
      deletedCount
    });
  } catch (error) {
    console.error('Error deleting anonymous support:', error);
    return NextResponse.json(
      { error: 'Failed to delete support' },
      { status: 500 }
    );
  }
}