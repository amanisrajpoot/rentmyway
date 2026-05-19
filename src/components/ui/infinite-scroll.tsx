'use client';

import { useEffect } from 'react';
import { useInView } from 'react-intersection-observer';
import { Loader2 } from 'lucide-react';

interface InfiniteScrollProps {
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
  loadingText?: string;
  endText?: string;
}

export function InfiniteScroll({
  hasMore,
  isLoading,
  onLoadMore,
  loadingText = 'Loading more items...',
  endText = 'No more items to load',
}: InfiniteScrollProps) {
  const { ref, inView } = useInView({
    rootMargin: '100px', // Trigger slightly before it comes into view
  });

  useEffect(() => {
    if (inView && hasMore && !isLoading) {
      onLoadMore();
    }
  }, [inView, hasMore, isLoading, onLoadMore]);

  if (!hasMore) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        {endText}
      </div>
    );
  }

  return (
    <div ref={ref} className="py-8 flex flex-col items-center justify-center gap-2 text-muted-foreground">
      {isLoading && (
        <>
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">{loadingText}</span>
        </>
      )}
    </div>
  );
}
