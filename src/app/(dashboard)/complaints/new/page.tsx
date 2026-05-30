'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createComplaint } from '@/lib/actions/complaints';
import { getUserProfile } from '@/lib/actions/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Save, MessageSquareWarning, AlertTriangle, Camera } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { MediaUploader } from '@/components/ui/media-uploader';
import { COMPLAINT_CATEGORY_LABELS } from '@/types/database';
import { VoiceAssistant } from '@/components/ui/voice-assistant';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { TenantFormDialog } from '@/components/tenant/tenant-form-dialog';

export default function NewComplaintPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState<string>('tenant');
  
  const [properties, setProperties] = useState<{ id: string; title: string; broker_id: string }[]>([]);
  const [tenants, setTenants] = useState<{ id: string; name: string }[]>([]);
  
  const [selectedProperty, setSelectedProperty] = useState('');
  const [selectedTenant, setSelectedTenant] = useState('');
  const [priority, setPriority] = useState('medium');
  const [category, setCategory] = useState('other');
  const [images, setImages] = useState<string[]>([]);

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
        // Find owner record(s) by profile_id or email
        let { data: owners } = await supabase.from('owners').select('id').eq('profile_id', profile.id);
        if (!owners || owners.length === 0) {
          const { data: ownersByEmail } = await supabase.from('owners').select('id').eq('email', profile.email);
          owners = ownersByEmail;
        }
        
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
        // Find tenant record by profile_id or email
        let { data: tnt } = await supabase
          .from('tenants')
          .select('id, property_id, property:properties(broker_id)')
          .eq('profile_id', profile.id)
          .eq('is_active', true)
          .maybeSingle();
        
        if (!tnt && profile.email) {
          const { data: tntByEmail } = await supabase
            .from('tenants')
            .select('id, property_id, property:properties(broker_id)')
            .eq('email', profile.email)
            .eq('is_active', true)
            .maybeSingle();
          tnt = tntByEmail as any;
        }

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

  const handleTenantCreated = (tenant: any) => {
    setTenants(prev => [...prev, { id: tenant.id, name: tenant.name }]);
    setSelectedTenant(tenant.id);
  };

  const handleVoiceData = (data: any) => {
    if (data.title) {
      const el = document.querySelector('input[name="title"]') as HTMLInputElement;
      if (el) el.value = data.title;
    }
    if (data.description) {
      const el = document.querySelector('textarea[name="description"]') as HTMLTextAreaElement;
      if (el) el.value = data.description;
    }
    if (data.priority) {
      setPriority(data.priority);
    }
  };

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

      const res = await createComplaint({
        title: formData.get('title') as string,
        description: (formData.get('description') as string) || null,
        tenant_id: selectedTenant,
        property_id: selectedProperty,
        broker_id: prop?.broker_id || '',
        utility_id: null,
        status: 'open',
        priority: priority as any,
        category: category as any,
        resolution_notes: null,
        cost: null,
        images: images.length > 0 ? images : null,
      });
      if (res && 'error' in res && res.error) throw new Error(res.error);
      toast.success('Complaint created');
      router.push('/complaints');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create complaint');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New Complaint</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Report a maintenance issue or complaint
          </p>
        </div>
        <VoiceAssistant formType="complaint" onParsed={handleVoiceData} />
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
                  <div className="flex gap-2">
                    <Select value={selectedProperty} onValueChange={(val) => setSelectedProperty(val ?? '')}>
                      <SelectTrigger className="bg-background/50 w-full">
                        <SelectValue placeholder="Select property">
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
                      </SelectContent>
                    </Select>
                    <Link href="/properties/new" className={buttonVariants({ variant: 'outline', size: 'icon' })} title="Add Property">
                      <Plus className="h-4 w-4" />
                    </Link>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Tenant *</Label>
                  <div className="flex gap-2">
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
                    <TenantFormDialog onSuccess={handleTenantCreated} defaultPropertyId={selectedProperty} />
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={category} onValueChange={(val) => setCategory(val ?? 'other')}>
                  <SelectTrigger className="bg-background/50 w-full">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(COMPLAINT_CATEGORY_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Camera className="h-4 w-4 text-primary" />
              Photos / Videos of the Issue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MediaUploader
              value={images}
              onChange={setImages}
              maxFiles={5}
              acceptedTypes="image/*,video/*"
            />
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
