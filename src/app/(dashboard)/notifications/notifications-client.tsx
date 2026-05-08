'use client';

import { useState } from 'react';
import { 
  Bell, CheckCircle2, Info, AlertTriangle, MessageSquare, 
  Trash2, MailOpen, Calendar, ArrowRight, CheckCircle
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { markAsRead, markAllAsRead } from '@/lib/actions/notifications';
import type { Notification } from '@/types/database';
import { format } from 'date-fns';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const typeIcons: Record<string, any> = {
  rent_due: AlertTriangle,
  rent_overdue: AlertTriangle,
  rent_paid: CheckCircle2,
  complaint_created: MessageSquare,
  complaint_updated: Info,
  complaint_resolved: CheckCircle2,
  lease_expiring: AlertTriangle,
  maintenance_scheduled: Info,
  announcement: Info,
  move_out: AlertTriangle,
  general: Info,
};

const typeColors: Record<string, string> = {
  rent_overdue: 'bg-red-500/10 text-red-400 border-red-500/20',
  rent_due: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  rent_paid: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  lease_expiring: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  move_out: 'bg-red-500/10 text-red-400 border-red-500/20',
  general: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
};

export function NotificationsClient({ initialNotifications }: { initialNotifications: Notification[] }) {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const filtered = notifications.filter(n => filter === 'all' || !n.is_read);

  const handleMarkAsRead = async (id: string) => {
    try {
      await markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (error) {
      toast.error('Failed to update');
    }
  };

  const handleMarkAll = async () => {
    try {
      await markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      toast.success('All marked as read');
    } catch (error) {
      toast.error('Failed to update');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button 
            variant={filter === 'all' ? 'default' : 'outline'} 
            size="sm" 
            onClick={() => setFilter('all')}
            className="h-8 text-xs"
          >
            All
          </Button>
          <Button 
            variant={filter === 'unread' ? 'default' : 'outline'} 
            size="sm" 
            onClick={() => setFilter('unread')}
            className="h-8 text-xs"
          >
            Unread
          </Button>
        </div>
        {notifications.some(n => !n.is_read) && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleMarkAll}
            className="h-8 text-xs text-muted-foreground hover:text-foreground"
          >
            <CheckCircle className="h-3.5 w-3.5 mr-2" />
            Mark all as read
          </Button>
        )}
      </div>

      {filtered.length === 0 ? (
        <Card className="border-border/50 bg-background/50 border-dashed">
          <CardContent className="py-20 text-center space-y-4">
            <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mx-auto">
              <MailOpen className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">No notifications</h3>
              <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                {filter === 'unread' 
                  ? "You've caught up with everything! No unread alerts." 
                  : "You don't have any notifications at the moment."}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((n) => {
            const Icon = typeIcons[n.type] || Info;
            return (
              <Card 
                key={n.id} 
                className={cn(
                  "border-border/50 transition-all stagger-children",
                  !n.is_read ? "bg-primary/5 ring-1 ring-primary/10 border-primary/20" : "bg-card/50"
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={cn("p-2 rounded-xl shrink-0 border", typeColors[n.type] || 'bg-muted text-muted-foreground border-border/50')}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className={cn("font-semibold", !n.is_read ? "text-foreground" : "text-muted-foreground")}>
                            {n.title}
                          </h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(n.created_at), 'dd MMM yyyy, hh:mm a')}
                            </span>
                            {!n.is_read && (
                              <Badge className="bg-primary/20 text-primary hover:bg-primary/30 border-none text-[10px] h-4 px-1.5">New</Badge>
                            )}
                          </div>
                        </div>
                        {!n.is_read && (
                          <Button 
                            variant="ghost" 
                            size="icon-xs" 
                            onClick={() => handleMarkAsRead(n.id)}
                            className="text-muted-foreground hover:text-primary"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                        {n.message}
                      </p>
                      {n.link && (
                        <Link href={n.link} className="inline-flex items-center gap-1.5 text-xs text-primary font-medium hover:underline mt-3 group">
                          View details
                          <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                        </Link>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
