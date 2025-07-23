import { prisma } from '@/lib/prisma';

interface GeolocationData {
  latitude: number;
  longitude: number;
  city: string;
  region: string;
  country: string;
}

interface IPInfoResponse {
  ip: string;
  city: string;
  region: string;
  country: string;
  loc: string;
  timezone: string;
}

const IPINFO_TOKEN = process.env.IPINFO_TOKEN;
const RATE_LIMIT_DELAY = 1000; // 1 second between requests
const BATCH_SIZE = process.env.GEOLOCATION_BATCH_SIZE ? parseInt(process.env.GEOLOCATION_BATCH_SIZE, 10) : 50;
const MAX_BATCH_SIZE = process.env.IPINFO_MAX_BATCH_SIZE ? parseInt(process.env.IPINFO_MAX_BATCH_SIZE, 10) : 100;

// Ensure batch size doesn't exceed the API maximum
const EFFECTIVE_BATCH_SIZE = Math.min(BATCH_SIZE, MAX_BATCH_SIZE);

interface BatchIPInfoResponse {
  [ip: string]: IPInfoResponse;
}

export class GeolocationService {
  private static lastRequestTime = 0;

  private static async rateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < RATE_LIMIT_DELAY) {
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY - timeSinceLastRequest));
    }
    this.lastRequestTime = Date.now();
  }

  // Batch processing method for multiple IPs
  static async getLocationsFromIPs(ipAddresses: string[]): Promise<Map<string, GeolocationData | null>> {
    const results = new Map<string, GeolocationData | null>();
    
    // Filter out invalid IPs
    const validIps = ipAddresses.filter(ip => ip && ip !== 'unknown');
    
    if (validIps.length === 0) {
      return results;
    }

    // If no token, fall back to sequential processing
    if (!IPINFO_TOKEN) {
      for (const ip of validIps) {
        const result = await this.getLocationFromIP(ip);
        results.set(ip, result);
      }
      return results;
    }

    try {
      await this.rateLimit();

      const response = await fetch(`https://ipinfo.io/batch?token=${IPINFO_TOKEN}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validIps),
      });

      if (!response.ok) {
        if (response.status === 429) {
          console.error('Rate limit exceeded for batch IP geolocation');
          throw new Error('Rate limit exceeded');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const batchData: BatchIPInfoResponse = await response.json();

      // Process each IP response
      for (const [ip, data] of Object.entries(batchData)) {
        if (data && data.loc) {
          const [latitude, longitude] = data.loc.split(',').map(Number);
          results.set(ip, {
            latitude,
            longitude,
            city: data.city || '',
            region: data.region || '',
            country: data.country || ''
          });
        } else {
          results.set(ip, null);
        }
      }

      // Set null for any IPs that weren't in the response
      for (const ip of validIps) {
        if (!results.has(ip)) {
          results.set(ip, null);
        }
      }


    } catch (error) {
      console.error('Error fetching batch geolocation:', error);
      // Fall back to sequential processing on error
      for (const ip of validIps) {
        const result = await this.getLocationFromIP(ip);
        results.set(ip, result);
      }
    }

    return results;
  }

  static async getLocationFromIP(ipAddress: string): Promise<GeolocationData | null> {
    if (!ipAddress || ipAddress === 'unknown') {
      return null;
    }

    try {
      await this.rateLimit();

      const url = IPINFO_TOKEN 
        ? `https://ipinfo.io/${ipAddress}?token=${IPINFO_TOKEN}`
        : `https://ipinfo.io/${ipAddress}/json`;

      const response = await fetch(url);
      
      if (!response.ok) {
        if (response.status === 429) {
          console.error('Rate limit exceeded for IP geolocation');
          throw new Error('Rate limit exceeded');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: IPInfoResponse = await response.json();
      
      if (!data.loc) {
        return null;
      }

      const [latitude, longitude] = data.loc.split(',').map(Number);

      return {
        latitude,
        longitude,
        city: data.city || '',
        region: data.region || '',
        country: data.country || ''
      };
    } catch (error) {
      console.error('Error fetching geolocation:', error);
      return null;
    }
  }

  static async processUnprocessedComments(personId: string) {
    // If batch size is 0, don't process anything
    if (EFFECTIVE_BATCH_SIZE === 0) {
      return [];
    }

    const unprocessedComments = await prisma.comment.findMany({
      where: {
        personId,
        processedForLatLon: false,
        ipAddress: {
          not: null,
          notIn: ['unknown']
        },
        isApproved: true  // Only process approved messages
      },
      select: {
        id: true,
        ipAddress: true
      },
      take: EFFECTIVE_BATCH_SIZE
    });

    if (unprocessedComments.length === 0) {
      return [];
    }

    // Extract unique IPs for batch processing
    const uniqueIps = [...new Set(unprocessedComments.map(c => c.ipAddress).filter(ip => ip !== null))] as string[];
    
    // Process IPs in batch
    const locationResults = await this.getLocationsFromIPs(uniqueIps);
    
    const results = [];
    
    // Update each comment with its location data
    for (const comment of unprocessedComments) {
      if (!comment.ipAddress) continue;
      
      const location = locationResults.get(comment.ipAddress);
      
      if (location) {
        await prisma.comment.update({
          where: { id: comment.id },
          data: {
            latitude: location.latitude,
            longitude: location.longitude,
            geoCity: location.city,
            region: location.region,
            country: location.country,
            processedForLatLon: true
          }
        });
        results.push({ id: comment.id, success: true, ipAddress: comment.ipAddress });
      } else {
        // Mark as processed even if failed to prevent retry
        await prisma.comment.update({
          where: { id: comment.id },
          data: { processedForLatLon: true }
        });
        results.push({ id: comment.id, success: false, ipAddress: comment.ipAddress });
      }
    }

    return results;
  }

  static async processUnprocessedSupport(personId: string) {
    // If batch size is 0, don't process anything
    if (EFFECTIVE_BATCH_SIZE === 0) {
      return [];
    }

    const unprocessedSupport = await prisma.anonymousSupport.findMany({
      where: {
        personId,
        processedForLatLon: false,
        ipAddress: {
          not: null,
          notIn: ['unknown']
        }
      },
      select: {
        id: true,
        ipAddress: true
      },
      take: EFFECTIVE_BATCH_SIZE
    });

    if (unprocessedSupport.length === 0) {
      return [];
    }

    // Extract unique IPs for batch processing
    const uniqueIps = [...new Set(unprocessedSupport.map(s => s.ipAddress).filter(ip => ip !== null))] as string[];
    
    // Process IPs in batch
    const locationResults = await this.getLocationsFromIPs(uniqueIps);
    
    const results = [];
    
    // Update each support record with its location data
    for (const support of unprocessedSupport) {
      if (!support.ipAddress) continue;
      
      const location = locationResults.get(support.ipAddress);
      
      if (location) {
        await prisma.anonymousSupport.update({
          where: { id: support.id },
          data: {
            latitude: location.latitude,
            longitude: location.longitude,
            geoCity: location.city,
            region: location.region,
            country: location.country,
            processedForLatLon: true
          }
        });
        results.push({ id: support.id, success: true, ipAddress: support.ipAddress });
      } else {
        // Mark as processed even if failed to prevent retry
        await prisma.anonymousSupport.update({
          where: { id: support.id },
          data: { processedForLatLon: true }
        });
        results.push({ id: support.id, success: false, ipAddress: support.ipAddress });
      }
    }

    return results;
  }

  static async getProcessedLocations(personId: string) {
    // Use Prisma transaction to batch queries
    const [comments, support] = await prisma.$transaction([
      prisma.comment.findMany({
        where: {
          personId,
          latitude: { not: null },
          longitude: { not: null },
          isApproved: true  // Only show approved messages
        },
        select: {
          id: true,
          latitude: true,
          longitude: true,
          geoCity: true,
          country: true,
          createdAt: true
        }
      }),
      prisma.anonymousSupport.findMany({
        where: {
          personId,
          latitude: { not: null },
          longitude: { not: null }
        },
        select: {
          id: true,
          latitude: true,
          longitude: true,
          geoCity: true,
          country: true,
          createdAt: true
        }
      })
    ]);

    return {
      messages: comments.map(c => ({
        id: c.id,
        latitude: c.latitude!,
        longitude: c.longitude!,
        city: c.geoCity,
        country: c.country,
        createdAt: c.createdAt.toISOString()
      })),
      support: support.map(s => ({
        id: s.id,
        latitude: s.latitude!,
        longitude: s.longitude!,
        city: s.geoCity,
        country: s.country,
        createdAt: s.createdAt.toISOString()
      }))
    };
  }

  static async getUnprocessedCount(personId: string) {
    const [messagesRemaining, supportRemaining] = await Promise.all([
      prisma.comment.count({
        where: {
          personId,
          processedForLatLon: false,
          ipAddress: {
            not: null,
            notIn: ['unknown']
          },
          isApproved: true  // Only count approved messages
        }
      }),
      prisma.anonymousSupport.count({
        where: {
          personId,
          processedForLatLon: false,
          ipAddress: {
            not: null,
            notIn: ['unknown']
          }
        }
      })
    ]);

    return { messagesRemaining, supportRemaining };
  }
  
  static async hasAnyIpAddresses(personId: string) {
    // Use Prisma transaction to batch queries
    const [messagesWithIp, supportWithIp] = await prisma.$transaction([
      prisma.comment.count({
        where: {
          personId,
          ipAddress: {
            not: null,
            notIn: ['unknown']
          }
          // Don't filter by approval status - we want to show the map if ANY messages have IPs
        }
      }),
      prisma.anonymousSupport.count({
        where: {
          personId,
          ipAddress: {
            not: null,
            notIn: ['unknown']
          }
        }
      })
    ]);

    return (messagesWithIp + supportWithIp) > 0;
  }
}