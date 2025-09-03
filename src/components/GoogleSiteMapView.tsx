import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin } from 'lucide-react';

interface GoogleSiteMapViewProps {
  lat?: number;
  lng?: number;
  address: string;
  className?: string;
}

export const GoogleSiteMapView: React.FC<GoogleSiteMapViewProps> = ({
  lat,
  lng,
  address,
  className = ''
}) => {
  // Generate high-quality static map using Google Maps Static API
  const generateStaticMap = () => {
    if (!lat || !lng) return null;

    const apiKey = localStorage.getItem('google_maps_api_key');
    if (!apiKey) {
      return (
        <div className="w-full h-64 bg-gradient-to-br from-blue-400 to-green-500 rounded-lg flex items-center justify-center">
          <div className="text-white text-center">
            <MapPin className="h-12 w-12 mx-auto mb-2" />
            <p className="text-lg font-semibold">Site Location</p>
            <p className="text-sm opacity-90">Lat: {lat.toFixed(4)}, Lng: {lng.toFixed(4)}</p>
            <p className="text-xs mt-2 opacity-75">Google Maps API key required for satellite view</p>
          </div>
        </div>
      );
    }

    const zoom = 18;
    const size = '600x400';
    const mapType = 'satellite';
    
    // Create marker for the location
    const marker = `color:red%7Clabel:S%7C${lat},${lng}`;
    
    const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?` +
      `center=${lat},${lng}&` +
      `zoom=${zoom}&` +
      `size=${size}&` +
      `maptype=${mapType}&` +
      `markers=${marker}&` +
      `key=${apiKey}`;

    return (
      <div className="relative w-full h-64 rounded-lg overflow-hidden">
        <img 
          src={staticMapUrl}
          alt={`Satellite view of ${address}`}
          className="w-full h-full object-cover"
          onError={(e) => {
            // Fallback if image fails to load
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            const fallback = target.nextElementSibling as HTMLElement;
            if (fallback) fallback.style.display = 'flex';
          }}
        />
        {/* Fallback content */}
        <div className="hidden w-full h-full bg-gradient-to-br from-blue-400 to-green-500 rounded-lg items-center justify-center">
          <div className="text-white text-center">
            <MapPin className="h-12 w-12 mx-auto mb-2" />
            <p className="text-lg font-semibold">Site Location</p>
            <p className="text-sm opacity-90">Lat: {lat.toFixed(4)}, Lng: {lng.toFixed(4)}</p>
            <p className="text-xs mt-2 opacity-75">Map unavailable</p>
          </div>
        </div>
        
        {/* Overlay with coordinates */}
        <div className="absolute top-2 right-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
          {lat.toFixed(4)}, {lng.toFixed(4)}
        </div>
        
        {/* Center crosshair */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-4 h-4 border-2 border-red-500 bg-red-500 rounded-full opacity-80"></div>
        </div>
      </div>
    );
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <MapPin className="h-5 w-5 text-primary" />
          Site Location
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="text-sm text-muted-foreground">
            <strong>Address:</strong> {address}
          </div>
          {generateStaticMap()}
        </div>
      </CardContent>
    </Card>
  );
};