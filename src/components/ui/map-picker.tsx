'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, MapPin, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// Fix Leaflet marker icon issue in Next.js
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface MapPickerProps {
  onLocationSelect: (data: {
    lat: number;
    lng: number;
    address: string;
    locality: string;
    city: string;
    state: string;
    pincode: string;
  }) => void;
  initialLocation?: { lat: number; lng: number };
}

// Component to handle map center updates
function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 15);
  }, [center, map]);
  return null;
}

export default function MapPicker({ onLocationSelect, initialLocation }: MapPickerProps) {
  const [position, setPosition] = useState<[number, number]>(
    initialLocation ? [initialLocation.lat, initialLocation.lng] : [19.076, 72.8777] // Default Mumbai
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);

  // Reverse Geocoding
  const fetchAddress = useCallback(async (lat: number, lng: number) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
      const data = await res.json();
      
      if (data && data.address) {
        const addr = data.address;
        onLocationSelect({
          lat,
          lng,
          address: data.display_name,
          locality: addr.suburb || addr.neighbourhood || addr.subdistrict || addr.road || '',
          city: addr.city || addr.town || addr.village || '',
          state: addr.state || '',
          pincode: addr.postcode || '',
        });
      }
    } catch (error) {
      console.error('Reverse geocoding failed', error);
    }
  }, [onLocationSelect]);

  // Handle manual pin movement
  const LocationMarker = () => {
    useMapEvents({
      click(e) {
        const newPos: [number, number] = [e.latlng.lat, e.latlng.lng];
        setPosition(newPos);
        fetchAddress(e.latlng.lat, e.latlng.lng);
      },
    });

    return (
      <Marker 
        position={position} 
        draggable={true}
        eventHandlers={{
          dragend: (e) => {
            const marker = e.target;
            const newPos = marker.getLatLng();
            setPosition([newPos.lat, newPos.lng]);
            fetchAddress(newPos.lat, newPos.lng);
          },
        }}
      />
    );
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=1`);
      const data = await res.json();

      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        const newPos: [number, number] = [parseFloat(lat), parseFloat(lon)];
        setPosition(newPos);
        fetchAddress(parseFloat(lat), parseFloat(lon));
      } else {
        toast.error('Location not found');
      }
    } catch (error) {
      toast.error('Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported');
      return;
    }

    setIsDetecting(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newPos: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setPosition(newPos);
        fetchAddress(pos.coords.latitude, pos.coords.longitude);
        setIsDetecting(false);
      },
      () => {
        toast.error('Location access denied');
        setIsDetecting(false);
      }
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSearch(new Event('submit') as any);
                }
              }}
              placeholder="Search locality, building, or city..."
              className="pl-10 bg-background/50"
            />
          </div>
          <Button 
            type="button" 
            size="sm" 
            disabled={isSearching}
            onClick={() => handleSearch(new Event('submit') as any)}
          >
            {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
          </Button>
        </div>
        <Button 
          type="button" 
          variant="outline" 
          size="sm" 
          onClick={handleDetectLocation}
          disabled={isDetecting}
        >
          {isDetecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
        </Button>
      </div>

      <div className="h-[300px] w-full rounded-xl overflow-hidden border border-border shadow-inner relative z-0">
        <MapContainer 
          center={position} 
          zoom={15} 
          scrollWheelZoom={false}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ChangeView center={position} />
          <LocationMarker />
        </MapContainer>
      </div>
      
      <p className="text-[10px] text-muted-foreground italic text-center">
        * Drag the pin to adjust building location. Click anywhere on the map to jump.
      </p>
    </div>
  );
}
