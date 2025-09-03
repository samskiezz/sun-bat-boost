import React, { useRef, useEffect, useState } from 'react';
import { useGoogleMapsLoader } from '@/hooks/useGoogleMapsLoader';
import { GoogleMapsApiKeyInput } from '@/components/GoogleMapsApiKeyInput';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MapPin, Search, Satellite, Map as MapIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface InteractiveMapProps {
  lat?: number;
  lng?: number;
  onLocationSelect?: (location: { lat: number; lng: number; address?: string }) => void;
  className?: string;
}

export function GoogleInteractiveMap({ 
  lat = -33.8688, 
  lng = 151.2093, 
  onLocationSelect, 
  className = "h-96 w-full rounded-lg border" 
}: InteractiveMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const marker = useRef<google.maps.Marker | null>(null);
  const geocoder = useRef<google.maps.Geocoder | null>(null);
  
  const [apiKey, setApiKey] = useState<string | null>(() => 
    localStorage.getItem('google_maps_api_key')
  );
  const [showApiKeyInput, setShowApiKeyInput] = useState(!apiKey);
  const [mapStyle, setMapStyle] = useState<'satellite' | 'roadmap'>('satellite');
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  const { isLoaded, loadError } = useGoogleMapsLoader({ 
    apiKey: apiKey || '',
    libraries: ['places', 'geometry']
  });

  // Initialize map
  useEffect(() => {
    if (!isLoaded || !mapContainer.current || !apiKey) return;

    map.current = new google.maps.Map(mapContainer.current, {
      center: { lat, lng },
      zoom: 18,
      mapTypeId: mapStyle === 'satellite' ? google.maps.MapTypeId.SATELLITE : google.maps.MapTypeId.ROADMAP,
      disableDefaultUI: false,
      zoomControl: true,
      mapTypeControl: true,
      scaleControl: true,
      streetViewControl: true,
      rotateControl: true,
      fullscreenControl: true,
    });

    geocoder.current = new google.maps.Geocoder();

    // Add click listener for location selection
    const clickListener = map.current.addListener('click', async (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        const clickLat = e.latLng.lat();
        const clickLng = e.latLng.lng();
        
        // Reverse geocoding to get address
        try {
          const response = await geocoder.current!.geocode({
            location: { lat: clickLat, lng: clickLng }
          });
          
          if (response.results[0]) {
            const address = response.results[0].formatted_address;
            addMarker(clickLat, clickLng, address);
            onLocationSelect?.({ lat: clickLat, lng: clickLng, address });
          }
        } catch (error) {
          console.error('Geocoding failed:', error);
          addMarker(clickLat, clickLng);
          onLocationSelect?.({ lat: clickLat, lng: clickLng });
        }
      }
    });

    return () => {
      google.maps.event.removeListener(clickListener);
    };
  }, [isLoaded, apiKey, lat, lng, mapStyle, onLocationSelect]);

  // Update marker when coordinates change
  useEffect(() => {
    if (map.current && isLoaded && lat && lng) {
      addMarker(lat, lng);
      map.current.setCenter({ lat, lng });
    }
  }, [lat, lng, isLoaded]);

  const addMarker = (latitude: number, longitude: number, address?: string) => {
    if (!map.current) return;

    // Remove existing marker
    if (marker.current) {
      marker.current.setMap(null);
    }

    // Add new marker
    marker.current = new google.maps.Marker({
      position: { lat: latitude, lng: longitude },
      map: map.current,
      title: address || `Location: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
      icon: {
        path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
        scale: 6,
        fillColor: '#ef4444',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2
      }
    });

    if (address) {
      const infoWindow = new google.maps.InfoWindow({
        content: `<div class="p-2"><strong>Selected Location</strong><br/>${address}</div>`
      });
      
      marker.current.addListener('click', () => {
        infoWindow.open(map.current, marker.current);
      });
    }
  };

  // Search functionality
  useEffect(() => {
    if (!searchQuery || !isLoaded || !geocoder.current) return;

    const timeoutId = setTimeout(async () => {
      try {
        const response = await geocoder.current!.geocode({
          address: searchQuery,
          componentRestrictions: { country: 'AU' }
        });

        if (response.results[0]) {
          const result = response.results[0];
          const location = result.geometry.location;
          const newLat = location.lat();
          const newLng = location.lng();

          if (map.current) {
            map.current.setCenter({ lat: newLat, lng: newLng });
            map.current.setZoom(16);
            addMarker(newLat, newLng, result.formatted_address);
            onLocationSelect?.({ 
              lat: newLat, 
              lng: newLng, 
              address: result.formatted_address 
            });
          }
        } else {
          toast({
            title: "Location not found",
            description: "Please try a different search term",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error('Search failed:', error);
        toast({
          title: "Search failed",
          description: "Unable to search for location",
          variant: "destructive"
        });
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, isLoaded, onLocationSelect, toast]);

  const toggleMapStyle = () => {
    const newStyle = mapStyle === 'satellite' ? 'roadmap' : 'satellite';
    setMapStyle(newStyle);
    if (map.current) {
      map.current.setMapTypeId(
        newStyle === 'satellite' ? google.maps.MapTypeId.SATELLITE : google.maps.MapTypeId.ROADMAP
      );
    }
  };

  const handleApiKeySubmit = (newApiKey: string) => {
    setApiKey(newApiKey);
    setShowApiKeyInput(false);
  };

  if (showApiKeyInput || !apiKey) {
    return (
      <div className={className}>
        <GoogleMapsApiKeyInput onApiKeySubmit={handleApiKeySubmit} />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className={`${className} flex items-center justify-center bg-muted rounded-lg border-2 border-dashed border-muted-foreground/20`}>
        <div className="text-center p-6">
          <div className="text-destructive mb-2">⚠️ Google Maps Error</div>
          <div className="text-sm text-muted-foreground mb-4">{loadError}</div>
          <Button onClick={() => setShowApiKeyInput(true)} size="sm">
            Update API Key
          </Button>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className={`${className} flex items-center justify-center bg-gray-100 rounded-lg`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <div className="text-sm text-gray-600">Loading Google Maps...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search locations in Australia..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant="outline"
          onClick={toggleMapStyle}
          className="flex items-center gap-2"
        >
          {mapStyle === 'satellite' ? <MapIcon className="h-4 w-4" /> : <Satellite className="h-4 w-4" />}
          {mapStyle === 'satellite' ? 'Map' : 'Satellite'}
        </Button>
      </div>

      {/* Map */}
      <div className="relative">
        <div ref={mapContainer} className={className} />
        <div className="absolute top-2 left-2 z-10">
          <Badge variant="secondary" className="text-xs">
            <MapPin className="h-3 w-3 mr-1" />
            Click to select location
          </Badge>
        </div>
      </div>
    </div>
  );
}