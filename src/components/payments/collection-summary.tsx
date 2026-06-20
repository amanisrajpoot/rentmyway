'use client';

import { useState, useEffect } from 'react';
import { getMonthlyCollectionSummary } from '@/lib/actions/payments';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Loader2, IndianRupee } from 'lucide-react';

export function CollectionSummary() {
  const [data, setData] = useState<{ month: string; amount: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await getMonthlyCollectionSummary();
        if (res.data) setData(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <Card className="border-border/50">
        <CardContent className="py-10 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary/50" />
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) return null;

  const maxAmount = Math.max(...data.map(d => d.amount), 1);

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Last 6 Months Collections
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-2 h-32 mt-4">
          {data.map((item, i) => {
            const height = `${(item.amount / maxAmount) * 100}%`;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                <div className="relative w-full flex-1 flex items-end bg-muted/20 rounded-t-sm">
                  <div 
                    className="w-full bg-primary/60 group-hover:bg-primary transition-all rounded-t-sm"
                    style={{ height: height || '4px' }}
                  />
                  <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-popover border border-border shadow-md rounded text-xs py-1 px-2 whitespace-nowrap z-10 transition-opacity flex items-center">
                    <IndianRupee className="h-2.5 w-2.5 mr-0.5" />
                    {item.amount.toLocaleString('en-IN')}
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis max-w-full">
                  {item.month.split(' ')[0]}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
