import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Zap, Network } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-shadow.png',
});

interface DNSPData {
  id: number;
  network: string;
  state: string;
  postcode_start: number;
  postcode_end: number;
  export_cap_kw: number;
}

interface StateCenter {
  lat: number;
  lng: number;
  zoom: number;
}

const STATE_CENTERS: Record<string, StateCenter> = {
  'NSW': { lat: -32.7, lng: 147.0, zoom: 6 },
  'VIC': { lat: -36.5, lng: 144.6, zoom: 6 },
  'QLD': { lat: -22.0, lng: 144.0, zoom: 5 },
  'SA': { lat: -30.0, lng: 136.0, zoom: 6 },
  'WA': { lat: -25.0, lng: 121.0, zoom: 5 },
  'TAS': { lat: -41.5, lng: 146.0, zoom: 7 },
  'NT': { lat: -19.0, lng: 132.0, zoom: 5 },
  'ACT': { lat: -35.3, lng: 149.1, zoom: 10 }
};

export default function NetworkMapVisualization() {
  const [dnspData, setDnspData] = useState<DNSPData[]>([]);
  const [selectedState, setSelectedState] = useState<string>('NSW');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDNSPData = async () => {
      try {
        const { data, error } = await supabase
          .from('dnsps')
          .select('*')
          .order('state')
          .order('network');

        if (!error && data) {
          setDnspData(data);
        }
      } catch (error) {
        console.error('Error fetching DNSP data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDNSPData();
  }, []);

  const stateData = dnspData.filter(d => d.state === selectedState);
  const center = STATE_CENTERS[selectedState] || STATE_CENTERS['NSW'];

  // Calculate rough coordinates for postcode ranges (simplified)
  const getPostcodeCoords = (postcodeStart: number, state: string): [number, number] => {
    const stateCenter = STATE_CENTERS[state];
    const offset = (postcodeStart % 100) / 100;
    return [
      stateCenter.lat + (Math.random() - 0.5) * 2 * offset,
      stateCenter.lng + (Math.random() - 0.5) * 4 * offset
    ];
  };

  if (loading) {
    return (
      <Card className="border-white/20 bg-white/10 backdrop-blur-xl">
        <CardContent className="p-6">
          <div className="h-96 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-white/20 bg-white/10 backdrop-blur-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Network className="w-5 h-5" />
          DNSP Network Visualization
        </CardTitle>
        <div className="flex flex-wrap gap-2">
          {Object.keys(STATE_CENTERS).map(state => (
            <Badge
              key={state}
              variant={selectedState === state ? "default" : "secondary"}
              className="cursor-pointer"
              onClick={() => setSelectedState(state)}
            >
              {state}
            </Badge>
          ))}
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="h-96 rounded-lg overflow-hidden border border-white/20">
          <MapContainer
            center={[center.lat, center.lng]}
            zoom={center.zoom}
            style={{ height: '100%', width: '100%' }}
            key={selectedState} // Force re-render on state change
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            
            {stateData.map((dnsp, index) => {
              const coords = getPostcodeCoords(dnsp.postcode_start, dnsp.state);
              const color = index % 2 === 0 ? '#3b82f6' : '#10b981';
              
              return (
                <Circle
                  key={`${dnsp.id}-${index}`}
                  center={coords}
                  radius={20000} // 20km radius
                  fillColor={color}
                  fillOpacity={0.3}
                  color={color}
                  weight={2}
                >
                  <Popup>
                    <div className="space-y-2">
                      <div className="font-semibold">{dnsp.network}</div>
                      <div className="text-sm">
                        <div>State: {dnsp.state}</div>
                        <div>Postcodes: {dnsp.postcode_start} - {dnsp.postcode_end}</div>
                        <div>Export Cap: {dnsp.export_cap_kw}kW</div>
                      </div>
                    </div>
                  </Popup>
                </Circle>
              );
            })}
          </MapContainer>
        </div>
        
        <div className="mt-4 space-y-2">
          <h4 className="font-medium">Networks in {selectedState}:</h4>
          <div className="flex flex-wrap gap-2">
            {stateData.map((dnsp, index) => (
              <Badge key={dnsp.id} variant="outline" className="bg-white/5 border-white/20">
                <Zap className="w-3 h-3 mr-1" />
                {dnsp.network}: {dnsp.postcode_start}-{dnsp.postcode_end} ({dnsp.export_cap_kw}kW)
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}