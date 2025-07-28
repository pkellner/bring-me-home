import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 1x1 transparent GIF (43-byte payload)
const TRACKING_PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  try {
    // Update the emailNotification record
    await prisma.emailNotification.update({
      where: { id },
      data: {
        status: 'OPENED',
        openedAt: new Date(),
      },
    });
    if (process.env.environment !== 'production') {
      console.log(`Email ${id} marked as opened`);
    }
  } catch (error) {
    if (process.env.environment !== 'production') {
      // In non-production environments, log the error to console
      console.error(`Error tracking email ${id}:`, error);
      // We still return the pixel even if update fails
    }
  }

  return new NextResponse(TRACKING_PIXEL, {
    status: 200,
    headers: {
      'Content-Type': 'image/gif',
      'Content-Length': TRACKING_PIXEL.length.toString(),
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    },
  });
}
