'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Activity, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface KirayaScoreGaugeProps {
  score: number;
}

export function KirayaScoreGauge({ score }: KirayaScoreGaugeProps) {
  // Score is out of 1000
  const normalizedScore = Math.max(0, Math.min(1000, score));
  const percentage = (normalizedScore / 1000) * 100;
  
  let colorClass = 'text-green-500';
  let progressClass = '[&>div]:bg-green-500';
  let label = 'Excellent';
  let TrendIcon = TrendingUp;

  if (normalizedScore < 500) {
    colorClass = 'text-red-500';
    progressClass = '[&>div]:bg-red-500';
    label = 'Poor';
    TrendIcon = TrendingDown;
  } else if (normalizedScore < 750) {
    colorClass = 'text-amber-500';
    progressClass = '[&>div]:bg-amber-500';
    label = 'Average';
    TrendIcon = Minus;
  }

  return (
    <Card className="border-border/50 relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          Kiraya Score™
        </CardTitle>
        <CardDescription>Tenant Reliability Index</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between mb-2">
          <div className="flex items-baseline gap-1">
            <span className={cn("text-3xl font-bold tracking-tight", colorClass)}>
              {normalizedScore}
            </span>
            <span className="text-sm text-muted-foreground">/ 1000</span>
          </div>
          <div className={cn("flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-background border", colorClass)}>
            <TrendIcon className="h-3 w-3" />
            {label}
          </div>
        </div>
        <Progress value={percentage} className={cn("h-2 bg-muted", progressClass)} />
        <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
          Based on payment punctuality, property maintenance, and police verification status.
        </p>
      </CardContent>
    </Card>
  );
}
