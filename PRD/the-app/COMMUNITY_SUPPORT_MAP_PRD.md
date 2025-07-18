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
- **Clustering**: Group nearby pins at low zoom levels
- **Tooltips**: Show city/country on hover
- **Custom Markers**: Blue for messages, purple for support
- **Auto-fit**: Automatically adjust viewport to show all pins
- **Minimum Zoom**: Prevent zooming out too far (empty ocean views)

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
2. **IP Anonymization**: Store only city-level precision (no street addresses)
3. **Data Retention**: Consider purging location data after 90 days
4. **GDPR Compliance**: Update privacy policy to mention geographic processing
5. **Rate Limiting**: Prevent abuse of geolocation API through map spam

### Performance Optimization

1. **Lazy Loading**: Load map library only when expanded
2. **Data Pagination**: Limit to 1000 most recent pins
3. **Clustering**: Use marker clustering for performance with many pins
4. **Caching**: Cache processed coordinates indefinitely
5. **Debouncing**: Prevent rapid expand/collapse cycles

## Implementation Phases

### Phase 1: Database & Backend (Week 1)
- [ ] Add migration for new database columns
- [ ] Implement geolocation service integration
- [ ] Create support-map API endpoint
- [ ] Add batch processing logic

### Phase 2: Map Component (Week 2)
- [ ] Implement React-Leaflet map component
- [ ] Add marker clustering
- [ ] Create custom marker designs
- [ ] Implement viewport auto-fitting

### Phase 3: UI Integration (Week 3)
- [ ] Add expandable map container
- [ ] Implement loading states
- [ ] Add toggle checkboxes
- [ ] Polish animations

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
2. **API Costs**: Budget for geolocation API if free tiers exceeded?
3. **Moderation**: Should inappropriate message locations be hidden?
4. **Retention**: How long to keep location data?
5. **Performance**: Maximum number of pins to display?

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

## Risk Mitigation

1. **API Rate Limits**: Implement queueing and retry logic
2. **Service Downtime**: Cache results, graceful degradation
3. **Performance Issues**: Implement progressive loading
4. **Privacy Concerns**: Clear data usage disclosure
5. **Abuse Prevention**: Rate limit map expansions per IP