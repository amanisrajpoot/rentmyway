'use client';

import dynamic from 'next/dynamic';
import type { Property } from '@/types/database';

const MultiMapView = dynamic(() => import('@/components/ui/multi-map-view'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-muted animate-pulse flex items-center justify-center text-muted-foreground text-sm">
      Loading Map...
    </div>
  ),
});

interface MultiMapViewWrapperProps {
  properties: Property[];
  city: string;
}

export default function MultiMapViewWrapper(props: MultiMapViewWrapperProps) {
  return <MultiMapView {...props} />;
}
