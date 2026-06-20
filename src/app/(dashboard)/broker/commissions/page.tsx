import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { IndianRupee, HandCoins, Building2, User, Calendar } from 'lucide-react';
import { format } from 'date-fns';

export default async function BrokerCommissionsPage() {
  const supabase = await createClient();

  const { data: commissions } = await supabase
    .from('broker_commissions')
    .select(`
      *,
      property:properties(title),
      tenant:tenants(name)
    `)
    .order('created_at', { ascending: false });

  const totalEarned = commissions?.reduce((acc, curr) => acc + (curr.computed_amount || 0), 0) || 0;
  const totalReceived = commissions?.reduce((acc, curr) => acc + (curr.received_amount || 0), 0) || 0;
  const totalPending = totalEarned - totalReceived;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Commissions Ledger</h1>
        <p className="text-muted-foreground mt-1 text-sm">Track your brokerage earnings and pending payouts.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-emerald-600 flex items-center gap-2">
              <HandCoins className="h-4 w-4" /> Total Earned
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">₹{totalEarned.toLocaleString('en-IN')}</div>
          </CardContent>
        </Card>
        
        <Card className="border-blue-500/20 bg-blue-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-blue-600 flex items-center gap-2">
              <IndianRupee className="h-4 w-4" /> Received
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">₹{totalReceived.toLocaleString('en-IN')}</div>
          </CardContent>
        </Card>

        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-amber-600 flex items-center gap-2">
              <Calendar className="h-4 w-4" /> Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">₹{totalPending.toLocaleString('en-IN')}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Your latest closed deals and commission statuses.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left">
                  <th className="font-medium p-3">Date</th>
                  <th className="font-medium p-3">Property</th>
                  <th className="font-medium p-3">Tenant</th>
                  <th className="font-medium p-3">Amount</th>
                  <th className="font-medium p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {commissions?.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-muted-foreground">No commissions recorded yet. Convert a lead to see it here.</td>
                  </tr>
                ) : (
                  commissions?.map((c) => (
                    <tr key={c.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="p-3 text-muted-foreground">{format(new Date(c.created_at), 'dd MMM yyyy')}</td>
                      <td className="p-3 font-medium flex items-center gap-2">
                        <Building2 className="h-3 w-3 text-muted-foreground" />
                        {c.property?.title || 'N/A'}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <User className="h-3 w-3 text-muted-foreground" />
                          {c.tenant?.name || 'N/A'}
                        </div>
                      </td>
                      <td className="p-3 font-semibold">₹{c.computed_amount?.toLocaleString('en-IN')}</td>
                      <td className="p-3">
                        <Badge variant="outline" className={
                          c.status === 'received' ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' : 
                          'text-amber-500 bg-amber-500/10 border-amber-500/20'
                        }>
                          {c.status.toUpperCase()}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
