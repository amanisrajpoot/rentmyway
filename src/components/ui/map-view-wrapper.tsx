'use client';

import dynamic from 'next/dynamic';

const MapView = dynamic(() => import('@/components/ui/map-view'), {
  ssr: false,
  loading: () => (
    <div className="h-[300px] w-full bg-muted animate-pulse rounded-xl flex items-center justify-center text-muted-foreground text-sm border border-border shadow-inner">
      Loading Map View...
    </div>
  ),
});

interface MapViewWrapperProps {
  address: string;
  locality: string;
  city: string;
}

export default function MapViewWrapper(props: MapViewWrapperProps) {
  return <MapView {...props} />;
}
