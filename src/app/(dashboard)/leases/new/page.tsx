'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Loader2, ScrollText, Upload } from 'lucide-react';
import { createLease } from '@/lib/actions/leases';
import { generateRentSchedule } from '@/lib/actions/rent-schedule';
import { createClient } from '@/lib/supabase/client';
import { MediaUploader } from '@/components/ui/media-uploader';
import { toast } from 'sonner';
import Link from 'next/link';

type TenantOption = {
  id: string;
  name: string;
  phone: string;
  property_id: string;
  rent_amount: number;
  deposit_amount: number;
  property?: { title: string } | { title: string }[];
};

export default function NewLeasePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [selectedTenant, setSelectedTenant] = useState('');
  const [agreementUrls, setAgreementUrls] = useState<string[]>([]);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from('tenants')
        .select('id, name, phone, property_id, rent_amount, deposit_amount, property:properties(title)')
        .eq('is_active', true)
        .order('name');
      setTenants(data || []);
    }
    load();
  }, []);

  const activeTenant = tenants.find(t => t.id === selectedTenant);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedTenant || !activeTenant) {
      toast.error('Please select a tenant');
      return;
    }
    setSaving(true);
    const fd = new FormData(e.currentTarget);

    try {
      const startDate = fd.get('start_date') as string;
      const endDate = fd.get('end_date') as string;
      const monthlyRent = parseFloat(fd.get('monthly_rent') as string);

      const lease = await createLease({
        tenant_id: selectedTenant,
        property_id: activeTenant.property_id,
        broker_id: '', // Will be set by server action
        start_date: startDate,
        end_date: endDate,
        lock_in_months: parseInt(fd.get('lock_in_months') as string) || 6,
        notice_period_days: parseInt(fd.get('notice_period_days') as string) || 30,
        monthly_rent: monthlyRent,
        security_deposit: parseFloat(fd.get('security_deposit') as string),
        maintenance_charge: parseFloat(fd.get('maintenance_charge') as string) || 0,
        escalation_percent: parseFloat(fd.get('escalation_percent') as string) || 5,
        escalation_frequency_months: parseInt(fd.get('escalation_frequency') as string) || 12,
        status: 'active',
        renewed_from_id: null,
        renewal_notes: null,
        agreement_url: agreementUrls[0] || null,
        terminated_at: null,
        termination_reason: null,
      });

      // Generate rent schedule
      if (lease?.id) {
        await generateRentSchedule(
          selectedTenant,
          activeTenant.property_id,
          lease.id,
          monthlyRent,
          startDate,
          endDate
        );
      }

      toast.success('Lease created with rent schedule');
      router.push('/leases');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create lease');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Link href="/leases">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New Lease Agreement</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Create a lease and auto-generate a rent schedule
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Tenant Selection */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ScrollText className="h-4 w-4 text-primary" />
              Tenant & Property
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Select Tenant *</Label>
              <Select value={selectedTenant} onValueChange={(val) => setSelectedTenant(val ?? '')}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select an active tenant" />
                </SelectTrigger>
                <SelectContent>
                  {tenants.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} — {Array.isArray(t.property) ? t.property[0]?.title : (t.property as any)?.title || 'Unknown'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Lease Terms */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Lease Period</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date *</Label>
                <Input name="start_date" type="date" required />
              </div>
              <div className="space-y-2">
                <Label>End Date *</Label>
                <Input name="end_date" type="date" required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Lock-in Period (months)</Label>
                <Input name="lock_in_months" type="number" defaultValue={6} min={0} />
              </div>
              <div className="space-y-2">
                <Label>Notice Period (days)</Label>
                <Input name="notice_period_days" type="number" defaultValue={30} min={0} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Financial Terms */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Financial Terms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Monthly Rent (₹) *</Label>
                <Input
                  name="monthly_rent"
                  type="number"
                  required
                  defaultValue={activeTenant?.rent_amount || ''}
                  placeholder="25000"
                />
              </div>
              <div className="space-y-2">
                <Label>Security Deposit (₹) *</Label>
                <Input
                  name="security_deposit"
                  type="number"
                  required
                  defaultValue={activeTenant?.deposit_amount || ''}
                  placeholder="50000"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Maintenance (₹/mo)</Label>
                <Input name="maintenance_charge" type="number" defaultValue={0} min={0} />
              </div>
              <div className="space-y-2">
                <Label>Escalation (%)</Label>
                <Input name="escalation_percent" type="number" defaultValue={5} min={0} step={0.5} />
              </div>
              <div className="space-y-2">
                <Label>Escalation Freq.</Label>
                <Select name="escalation_frequency" defaultValue="12">
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="6">Every 6 months</SelectItem>
                    <SelectItem value="12">Yearly</SelectItem>
                    <SelectItem value="24">Every 2 years</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Agreement Upload */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Upload className="h-4 w-4 text-primary" />
              Agreement Document (Optional)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MediaUploader
              value={agreementUrls}
              onChange={setAgreementUrls}
              maxFiles={1}
              acceptedTypes="application/pdf,image/*"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Upload the signed rent agreement (PDF or image).
            </p>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Link href="/leases">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button
            type="submit"
            disabled={saving || !selectedTenant}
            className="bg-gradient-to-r from-[oklch(0.55_0.2_265)] to-[oklch(0.60_0.19_280)] hover:from-[oklch(0.60_0.22_265)] hover:to-[oklch(0.65_0.21_280)] text-white"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Create Lease & Schedule
          </Button>
        </div>
      </form>
    </div>
  );
}
