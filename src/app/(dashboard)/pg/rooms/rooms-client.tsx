'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { getPgRooms } from '@/lib/actions/pg-rooms';
import { Loader2, Bed, Users } from 'lucide-react';
import type { Property, PgRoom } from '@/types/database';

export function RoomsClient({ properties }: { properties: Property[] }) {
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(properties[0]?.id || '');
  const [rooms, setRooms] = useState<PgRoom[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedPropertyId) {
      loadRooms(selectedPropertyId);
    }
  }, [selectedPropertyId]);

  async function loadRooms(propId: string) {
    setLoading(true);
    const { data } = await getPgRooms(propId);
    setRooms(data as any || []);
    setLoading(false);
  }

  if (properties.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-muted-foreground">No PG properties found. Add a PG property first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <Select value={selectedPropertyId} onValueChange={(val: any) => setSelectedPropertyId(val)}>
          <SelectTrigger className="w-[300px]">
            <SelectValue placeholder="Select Property" />
          </SelectTrigger>
          <SelectContent>
            {properties.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button>Add Room</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : rooms.length === 0 ? (
        <div className="text-center py-10 border rounded-lg border-dashed">
          <p className="text-muted-foreground">No rooms added yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
          {rooms.map(room => (
            <Card key={room.id} className="border-border/50 hover:shadow-md transition-all duration-300">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">Room {room.room_number}</CardTitle>
                  <Badge variant="outline" className="capitalize">{room.room_type}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 mb-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1"><Bed className="h-4 w-4"/> {room.occupied_beds}/{room.total_beds} Beds</div>
                  <div className="flex items-center gap-1"><Users className="h-4 w-4"/> ₹{room.rent_per_bed}/bed</div>
                </div>
                
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Beds</p>
                  <div className="grid grid-cols-2 gap-2">
                    {room.beds?.map(bed => (
                      <div key={bed.id} className={`p-2 rounded border text-xs flex justify-between items-center transition-colors ${
                        bed.status === 'vacant' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400' :
                        bed.status === 'occupied' ? 'bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400' :
                        'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400'
                      }`}>
                        <span className="font-medium">Bed {bed.bed_number}</span>
                        <span className="truncate max-w-[60px]" title={bed.tenant?.name || 'Vacant'}>{bed.status === 'vacant' ? 'Vacant' : bed.tenant?.name?.split(' ')[0] || 'Occupied'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
