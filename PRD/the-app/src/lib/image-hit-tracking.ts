type HitData = {
  url: string;
  lastMinute: number;
  last5Minutes: number;
  last60Minutes: number;
  total: number;
  firstHit: Date;
  lastHit: Date;
};

type HitRecord = {
  timestamp: Date;
};

// Module-level state
const hits = new Map<string, HitRecord[]>();
const totalHits = new Map<string, number>();
let startTime = new Date();

function cleanupOldRecords(url: string): void {
  const records = hits.get(url);
  if (!records) return;
  
  const now = new Date();
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const cleanedRecords = records.filter(r => r.timestamp > hourAgo);
  
  if (cleanedRecords.length !== records.length) {
    hits.set(url, cleanedRecords);
  }
}

export function recordImageHit(url: string): void {
  const now = new Date();
  const records = hits.get(url) || [];
  records.push({ timestamp: now });
  hits.set(url, records);
  
  // Update total hits counter
  const current = totalHits.get(url) || 0;
  totalHits.set(url, current + 1);
  
  // Clean up old records (older than 60 minutes)
  cleanupOldRecords(url);
}

export function getImageHitStats(): HitData[] {
  const now = new Date();
  const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
  const sixtyMinutesAgo = new Date(now.getTime() - 60 * 60 * 1000);

  const stats: HitData[] = [];

  for (const [url, records] of hits.entries()) {
    if (records.length === 0) continue;

    const sortedHits = [...records].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    stats.push({
      url,
      lastMinute: records.filter(r => r.timestamp > oneMinuteAgo).length,
      last5Minutes: records.filter(r => r.timestamp > fiveMinutesAgo).length,
      last60Minutes: records.filter(r => r.timestamp > sixtyMinutesAgo).length,
      total: totalHits.get(url) || records.length,
      firstHit: sortedHits[0].timestamp,
      lastHit: sortedHits[sortedHits.length - 1].timestamp,
    });
  }

  // Sort by total hits descending
  return stats.sort((a, b) => b.total - a.total);
}

export function getTrackerUptime(): string {
  const now = new Date();
  const uptimeMs = now.getTime() - startTime.getTime();
  
  const days = Math.floor(uptimeMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((uptimeMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((uptimeMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}

export function resetImageHitTracking(): void {
  hits.clear();
  totalHits.clear();
  startTime = new Date();
}