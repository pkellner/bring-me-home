# Product Requirements Document: Community Support Geographic Visualization

## Executive Summary

This feature adds an interactive map visualization to person profile pages that displays the geographic distribution of community support actions (messages and anonymous support clicks). The map provides real-time geolocation processing of IP addresses and offers an engaging visual representation of global solidarity for detained individuals.

## Feature Overview

### Core Functionality
- **Interactive Map Display**: Shows pins for all locations where users have clicked "Leave a message" or "Anonymous support"
- **Toggle Controls**: Checkboxes to show/hide message locations (blue pins) and support clicks (purple pins)
- **Smart Viewport**: Map automatically adjusts zoom and center to encompass all pins
- **Expandable UI**: Animated expand/collapse between community support stats and action buttons
- **Real-time Processing**: On-demand IP geolocation with loading indicators
- **Privacy-First**: No pre-processing of locations until user requests the map view

### User Experience Flow
1. User views person profile page
2. Sees new "View Support Map" button between stats and action buttons
3. Clicks to expand → loading spinner appears
4. System processes any unprocessed IP addresses in background
5. Map animates open showing all support locations
6. User can toggle between message and support pin types
7. Map animates closed when collapsed

## Technical Requirements

Only attempt to create the map and do the geolocation processing when the user clicks the "View Support Map" button. This makes the page load faster.
The map should not be pre-rendered or processed until the user explicitly requests it with the "expand" button,
Use SVG to make a nice expand/collapse button that animates the map expanding and collapsing.

### Database Schema Updates

#### AnonymousSupport Model
```prisma
model AnonymousSupport {
  // Existing fields...
  
  // New geolocation fields
  latitude          Float?
  longitude         Float?
  city              String?
  region            String?
  country           String?
  processedForLatLon Boolean @default(false)
  
  @@index([processedForLatLon])
}
```

#### Comment Model
```prisma
model Comment {
  // Existing fields...
  
  // New geolocation fields
  latitude          Float?
  longitude         Float?
  city              String?
  region            String?
  country           String?
  processedForLatLon Boolean @default(false)
  
  @@index([processedForLatLon])
}
```

### API Requirements

#### New Endpoint: `/api/persons/[id]/support-map`
- **Method**: GET
- **Purpose**: Fetch processed location data and trigger processing
- **Response**:
```typescript
{
  locations: {
    messages: Array<{
      id: string
      latitude: number
      longitude: number
      city?: string
      country?: string
      createdAt: string
    }>
    support: Array<{
      id: string
      latitude: number
      longitude: number
      city?: string
      country?: string
      createdAt: string
    }>
  }
  processing: {
    messagesRemaining: number
    supportRemaining: number
  }
}
```

### Geolocation Service Integration

#### Recommended Services (in order of preference)
1. **IPinfo.io**
   - Free tier: 50,000 requests/month
   - Accurate, fast, includes city/region data
   - Simple REST API

2. **IP-API**
   - Free tier: 45 requests/minute
   - No API key required for non-commercial use
   - Good accuracy

3. **IPGeolocation.io**
   - Free tier: 1,000 requests/day
   - Includes timezone data
   - REST API with good documentation

#### Processing Strategy
- Batch process up to 50 IPs per map expansion
- Cache results permanently in database
- Rate limit aware with exponential backoff
- Graceful degradation if service unavailable

### Map Implementation

#### Library: Leaflet
- **Why Leaflet**: Lightweight, mobile-friendly, extensive plugin ecosystem
- **React Integration**: react-leaflet for component-based implementation
- **Tile Provider**: OpenStreetMap (free, no API key required)

#### Map Features
- **Simple Markers**: Direct rendering without clustering for stability
- **Tooltips**: Show city/country on hover
- **Custom Markers**: Blue for messages, purple for support
- **Auto-fit**: Automatically adjust viewport to show all pins
- **Minimum Zoom**: Prevent zooming out too far (empty ocean views)

#### Map API Details

**Map Library**: Leaflet
- Open source JavaScript library for mobile-friendly interactive maps
- Version: 1.9.4 (from package.json)
- React integration: react-leaflet 5.0.0

**Tile Provider**: OpenStreetMap (OSM)
- URL: `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`
- Attribution: © OpenStreetMap contributors
- **No API key required** - completely free to use
- License: Open Database License (ODbL)

