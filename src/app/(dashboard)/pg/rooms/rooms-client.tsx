'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { getPgRooms } from '@/lib/actions/pg-rooms';
import { Loader2, Bed, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createPgRoom, bulkCreatePgRooms, assignBedToTenant, vacateBed, getUnassignedTenants } from '@/lib/actions/pg-rooms';
import { onboardSinglePgTenant } from '@/lib/actions/pg-onboarding';
import { UploadCloud, Download, UserPlus, UserMinus } from 'lucide-react';
import { toast } from 'sonner';
import type { Property, PgRoom } from '@/types/database';

export function RoomsClient({ properties }: { properties: Property[] }) {
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(properties[0]?.id || '');
  const [rooms, setRooms] = useState<PgRoom[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [addingRoom, setAddingRoom] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [uploadingBulk, setUploadingBulk] = useState(false);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  
  const [unassignedTenants, setUnassignedTenants] = useState<{id: string, name: string}[]>([]);
  const [assignBedData, setAssignBedData] = useState<{bedId: string, roomId: string, defaultRent: number, defaultDeposit: number} | null>(null);
  const [assignMode, setAssignMode] = useState<'existing' | 'new'>('existing');
  const [vacateBedId, setVacateBedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (selectedPropertyId) {
      loadRooms(selectedPropertyId);
    }
  }, [selectedPropertyId]);

  async function loadRooms(propId: string) {
    setLoading(true);
    const [res, tenantsRes] = await Promise.all([
      getPgRooms(propId),
      getUnassignedTenants(propId)
    ]);
    if (res.error) toast.error('Failed to load rooms: ' + res.error);
    setRooms(res.data as any || []);
    setUnassignedTenants(tenantsRes.data || []);
    setLoading(false);
  }

  async function handleAssignBed(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!assignBedData) return;
    setActionLoading(true);
    const formData = new FormData(e.currentTarget);
    
    if (assignMode === 'existing') {
      const tenantId = formData.get('tenant_id') as string;
      const rentOverrideStr = formData.get('rent_override') as string;
      const rentOverride = rentOverrideStr ? Number(rentOverrideStr) : undefined;
      
      const result = await assignBedToTenant(assignBedData.bedId, tenantId, rentOverride);
      if (result.error) toast.error(result.error);
      else {
        toast.success('Tenant assigned to bed');
        setAssignBedData(null);
        loadRooms(selectedPropertyId);
      }
    } else {
      const data = {
        property_id: selectedPropertyId,
        room_id: assignBedData.roomId,
        bed_id: assignBedData.bedId,
        name: formData.get('name') as string,
        phone: formData.get('phone') as string,
        email: formData.get('email') as string,
        rent_amount: Number(formData.get('rent_amount')),
        deposit_amount: Number(formData.get('deposit_amount')),
        move_in_date: formData.get('move_in_date') as string,
      };
      const result = await onboardSinglePgTenant(data);
      if (result.error) toast.error(result.error);
      else {
        toast.success('New tenant onboarded & assigned successfully');
        setAssignBedData(null);
        loadRooms(selectedPropertyId);
      }
    }
    setActionLoading(false);
  }

  async function handleVacateBed() {
    if (!vacateBedId) return;
    setActionLoading(true);
    const result = await vacateBed(vacateBedId);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Bed vacated successfully');
      setVacateBedId(null);
      loadRooms(selectedPropertyId);
    }
    setActionLoading(false);
  }

  async function handleAddRoom(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAddingRoom(true);
    const formData = new FormData(e.currentTarget);
    const data = {
      property_id: selectedPropertyId,
      room_number: formData.get('room_number') as string,
      room_type: formData.get('room_type') as string,
      total_beds: Number(formData.get('total_beds')),
      rent_per_bed: Number(formData.get('rent_per_bed')),
      deposit_per_bed: Number(formData.get('deposit_per_bed')),
    };
    
    const result = await createPgRoom(data as any);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Room added successfully');
      setIsDialogOpen(false);
      loadRooms(selectedPropertyId);
    }
    setAddingRoom(false);
  }

  const downloadSampleCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8,room_number,room_type,total_beds,rent_per_bed,deposit_per_bed\n101,single,1,10000,20000\n102,double,2,8000,16000\n103,triple,3,6000,12000";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "sample_rooms.csv");
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkFile) return toast.error('Please select a CSV file');
    
    setUploadingBulk(true);
    try {
      const text = await bulkFile.text();
      const lines = text.split('\n').map(l => l.trim()).filter(l => l);
      if (lines.length < 2) throw new Error('File is empty or missing data rows');
      
      const headers = lines[0].toLowerCase().split(',');
      const rows = lines.slice(1).map(line => {
        const values = line.split(',');
        const obj: any = {};
        headers.forEach((h, i) => obj[h.trim()] = values[i]?.trim());
        return obj;
      });

      const res = await bulkCreatePgRooms(selectedPropertyId, rows);
      if (res.error) throw new Error(res.error);
      
      toast.success(`Successfully added ${res.count} rooms!`);
      setIsBulkDialogOpen(false);
      setBulkFile(null);
      loadRooms(selectedPropertyId);
    } catch (err: any) {
      toast.error(err.message || 'Failed to process CSV');
    } finally {
      setUploadingBulk(false);
    }
  };

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
            <SelectValue placeholder="Select Property">
              {properties.find(p => p.id === selectedPropertyId)?.title || "Select Property"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {properties.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setIsBulkDialogOpen(true)}>
            <UploadCloud className="h-4 w-4 mr-2" /> Bulk Upload
          </Button>
          <Button onClick={() => setIsDialogOpen(true)}>Add Room</Button>
        </div>
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
                        <div className="flex flex-col">
                          <span className="font-medium">Bed {bed.bed_number}</span>
                          <span className="text-[10px] truncate max-w-[80px]" title={bed.tenant?.name || 'Vacant'}>{bed.status === 'vacant' ? 'Vacant' : bed.tenant?.name || 'Occupied'}</span>
                        </div>
                        {bed.status === 'vacant' ? (
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/50" onClick={() => { setAssignBedData({ bedId: bed.id, roomId: room.id, defaultRent: room.rent_per_bed, defaultDeposit: room.deposit_per_bed }); setAssignMode('existing'); }} title="Assign Tenant">
                            <UserPlus className="h-3.5 w-3.5" />
                          </Button>
                        ) : (
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50" onClick={() => setVacateBedId(bed.id)} title="Vacate Bed">
                            <UserMinus className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Room</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddRoom} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Room Number</Label>
              <Input name="room_number" placeholder="e.g., 101" required />
            </div>
            <div className="space-y-2">
              <Label>Room Type</Label>
              <Select name="room_type" defaultValue="single">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single</SelectItem>
                  <SelectItem value="double">Double</SelectItem>
                  <SelectItem value="triple">Triple</SelectItem>
                  <SelectItem value="dormitory">Dormitory</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Total Beds</Label>
                <Input name="total_beds" type="number" min="1" max="20" required defaultValue="1" />
              </div>
              <div className="space-y-2">
                <Label>Rent Per Bed</Label>
                <Input name="rent_per_bed" type="number" min="0" required placeholder="e.g., 8000" />
              </div>
              <div className="space-y-2">
                <Label>Deposit Per Bed</Label>
                <Input name="deposit_per_bed" type="number" min="0" required placeholder="e.g., 16000" />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={addingRoom}>
              {addingRoom ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create Room & Generate Beds
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Upload PG Rooms</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="bg-muted p-4 rounded-lg text-sm text-muted-foreground overflow-hidden">
              <p className="mb-2">Upload a CSV file to add multiple rooms at once. The file must have the following headers:</p>
              <code className="bg-background px-2 py-2 rounded border block mb-4 overflow-x-auto whitespace-nowrap text-xs">room_number,room_type,total_beds,rent_per_bed,deposit_per_bed</code>
              <Button variant="outline" size="sm" onClick={downloadSampleCSV} className="w-full">
                <Download className="h-4 w-4 mr-2" /> Download Sample CSV
              </Button>
            </div>
            
            <form onSubmit={handleBulkSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Select CSV File</Label>
                <Input 
                  type="file" 
                  accept=".csv" 
                  onChange={(e) => setBulkFile(e.target.files?.[0] || null)}
                  required 
                />
              </div>
              <Button type="submit" className="w-full" disabled={uploadingBulk || !bulkFile}>
                {uploadingBulk ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UploadCloud className="h-4 w-4 mr-2" />}
                Upload & Create Rooms
              </Button>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign Bed Dialog */}
      <Dialog open={!!assignBedData} onOpenChange={(open) => !open && setAssignBedData(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Tenant to Bed</DialogTitle>
          </DialogHeader>
          
          <div className="flex bg-muted p-1 rounded-md mb-4">
            <button type="button" className={`flex-1 text-sm py-1.5 rounded-sm font-medium transition-colors ${assignMode === 'existing' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`} onClick={() => setAssignMode('existing')}>Existing Tenant</button>
            <button type="button" className={`flex-1 text-sm py-1.5 rounded-sm font-medium transition-colors ${assignMode === 'new' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`} onClick={() => setAssignMode('new')}>Add New Tenant</button>
          </div>

          <form onSubmit={handleAssignBed} className="space-y-4">
            {assignMode === 'existing' ? (
              <>
                <div className="space-y-2">
                  <Label>Select Tenant</Label>
                  {unassignedTenants.length > 0 ? (
                    <Select name="tenant_id" required>
                      <SelectTrigger><SelectValue placeholder="Select a tenant" /></SelectTrigger>
                      <SelectContent>
                        {unassignedTenants.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="p-3 bg-amber-500/10 text-amber-600 rounded text-sm border border-amber-500/20">
                      No unassigned active tenants found for this property.
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Rent Override (Optional)</Label>
                  <Input name="rent_override" type="number" min="0" placeholder="e.g. Leave blank to use room's default rent" />
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input name="name" required placeholder="John Doe" />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input name="phone" required placeholder="10-digit number" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Email (Optional)</Label>
                  <Input name="email" type="email" placeholder="john@example.com" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Rent Amount</Label>
                    <Input name="rent_amount" type="number" defaultValue={assignBedData?.defaultRent} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Deposit Amount</Label>
                    <Input name="deposit_amount" type="number" defaultValue={assignBedData?.defaultDeposit} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Move In Date</Label>
                  <Input name="move_in_date" type="date" defaultValue={new Date().toISOString().split('T')[0]} required />
                </div>
              </div>
            )}
            <DialogFooter className="mt-6 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setAssignBedData(null)}>Cancel</Button>
              <Button type="submit" disabled={actionLoading || (assignMode === 'existing' && unassignedTenants.length === 0)}>
                {actionLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {assignMode === 'new' ? 'Onboard & Assign' : 'Assign Bed'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Vacate Bed Dialog */}
      <Dialog open={!!vacateBedId} onOpenChange={(open) => !open && setVacateBedId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vacate Bed</DialogTitle>
            <DialogDescription>
              Are you sure you want to vacate this bed? The assigned tenant will be unlinked from this bed, making it available for new assignments.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setVacateBedId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleVacateBed} disabled={actionLoading}>
              {actionLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Yes, Vacate Bed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
