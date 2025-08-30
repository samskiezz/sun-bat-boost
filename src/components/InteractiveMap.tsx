import React, { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapPin, Satellite, Navigation, Search, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface InteractiveMapProps {
  lat?: number;
  lng?: number;
  address?: string;
  onLocationSelect?: (lat: number, lng: number, address: string) => void;
  className?: string;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  lat,
  lng,
  address,
  onLocationSelect,
  className = ''
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const [mapboxToken, setMapboxToken] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [mapStyle, setMapStyle] = useState<'satellite' | 'streets'>('satellite');
  const { toast } = useToast();

  // Get Mapbox token from Supabase
  useEffect(() => {
    const getMapboxToken = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('mapbox-token');
        
        if (error || !data?.token) {
          throw new Error('Failed to get Mapbox token');
        }
        
        setMapboxToken(data.token);
      } catch (error) {
        console.error('Mapbox token error:', error);
        toast({
          title: "Map Error",
          description: "Please configure your Mapbox token in Supabase secrets",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    getMapboxToken();
  }, [toast]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: `mapbox://styles/mapbox/${mapStyle === 'satellite' ? 'satellite-v9' : 'streets-v12'}`,
      center: [lng || 151.2093, lat || -33.8688], // Default to Sydney
      zoom: lat && lng ? 18 : 10,
      pitch: 45,
      bearing: 0
    });

    // Add navigation controls
    map.current.addControl(
      new mapboxgl.NavigationControl({
        visualizePitch: true,
      }),
      'top-right'
    );

    // Add geolocate control
    const geolocate = new mapboxgl.GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true
      },
      trackUserLocation: true,
      showUserHeading: true
    });
    map.current.addControl(geolocate, 'top-right');

    // Add fullscreen control
    map.current.addControl(new mapboxgl.FullscreenControl(), 'top-right');

    // Add initial marker if coordinates provided
    if (lat && lng) {
      addMarker(lat, lng);
    }

    // Click to select location
    map.current.on('click', async (e) => {
      const { lat: clickLat, lng: clickLng } = e.lngLat;
      
      // Reverse geocode to get address
      try {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${clickLng},${clickLat}.json?access_token=${mapboxToken}`
        );
        const data = await response.json();
        const clickAddress = data.features?.[0]?.place_name || `${clickLat.toFixed(5)}, ${clickLng.toFixed(5)}`;
        
        addMarker(clickLat, clickLng);
        onLocationSelect?.(clickLat, clickLng, clickAddress);
        
        toast({
          title: "Location Selected",
          description: clickAddress
        });
      } catch (error) {
        console.error('Reverse geocoding failed:', error);
        addMarker(clickLat, clickLng);
        onLocationSelect?.(clickLat, clickLng, `${clickLat.toFixed(5)}, ${clickLng.toFixed(5)}`);
      }
    });

    // Clean up on unmount
    return () => {
      map.current?.remove();
    };
  }, [mapboxToken, lat, lng, mapStyle, onLocationSelect, toast]);

  const addMarker = useCallback((latitude: number, longitude: number) => {
    if (!map.current) return;

    // Remove existing marker
    if (marker.current) {
      marker.current.remove();
    }

    // Create custom marker element
    const el = document.createElement('div');
    el.innerHTML = `
      <div style="
        background: #ff6b35;
        width: 30px;
        height: 30px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid #fff;
        box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          color: white;
          transform: rotate(45deg);
          font-weight: bold;
          font-size: 12px;
        ">📍</div>
      </div>
    `;

    // Add new marker
    marker.current = new mapboxgl.Marker(el)
      .setLngLat([longitude, latitude])
      .addTo(map.current);

    // Fly to location
    map.current.flyTo({
      center: [longitude, latitude],
      zoom: 18,
      pitch: 60,
      bearing: 20
    });
  }, []);

  const searchAddress = useCallback(async () => {
    if (!searchQuery || !mapboxToken) return;

    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?country=AU&access_token=${mapboxToken}`
      );
      const data = await response.json();
      
      if (data.features?.length > 0) {
        const [lng, lat] = data.features[0].center;
        const foundAddress = data.features[0].place_name;
        
        addMarker(lat, lng);
        onLocationSelect?.(lat, lng, foundAddress);
        
        toast({
          title: "Address Found",
          description: foundAddress
        });
      } else {
        toast({
          title: "Address Not Found",
          description: "Please try a different search term",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      toast({
        title: "Search Error",
        description: "Failed to search address",
        variant: "destructive"
      });
    }
  }, [searchQuery, mapboxToken, addMarker, onLocationSelect, toast]);

  if (isLoading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="flex items-center justify-center h-48">
          <div className="text-center">
            <Navigation className="w-8 h-8 mx-auto mb-2 animate-spin" />
            <p className="text-sm text-muted-foreground">Loading map...</p>
          </div>
        </div>
      </Card>
    );
  }

  if (!mapboxToken) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="flex items-center justify-center h-48">
          <div className="text-center">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-destructive" />
            <p className="text-sm text-muted-foreground mb-2">Map service unavailable</p>
            <p className="text-xs text-muted-foreground">Please configure Mapbox token</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`overflow-hidden ${className}`}>
      {/* Map Controls Header */}
      <div className="p-4 border-b bg-card/50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            <h3 className="font-medium">Interactive Site Map</h3>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant={mapStyle === 'streets' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMapStyle('streets')}
            >
              Streets
            </Button>
            <Button
              variant={mapStyle === 'satellite' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMapStyle('satellite')}
            >
              <Satellite className="w-3 h-3 mr-1" />
              Satellite
            </Button>
          </div>
        </div>
        
        {/* Address Search */}
        <div className="flex gap-2">
          <Input
            placeholder="Search address in Australia..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && searchAddress()}
            className="flex-1"
          />
          <Button onClick={searchAddress} size="sm">
            <Search className="w-4 h-4" />
          </Button>
        </div>
        
        {address && (
          <div className="mt-2 flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              Selected: {address}
            </Badge>
          </div>
        )}
      </div>
      
      {/* Map Container */}
      <div className="relative">
        <div 
          ref={mapContainer} 
          className="w-full h-80"
          style={{ minHeight: '320px' }}
        />
        
        {/* Click Instructions Overlay */}
        <div className="absolute bottom-4 left-4 bg-black/70 text-white text-xs px-3 py-2 rounded-lg">
          Click anywhere on the map to select location
        </div>
        
        {/* Coordinates Display */}
        {lat && lng && (
          <div className="absolute bottom-4 right-4 bg-black/70 text-white text-xs px-3 py-2 rounded-lg">
            {lat.toFixed(5)}, {lng.toFixed(5)}
          </div>
        )}
      </div>
    </Card>
  );
};

export default InteractiveMap;