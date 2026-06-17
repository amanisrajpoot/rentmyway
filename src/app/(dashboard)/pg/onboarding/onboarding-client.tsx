'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { bulkOnboardTenants } from '@/lib/actions/pg-onboarding';
import { Loader2, UsersRound, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Property } from '@/types/database';

export function OnboardingClient({ properties }: { properties: Property[] }) {
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(properties[0]?.id || '');
  const [loading, setLoading] = useState(false);


  const [rows, setRows] = useState([
    { id: 1, name: '', phone: '', room_id: '', bed_number: '', rent_amount: '', deposit_amount: '', move_in_date: new Date().toISOString().split('T')[0] }
  ]);

  const addRow = () => setRows([...rows, { id: Date.now(), name: '', phone: '', room_id: '', bed_number: '', rent_amount: '', deposit_amount: '', move_in_date: new Date().toISOString().split('T')[0] }]);
  const removeRow = (id: number) => setRows(rows.filter(r => r.id !== id));
  
  const updateRow = (id: number, field: string, value: string) => {
    setRows(rows.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  async function handleOnboard() {
    // Basic validation
    const validRows = rows.filter(r => r.name && r.phone && r.room_id && r.bed_number && r.rent_amount);
    if (validRows.length === 0) {
      toast.error('Validation Error', { description: 'Please fill all required fields for at least one tenant.' });
      return;
    }

    setLoading(true);
    const tenants = validRows.map(r => ({
      property_id: selectedPropertyId,
      name: r.name,
      phone: r.phone,
      room_id: r.room_id,
      bed_number: r.bed_number,
      rent_amount: Number(r.rent_amount),
      deposit_amount: Number(r.deposit_amount) || 0,
      move_in_date: r.move_in_date,
    }));

    const result = await bulkOnboardTenants(tenants as any);
    if (result.error) {
      toast.error('Error', { description: result.error });
    } else {
      toast.success('Success', { description: `Successfully onboarded ${result.count} tenants.` });
      setRows([{ id: Date.now(), name: '', phone: '', room_id: '', bed_number: '', rent_amount: '', deposit_amount: '', move_in_date: new Date().toISOString().split('T')[0] }]);
    }
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
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="px-4 py-3 font-medium">Room ID</th>
                  <th className="px-4 py-3 font-medium">Bed (A/B..)</th>
                  <th className="px-4 py-3 font-medium">Rent</th>
                  <th className="px-4 py-3 font-medium">Deposit</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-2"><Input value={row.name} onChange={e => updateRow(row.id, 'name', e.target.value)} placeholder="Tenant Name" className="h-8" /></td>
                    <td className="px-4 py-2"><Input value={row.phone} onChange={e => updateRow(row.id, 'phone', e.target.value)} placeholder="Phone" className="h-8" /></td>
                    <td className="px-4 py-2"><Input value={row.room_id} onChange={e => updateRow(row.id, 'room_id', e.target.value)} placeholder="Room UUID" className="h-8" /></td>
                    <td className="px-4 py-2"><Input value={row.bed_number} onChange={e => updateRow(row.id, 'bed_number', e.target.value)} placeholder="e.g. A" className="h-8 w-20" /></td>
                    <td className="px-4 py-2"><Input type="number" value={row.rent_amount} onChange={e => updateRow(row.id, 'rent_amount', e.target.value)} placeholder="Amount" className="h-8 w-24" /></td>
                    <td className="px-4 py-2"><Input type="number" value={row.deposit_amount} onChange={e => updateRow(row.id, 'deposit_amount', e.target.value)} placeholder="Deposit" className="h-8 w-24" /></td>
                    <td className="px-4 py-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeRow(row.id)} disabled={rows.length === 1}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={addRow}><Plus className="h-4 w-4 mr-2" /> Add Row</Button>
            <Button onClick={handleOnboard} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UsersRound className="h-4 w-4 mr-2" />}
              Onboard Tenants
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