**OSM Usage Policy**:
- No bulk downloading or archiving of tiles
- No heavy/commercial use without custom tile server
- Must set valid HTTP User-Agent for contact purposes
- No guaranteed SLA - best effort basis
- IP-based throttling for excessive use
- Scale reference: OSM serves 1 billion tiles every 11 days

**Important Limitations**:
- The OSM tile servers have limited capacity from donated resources
- Heavy use can result in throttling or blocking
- Commercial services should consider alternative tile providers
- No specific numerical limits published (can change anytime)

**Alternative Options** (if usage grows):
- MapTiler, Stadia Maps, Thunderforest (paid services)
- Self-hosted tile server using OSM data
- Mapbox (requires API key and has usage limits)
- Google Maps (requires API key, has free tier limits)

### UI/UX Design

#### Visual Design
```
┌─────────────────────────────────────────┐
│ Community Support: 1,234                │
│ ▓▓▓▓▓▓▓▓▓▓▓▓░░░ 823 msgs | 411 support│
├─────────────────────────────────────────┤
│ [🗺️ View Support Map]                   │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │                                     │ │
│ │         [Animated Map Area]        │ │
│ │                                     │ │
│ │  □ Show Messages (823)             │ │
│ │  ☑ Show Support (411)              │ │
│ └─────────────────────────────────────┘ │
├─────────────────────────────────────────┤
│ [💬 Leave a Message] [❤️ Support]       │
└─────────────────────────────────────────┘
```

#### Animation Specifications
- **Expand**: 500ms ease-out, height from 0 to auto
- **Collapse**: 400ms ease-in, height from auto to 0
- **Loading State**: Pulsing spinner with "Processing locations..." text
- **Map Fade-in**: 300ms opacity transition after load

#### Responsive Behavior
- **Mobile**: Full-width map, 250px height
- **Tablet**: Full-width map, 350px height
- **Desktop**: Full-width map, 400px height

### Privacy & Security Considerations

1. **No Pre-processing**: Locations only processed when user requests
2. **IP Anonymization**: Get as much precision for the latitude and longitude as possible using the associated IP address and browser information if that helps with the geolocation
3. **Data Retention**: Keep until explicitly deleted by user
4. **GDPR Compliance**: Update privacy policy to mention geographic processing
5. **Rate Limiting**: Prevent abuse of geolocation API through map spam

### Performance Optimization

1. **Lazy Loading**: DO Not lazy load any javascript, but the map itself should be lazy loaded
   - Load map only when user clicks "View Support Map"
   - Prefer having state cause reloads which is best for performance and best practice. Only include useEffect if absolutely necessary.
2. **Data Pagination**: Limit to 1000 most recent pins
3. **Simple Markers**: Direct marker rendering without clustering for reliability
4. **Caching**: Cache processed coordinates indefinitely
5. **Debouncing**: Prevent rapid expand/collapse cycles

## Implementation Phases

### Phase 1: Database & Backend (Week 1)
- [x] Add migration for new database columns
- [x] Implement geolocation service integration
- [x] Create support-map API endpoint
- [x] Add batch processing logic
- [x] Update seed script with realistic IP addresses and user agents (50% populated)

### Phase 2: Map Component (Week 2)
- [x] Implement React-Leaflet map component
- [x] Simple marker implementation (removed clustering for stability)
- [x] Create custom marker designs
- [x] Implement viewport auto-fitting

### Phase 3: UI Integration (Week 3)
- [x] Add expandable map container
- [x] Implement loading states
- [x] Add toggle checkboxes
- [x] Polish animations
- [x] Add environment variable toggle (ENABLE_SUPPORT_MAP)

### Phase 4: Testing & Optimization (Week 4)
- [ ] Load testing with 1000+ pins
- [ ] Mobile responsiveness testing
- [ ] Geolocation API error handling
- [ ] Performance optimization

## Success Metrics

1. **User Engagement**
   - 30% of profile viewers expand the map
   - Average map view time > 15 seconds

2. **Performance**
   - Map loads in < 2 seconds (after processing)
   - Processing completes in < 5 seconds for 100 IPs

3. **Technical**
   - < 1% geolocation API failure rate
   - Zero impact on page initial load time

## Accessibility Requirements

1. **Keyboard Navigation**: Full keyboard support for map controls
2. **Screen Readers**: Announce pin counts and locations
3. **Color Contrast**: Ensure pins visible on all map tiles
4. **Alternative View**: Table view option for non-visual users

## Future Enhancements

1. **Heat Map View**: Density visualization for high-volume locations
2. **Time Animation**: Replay support growth over time
3. **Statistics Panel**: Country breakdown, distance calculations
4. **Share Feature**: Generate shareable map images
5. **Real-time Updates**: WebSocket for live pin additions

