'use client';

import { useState, useEffect } from 'react';
import { Bell, CheckCircle2, Info, AlertTriangle, MessageSquare } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getNotifications, getUnreadCount, markAsRead, markAllAsRead } from '@/lib/actions/notifications';
import type { Notification } from '@/types/database';
import { formatDistanceToNow } from 'date-fns';
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
  rent_overdue: 'text-red-400',
  rent_due: 'text-amber-400',
  rent_paid: 'text-emerald-400',
  lease_expiring: 'text-amber-400',
  move_out: 'text-red-400',
};

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const [res, count] = await Promise.all([
        getNotifications(),
        getUnreadCount()
      ]);
      const data = 'data' in res && res.data ? res.data : [];
      setNotifications(data);
      setUnreadCount(count);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll every 3 minutes
    const interval = setInterval(fetchNotifications, 3 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      await markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      toast.error('Failed to mark as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
      toast.success('All marked as read');
    } catch (error) {
      toast.error('Failed to mark all as read');
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={
        <Button variant="ghost" size="icon-sm" className="relative text-muted-foreground hover:text-foreground">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-primary text-[8px] items-center justify-center text-primary-foreground font-bold leading-none">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            </span>
          )}
        </Button>
      } />
      <DropdownMenuContent align="end" className="w-80 p-0 overflow-hidden bg-background/95 backdrop-blur-xl border-border/50">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <h3 className="font-semibold text-sm">Notifications</h3>
          {unreadCount > 0 && (
            <button 
              onClick={handleMarkAllAsRead}
              className="text-[10px] text-primary hover:underline font-medium"
            >
              Mark all as read
            </button>
          )}
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          {loading ? (
            <div className="py-8 text-center text-xs text-muted-foreground">Loading...</div>
          ) : notifications.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <Bell className="h-8 w-8 mx-auto text-muted-foreground/20" />
              <p className="text-xs text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {notifications.map((n) => {
                const Icon = typeIcons[n.type] || Info;
                return (
                  <div 
                    key={n.id}
                    className={cn(
                      "group relative p-4 hover:bg-muted/30 transition-colors cursor-pointer",
                      !n.is_read && "bg-primary/5"
                    )}
                    onClick={() => !n.is_read && handleMarkAsRead(n.id)}
                  >
                    <div className="flex gap-3">
                      <div className={cn("p-1.5 rounded-lg bg-muted/50 shrink-0 h-fit", typeColors[n.type])}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={cn("text-xs font-semibold leading-none", !n.is_read ? "text-foreground" : "text-muted-foreground")}>
                            {n.title}
                          </p>
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                            {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        {n.message && (
                          <p className="text-[11px] text-muted-foreground line-clamp-2 leading-normal">
                            {n.message}
                          </p>
                        )}
                        {n.link && (
                          <Link 
                            href={n.link}
                            className="text-[10px] text-primary hover:underline font-medium inline-block mt-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            View details
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="p-2 border-t border-border/50 text-center">
          <Link href="/notifications">
            <Button variant="ghost" size="xs" className="w-full text-[10px] text-muted-foreground">
              See all notifications
            </Button>
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
