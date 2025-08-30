import React, { useEffect, useRef } from 'react';
import { MapPin, Satellite } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface SiteMapViewProps {
  lat?: number;
  lng?: number;
  address: string;
  className?: string;
}

export const SiteMapView: React.FC<SiteMapViewProps> = ({
  lat,
  lng,
  address,
  className = ''
}) => {
  const mapRef = useRef<HTMLDivElement>(null);

  // Mock satellite view - in production this would use Google Maps or similar
  const generateSatelliteView = () => {
    if (!lat || !lng) return null;

    const zoom = 18;
    const tileSize = 400;
    
    // Generate a mock satellite image URL (in production, use real mapping service)
    const mockSatelliteUrl = `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/pin-l-solar+ff6b35(${lng},${lat})/${lng},${lat},${zoom}/${tileSize}x${tileSize}@2x?access_token=pk.eyJ1IjoiZXhhbXBsZSIsImEiOiJjazk5eWN1cHAwMDBuM29taDg3OXZ2ZTBmIn0.example`;
    
    return (
      <div className="relative overflow-hidden rounded-lg">
        <div 
          className="w-full h-48 bg-gradient-to-br from-green-400 via-green-500 to-green-600 relative"
          style={{
            backgroundImage: `
              radial-gradient(circle at 30% 20%, rgba(255,255,255,0.2) 1px, transparent 1px),
              radial-gradient(circle at 70% 60%, rgba(255,255,255,0.15) 2px, transparent 2px),
              radial-gradient(circle at 20% 80%, rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(45deg, #22c55e 25%, transparent 25%),
              linear-gradient(-45deg, #16a34a 25%, transparent 25%),
              linear-gradient(45deg, transparent 75%, #22c55e 75%),
              linear-gradient(-45deg, transparent 75%, #16a34a 75%)
            `,
            backgroundSize: '30px 30px, 50px 50px, 40px 40px, 60px 60px, 60px 60px, 60px 60px, 60px 60px'
          }}
        >
          {/* Mock buildings/structures */}
          <div className="absolute inset-0">
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              {/* Main house */}
              <div className="w-16 h-12 bg-gray-600 rounded shadow-lg relative">
                <div className="w-12 h-8 bg-gray-700 absolute top-1 left-2 rounded"></div>
                <div className="w-2 h-2 bg-red-500 absolute top-2 right-2 rounded"></div>
              </div>
              
              {/* Roof highlight */}
              <div className="absolute top-0 left-2 w-12 h-8 bg-gradient-to-br from-orange-400 to-orange-600 rounded opacity-80">
                <div className="absolute inset-1 grid grid-cols-3 gap-0.5">
                  {Array.from({ length: 6 }, (_, i) => (
                    <div key={i} className="bg-blue-900/60 rounded-sm"></div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Trees */}
            <div className="absolute top-4 left-8 w-4 h-6 bg-green-700 rounded-full"></div>
            <div className="absolute bottom-6 right-12 w-3 h-5 bg-green-800 rounded-full"></div>
            
            {/* Roads */}
            <div className="absolute bottom-0 left-0 right-0 h-4 bg-gray-400"></div>
            <div className="absolute top-0 bottom-0 right-0 w-4 bg-gray-400"></div>
            
            {/* Location pin */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 translate-y-2">
              <MapPin className="w-6 h-6 text-red-500 drop-shadow-lg" fill="currentColor" />
            </div>
          </div>
        </div>
        
        {/* Map controls overlay */}
        <div className="absolute top-2 right-2 space-y-1">
          <Badge variant="secondary" className="text-xs">
            <Satellite className="w-3 h-3 mr-1" />
            Satellite
          </Badge>
        </div>
        
        {/* Coordinates overlay */}
        <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
          {lat?.toFixed(5)}, {lng?.toFixed(5)}
        </div>
      </div>
    );
  };

  return (
    <Card className={`p-4 ${className}`}>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" />
          <h4 className="font-medium">Site Location</h4>
        </div>
        
        <div className="text-sm text-muted-foreground">
          {address}
        </div>
        
        {lat && lng ? (
          generateSatelliteView()
        ) : (
          <div className="w-full h-48 bg-muted/20 rounded-lg flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <Satellite className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <div className="text-sm">Enter address to view site map</div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};