## Open Questions

1. **Data Privacy**: Should we allow users to opt-out of location tracking?
     NO, the privacty policy should be updated to reflect that we are processing the IP address and browser information to get the latitude and longitude of the user and also mention no user identifiable information is stored.
2. **API Costs**: Budget for geolocation API if free tiers exceeded?   ONLY ALLOW FOR FREE TIER. STOP PROCESSING AND LOG ERROR IF FREE TIER IS EXCEEDED.
3. **Moderation**: Should inappropriate message locations be hidden? THAT IS TAKEN CARE OF BY APPROVAL PROCESSING OF COMMENTS AND ANONYMOUS SUPPORT.
5. **Performance**: Maximum number of pins to display? DON'T SHOW MORE THAN 1000 PINS AT A TIME. IF MORE THAN 1000 PINS, SHOW A MESSAGE SAYING "TOO MANY PINS TO DISPLAY, PLEASE ZOOM IN OR FILTER THE MAP".

## Technical Decisions

1. **Map Library**: Leaflet (vs Google Maps, Mapbox)
   - ✅ Free and open source
   - ✅ No API key required
   - ✅ Lightweight (42KB gzipped)
   - ✅ Extensive plugin ecosystem

2. **Geolocation Service**: IPinfo.io (primary)
   - ✅ Generous free tier
   - ✅ High accuracy
   - ✅ Simple integration
   - ✅ Good rate limits

3. **Processing Strategy**: On-demand (vs pre-processing)
   - ✅ Respects user privacy
   - ✅ Reduces API costs
   - ✅ Fresh data when viewed
   - ❌ Slight delay for users

## Test Data

The seed script has been enhanced to support map testing:

### IP Address Distribution
- 30 realistic IP addresses from various countries:
  - USA (California, Texas, New York)
  - Mexico, Guatemala, Honduras, El Salvador
  - Colombia, Peru, Ecuador, Brazil
  - UK, Germany, France, Spain, Italy, Netherlands
  - China, Japan, India, South Korea
  - South Africa, Kenya, Egypt
  - Australia, Turkey, Sweden

### User Agent Strings
- 15 realistic browser user agents including:
  - Desktop: Chrome, Firefox, Safari, Edge, Opera
  - Mobile: iOS Safari, Android Chrome
  - Various operating systems: Windows, macOS, Linux, Android, iOS

### Data Population Strategy
- **50% Coverage**: Only half of comments and anonymous support records have IP/user agent data
- **Remaining 50%**: Left without geolocation data for the map feature to process
- This allows demonstration of the real-time processing capability

## Feature Toggle

The Community Support Map can be enabled or disabled via environment variable:

```bash
# Enable the feature (default)
ENABLE_SUPPORT_MAP="true"

# Disable the feature
ENABLE_SUPPORT_MAP="false"
```

When disabled:
- No map button appears in the UI
- No geolocation processing occurs
- API endpoint still exists but is unused
- Zero performance impact on page load

## Map API Details

### Mapping Library and Provider
- **Library**: Leaflet v1.9.4 with react-leaflet v5.0.0
- **Tile Provider**: OpenStreetMap (OSM)
- **Tile Server URL**: `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`
- **API Key Required**: No - OpenStreetMap is free and open
- **Cost**: Free (no API charges)

### OpenStreetMap Usage Limits and Policy
OpenStreetMap operates on a **Fair Use Policy** rather than hard limits:

1. **No Bulk Downloading**: Don't download tiles en masse or create archives
2. **Reasonable Usage**: The service is designed for normal map viewing, not heavy commercial use
3. **No Guaranteed Uptime**: OSM runs on donated resources with no SLA
4. **Respect the Servers**: Automatic throttling may occur for excessive requests
5. **Attribution Required**: Must display "© OpenStreetMap contributors"

### Technical Implementation
```javascript
// Current implementation in SupportMap.tsx
<TileLayer
  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
/>
```

### Alternative Providers (if needed in future)
If OSM usage becomes problematic, alternatives include:
- **Mapbox**: Requires API key, 50,000 free map loads/month
- **Google Maps**: Requires API key, $7 per 1,000 map loads after free tier
- **Stamen/Stadia Maps**: Requires API key, various pricing tiers
- **Thunderforest**: Requires API key, 150,000 free tiles/month

