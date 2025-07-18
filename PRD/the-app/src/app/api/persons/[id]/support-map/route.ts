import { NextRequest, NextResponse } from 'next/server';
import { GeolocationService } from '@/lib/geolocation';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: personId } = await params;

    // Get current locations
    const locations = await GeolocationService.getProcessedLocations(personId);
    
    // Check if there are any IP addresses at all
    const hasIpAddresses = await GeolocationService.hasAnyIpAddresses(personId);
    
    // Check if batch processing is enabled
    const BATCH_SIZE = process.env.GEOLOCATION_BATCH_SIZE ? parseInt(process.env.GEOLOCATION_BATCH_SIZE, 10) : 50;
    
    // If batch size is 0, don't report unprocessed items to prevent polling
    if (BATCH_SIZE === 0) {
      return NextResponse.json({
        locations,
        hasIpAddresses,
        processing: {
          messagesRemaining: 0,
          supportRemaining: 0
        }
      });
    }
    
    // Get unprocessed count
    const processing = await GeolocationService.getUnprocessedCount(personId);
    
    // If there are unprocessed items, process them
    let processingStats = null;
    if (processing.messagesRemaining > 0 || processing.supportRemaining > 0) {
      const startTime = Date.now();
      
      try {
        // Process and await results to get statistics
        const [commentResults, supportResults] = await Promise.all([
          processing.messagesRemaining > 0 ? GeolocationService.processUnprocessedComments(personId) : Promise.resolve([]),
          processing.supportRemaining > 0 ? GeolocationService.processUnprocessedSupport(personId) : Promise.resolve([])
        ]);
        
        const endTime = Date.now();
        const processingTime = endTime - startTime;
        
        // Calculate statistics
        const allResults = [...commentResults, ...supportResults];
        const totalSent = allResults.length;
        const totalSuccess = allResults.filter(r => r.success).length;
        
        // Count unique IPs that were processed
        const uniqueIps = new Set(allResults.map(r => r.ipAddress).filter(ip => ip));
        
        processingStats = {
          totalRecords: totalSent,
          uniqueIps: uniqueIps.size,
          successful: totalSuccess,
          failed: totalSent - totalSuccess,
          processingTimeMs: processingTime,
          messagesProcessed: commentResults.length,
          supportProcessed: supportResults.length
        };
        
        console.log(`Processed ${totalSent} records (${uniqueIps.size} unique IPs) in ${processingTime}ms (${totalSuccess} successful, ${totalSent - totalSuccess} failed)`);
      } catch (error) {
        console.error('Error processing locations:', error);
      }
    }

    return NextResponse.json({
      locations,
      hasIpAddresses,
      processing,
      processingStats
    });
  } catch (error) {
    console.error('Error fetching support map data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch support map data' },
      { status: 500 }
    );
  }
}