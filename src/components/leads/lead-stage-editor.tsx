'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { updateLeadStage, convertLead } from '@/lib/actions/leads';
import { toast } from 'sonner';
import { StageChangeDialog } from '@/components/leads/stage-change-dialog';
import type { LeadStatus } from '@/types/database';
import { LEAD_STAGE_LABELS, LEAD_STAGE_ORDER } from '@/types/database';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ChevronDown, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

const stageBadgeColors: Record<string, string> = {
  new: 'bg-blue-500/15 text-blue-400 border-blue-500/20 hover:bg-blue-500/25 hover:text-blue-500',
  contacted: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20 hover:bg-cyan-500/25 hover:text-cyan-500',
  site_visit_scheduled: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20 hover:bg-yellow-500/25 hover:text-yellow-500',
  site_visit_done: 'bg-amber-500/15 text-amber-400 border-amber-500/20 hover:bg-amber-500/25 hover:text-amber-500',
  negotiation: 'bg-orange-500/15 text-orange-400 border-orange-500/20 hover:bg-orange-500/25 hover:text-orange-500',
  token_paid: 'bg-purple-500/15 text-purple-400 border-purple-500/20 hover:bg-purple-500/25 hover:text-purple-500',
  converted: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/25 hover:text-emerald-500',
  lost: 'bg-red-500/15 text-red-400 border-red-500/20 hover:bg-red-500/25 hover:text-red-500',
};

interface LeadStageEditorProps {
  leadId: string;
  currentStatus: LeadStatus;
  availableProperties: any[];
}

export function LeadStageEditor({ leadId, currentStatus, availableProperties }: LeadStageEditorProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [targetStage, setTargetStage] = useState<LeadStatus | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  function handleSelectStage(stage: LeadStatus) {
    if (stage === currentStatus) return;
    setTargetStage(stage);
    setDialogOpen(true);
  }

  async function handleConfirm(data: any) {
    if (!targetStage) return;
    setIsUpdating(true);
    try {
      if (targetStage === 'converted') {
        const res = await convertLead(leadId, data.propertyId);
        if ('error' in res && res.error) throw new Error(res.error);
      } else {
        // Here we could pass notes or date to updateLeadStage if backend supports it.
        const res = await updateLeadStage(leadId, targetStage);
        if ('error' in res && res.error) throw new Error(res.error);
      }
      
      toast.success(`Lead moved to ${LEAD_STAGE_LABELS[targetStage]}`);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update stage');
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger>
          <Badge 
            variant="outline" 
            className={`cursor-pointer transition-colors ${stageBadgeColors[currentStatus] || ''} ${isUpdating ? 'opacity-50 pointer-events-none' : ''}`}
          >
            {isUpdating && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
            {LEAD_STAGE_LABELS[currentStatus]}
            <ChevronDown className="h-3 w-3 ml-1" />
          </Badge>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {LEAD_STAGE_ORDER.map(stage => (
            <DropdownMenuItem 
              key={stage}
              onClick={() => handleSelectStage(stage)}
              className={stage === currentStatus ? 'bg-muted font-medium' : ''}
            >
              {LEAD_STAGE_LABELS[stage]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <StageChangeDialog 
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        leadId={leadId}
        targetStage={targetStage}
        onConfirm={handleConfirm}
        properties={availableProperties}
      />
    </>
  );
}
