'use client';

import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Loader2, Home, IndianRupee } from 'lucide-react';
import type { Property } from '@/types/database';
import Link from 'next/link';

// Fix Leaflet marker icon issue in Next.js
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom div icon for properties
const createPropertyIcon = (price: number) => {
  return L.divIcon({
    className: 'bg-transparent border-none',
    html: `<div class="bg-primary text-primary-foreground font-bold px-2 py-1 rounded-full shadow-lg border-2 border-white text-xs whitespace-nowrap transform -translate-x-1/2 -translate-y-full hover:scale-110 transition-transform">
      ₹${(price / 1000).toFixed(1)}k
    </div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
};

const CITY_CENTERS: Record<string, [number, number]> = {
  'Mumbai': [19.0760, 72.8777],
  'Pune': [18.5204, 73.8567],
  'Bangalore': [12.9716, 77.5946],
  'Delhi': [28.7041, 77.1025],
};

interface MultiMapViewProps {
  properties: Property[];
  city: string;
}

function ChangeView({ center }: { center: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, 12);
    }
  }, [center, map]);
  return null;
}

function FitBounds({ markers }: { markers: Record<string, [number, number]> }) {
  const map = useMap();
  useEffect(() => {
    const coords = Object.values(markers);
    if (coords.length > 0) {
      const bounds = L.latLngBounds(coords);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [markers, map]);
  return null;
}

export default function MultiMapView({ properties, city }: MultiMapViewProps) {
  const [center, setCenter] = useState<[number, number]>([19.076, 72.8777]); // Default Mumbai
  const [loading, setLoading] = useState(true);
  const [loadingText, setLoadingText] = useState('Initializing map...');
  const [localityCoords, setLocalityCoords] = useState<Record<string, [number, number]>>({});
  const geocodedCache = useRef<Record<string, [number, number]>>({});

  useEffect(() => {
    let isMounted = true;

    async function geocodeCity() {
      const defaultCenter = CITY_CENTERS[city];
      if (defaultCenter) {
        setCenter(defaultCenter);
        return defaultCenter;
      }

      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1&email=contact@rentmyway.com`);
        const data = await res.json();
        if (data && data.length > 0 && isMounted) {
          const coords: [number, number] = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
          setCenter(coords);
          return coords;
        }
      } catch (err) {
        console.error('Failed to geocode city:', err);
      }
      return [19.076, 72.8777] as [number, number];
    }

    async function geocodeProperties(cityCenter: [number, number]) {
      if (properties.length === 0) {
        setLoading(false);
        return;
      }

      setLoadingText('Locating properties...');
      
      const uniqueLocalities = new Set<string>();
      properties.forEach(p => {
        if (p.locality && p.city) {
          uniqueLocalities.add(`${p.locality}, ${p.city}`);
        }
      });

      const localitiesToFetch = Array.from(uniqueLocalities).filter(loc => !geocodedCache.current[loc]);
      const newCoords = { ...geocodedCache.current };

      for (let i = 0; i < localitiesToFetch.length; i++) {
        const loc = localitiesToFetch[i];
        if (!isMounted) break;
        
        // Skip fetch if we know we are blocked to prevent console spam
        if (sessionStorage.getItem('nominatim_blocked')) {
          console.warn(`Skipping geocoding for ${loc} because API is rate-limited.`);
          const fallbackLat = cityCenter[0] + (Math.random() - 0.5) * 0.08;
          const fallbackLon = cityCenter[1] + (Math.random() - 0.5) * 0.08;
          newCoords[loc] = [fallbackLat, fallbackLon];
          geocodedCache.current[loc] = [fallbackLat, fallbackLon];
          continue;
        }

        try {
          setLoadingText(`Locating ${loc.split(',')[0]}...`);
          const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(loc)}&format=json&limit=1&email=contact@rentmyway.com`);
          
          if (!res.ok) {
            if (res.status === 429) {
              sessionStorage.setItem('nominatim_blocked', 'true');
            }
            throw new Error(`HTTP Status ${res.status}`);
          }
          
          const data = await res.json();
          
          if (data && data.length > 0) {
            const lat = parseFloat(data[0].lat) + (Math.random() - 0.5) * 0.005;
            const lon = parseFloat(data[0].lon) + (Math.random() - 0.5) * 0.005;
            newCoords[loc] = [lat, lon];
            geocodedCache.current[loc] = [lat, lon];
          } else {
            throw new Error('No coordinates found');
          }
        } catch (err) {
          console.warn(`Fallback applied for ${loc} due to error:`, err);
          // Scatter markers nicely around the city center as a seamless fallback
          const fallbackLat = cityCenter[0] + (Math.random() - 0.5) * 0.08;
          const fallbackLon = cityCenter[1] + (Math.random() - 0.5) * 0.08;
          newCoords[loc] = [fallbackLat, fallbackLon];
          geocodedCache.current[loc] = [fallbackLat, fallbackLon];
        }
        
        if (i < localitiesToFetch.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1500)); // Be gentler with the API
        }
      }

      if (isMounted) {
        setLocalityCoords(newCoords);
        setLoading(false);
      }
    }

    geocodeCity().then(cityCenter => {
      if (isMounted) {
        geocodeProperties(cityCenter);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [properties, city]);

  return (
    <div className="relative h-full w-full bg-muted/20 z-0">
      {loading && (
        <div className="absolute inset-0 bg-background/60 backdrop-blur-sm z-20 flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-sm font-medium">{loadingText}</span>
        </div>
      )}
      
      <MapContainer 
        center={center} 
        zoom={12} 
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%', zIndex: 10 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        
        <ChangeView center={center} />
        {Object.keys(localityCoords).length > 0 && <FitBounds markers={localityCoords} />}

        {properties.map(property => {
          const locKey = `${property.locality}, ${property.city}`;
          const coords = localityCoords[locKey];
          
          if (!coords) return null;
          
          // Add a tiny deterministic offset based on property ID so markers in exact same locality don't overlap completely
          const hash = property.id.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a }, 0);
          const offsetLat = coords[0] + (hash % 100) * 0.00005;
          const offsetLng = coords[1] + ((hash >> 8) % 100) * 0.00005;

          return (
            <Marker key={property.id} position={[offsetLat, offsetLng]} icon={createPropertyIcon(property.rent)}>
              <Popup className="rounded-xl overflow-hidden p-0 border-none shadow-xl min-w-[200px]">
                <div className="flex flex-col m-0 p-0">
                  <div className="h-24 w-full bg-muted relative">
                    {property.images && property.images.length > 0 ? (
                      <img src={property.images[0]} alt={property.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-primary/10">
                        <Home className="h-8 w-8 text-primary/50" />
                      </div>
                    )}
                    <div className="absolute top-2 right-2 bg-background/90 backdrop-blur px-2 py-1 rounded text-xs font-bold flex items-center">
                      <IndianRupee className="h-3 w-3" />
                      {property.rent.toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div className="p-3">
                    <h4 className="font-bold text-sm line-clamp-1 mb-1">{property.title}</h4>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mb-3">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">{property.locality}</span>
                    </p>
                    <Link href={`/property/${property.id}`} className="block w-full text-center bg-primary text-primary-foreground text-xs font-medium py-1.5 rounded-md hover:bg-primary/90 transition-colors">
                      View Details
                    </Link>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
