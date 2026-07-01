'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { getTaxConfig, upsertTaxConfig } from '@/lib/actions/tax-calculations';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import type { TaxConfig } from '@/types/database';

export function TaxSettings({ propertyId }: { propertyId: string }) {
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  
  const [gstEnabled, setGstEnabled] = useState(false);
  const [gstNumber, setGstNumber] = useState('');
  const [gstPercent, setGstPercent] = useState(18);
  
  const [tdsEnabled, setTdsEnabled] = useState(false);
  const [tdsPercent, setTdsPercent] = useState(10);

  useEffect(() => {
    async function load() {
      const res = await getTaxConfig(propertyId);
      if (res.data) {
        setGstEnabled(res.data.gst_enabled);
        setGstNumber(res.data.gst_number || '');
        setGstPercent(res.data.gst_percent);
        setTdsEnabled(res.data.tds_enabled);
        setTdsPercent(res.data.tds_percent);
      }
      setInitialLoad(false);
    }
    load();
  }, [propertyId]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await upsertTaxConfig({
        property_id: propertyId,
        gst_enabled: gstEnabled,
        gst_number: gstNumber,
        gst_percent: gstPercent,
        tds_enabled: tdsEnabled,
        tds_percent: tdsPercent
      });
      if (res.error) throw new Error(res.error);
      toast.success('Tax configuration saved');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (initialLoad) return <div className="p-4 flex justify-center"><Loader2 className="animate-spin text-gray-400" /></div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tax & Compliance</CardTitle>
        <CardDescription>Configure GST and TDS rules for this property.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* GST Section */}
        <div className="space-y-4 border p-4 rounded-lg bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base font-medium">Enable GST Collection</Label>
              <p className="text-sm text-gray-500">Automatically calculate and apply GST on rent invoices.</p>
            </div>
            <Switch checked={gstEnabled} onCheckedChange={setGstEnabled} />
          </div>
          
          {gstEnabled && (
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 mt-4">
              <div className="space-y-2">
                <Label>GSTIN Number</Label>
                <Input value={gstNumber} onChange={e => setGstNumber(e.target.value)} placeholder="e.g. 27AAAAA0000A1Z5" />
              </div>
              <div className="space-y-2">
                <Label>GST Percentage (%)</Label>
                <Input type="number" value={gstPercent} onChange={e => setGstPercent(Number(e.target.value))} />
              </div>
            </div>
          )}
        </div>

        {/* TDS Section */}
        <div className="space-y-4 border p-4 rounded-lg bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base font-medium">Enable TDS Deduction</Label>
              <p className="text-sm text-gray-500">Auto-deduct TDS from owner payouts for compliance.</p>
            </div>
            <Switch checked={tdsEnabled} onCheckedChange={setTdsEnabled} />
          </div>
          
          {tdsEnabled && (
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 mt-4">
              <div className="space-y-2">
                <Label>TDS Percentage (%)</Label>
                <Input type="number" value={tdsPercent} onChange={e => setTdsPercent(Number(e.target.value))} />
              </div>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleSave} disabled={loading}>
          {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Save Tax Rules
        </Button>
      </CardFooter>
    </Card>
  );
}
