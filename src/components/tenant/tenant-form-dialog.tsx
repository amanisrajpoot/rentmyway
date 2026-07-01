'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { createDirectTenant } from '@/lib/actions/tenants';
import { createClient } from '@/lib/supabase/client';

interface Property {
  id: string;
  title: string;
  rent: number;
  deposit: number;
}

interface TenantFormDialogProps {
  onSuccess?: (tenant: any) => void;
  trigger?: React.ReactNode;
  defaultPropertyId?: string;
}

export function TenantFormDialog({ onSuccess, trigger, defaultPropertyId }: TenantFormDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState(defaultPropertyId || '');
  
  const [rent, setRent] = useState('');
  const [deposit, setDeposit] = useState('');

  useEffect(() => {
    async function loadProperties() {
      const supabase = createClient();
      const { data } = await supabase
        .from('properties')
        .select('id, title, rent, deposit')
        .eq('status', 'available')
        .order('title');
      setProperties(data || []);
      
      if (defaultPropertyId && data) {
        const prop = data.find(p => p.id === defaultPropertyId);
        if (prop) {
          setRent(prop.rent.toString());
          setDeposit(prop.deposit.toString());
        }
      }
    }
    if (open) {
      loadProperties();
    }
  }, [open, defaultPropertyId]);

  const handlePropertyChange = (val: string | null) => {
    setSelectedProperty(val ?? '');
    const prop = properties.find(p => p.id === val);
    if (prop) {
      setRent(prop.rent.toString());
      setDeposit(prop.deposit.toString());
    }
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    
    try {
      const res = await createDirectTenant({
        name: fd.get('name') as string,
        phone: fd.get('phone') as string,
        email: (fd.get('email') as string) || undefined,
        property_id: selectedProperty,
        rent_amount: parseFloat(rent),
        deposit_amount: parseFloat(deposit),
        move_in_date: fd.get('move_in_date') as string,
      });
      
      if ('error' in res && res.error) {
        throw new Error(res.error);
      }
      
      const tenantData = 'data' in res ? res.data : undefined;
      
      setOpen(false);
      onSuccess?.(tenantData);

      if (tenantData && window.confirm('Tenant created successfully. Would you like to create a rental agreement now?')) {
        router.push(`/leases/new?tenantId=${tenantData.id}`);
      } else {
        toast.success('Tenant created successfully');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to create tenant');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        (trigger as React.ReactElement) || (
          <Button variant="default" size="sm">
            <UserPlus className="h-4 w-4 mr-2" />
            New Tenant
          </Button>
        )
      } />
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Tenant</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Property *</Label>
            <Select value={selectedProperty} onValueChange={handlePropertyChange} required>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select available property">
                  {(value) => {
                    if (!value) return null;
                    const prop = properties.find(p => p.id === value);
                    return prop ? prop.title : null;
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {properties.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                ))}
                {properties.length === 0 && (
                  <SelectItem value="" disabled>No available properties</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Name *</Label>
            <Input name="name" required placeholder="Full Name" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Phone *</Label>
              <Input name="phone" required type="tel" placeholder="10 digits" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input name="email" type="email" placeholder="Optional" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Rent (₹) *</Label>
              <Input 
                type="number" 
                value={rent}
                onChange={(e) => setRent(e.target.value)}
                required 
              />
            </div>
            <div className="space-y-2">
              <Label>Deposit (₹) *</Label>
              <Input 
                type="number" 
                value={deposit}
                onChange={(e) => setDeposit(e.target.value)}
                required 
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Move-in Date *</Label>
            <Input name="move_in_date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Tenant
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
