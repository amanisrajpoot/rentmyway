'use client';

import { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import { 
  BarChart3, PieChart as PieIcon, TrendingUp, Users, Building2, 
  IndianRupee, ArrowUpRight, ArrowDownRight, Wallet, Activity
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const COLORS = [
  'oklch(0.65 0.15 265)', // Primary
  'oklch(0.70 0.14 160)', // Secondary/Emerald
  'oklch(0.60 0.20 20)',  // Red/Rose
  'oklch(0.80 0.15 80)',  // Amber/Yellow
  'oklch(0.55 0.10 240)', // Blue/Indigo
];

export function AnalyticsClient({ initialData, role }: { initialData: any, role: string }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !initialData) return null;

  if (role === 'broker') {
    const { occupancy, revenueTrends, leadStats, commissionStats } = initialData;

    const occupancyData = [
      { name: 'Occupied', value: occupancy.occupied },
      { name: 'Vacant', value: occupancy.vacant },
      { name: 'Maintenance', value: occupancy.maintenance },
    ];

    const leadData = [
      { name: 'New', count: leadStats.new },
      { name: 'Contacted', count: leadStats.contacted },
      { name: 'Viewing', count: leadStats.viewing },
      { name: 'Negotiating', count: leadStats.negotiating },
      { name: 'Converted', count: leadStats.converted },
    ];

    return (
      <div className="space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-border/50 bg-background/50">
            <CardContent className="pt-4 flex items-center gap-4">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Total Revenue</p>
                <p className="text-xl font-bold">₹{commissionStats.total.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-background/50">
            <CardContent className="pt-4 flex items-center gap-4">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Occupancy Rate</p>
                <p className="text-xl font-bold">
                  {occupancy.total > 0 ? Math.round((occupancy.occupied / occupancy.total) * 100) : 0}%
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-background/50">
            <CardContent className="pt-4 flex items-center gap-4">
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Lead Conversion</p>
                <p className="text-xl font-bold">
                  {leadData.reduce((s, c) => s + c.count, 0) > 0 
                    ? Math.round((leadStats.converted / leadData.reduce((s, c) => s + c.count, 0)) * 100) 
                    : 0}%
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-background/50">
            <CardContent className="pt-4 flex items-center gap-4">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Pending Payouts</p>
                <p className="text-xl font-bold">₹{commissionStats.pending.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Trend */}
          <Card className="border-border/50 bg-background/50">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Revenue Growth
              </CardTitle>
              <CardDescription className="text-xs">Monthly rental collection trend</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueTrends}>
                  <defs>
                    <linearGradient id="colorAmt" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="oklch(0.65 0.15 265)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="oklch(0.65 0.15 265)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(0.2 0 0 / 0.1)" />
                  <XAxis dataKey="month" fontSize={10} axisLine={false} tickLine={false} />
                  <YAxis fontSize={10} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v/1000}k`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'oklch(0.2 0 0)', border: 'none', borderRadius: '8px', fontSize: '12px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Area type="monotone" dataKey="amount" stroke="oklch(0.65 0.15 265)" fillOpacity={1} fill="url(#colorAmt)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Lead Funnel */}
          <Card className="border-border/50 bg-background/50">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Lead Conversion Funnel
              </CardTitle>
              <CardDescription className="text-xs">Lead status distribution</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={leadData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="oklch(0.2 0 0 / 0.1)" />
                  <XAxis type="number" fontSize={10} axisLine={false} tickLine={false} />
                  <YAxis dataKey="name" type="category" fontSize={10} axisLine={false} tickLine={false} width={80} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'oklch(0.2 0 0)', border: 'none', borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Bar dataKey="count" fill="oklch(0.70 0.14 160)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Occupancy Chart */}
          <Card className="border-border/50 bg-background/50">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <PieIcon className="h-4 w-4 text-primary" />
                Property Status
              </CardTitle>
              <CardDescription className="text-xs">Current occupancy distribution</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px] flex items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={occupancyData}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {occupancyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'oklch(0.2 0 0)', border: 'none', borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Table of Properties */}
          <Card className="border-border/50 bg-background/50">
            <CardHeader>
              <CardTitle className="text-sm">Recent Activity</CardTitle>
              <CardDescription className="text-xs">Latest revenue updates</CardDescription>
            </CardHeader>
            <CardContent>
               <div className="space-y-4">
                 <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground pb-2 border-b border-border/50">
                   <span>Deal Pipeline</span>
                   <span>Value</span>
                 </div>
                 {leadData.filter(l => l.count > 0).map((l, i) => (
                   <div key={i} className="flex items-center justify-between">
                     <span className="text-sm">{l.name} Leads</span>
                     <span className="font-bold">{l.count}</span>
                   </div>
                 ))}
               </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Owner View
  const { propertyPerformance, cashflow } = initialData;

  return (
    <div className="space-y-6">
      {/* Cashflow Chart */}
      <Card className="border-border/50 bg-background/50">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Net Cashflow Trend
          </CardTitle>
          <CardDescription className="text-xs">Rent income vs property expenses</CardDescription>
        </CardHeader>
        <CardContent className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={cashflow}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(0.2 0 0 / 0.1)" />
              <XAxis dataKey="month" fontSize={10} axisLine={false} tickLine={false} />
              <YAxis fontSize={10} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v/1000}k`} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'oklch(0.2 0 0)', border: 'none', borderRadius: '8px', fontSize: '12px' }}
              />
              <Legend verticalAlign="top" height={36} align="right" iconType="circle" />
              <Bar dataKey="rent" name="Income" fill="oklch(0.70 0.14 160)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" name="Expenses" fill="oklch(0.60 0.20 20)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Yield Analysis */}
        <Card className="lg:col-span-2 border-border/50 bg-background/50">
          <CardHeader>
            <CardTitle className="text-sm">Property ROI & Yield</CardTitle>
            <CardDescription className="text-xs">Efficiency ratio per property</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={propertyPerformance} layout="vertical">
                 <XAxis type="number" fontSize={10} hide />
                 <YAxis dataKey="title" type="category" fontSize={10} width={120} axisLine={false} tickLine={false} />
                 <Tooltip 
                   contentStyle={{ backgroundColor: 'oklch(0.2 0 0)', border: 'none', borderRadius: '8px', fontSize: '12px' }}
                   formatter={(v: any) => [`${v.toFixed(1)}%`, 'Yield']}
                 />
                 <Bar dataKey="yield" fill="oklch(0.65 0.15 265)" radius={[0, 4, 4, 0]} />
               </BarChart>
             </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Portfolio Stats */}
        <Card className="border-border/50 bg-background/50">
          <CardHeader>
            <CardTitle className="text-sm">Portfolio Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest">Total Net Profit</p>
              <p className="text-3xl font-bold text-primary">
                ₹{propertyPerformance.reduce((s: number, p: any) => s + p.net, 0).toLocaleString()}
              </p>
              <div className="flex items-center gap-1 text-[10px] text-emerald-500 font-bold">
                <ArrowUpRight className="h-3 w-3" />
                <span>ROI positive</span>
              </div>
            </div>
            
            <div className="space-y-4 pt-4 border-t border-border/50">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Top Performer</span>
                <span className="text-xs font-bold text-foreground">
                  {propertyPerformance.length > 0 ? propertyPerformance.sort((a: any, b: any) => b.yield - a.yield)[0].title : 'N/A'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Avg. Portfolio Yield</span>
                <span className="text-xs font-bold text-foreground">
                  {propertyPerformance.length > 0 
                    ? (propertyPerformance.reduce((s: number, p: any) => s + p.yield, 0) / propertyPerformance.length).toFixed(1) 
                    : 0}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
