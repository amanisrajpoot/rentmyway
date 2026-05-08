'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import {
  Wallet, IndianRupee, TrendingUp, Building2, ArrowDown,
  ArrowUp, Banknote, Download,
} from 'lucide-react';
import { PDFGenerator } from '@/lib/utils/pdf-generator';

export function FinancialsClient({ 
  profile, 
  stats, 
  data 
}: { 
  profile: any, 
  stats: any, 
  data: {
    payoutList: any[],
    expenses: any[],
    payments: any[]
  }
}) {
  const { totalRentCollected, totalPayoutsReceived, totalExpenses, monthlyExpectedRent } = stats;
  const { payoutList, expenses, payments } = data;

  const handleDownloadStatement = () => {
    PDFGenerator.generateOwnerStatement(
      profile.full_name || 'Owner',
      format(new Date(), 'MMMM yyyy'),
      {
        income: totalRentCollected,
        expenses: totalExpenses,
        payouts: payoutList,
        expenseList: expenses,
        rentList: payments
      }
    );
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Financials</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Income summary and payout history for your properties.
          </p>
        </div>
        <Button 
          onClick={handleDownloadStatement}
          className="bg-gradient-to-r from-[oklch(0.55_0.2_265)] to-[oklch(0.60_0.19_280)] text-white"
        >
          <Download className="h-4 w-4 mr-2" />
          Download Statement
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 stagger-children">
        <Card className="border-border/50 bg-gradient-to-br from-background to-emerald-500/5">
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10">
                <IndianRupee className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Expected Monthly</p>
                <p className="text-xl font-bold text-emerald-400">₹{monthlyExpectedRent.toLocaleString('en-IN')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-gradient-to-br from-background to-blue-500/5">
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/10">
                <ArrowDown className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Collected</p>
                <p className="text-xl font-bold text-blue-400">₹{totalRentCollected.toLocaleString('en-IN')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-gradient-to-br from-background to-purple-500/5">
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-500/10">
                <ArrowUp className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Payouts Received</p>
                <p className="text-xl font-bold text-purple-400">₹{totalPayoutsReceived.toLocaleString('en-IN')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`border-border/50 bg-gradient-to-br from-background to-red-500/5 ${totalExpenses > 0 ? 'ring-1 ring-red-500/10' : ''}`}>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-red-500/10">
                <ArrowUp className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Expenses</p>
                <p className="text-xl font-bold text-red-400">₹{totalExpenses.toLocaleString('en-IN')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border/50 overflow-hidden">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Banknote className="h-4 w-4 text-primary" />
              Payout History
            </CardTitle>
          </CardHeader>
          {payoutList.length === 0 ? (
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Wallet className="h-8 w-8 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No payouts recorded yet.</p>
              </div>
            </CardContent>
          ) : (
            <div className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payoutList.slice(0, 5).map((payout) => (
                    <TableRow key={payout.id}>
                      <TableCell className="font-medium text-xs">{payout.for_month}</TableCell>
                      <TableCell>
                        <span className="font-semibold text-xs flex items-center gap-0.5">
                          <IndianRupee className="h-3 w-3" />
                          {payout.amount.toLocaleString('en-IN')}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] px-1.5 h-4 ${payout.status === 'paid' ? 'text-emerald-400 border-emerald-500/20' : 'text-amber-400 border-amber-500/20'}`}>
                          {payout.status === 'paid' ? 'Paid' : 'Pending'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>

        <Card className="border-border/50 overflow-hidden">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowUp className="h-4 w-4 text-red-400" />
              Recent Expenses
            </CardTitle>
          </CardHeader>
          {expenses.length === 0 ? (
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">No expenses recorded.</p>
              </div>
            </CardContent>
          ) : (
            <div className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.slice(0, 5).map((exp) => (
                    <TableRow key={exp.id}>
                      <TableCell className="text-xs capitalize">{exp.category.replace('_', ' ')}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{format(new Date(exp.date), 'dd MMM')}</TableCell>
                      <TableCell>
                        <span className="font-semibold text-xs text-red-400">
                          ₹{exp.amount.toLocaleString('en-IN')}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>

      {payments.length > 0 && (
        <Card className="border-border/50 overflow-hidden">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Recent Rent Collections
            </CardTitle>
          </CardHeader>
          <div className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Collected On</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.slice(0, 10).map((payment, i) => (
                  <TableRow key={i} className="animate-fade-in">
                    <TableCell className="font-medium">{payment.month_year}</TableCell>
                    <TableCell>
                      <span className="font-semibold flex items-center gap-0.5 text-emerald-400">
                        <IndianRupee className="h-3.5 w-3.5" />
                        {payment.amount.toLocaleString('en-IN')}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(payment.payment_date), 'dd MMM yyyy')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}
