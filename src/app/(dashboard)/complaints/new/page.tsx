'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createComplaint } from '@/lib/actions/complaints';
import { getUserProfile } from '@/lib/actions/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Save, MessageSquareWarning, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

export default function NewComplaintPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState<string>('tenant');
  
  const [properties, setProperties] = useState<{ id: string; title: string; broker_id: string }[]>([]);
  const [tenants, setTenants] = useState<{ id: string; name: string }[]>([]);
  
  const [selectedProperty, setSelectedProperty] = useState('');
  const [selectedTenant, setSelectedTenant] = useState('');
  const [priority, setPriority] = useState('medium');

  useEffect(() => {
    async function loadData() {
      const profile = await getUserProfile();
      if (!profile) return;
      setUserRole(profile.role);

      const supabase = createClient();
      
      if (profile.role === 'broker') {
        const { data: props } = await supabase
          .from('properties')
          .select('id, title, broker_id')
          .eq('broker_id', profile.id)
          .eq('status', 'rented')
          .order('title');
        setProperties(props || []);
      } else if (profile.role === 'owner') {
        const { data: owners } = await supabase.from('owners').select('id').eq('email', profile.email);
        const ownerIds = owners?.map(o => o.id) || [];
        if (ownerIds.length > 0) {
          const { data: props } = await supabase
            .from('properties')
            .select('id, title, broker_id')
            .in('owner_id', ownerIds)
            .eq('status', 'rented')
            .order('title');
          setProperties(props || []);
        }
      } else if (profile.role === 'tenant') {
        const { data: tnt } = await supabase.from('tenants').select('id, property_id, property:properties(broker_id)').eq('email', profile.email).eq('is_active', true).single();
        if (tnt) {
          setSelectedTenant(tnt.id);
          setSelectedProperty(tnt.property_id);
        }
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    async function loadTenants() {
      if (!selectedProperty || userRole === 'tenant') { setTenants([]); return; }
      const supabase = createClient();
      const { data: tenantData } = await supabase
        .from('tenants')
        .select('id, name')
        .eq('property_id', selectedProperty)
        .eq('is_active', true);
      setTenants(tenantData || []);
      if (tenantData && tenantData.length === 1) {
        setSelectedTenant(tenantData[0].id);
      }
    }
    loadTenants();
  }, [selectedProperty, userRole]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedProperty || !selectedTenant) {
      toast.error('Unable to determine property or tenant');
      return;
    }
    setLoading(true);
    const formData = new FormData(e.currentTarget);

    try {
      const supabase = createClient();
      const { data: prop } = await supabase.from('properties').select('broker_id').eq('id', selectedProperty).single();

      await createComplaint({
        title: formData.get('title') as string,
        description: (formData.get('description') as string) || null,
        tenant_id: selectedTenant,
        property_id: selectedProperty,
        broker_id: prop?.broker_id || '',
        utility_id: null,
        status: 'open',
        priority: priority as 'low' | 'medium' | 'high' | 'urgent',
        resolution_notes: null,
        cost: null,
        images: null,
      });
      toast.success('Complaint created');
      router.push('/complaints');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create complaint');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">New Complaint</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Report a maintenance issue or complaint
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquareWarning className="h-4 w-4 text-primary" />
              Issue Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input name="title" required placeholder="e.g., Leaking tap in kitchen" className="bg-background/50" />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                name="description"
                placeholder="Describe the issue in detail..."
                className="bg-background/50"
                rows={4}
              />
            </div>

            {userRole !== 'tenant' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Property *</Label>
                  <Select value={selectedProperty} onValueChange={(val) => setSelectedProperty(val ?? '')}>
                    <SelectTrigger className="bg-background/50 w-full">
                      <SelectValue placeholder="Select property" />
                    </SelectTrigger>
                    <SelectContent>
                      {properties.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Tenant *</Label>
                  <Select value={selectedTenant} onValueChange={(val) => setSelectedTenant(val ?? '')}>
                    <SelectTrigger className="bg-background/50 w-full">
                      <SelectValue placeholder={tenants.length ? 'Select tenant' : 'Select property first'} />
                    </SelectTrigger>
                    <SelectContent>
                      {tenants.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" />
                Priority
              </Label>
              <Select value={priority} onValueChange={(val) => setPriority(val ?? 'medium')}>
                <SelectTrigger className="bg-background/50 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="bg-gradient-to-r from-[oklch(0.55_0.2_265)] to-[oklch(0.60_0.19_280)] hover:from-[oklch(0.60_0.22_265)] hover:to-[oklch(0.65_0.21_280)] text-white"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Submit Complaint
          </Button>
        </div>
      </form>
    </div>
  );
}
