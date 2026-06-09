'use client';

import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Loader2 } from 'lucide-react';

// Fix Leaflet marker icon issue in Next.js
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface MapViewProps {
  address: string;
  locality: string;
  city: string;
}

const CITY_CENTERS: Record<string, [number, number]> = {
  'Mumbai': [19.0760, 72.8777],
  'Pune': [18.5204, 73.8567],
  'Bangalore': [12.9716, 77.5946],
  'Delhi': [28.7041, 77.1025],
};

function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 15);
  }, [center, map]);
  return null;
}

export default function MapView({ address, locality, city }: MapViewProps) {
  const fallbackCenter = CITY_CENTERS[city] || [19.076, 72.8777];
  const [position, setPosition] = useState<[number, number]>(fallbackCenter);
  const [loading, setLoading] = useState(true);
  const [displayAddress, setDisplayAddress] = useState(`${locality}, ${city}`);

  useEffect(() => {
    async function geocode() {
      try {
        if (sessionStorage.getItem('nominatim_blocked')) {
          console.warn(`Skipping geocoding for ${locality} because API is rate-limited.`);
          throw new Error('API Rate Limited');
        }

        const query = encodeURIComponent(`${locality}, ${city}`);
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1&email=contact@rentmyway.com`);
        
        if (!res.ok) {
          if (res.status === 429) {
            sessionStorage.setItem('nominatim_blocked', 'true');
          }
          throw new Error(`HTTP Status ${res.status}`);
        }

        const data = await res.json();

        if (data && data.length > 0) {
          setPosition([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
          setDisplayAddress(data[0].display_name || `${locality}, ${city}`);
        }
      } catch (err) {
        // Only log once as a warning, then fail gracefully to the dynamic city center
        console.warn(`Geocoding error, falling back to ${city} city center:`, err);
        setPosition(fallbackCenter);
      } finally {
        setLoading(false);
      }
    }

    if (locality && city) {
      geocode();
    } else {
      setLoading(false);
    }
  }, [locality, city]);

  return (
    <div className="relative h-[300px] w-full rounded-xl overflow-hidden border border-border shadow-inner z-0">
      {loading && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-xs font-medium">Loading Map View...</span>
        </div>
      )}
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
        <Marker position={position}>
          <Popup className="rounded-lg">
            <div className="text-xs font-sans">
              <p className="font-bold text-foreground mb-1">{locality}</p>
              <p className="text-muted-foreground line-clamp-2">{address}</p>
            </div>
          </Popup>
        </Marker>
      </MapContainer>
      <div className="absolute bottom-2 left-2 z-[400] bg-background/90 backdrop-blur border border-border/50 px-3 py-1.5 rounded-lg shadow-md max-w-[80%] flex items-center gap-2 pointer-events-none">
        <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
        <span className="text-xs font-medium text-foreground truncate">{locality}, {city}</span>
      </div>
    </div>
  );
}
