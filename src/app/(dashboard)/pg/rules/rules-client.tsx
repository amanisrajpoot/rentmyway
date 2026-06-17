'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { getPgRules } from '@/lib/actions/pg-rules';
import { Loader2, ShieldAlert } from 'lucide-react';
import type { Property, PgRule } from '@/types/database';

export function RulesClient({ properties }: { properties: Property[] }) {
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(properties[0]?.id || '');
  const [rules, setRules] = useState<PgRule[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedPropertyId) loadRules(selectedPropertyId);
  }, [selectedPropertyId]);

  async function loadRules(propId: string) {
    setLoading(true);
    const { data } = await getPgRules(propId);
    setRules(data as any || []);
    setLoading(false);
  }

  if (properties.length === 0) return <div className="text-center py-10 text-muted-foreground">No PG properties found.</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <Select value={selectedPropertyId} onValueChange={(val: any) => setSelectedPropertyId(val)}>
          <SelectTrigger className="w-[300px]">
            <SelectValue placeholder="Select Property" />
          </SelectTrigger>
          <SelectContent>
            {properties.map(p => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button>Add Rule</Button>
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
    </div>
  );
}
