'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Lead, LeadStatus } from '@/types/database';
import { LEAD_STAGE_ORDER, LEAD_STAGE_LABELS, LEAD_SOURCE_LABELS } from '@/types/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { updateLeadStage } from '@/lib/actions/leads';
import { toast } from 'sonner';
import {
  Plus, Phone, Eye, ChevronRight, ChevronLeft, IndianRupee, MapPin, Users,
} from 'lucide-react';

const stageColors: Record<LeadStatus, string> = {
  new: 'border-t-blue-500',
  contacted: 'border-t-cyan-500',
  site_visit_scheduled: 'border-t-yellow-500',
  site_visit_done: 'border-t-amber-500',
  negotiation: 'border-t-orange-500',
  token_paid: 'border-t-purple-500',
  converted: 'border-t-emerald-500',
  lost: 'border-t-red-500',
};

const stageBadgeColors: Record<LeadStatus, string> = {
  new: 'bg-blue-500/15 text-blue-400',
  contacted: 'bg-cyan-500/15 text-cyan-400',
  site_visit_scheduled: 'bg-yellow-500/15 text-yellow-400',
  site_visit_done: 'bg-amber-500/15 text-amber-400',
  negotiation: 'bg-orange-500/15 text-orange-400',
  token_paid: 'bg-purple-500/15 text-purple-400',
  converted: 'bg-emerald-500/15 text-emerald-400',
  lost: 'bg-red-500/15 text-red-400',
};

export function LeadsClient({ initialLeads }: { initialLeads: Lead[] }) {
  const [leads, setLeads] = useState(initialLeads);

  // Group leads by stage
  const grouped = LEAD_STAGE_ORDER.reduce((acc, stage) => {
    acc[stage] = leads.filter((l) => l.status === stage);
    return acc;
  }, {} as Record<LeadStatus, Lead[]>);

  async function moveLead(leadId: string, direction: 'forward' | 'backward') {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;

    const currentIdx = LEAD_STAGE_ORDER.indexOf(lead.status);
    const newIdx = direction === 'forward' ? currentIdx + 1 : currentIdx - 1;
    if (newIdx < 0 || newIdx >= LEAD_STAGE_ORDER.length) return;

    const newStatus = LEAD_STAGE_ORDER[newIdx];

    // Optimistic update
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l))
    );

    try {
      await updateLeadStage(leadId, newStatus);
      toast.success(`Moved to ${LEAD_STAGE_LABELS[newStatus]}`);
    } catch {
      // Revert
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, status: lead.status } : l))
      );
      toast.error('Failed to update lead stage');
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Lead Pipeline</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {leads.length} total leads
          </p>
        </div>
        <Link href="/leads/new">
          <Button className="bg-gradient-to-r from-[oklch(0.55_0.2_265)] to-[oklch(0.60_0.19_280)] hover:from-[oklch(0.60_0.22_265)] hover:to-[oklch(0.65_0.21_280)] text-white">
            <Plus className="h-4 w-4 mr-2" />
            Add Lead
          </Button>
        </Link>
      </div>

      {/* Kanban Board */}
      <div className="w-full overflow-x-auto pb-4 snap-x">
        <div className="flex gap-4 min-w-max px-1">
          {LEAD_STAGE_ORDER.map((stage) => (
            <div key={stage} className="w-72 shrink-0">
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-sm font-semibold">{LEAD_STAGE_LABELS[stage]}</h3>
                <Badge variant="secondary" className="text-xs px-1.5 h-5">
                  {grouped[stage].length}
                </Badge>
              </div>

              <div className="space-y-3">
                {grouped[stage].length === 0 ? (
                  <div className="border border-dashed border-border/50 rounded-lg p-6 text-center">
                    <p className="text-xs text-muted-foreground">No leads</p>
                  </div>
                ) : (
                  grouped[stage].map((lead) => (
                    <Card
                      key={lead.id}
                      className={`border-border/50 border-t-2 ${stageColors[stage]} animate-slide-up`}
                    >
                      <CardContent className="pt-4 space-y-2.5">
                        <div className="flex items-start justify-between">
                          <div className="min-w-0">
                            <p className="font-semibold text-sm truncate">{lead.name}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Phone className="h-3 w-3" /> {lead.phone}
                            </p>
                          </div>
                          <Link href={`/leads/${lead.id}`}>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                        </div>

                        {(lead.budget_min || lead.budget_max) && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <IndianRupee className="h-3 w-3" />
                            {lead.budget_min ? `₹${lead.budget_min.toLocaleString('en-IN')}` : '—'} - {lead.budget_max ? `₹${lead.budget_max.toLocaleString('en-IN')}` : '—'}
                          </p>
                        )}

                        {lead.preferred_locality && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {lead.preferred_locality}
                          </p>
                        )}

                        {lead.source && (
                          <Badge className={`${stageBadgeColors[stage]} text-xs`}>
                            {LEAD_SOURCE_LABELS[lead.source]}
                          </Badge>
                        )}

                        {/* Move buttons */}
                        {stage !== 'converted' && stage !== 'lost' && (
                          <div className="flex justify-between pt-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              disabled={stage === LEAD_STAGE_ORDER[0]}
                              onClick={() => moveLead(lead.id, 'backward')}
                            >
                              <ChevronLeft className="h-3 w-3 mr-1" /> Back
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-primary"
                              onClick={() => moveLead(lead.id, 'forward')}
                            >
                              Next <ChevronRight className="h-3 w-3 ml-1" />
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
