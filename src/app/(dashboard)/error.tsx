'use client';

import { useEffect } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center space-y-6 animate-fade-in">
      <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
        <AlertCircle className="h-8 w-8 text-destructive" />
      </div>
      <div className="space-y-2 max-w-md">
        <h2 className="text-xl font-semibold">Something went wrong</h2>
        <p className="text-sm text-muted-foreground">
          {error.message || 'An unexpected error occurred while loading this page. Please try again.'}
        </p>
      </div>
      <Button onClick={reset} variant="outline" className="gap-2">
        <RefreshCw className="h-4 w-4" />
        Try Again
      </Button>
    </div>
  );
}
