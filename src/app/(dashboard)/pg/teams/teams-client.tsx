'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { getMaintenanceTeams } from '@/lib/actions/pg-teams';
import { Loader2, Wrench, Phone, Mail } from 'lucide-react';
import type { Property, PgMaintenanceTeam } from '@/types/database';

export function TeamsClient({ properties }: { properties: Property[] }) {
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(properties[0]?.id || '');
  const [teams, setTeams] = useState<PgMaintenanceTeam[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedPropertyId) loadTeams(selectedPropertyId);
  }, [selectedPropertyId]);

  async function loadTeams(propId: string) {
    setLoading(true);
    const { data } = await getMaintenanceTeams(propId);
    setTeams(data as any || []);
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
        <Button>Add Team</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : teams.length === 0 ? (
        <div className="text-center py-10 border rounded-lg border-dashed">
          <p className="text-muted-foreground">No teams added yet. Complaints will not be auto-delegated.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
          {teams.map(team => (
            <Card key={team.id} className="border-border/50 hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="flex items-center gap-2"><Wrench className="h-4 w-4 text-primary" /> {team.team_name}</span>
                  <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-primary/10 text-primary capitalize">{team.category.replace('_', ' ')}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mt-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground w-16">Contact:</span>
                    <span>{team.contact_name || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" />
                    <span>{team.contact_phone}</span>
                  </div>
                  {team.email && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-3.5 w-3.5" />
                      <span>{team.email}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
