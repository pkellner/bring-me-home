'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers
interface IconDefault extends L.Icon.Default {
  _getIconUrl?: string;
}
delete (L.Icon.Default.prototype as IconDefault)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/leaflet/marker-icon-2x.png',
  iconUrl: '/leaflet/marker-icon.png',
  shadowUrl: '/leaflet/marker-shadow.png',
});

// Dynamic imports to avoid SSR issues
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);


interface Location {
  id: string;
  latitude: number;
  longitude: number;
  city?: string | null;
  country?: string | null;
  createdAt: string;
}

// Component to track map movements (only works inside MapContainer)
const MapEventTracker = dynamic(
  () => import('react-leaflet').then((mod) => {
    const Component = ({ onViewChange }: { onViewChange: (view: { center: number[], zoom: number }) => void }) => {
      const map = mod.useMapEvents({
        moveend: () => {
          const center = map.getCenter();
          const zoom = map.getZoom();
          onViewChange({ center: [center.lat, center.lng], zoom });
        },
        zoomend: () => {
          const center = map.getCenter();
          const zoom = map.getZoom();
          onViewChange({ center: [center.lat, center.lng], zoom });
        },
      });
      return null;
    };
    return Component;
  }),
  { ssr: false }
);

interface SupportMapProps {
  personId: string;
  showMessages: boolean;
  showSupport: boolean;
  isAdmin?: boolean;
  onDataLoaded?: (messageCount: number, supportCount: number) => void;
}