### Related Configuration
- **Map Feature Toggle**: `ENABLE_SUPPORT_MAP="true"` in .env
- **Geolocation Service**: IPinfo.io (optional `IPINFO_TOKEN` for higher limits)
- **Batch Processing**: `GEOLOCATION_BATCH_SIZE="2"` controls IP processing rate

## IP Geolocation Service Details

### IPinfo.io API
The application uses IPinfo.io to convert IP addresses to geographic coordinates.

#### API Endpoints Used
```javascript
// Single IP lookup with token (authenticated)
https://ipinfo.io/${ipAddress}?token=${IPINFO_TOKEN}

// Single IP lookup without token (unauthenticated)
https://ipinfo.io/${ipAddress}/json

// Batch API endpoint (requires token)
https://ipinfo.io/batch?token=${IPINFO_TOKEN}
```

#### Batch API Support
IPinfo.io provides a `/batch` endpoint that allows grouping up to **100 IP lookups** into a single request:

1. **Request Format**:
   ```bash
   # JSON array format
   curl -XPOST --data '["8.8.8.8/country", "8.8.4.4/country"]' "ipinfo.io/batch?token=$TOKEN"
   
   # Newline separated format
   echo -e '8.8.8.8/country\n8.8.4.4/country' | \
   curl -XPOST --data-binary @- "ipinfo.io/batch?token=$TOKEN"
   ```

2. **Response Format**:
   ```json
   {
     "8.8.4.4/country": "US",
     "8.8.8.8/country": "US"
   }
   ```

3. **Batch Limits**:
   - Up to 100 IPs per batch request
   - Each IP in the batch counts as 1 request against quota
   - Can process ~100,000 IPs per minute with parallel batch requests

4. **Optional Parameters**:
   - `filter=1`: Removes URLs with no response from the result

#### Rate Limits
1. **Without API Key (Free)**:
   - 50,000 requests per month
   - Rate limited to ~1,000 requests per day
   - No guaranteed SLA
   - **No batch API access**

2. **With API Key (Free Tier)**:
   - 50,000 requests per month
   - Higher rate limits
   - Basic support
   - **Batch API access enabled**

3. **Paid Plans**:
   - **Basic**: $249/month - 250,000 requests
   - **Standard**: $499/month - 1,000,000 requests
   - **Business**: $999/month - 5,000,000 requests
   - **Enterprise**: Custom pricing for higher volumes

#### Response Format (Single IP)
```json
{
  "ip": "8.8.8.8",
  "city": "Mountain View",
  "region": "California",
  "country": "US",
  "loc": "37.4056,-122.0775",
  "timezone": "America/Los_Angeles"
}
```

#### Current Implementation Details
1. **Rate Limiting**: Built-in 1-second delay between requests to avoid hitting limits
2. **Batch Processing**: Controlled by `GEOLOCATION_BATCH_SIZE` (default: 2)
3. **Caching**: Results stored in database to avoid repeated lookups
4. **Privacy**: Only processes approved comments (for messages)
5. **No Batch API Usage**: Currently uses single IP lookups only

#### Optimization Opportunity
The current implementation processes IPs one at a time with a 1-second delay. By switching to the batch API:
- Could process up to 100 IPs in a single request
- Reduce processing time from 100 seconds to ~1 second for 100 IPs
- Would require an API token (free tier available)
- Would need to modify `GeolocationService` to accumulate IPs and batch process

#### Configuration
```env
# Optional - works without token but with lower limits
# Required for batch API access
IPINFO_TOKEN=your_token_here

# Controls how many IPs to process per batch
# With batch API, this could be increased to 100
GEOLOCATION_BATCH_SIZE=2
```

#### Cost Analysis
For typical usage:
- **Small Site** (<1,000 supporters/month): Free tier sufficient
- **Medium Site** (<5,000 supporters/month): May need free API key for batch processing
- **Large Site** (>5,000 supporters/month): Consider Basic plan ($249/month)

#### Data Processing Flow
1. User submits comment/support → IP address captured
2. IP stored with `processedForLatLon=false`
3. When map is viewed → batch processes unprocessed IPs
4. Converts IP to lat/lon using IPinfo.io
5. Stores results in database
6. Displays pins on map

#### Privacy Considerations
- IP addresses are captured but not displayed to users
- Only approximate city-level location shown
- Admins can see coordinate data for debugging
- Comments must be approved before location processing

### Batch API Capabilities

IPinfo.io offers a batch API endpoint that can process multiple IP addresses in a single request, providing significant performance improvements.

