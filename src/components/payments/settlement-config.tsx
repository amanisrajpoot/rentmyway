'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { addSettlementAccount, getSettlementAccounts, configureSettlementSplit } from '@/lib/actions/settlements';
import { toast } from 'sonner';
import { Loader2, Landmark, ShieldCheck } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { SettlementAccount } from '@/types/database';

export function SettlementConfig({ ownerId, propertyId }: { ownerId: string, propertyId?: string }) {
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<SettlementAccount[]>([]);
  
  // New account form
  const [accName, setAccName] = useState('');
  const [accNumber, setAccNumber] = useState('');
  const [ifsc, setIfsc] = useState('');
  
  // Split config
  const [brokerSplit, setBrokerSplit] = useState(5);
  const [ownerSplit, setOwnerSplit] = useState(95);

  const loadAccounts = async () => {
    const res = await getSettlementAccounts(ownerId);
    if (res.data) setAccounts(res.data);
  };

  useEffect(() => {
    loadAccounts();
  }, [ownerId]);

  const handleAddAccount = async () => {
    setLoading(true);
    try {
      const res = await addSettlementAccount({
        owner_id: ownerId,
        account_name: accName,
        account_number: accNumber,
        ifsc_code: ifsc,
        is_default: accounts.length === 0,
        bank_name: 'Cashfree Verified Bank' // Mock value
      });

      if (res.error) throw new Error(res.error);
      toast.success('Account added successfully');
      setAccName(''); setAccNumber(''); setIfsc('');
      loadAccounts();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSplit = async () => {
    if (!propertyId) return;
    setLoading(true);
    try {
      const res = await configureSettlementSplit({
        property_id: propertyId,
        broker_percent: brokerSplit,
        owner_percent: ownerSplit
      });
      if (res.error) throw new Error(res.error);
      toast.success('Split configuration saved');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Bank Accounts</CardTitle>
          <CardDescription>Manage bank accounts for automatic rent settlement payouts.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account Name</TableHead>
                <TableHead>Account Number</TableHead>
                <TableHead>IFSC Code</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-4 text-gray-500">No accounts added yet.</TableCell>
                </TableRow>
              )}
              {accounts.map(acc => (
                <TableRow key={acc.id}>
                  <TableCell className="font-medium">
                    {acc.account_name} 
                    {acc.is_default && <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">Default</span>}
                  </TableCell>
                  <TableCell>••••{acc.account_number.slice(-4)}</TableCell>
                  <TableCell>{acc.ifsc_code}</TableCell>
                  <TableCell>
                    {acc.is_verified ? (
                      <span className="flex items-center text-green-600 text-sm gap-1">
                        <ShieldCheck className="w-4 h-4" /> Verified
                      </span>
                    ) : (
                      <span className="text-yellow-600 text-sm">Pending</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="bg-gray-50 p-4 rounded-lg space-y-4 border">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Landmark className="w-4 h-4" /> Add New Account
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Account Holder Name</Label>
                <Input value={accName} onChange={e => setAccName(e.target.value)} placeholder="John Doe" />
              </div>
              <div className="space-y-2">
                <Label>Account Number</Label>
                <Input value={accNumber} onChange={e => setAccNumber(e.target.value)} placeholder="0000000000" type="password" />
              </div>
              <div className="space-y-2">
                <Label>IFSC Code</Label>
                <Input value={ifsc} onChange={e => setIfsc(e.target.value)} placeholder="HDFC0001234" />
              </div>
            </div>
            <Button onClick={handleAddAccount} disabled={loading || !accName || !accNumber || !ifsc}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Add Account
            </Button>
          </div>
        </CardContent>
      </Card>

      {propertyId && (
        <Card>
          <CardHeader>
            <CardTitle>Settlement Split Configuration</CardTitle>
            <CardDescription>Configure how rent collected for this property is split automatically.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 max-w-sm">
              <div className="space-y-2">
                <Label>Owner Share (%)</Label>
                <Input 
                  type="number" 
                  value={ownerSplit} 
                  onChange={e => {
                    const val = Number(e.target.value);
                    setOwnerSplit(val);
                    setBrokerSplit(100 - val);
                  }} 
                  min="0" max="100" 
                />
              </div>
              <div className="space-y-2">
                <Label>Broker Share (%)</Label>
                <Input 
                  type="number" 
                  value={brokerSplit} 
                  onChange={e => {
                    const val = Number(e.target.value);
                    setBrokerSplit(val);
                    setOwnerSplit(100 - val);
                  }} 
                  min="0" max="100" 
                />
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleSaveSplit} disabled={loading || (ownerSplit + brokerSplit !== 100)}>
              Save Split Rule
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