export default function SupportMap({ 
  personId, 
  showMessages, 
  showSupport,
  isAdmin = false,
  onDataLoaded 
}: SupportMapProps) {
  const [loading, setLoading] = useState(true);
  const [messageLocations, setMessageLocations] = useState<Location[]>([]);
  const [supportLocations, setSupportLocations] = useState<Location[]>([]);
  const [bounds, setBounds] = useState<L.LatLngBounds | null>(null);
  const [currentView, setCurrentView] = useState({ center: [39.8283, -98.5795], zoom: 4 });

  useEffect(() => {
    fetchMapData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personId]);

  useEffect(() => {
    calculateBounds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messageLocations, supportLocations, showMessages, showSupport]);

  const fetchMapData = async () => {
    const startTime = Date.now();
    
    try {
      // Create a minimum 1 second delay promise
      const minimumDelay = new Promise(resolve => setTimeout(resolve, 1000));
      
      // Fetch data promise
      const fetchDataPromise = fetch(`/api/persons/${personId}/support-map`).then(response => response.json());
      
      // Wait for both the minimum delay and the data fetch to complete
      const [, data] = await Promise.all([minimumDelay, fetchDataPromise]);
      
      setMessageLocations(data.locations.messages);
      setSupportLocations(data.locations.support);
      
      if (onDataLoaded) {
        onDataLoaded(data.locations.messages.length, data.locations.support.length);
      }
      
      // Always stop loading after first fetch - no polling
      setLoading(false);
    } catch (error) {
      console.error('Error fetching map data:', error);
      // Still respect minimum delay on error
      const elapsedTime = Date.now() - startTime;
      if (elapsedTime < 1000) {
        await new Promise(resolve => setTimeout(resolve, 1000 - elapsedTime));
      }
      setLoading(false);
    }
  };

  const calculateBounds = () => {
    const allLocations = [
      ...(showMessages ? messageLocations : []),
      ...(showSupport ? supportLocations : [])
    ];

    // If no checkboxes are selected or no locations to show
    if (allLocations.length === 0) {
      // Check if we have any locations at all
      const hasAnyLocations = messageLocations.length > 0 || supportLocations.length > 0;
      
      if (hasAnyLocations) {
        // We have locations but no checkboxes selected - calculate bounds from all locations
        const allAvailableLocations = [...messageLocations, ...supportLocations];
        const latlngs = allAvailableLocations.map(loc => L.latLng(loc.latitude, loc.longitude));
        const newBounds = L.latLngBounds(latlngs);
        
        console.log('No checkboxes selected, showing bounds for all available locations:', {
          totalAvailable: allAvailableLocations.length,
          bounds: {
            north: newBounds.getNorth(),
            south: newBounds.getSouth(),
            east: newBounds.getEast(),
            west: newBounds.getWest()
          }
        });
        
        setBounds(newBounds.pad(0.1));
      } else {
        console.log('No locations available, bounds set to null');
        setBounds(null);
      }
      return;
    }

    const latlngs = allLocations.map(loc => L.latLng(loc.latitude, loc.longitude));
    const newBounds = L.latLngBounds(latlngs);
    
    console.log('Calculated bounds for selected locations:', {
      locationCount: allLocations.length,
      bounds: {
        north: newBounds.getNorth(),
        south: newBounds.getSouth(),
        east: newBounds.getEast(),
        west: newBounds.getWest()
      }
    });
    
    // Add some padding
    setBounds(newBounds.pad(0.1));
  };


  // Group locations by coordinates
  const groupLocationsByCoordinates = (locations: Location[], type: 'message' | 'support') => {
    const grouped: Map<string, { locations: Location[], type: string }> = new Map();
    
    locations.forEach(location => {
      const key = `${location.latitude.toFixed(4)},${location.longitude.toFixed(4)}`;
      if (!grouped.has(key)) {
        grouped.set(key, { locations: [], type });
      }
      grouped.get(key)!.locations.push(location);
    });
    
    return grouped;
  };

  const messageGroups = showMessages ? groupLocationsByCoordinates(messageLocations, 'message') : new Map();
  const supportGroups = showSupport ? groupLocationsByCoordinates(supportLocations, 'support') : new Map();
  
  // Merge all groups
  const allGroups: Map<string, { messages: Location[], support: Location[] }> = new Map();
  
  messageGroups.forEach((value, key) => {
    allGroups.set(key, { messages: value.locations, support: [] });
  });
  
  supportGroups.forEach((value, key) => {
    if (allGroups.has(key)) {
      allGroups.get(key)!.support = value.locations;
    } else {
      allGroups.set(key, { messages: [], support: value.locations });
    }
  });

  const createGroupedIcon = (messageCount: number, supportCount: number) => {
    const total = messageCount + supportCount;
    const hasMessages = messageCount > 0;
    const hasSupport = supportCount > 0;
    
    // Determine size based on total count
    let size = 24; // Single item
    if (total === 2) size = 32;
    else if (total >= 3) size = 40;
    
    // Determine color - blue for messages only, purple for support only, blend for both
    let bgColor = '#3B82F6'; // Default blue
    if (hasMessages && hasSupport) {
      bgColor = '#6752F6'; // Halfway between blue (#3B82F6) and purple (#8B5CF6)
    } else if (hasSupport && !hasMessages) {
      bgColor = '#8B5CF6'; // Purple
    }
    
    const showNumber = total > 1;
    
    return L.divIcon({
      html: `<div style="
        background-color: ${bgColor}; 
        width: ${size}px; 
        height: ${size}px; 
        border-radius: 50%; 
        border: 2px solid white; 
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        color: white;
        font-size: ${size === 24 ? '12px' : size === 32 ? '14px' : '16px'};
      ">${showNumber ? total : ''}</div>`,
      className: 'custom-marker',
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2]
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Processing locations...</p>
        </div>
      </div>
    );
  }

  const allLocations = [
    ...(showMessages ? messageLocations : []),
    ...(showSupport ? supportLocations : [])
  ];
  
  const hasAnyLocations = messageLocations.length > 0 || supportLocations.length > 0;

  // For US view when no pins
  const usCenter: [number, number] = [39.8283, -98.5795]; // Geographic center of US
  const usZoom = 4; // Shows full continental US
  
  const defaultCenter: [number, number] = bounds 
    ? [bounds.getCenter().lat, bounds.getCenter().lng]
    : usCenter;
    
  const defaultZoom = bounds ? 10 : usZoom;
  
  // Log the starting position and zoom
  if (bounds) {
    console.log('Map auto-bounded to show all pins:', {
      locationCount: allLocations.length,
      bounds: {
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest()
      }
    });
  } else {
    console.log('Map showing default US view (no pins):', {
      center: defaultCenter,
      zoom: defaultZoom
    });
  }

  // If no geolocated data is available yet, show a message
  if (!hasAnyLocations && !loading) {
    return (
      <div>
        <div className="h-[400px] w-full rounded-lg overflow-hidden shadow-lg bg-gray-50 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto p-8">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Location Data Processing</h3>
            <p className="text-gray-600">
              We&apos;re working on mapping the locations of supporters. Check back soon to see where support is coming from around the world.
            </p>
          </div>
        </div>
        
        {/* Zoom instructions */}
        <div className="mt-2 text-xs text-gray-500 text-center">
          Location data will appear here once processed
        </div>
        
        {/* Admin coordinate display */}
        {isAdmin && (
          <div className="mt-2 p-3 bg-gray-100 rounded text-sm">
            <div className="text-gray-600">No location data available yet</div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="h-[400px] w-full rounded-lg overflow-hidden shadow-lg">
        <MapContainer
        center={bounds ? undefined : defaultCenter}
        zoom={bounds ? undefined : defaultZoom}
        className="h-full w-full"
        bounds={bounds || undefined}
        boundsOptions={{ padding: [50, 50] }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Map event tracker for admin view */}
        {isAdmin && typeof window !== 'undefined' && (
          <MapEventTracker onViewChange={setCurrentView} />
        )}
        
        {Array.from(allGroups.entries()).map(([key, group]) => {
          const [lat, lon] = key.split(',').map(Number);
          const messageCount = group.messages.length;
          const supportCount = group.support.length;
          const total = messageCount + supportCount;
          
          // Get location info from first item
          const firstLocation = group.messages[0] || group.support[0];
          
          return (
            <Marker
              key={key}
              position={[lat, lon]}
              icon={createGroupedIcon(messageCount, supportCount)}
            >
              <Popup>
                <div className="text-sm">
                  <p className="font-semibold">
                    {messageCount > 0 && supportCount > 0 ? (
                      <span style={{ color: '#6752F6' }}>{total} Total Actions</span>
                    ) : messageCount > 0 ? (
                      <span className="text-blue-600">{messageCount} Message{messageCount > 1 ? 's' : ''}</span>
                    ) : (
                      <span className="text-purple-600">{supportCount} Support Click{supportCount > 1 ? 's' : ''}</span>
                    )}
                  </p>
                  {firstLocation.city && firstLocation.country && (
                    <p>{firstLocation.city}, {firstLocation.country}</p>
                  )}
                  {messageCount > 0 && supportCount > 0 && (
                    <div className="mt-1 text-xs">
                      <p className="text-blue-600">{messageCount} message{messageCount > 1 ? 's' : ''}</p>
                      <p className="text-purple-600">{supportCount} support click{supportCount > 1 ? 's' : ''}</p>
                    </div>
                  )}
                  {total === 1 && (
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(firstLocation.createdAt).toLocaleDateString()}
                    </p>
                  )}
                  {total > 1 && (
                    <p className="text-xs text-gray-500 mt-1">
                      Multiple dates
                    </p>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
        </MapContainer>
      </div>
      
      {/* Zoom instructions */}
      <div className="mt-2 text-xs text-gray-500 text-center">
        Use Ctrl + scroll (Windows/Linux) or Cmd + scroll (Mac) to zoom • Click and drag to pan
      </div>
      
      {/* Admin coordinate display */}
      {isAdmin && (
        <div className="mt-2 p-3 bg-gray-100 rounded text-sm">
          <div className="flex items-center justify-between">
            <div className="font-mono">
              <div className="text-gray-600 mb-1">Current Map View (for env config):</div>
              <div className="select-all bg-white p-2 rounded border border-gray-300">
                center: [{currentView.center[0].toFixed(4)}, {currentView.center[1].toFixed(4)}], zoom: {currentView.zoom}
              </div>
            </div>
            <button
              onClick={() => {
                const config = `center: [${currentView.center[0].toFixed(4)}, ${currentView.center[1].toFixed(4)}], zoom: ${currentView.zoom}`;
                alert(config);
              }}
              className="ml-4 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
            >
              Copy Config
            </button>
          </div>
        </div>
      )}
    </div>
  );
}