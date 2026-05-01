'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Tenant } from '@/types/database';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Search, Eye, UserCheck, IndianRupee, Building2, Phone } from 'lucide-react';
import { format } from 'date-fns';

export function TenantsClient({ initialTenants }: { initialTenants: (Tenant & { property?: { id: string; title: string; locality: string; city: string } })[] }) {
  const [search, setSearch] = useState('');
  const [showActive, setShowActive] = useState(true);

  const filtered = initialTenants.filter((t) => {
    const matchesSearch =
      !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.phone.includes(search);
    const matchesActive = showActive ? t.is_active : !t.is_active;
    return matchesSearch && matchesActive;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tenants</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage your tenants
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={showActive ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowActive(true)}
          >
            Active
          </Button>
          <Button
            variant={!showActive ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowActive(false)}
          >
            Past
          </Button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search tenants..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-card"
        />
      </div>

      {filtered.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="py-16 text-center">
            <UserCheck className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="font-semibold text-lg">No tenants found</h3>
            <p className="text-muted-foreground text-sm mt-1">
              Tenants are created when a lead is converted.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/50">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tenant</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Rent</TableHead>
                <TableHead>Move-in</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((tenant) => (
                <TableRow key={tenant.id} className="animate-fade-in">
                  <TableCell>
                    <div>
                      <p className="font-medium">{tenant.name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {tenant.phone}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {tenant.property && (
                      <div className="flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm">{tenant.property.title}</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-0.5">
                      <IndianRupee className="h-3.5 w-3.5" />
                      {tenant.rent_amount.toLocaleString('en-IN')}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(tenant.move_in_date), 'dd MMM yyyy')}
                  </TableCell>
                  <TableCell>
                    <Badge variant={tenant.is_active ? 'default' : 'secondary'}>
                      {tenant.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Link href={`/tenants/${tenant.id}`}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
