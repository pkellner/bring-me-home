import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: personId } = await params;
    
    // Get total anonymous support count
    const totalAnonymousSupport = await prisma.anonymousSupport.count({
      where: { personId }
    });
    
    // Get support in last 24 hours
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
    
    const recentAnonymousSupport = await prisma.anonymousSupport.count({
      where: {
        personId,
        createdAt: {
          gte: twentyFourHoursAgo
        }
      }
    });
    
    // Get total approved comments (messages)
    const totalMessages = await prisma.comment.count({
      where: {
        personId,
        isApproved: true
      }
    });
    
    // Get messages in last 24 hours
    const recentMessages = await prisma.comment.count({
      where: {
        personId,
        isApproved: true,
        createdAt: {
          gte: twentyFourHoursAgo
        }
      }
    });
    
    return NextResponse.json({
      anonymousSupport: {
        total: totalAnonymousSupport,
        last24Hours: recentAnonymousSupport
      },
      messages: {
        total: totalMessages,
        last24Hours: recentMessages
      }
    });
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
    
    // Get IP address to find the most recent support from this user
    const forwarded = request.headers.get('x-forwarded-for');
    const ipAddress = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';
    
    // Delete the most recent anonymous support for this person from this IP
    const deleted = await prisma.anonymousSupport.deleteMany({
      where: {
        personId,
        ipAddress
      }
    });
    
    return NextResponse.json({
      success: true,
      deletedCount: deleted.count
    });
  } catch (error) {
    console.error('Error deleting anonymous support:', error);
    return NextResponse.json(
      { error: 'Failed to delete support' },
      { status: 500 }
    );
  }
}