'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { IndianRupee, Loader2, Plus, ArrowUpRight, ArrowDownRight, CheckCircle2 } from 'lucide-react';
import { addDepositTransaction, getDepositTransactions } from '@/lib/actions/deposits';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface TenantDepositCardProps {
  tenantId: string;
  propertyId: string;
  baseDepositAmount: number;
}

export function TenantDepositCard({ tenantId, propertyId, baseDepositAmount }: TenantDepositCardProps) {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Form State
  const [type, setType] = useState('advance');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const res = await getDepositTransactions(tenantId);
        if (res.data) setTransactions(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [tenantId]);

  async function handleAddTransaction(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await addDepositTransaction({
        tenant_id: tenantId,
        property_id: propertyId,
        type: type as any,
        amount: Number(amount),
        reason: reason || undefined,
      });
      if (res.error) throw new Error(res.error);
      
      toast.success('Transaction added');
      setTransactions([res.data, ...transactions]);
      setDialogOpen(false);
      setAmount('');
      setReason('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to add transaction');
    } finally {
      setSaving(false);
    }
  }

  // Calculate current balance
  const currentBalance = transactions.reduce((acc, t) => {
    if (t.type === 'advance') return acc + t.amount;
    if (t.type === 'deduction') return acc - t.amount;
    if (t.type === 'refund') return acc - t.amount;
    return acc;
  }, baseDepositAmount);

  return (
    <Card className="border-border/50">
      <CardHeader className="flex flex-row items-start justify-between pb-2">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            Deposit Management
          </CardTitle>
          <CardDescription>Current Balance: ₹{currentBalance.toLocaleString('en-IN')}</CardDescription>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={
            <Button variant="outline" size="sm" className="h-8">
              <Plus className="h-3.5 w-3.5 mr-1" /> Add
            </Button>
          } />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Deposit Transaction</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddTransaction} className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={type} onValueChange={(val) => setType(val as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="advance">Additional Advance</SelectItem>
                      <SelectItem value="deduction">Deduction (Damage, etc)</SelectItem>
                      <SelectItem value="refund">Refund (Move out)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Amount (₹)</Label>
                  <Input type="number" required value={amount} onChange={(e) => setAmount(e.target.value)} />
                </div>
              </div>
              {type === 'deduction' && (
                <div className="space-y-2">
                  <Label>Reason for Deduction *</Label>
                  <Input required placeholder="e.g. Broken window pane" value={reason} onChange={(e) => setReason(e.target.value)} />
                </div>
              )}
              {type === 'refund' && (
                <div className="space-y-2">
                  <Label>Notes (Optional)</Label>
                  <Input placeholder="e.g. NEFT transfer reference" value={reason} onChange={(e) => setReason(e.target.value)} />
                </div>
              )}
              <div className="flex justify-end pt-2 gap-2">
                <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Record
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-6 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground/50" /></div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-6 text-sm text-muted-foreground bg-muted/20 rounded-md">
            No transactions yet. (Base deposit: ₹{baseDepositAmount.toLocaleString()})
          </div>
        ) : (
          <div className="space-y-3 mt-2">
            {transactions.map(t => (
              <div key={t.id} className="flex items-start justify-between border-b border-border/50 pb-3 last:border-0 last:pb-0">
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 p-1.5 rounded-md ${
                    t.type === 'advance' ? 'bg-emerald-500/15 text-emerald-500' :
                    t.type === 'refund' ? 'bg-blue-500/15 text-blue-500' : 'bg-red-500/15 text-red-500'
                  }`}>
                    {t.type === 'advance' ? <ArrowUpRight className="h-3.5 w-3.5" /> : 
                     t.type === 'refund' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium capitalize">
                      {t.type} {t.reason ? `- ${t.reason}` : ''}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {format(new Date(t.created_at || new Date()), 'dd MMM yyyy, hh:mm a')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-semibold tabular-nums flex items-center justify-end ${
                    t.type === 'advance' ? 'text-emerald-500' :
                    t.type === 'refund' ? 'text-blue-500' : 'text-red-500'
                  }`}>
                    {t.type === 'advance' ? '+' : '-'}₹{t.amount.toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
