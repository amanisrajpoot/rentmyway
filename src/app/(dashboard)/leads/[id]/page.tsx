import { getLead, getFollowUps } from '@/lib/actions/leads';
import { getMatchedProperties } from '@/lib/actions/properties';
import { notFound } from 'next/navigation';
import type { LeadStatus, LeadSource } from '@/types/database';
import { LEAD_STAGE_LABELS, LEAD_SOURCE_LABELS } from '@/types/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import { format } from 'date-fns';
import {
  ArrowLeft, Phone, Mail, MapPin, IndianRupee, Calendar, MessageSquare,
  Building2, Clock, Sparkles, ExternalLink
} from 'lucide-react';

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let lead;
  let followUps;
  let matchedProperties;

  try {
    [lead, followUps] = await Promise.all([
      getLead(id),
      getFollowUps(id),
    ]);
    if (lead) {
      matchedProperties = await getMatchedProperties(lead);
    }
  } catch {
    notFound();
  }

  if (!lead) notFound();

  const stageBadgeColors: Record<string, string> = {
    new: 'bg-blue-500/15 text-blue-400',
    contacted: 'bg-cyan-500/15 text-cyan-400',
    site_visit_scheduled: 'bg-yellow-500/15 text-yellow-400',
    site_visit_done: 'bg-amber-500/15 text-amber-400',
    negotiation: 'bg-orange-500/15 text-orange-400',
    token_paid: 'bg-purple-500/15 text-purple-400',
    converted: 'bg-emerald-500/15 text-emerald-400',
    lost: 'bg-red-500/15 text-red-400',
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/leads">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{lead.name}</h1>
            <Badge className={stageBadgeColors[lead.status as LeadStatus] || ''}>
              {LEAD_STAGE_LABELS[lead.status as LeadStatus]}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Created {format(new Date(lead.created_at), 'dd MMM yyyy')}
            {lead.source && ` • via ${LEAD_SOURCE_LABELS[lead.source as LeadSource]}`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Info */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{lead.phone}</span>
              </div>
              {lead.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{lead.email}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Requirements */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base">Requirements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                {lead.budget_min || lead.budget_max ? (
                  <div className="flex items-start gap-2">
                    <IndianRupee className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Budget Range</p>
                      <p className="text-sm font-medium">
                        ₹{lead.budget_min?.toLocaleString('en-IN') || '—'} - ₹{lead.budget_max?.toLocaleString('en-IN') || '—'}
                      </p>
                    </div>
                  </div>
                ) : null}
                {lead.preferred_locality && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Location</p>
                      <p className="text-sm font-medium">
                        {lead.preferred_locality}
                        {lead.preferred_city && `, ${lead.preferred_city}`}
                      </p>
                    </div>
                  </div>
                )}
                {lead.preferred_type && (
                  <div className="flex items-start gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Property Type</p>
                      <p className="text-sm font-medium uppercase">{lead.preferred_type}</p>
                    </div>
                  </div>
                )}
                {lead.move_in_date && (
                  <div className="flex items-start gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Move-in Date</p>
                      <p className="text-sm font-medium">
                        {format(new Date(lead.move_in_date), 'dd MMM yyyy')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
              {lead.notes && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Notes</p>
                    <p className="text-sm">{lead.notes}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Matched Properties */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-500" />
                Matched Properties
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!matchedProperties || matchedProperties.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No currently available properties match the lead&apos;s budget and location criteria.
                </p>
              ) : (
                <div className="space-y-3">
                  {matchedProperties.map((prop: any) => (
                    <div key={prop.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:border-border transition-colors group">
                      <div className="min-w-0 flex-1 pr-4">
                        <Link href={`/properties/${prop.id}`} className="font-medium text-sm group-hover:text-primary transition-colors truncate block">
                          {prop.title}
                        </Link>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{prop.locality}</span>
                          <span className="flex items-center gap-1 font-medium text-foreground"><IndianRupee className="h-3 w-3" />{prop.rent.toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                      <Link href={`/properties/${prop.id}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Follow-ups Timeline */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Follow-up History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {followUps.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No follow-ups recorded yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {followUps.map((fu) => (
                    <div key={fu.id} className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <MessageSquare className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs capitalize">{fu.type}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(fu.created_at), 'dd MMM yyyy, hh:mm a')}
                          </span>
                        </div>
                        {fu.notes && <p className="text-sm mt-1">{fu.notes}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base">Pipeline Stage</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge className={`${stageBadgeColors[lead.status as LeadStatus]} text-sm px-3 py-1`}>
                {LEAD_STAGE_LABELS[lead.status as LeadStatus]}
              </Badge>
              <p className="text-xs text-muted-foreground mt-3">
                Last updated: {format(new Date(lead.updated_at), 'dd MMM yyyy')}
              </p>
            </CardContent>
          </Card>

          {lead.status === 'lost' && lead.lost_reason && (
            <Card className="border-border/50 border-destructive/20">
              <CardHeader>
                <CardTitle className="text-base text-destructive">Lost Reason</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{lead.lost_reason}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
