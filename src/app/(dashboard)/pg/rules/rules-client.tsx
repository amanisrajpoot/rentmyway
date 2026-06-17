'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getPgRules, createPgRule } from '@/lib/actions/pg-rules';
import { Loader2, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import type { Property, PgRule } from '@/types/database';

export function RulesClient({ properties, readOnly = false }: { properties: Property[], readOnly?: boolean }) {
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(properties[0]?.id || '');
  const [rules, setRules] = useState<PgRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);

  useEffect(() => {
    if (selectedPropertyId) loadRules(selectedPropertyId);
  }, [selectedPropertyId]);

  async function loadRules(propId: string) {
    setLoading(true);
    const { data } = await getPgRules(propId);
    setRules(data as any || []);
    setLoading(false);
  }

  async function handleAddRule(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAddLoading(true);
    const formData = new FormData(e.currentTarget);
    
    const result = await createPgRule({
      property_id: selectedPropertyId,
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      rule_type: formData.get('rule_type') as string,
    } as any);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Rule added successfully');
      setIsAddDialogOpen(false);
      loadRules(selectedPropertyId);
    }
    setAddLoading(false);
  }

  if (properties.length === 0) return <div className="text-center py-10 text-muted-foreground">No PG properties found.</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        {!readOnly ? (
          <Select value={selectedPropertyId} onValueChange={(val: any) => setSelectedPropertyId(val)}>
            <SelectTrigger className="w-[300px]">
              <SelectValue placeholder="Select Property">
                {properties.find(p => p.id === selectedPropertyId)?.title || "Select Property"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {properties.map(p => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
            </SelectContent>
          </Select>
        ) : (
          <h2 className="text-xl font-semibold">{properties[0]?.title}</h2>
        )}
        {!readOnly && (
          <Button onClick={() => setIsAddDialogOpen(true)}>Add Rule</Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : rules.length === 0 ? (
        <div className="text-center py-10 border rounded-lg border-dashed">
          <p className="text-muted-foreground">No rules added yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
          {rules.map(rule => (
            <Card key={rule.id} className="border-border/50 hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-primary" />
                  {rule.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-3">
                  <span className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground capitalize">
                    {rule.rule_type.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{rule.description || 'No description provided.'}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add PG Rule</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddRule} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Rule Title</Label>
              <Input name="title" placeholder="e.g. No Guests after 10 PM" required />
            </div>
            <div className="space-y-2">
              <Label>Rule Type</Label>
              <Select name="rule_type" defaultValue="other">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="entry_time">Entry Time</SelectItem>
                  <SelectItem value="exit_time">Exit Time</SelectItem>
                  <SelectItem value="guest_policy">Guest Policy</SelectItem>
                  <SelectItem value="smoking">Smoking</SelectItem>
                  <SelectItem value="alcohol">Alcohol</SelectItem>
                  <SelectItem value="noise">Noise</SelectItem>
                  <SelectItem value="food">Food</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input name="description" placeholder="Brief details about the rule..." required />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={addLoading}>
                {addLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Add Rule
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
