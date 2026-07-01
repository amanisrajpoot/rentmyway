'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { upsertGatewayConfig, testGatewayConnection } from '@/lib/actions/gateway-config';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import type { PgGatewayConfig } from '@/types/database';

export function GatewaySettings({ initialConfig }: { initialConfig?: PgGatewayConfig }) {
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  
  const [appId, setAppId] = useState(initialConfig?.cashfree_key_id || '');
  const [secretKey, setSecretKey] = useState(initialConfig?.cashfree_key_secret || '');
  const [enabled, setEnabled] = useState(initialConfig?.online_payments_enabled || false);
  const [feeType, setFeeType] = useState(initialConfig?.convenience_fee_type || 'percentage');
  const [feeAmount, setFeeAmount] = useState(initialConfig?.convenience_fee_amount?.toString() || '0');

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await upsertGatewayConfig({
        cashfree_key_id: appId,
        cashfree_key_secret: secretKey,
        online_payments_enabled: enabled,
        convenience_fee_type: feeType as 'fixed' | 'percentage',
        convenience_fee_amount: parseFloat(feeAmount) || 0,
      });

      if (res.error) throw new Error(res.error);
      toast.success('Gateway settings saved');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const res = await testGatewayConnection();
      if (res.error) throw new Error(res.error);
      toast.success(res.message || 'Connection successful!');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Payment Gateway Configuration</CardTitle>
        <CardDescription>Connect your Cashfree account to enable online rent collection, split settlements, and auto-debit.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Enable Online Payments</Label>
            <p className="text-sm text-gray-500">Allow tenants to pay via UPI, Cards, NetBanking</p>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Cashfree App ID</Label>
            <Input 
              value={appId} 
              onChange={e => setAppId(e.target.value)} 
              placeholder="TESTxxxxxxxxx" 
              type="password"
            />
          </div>
          <div className="space-y-2">
            <Label>Cashfree Secret Key</Label>
            <Input 
              value={secretKey} 
              onChange={e => setSecretKey(e.target.value)} 
              placeholder="cfsk_xxxxxxxx" 
              type="password"
            />
          </div>
        </div>

        <div className="border-t pt-4 space-y-4">
          <h3 className="text-sm font-medium">Convenience Fee Settings</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fee Type</Label>
              <Select value={feeType} onValueChange={(v) => { if(v) setFeeType(v as 'fixed' | 'percentage'); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage (%)</SelectItem>
                  <SelectItem value="fixed">Fixed Amount (₹)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fee Value</Label>
              <Input 
                type="number" 
                value={feeAmount} 
                onChange={e => setFeeAmount(e.target.value)} 
                min="0"
                step="0.1"
              />
            </div>
          </div>
        </div>

      </CardContent>
      <CardFooter className="flex justify-between border-t pt-6 bg-gray-50">
        <Button variant="outline" onClick={handleTest} disabled={testing || !appId || !secretKey}>
          {testing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Test Connection
        </Button>
        <Button onClick={handleSave} disabled={loading}>
          {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Save Configuration
        </Button>
      </CardFooter>
    </Card>
  );
}
