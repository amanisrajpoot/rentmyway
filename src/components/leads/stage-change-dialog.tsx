'use client';

import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import type { LeadStatus } from '@/types/database';
import { LEAD_STAGE_LABELS } from '@/types/database';

interface StageChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  targetStage: LeadStatus | null;
  onConfirm: (data: any) => Promise<void>;
  // For 'converted' stage, we might need available properties
  properties?: any[];
}

export function StageChangeDialog({ open, onOpenChange, leadId, targetStage, onConfirm, properties = [] }: StageChangeDialogProps) {
  const [loading, setLoading] = useState(false);
  
  // Dynamic fields
  const [propertyId, setPropertyId] = useState('');
  const [rentAmount, setRentAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [visitDate, setVisitDate] = useState('');

  useEffect(() => {
    if (open) {
      setPropertyId('');
      setRentAmount('');
      setNotes('');
      setVisitDate('');
    }
  }, [open, targetStage]);

  if (!targetStage) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const data: any = { status: targetStage, notes };
      if (targetStage === 'site_visit_scheduled') {
        data.visitDate = visitDate;
      } else if (targetStage === 'converted') {
        data.propertyId = propertyId;
        data.rentAmount = Number(rentAmount);
      }
      
      await onConfirm(data);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }

  const needsProperty = targetStage === 'converted' || targetStage === 'token_paid';
  const needsDate = targetStage === 'site_visit_scheduled';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move to {LEAD_STAGE_LABELS[targetStage]}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          {needsProperty && (
            <>
              <div className="space-y-2">
                <Label>Select Property *</Label>
                <Select value={propertyId} onValueChange={(val) => setPropertyId(val ?? '')} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a property" />
                  </SelectTrigger>
                  <SelectContent>
                    {properties.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Final Rent Amount (₹) *</Label>
                <Input 
                  type="number" 
                  required 
                  value={rentAmount} 
                  onChange={(e) => setRentAmount(e.target.value)} 
                />
              </div>
            </>
          )}

          {needsDate && (
            <div className="space-y-2">
              <Label>Visit Date & Time *</Label>
              <Input 
                type="datetime-local" 
                required 
                value={visitDate} 
                onChange={(e) => setVisitDate(e.target.value)} 
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Additional Notes (Optional)</Label>
            <Textarea 
              placeholder="Any remarks..." 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)} 
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm Change
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