#### Batch API Details
```javascript
// Batch endpoint (requires token)
POST https://ipinfo.io/batch?token=${IPINFO_TOKEN}

// Request body
{
  "ips": ["8.8.8.8", "1.1.1.1", "208.67.222.222", ...]  // up to 100 IPs
}

// Response format
{
  "8.8.8.8": {
    "ip": "8.8.8.8",
    "city": "Mountain View",
    "region": "California",
    "country": "US",
    "loc": "37.4056,-122.0775"
  },
  "1.1.1.1": {
    "ip": "1.1.1.1",
    "city": "Sydney",
    "region": "New South Wales",
    "country": "AU",
    "loc": "-33.8688,151.2093"
  }
}
```

#### Batch API Limits & Benefits
1. **Maximum IPs per request**: 100
2. **Request counting**: Each IP counts as 1 request (100 IPs = 100 requests)
3. **Token required**: Free tier token enables batch API
4. **Performance**: ~100,000 IPs per minute with parallel batching

#### Performance Comparison
| Method | IPs Processed | Time | Requests |
|--------|--------------|------|----------|
| Current (Sequential) | 100 | ~100 seconds | 100 |
| Batch API | 100 | ~1 second | 1 API call (counts as 100) |
| Batch API | 1,000 | ~10 seconds | 10 API calls |

#### Implementation Optimization Opportunity
The current implementation processes IPs sequentially with a 1-second delay. With batch API:
```javascript
// Current approach (100 IPs = 100 seconds)
for (const ip of ips) {
  await rateLimit(1000);  // 1 second delay
  const result = await fetch(`/ipinfo.io/${ip}`);
}

// Optimized batch approach (100 IPs = 1 second)
const chunks = chunk(ips, 100);  // Split into batches of 100
for (const batch of chunks) {
  const results = await fetch('/ipinfo.io/batch', {
    method: 'POST',
    body: JSON.stringify({ ips: batch })
  });
}
```

#### Recommended Configuration Changes
```env
# Increase batch size to leverage batch API
GEOLOCATION_BATCH_SIZE="100"  # Process up to 100 IPs at once

# Required for batch API access
IPINFO_TOKEN="your_token_here"  # Free tier token enables batch endpoint
```

#### Implementation Benefits
1. **User Experience**: Map loads 100x faster for bulk processing
2. **Server Load**: Fewer HTTP requests, less processing time
3. **Rate Limits**: More headroom under daily request limits
4. **Cost Efficiency**: Same cost, dramatically better performance

### Batch API Implementation Recommendation

The current implementation could be significantly optimized by using IPinfo.io's batch API endpoint:

#### Current Implementation
- Processes IPs one at a time
- 1-second delay between each request
- Processing 100 IPs takes ~100 seconds
- Works without API token but limited to 50,000 requests/month

#### Recommended Batch Implementation
1. **Modify `GeolocationService.getLocationFromIP()` to support batch processing**:
   ```typescript
   static async getLocationFromBatch(ipAddresses: string[]): Promise<Map<string, GeolocationData | null>> {
     if (!IPINFO_TOKEN) {
       // Fall back to single IP processing if no token
       return this.processOneByOne(ipAddresses);
     }
     
     const batchData = ipAddresses.map(ip => `${ip}/json`);
     const response = await fetch('https://ipinfo.io/batch?token=' + IPINFO_TOKEN, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify(batchData)
     });
     
     // Process batch response...
   }
   ```

2. **Update `processUnprocessedComments()` and `processUnprocessedSupport()`**:
   - Fetch up to 100 unprocessed records at once
   - Group by IP address (to avoid duplicate lookups)
   - Send batch request to IPinfo.io
   - Update all records with the same IP in one transaction

3. **Benefits**:
   - Process 100 IPs in ~1 second instead of 100 seconds
   - Reduce API calls from 100 to 1 for batch processing
   - Better user experience with faster map loading
   - More efficient use of API quota

4. **Requirements**:
   - Free IPinfo.io account to get API token
   - Update `GEOLOCATION_BATCH_SIZE` to 100 in production
   - Add error handling for batch API failures
   - Implement fallback to single IP processing if batch fails

## Risk Mitigation

1. **API Rate Limits**: Implement queueing and retry logic
2. **Service Downtime**: Cache results, graceful degradation
3. **Performance Issues**: Implement progressive loading
4. **Privacy Concerns**: Clear data usage disclosure
5. **Abuse Prevention**: Rate limit map expansions per IP