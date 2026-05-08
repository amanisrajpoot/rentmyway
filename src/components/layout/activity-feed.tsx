import { getActivityLog } from '@/lib/actions/activity-log';
import { formatDistanceToNow } from 'date-fns';
import { 
  Building2, UserCheck, Users, MessageSquareWarning, 
  IndianRupee, ScrollText, Megaphone, Trash2, Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';

const actionIcons: Record<string, any> = {
  property: Building2,
  tenant: UserCheck,
  lead: Users,
  complaint: MessageSquareWarning,
  payment: IndianRupee,
  lease: ScrollText,
  announcement: Megaphone,
  delete: Trash2,
  security: Shield,
};

const actionColors: Record<string, string> = {
  create: 'text-emerald-500',
  update: 'text-amber-500',
  delete: 'text-red-500',
  login: 'text-blue-500',
};

export async function ActivityFeed() {
  const activities = await getActivityLog();

  if (activities.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-sm font-medium">No activity yet</p>
        <p className="text-xs mt-1 opacity-70">Activity will appear here as you use the platform.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {activities.map((activity, i) => {
        const Icon = actionIcons[activity.entity_type] || Building2;
        const colorClass = actionColors[activity.action.split('_')[0]] || 'text-muted-foreground';

        return (
          <div key={activity.id} className="relative flex gap-4 stagger-children">
            {/* Timeline Line */}
            {i !== activities.length - 1 && (
              <div className="absolute left-[17px] top-9 w-px h-full bg-border/40" />
            )}
            
            <div className={cn(
              "h-9 w-9 rounded-full flex items-center justify-center bg-muted/50 border border-border/50 shrink-0 shadow-sm",
              colorClass
            )}>
              <Icon className="h-4 w-4" />
            </div>
            
            <div className="flex-1 pt-1 pb-4 min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-tight">
                    <span className="capitalize">{activity.action.replace(/_/g, ' ')}</span>
                  </p>
                  <p className="text-xs text-muted-foreground truncate max-w-[200px] sm:max-w-md">
                    {activity.details?.title || activity.details?.name || activity.entity_type}
                  </p>
                </div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/60 whitespace-nowrap">
                  {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
