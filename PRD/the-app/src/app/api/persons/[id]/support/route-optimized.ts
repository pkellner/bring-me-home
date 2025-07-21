import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withCache, CACHE_TTL, CACHE_KEYS, cacheInvalidation } from '@/lib/cache';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: personId } = await params;
    
    // Cache support stats with short TTL since they change frequently
    const stats = await withCache(
      CACHE_KEYS.supportStats(personId),
      async () => {
        // Execute queries in parallel
        const twentyFourHoursAgo = new Date();
        twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
        
        const [
          totalAnonymousSupport,
          recentAnonymousSupport,
          totalMessages,
          recentMessages
        ] = await Promise.all([
          // Total anonymous support
          prisma.anonymousSupport.count({
            where: { personId }
          }),
          
          // Recent anonymous support
          prisma.anonymousSupport.count({
            where: {
              personId,
              createdAt: {
                gte: twentyFourHoursAgo
              }
            }
          }),
          
          // Total approved messages
          prisma.comment.count({
            where: {
              personId,
              isApproved: true
            }
          }),
          
          // Recent messages
          prisma.comment.count({
            where: {
              personId,
              isApproved: true,
              createdAt: {
                gte: twentyFourHoursAgo
              }
            }
          })
        ]);
        
        return {
          anonymousSupport: {
            total: totalAnonymousSupport,
            last24Hours: recentAnonymousSupport
          },
          messages: {
            total: totalMessages,
            last24Hours: recentMessages
          }
        };
      },
      CACHE_TTL.SUPPORT_STATS
    );
    
    return NextResponse.json(stats);
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
    
    // Verify person exists (with caching)
    const personExists = await withCache(
      `person:exists:${personId}`,
      async () => {
        const person = await prisma.person.findUnique({
          where: { id: personId, isActive: true },
          select: { id: true }
        });
        return !!person;
      },
      3600 // Cache for 1 hour
    );
    
    if (!personExists) {
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
    
    // Invalidate support stats cache
    await cacheInvalidation.comments(personId);
    
    // Get updated total (from cache if possible)
    const stats = await withCache(
      CACHE_KEYS.supportStats(personId),
      async () => {
        const totalSupport = await prisma.anonymousSupport.count({
          where: { personId }
        });
        return { totalSupport };
      },
      10 // Very short TTL for fresh data
    );
    
    return NextResponse.json({
      success: true,
      supportId: support.id,
      totalSupport: stats.totalSupport
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
    
    // Get IP address and user agent
    const forwarded = request.headers.get('x-forwarded-for');
    const ipAddress = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || undefined;
    
    // Find and delete the most recent support
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
      
      // Invalidate cache
      await cacheInvalidation.comments(personId);
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