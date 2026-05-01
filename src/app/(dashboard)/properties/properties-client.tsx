'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Property } from '@/types/database';
import { PROPERTY_TYPE_LABELS, FURNISHING_LABELS } from '@/types/database';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Plus,
  Search,
  Building2,
  MapPin,
  IndianRupee,
  MoreVertical,
  Armchair,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { markPropertyAsRented, markPropertyAsAvailable, deleteProperty } from '@/lib/actions/properties';
import { toast } from 'sonner';

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  available: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  rented: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
};

export function PropertiesClient({ initialProperties }: { initialProperties: Property[] }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const filtered = initialProperties.filter((p) => {
    const matchesSearch =
      !search ||
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.locality.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchesType = typeFilter === 'all' || p.property_type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  async function handleStatusChange(id: string, action: 'rent' | 'available') {
    try {
      if (action === 'rent') {
        await markPropertyAsRented(id);
        toast.success('Property marked as rented');
      } else {
        await markPropertyAsAvailable(id);
        toast.success('Property marked as available');
      }
    } catch {
      toast.error('Failed to update property status');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this property?')) return;
    try {
      await deleteProperty(id);
      toast.success('Property deleted');
    } catch {
      toast.error('Failed to delete property');
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Properties</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage your property listings
          </p>
        </div>
        <Link href="/properties/new">
          <Button className="bg-gradient-to-r from-[oklch(0.55_0.2_265)] to-[oklch(0.60_0.19_280)] hover:from-[oklch(0.60_0.22_265)] hover:to-[oklch(0.65_0.21_280)] text-white">
            <Plus className="h-4 w-4 mr-2" />
            Add Property
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search properties..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-card"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? 'all')}>
          <SelectTrigger className="w-[140px] bg-card">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="available">Available</SelectItem>
            <SelectItem value="rented">Rented</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v ?? 'all')}>
          <SelectTrigger className="w-[160px] bg-card">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Object.entries(PROPERTY_TYPE_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Property grid */}
      {filtered.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="py-16 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="font-semibold text-lg">No properties found</h3>
            <p className="text-muted-foreground text-sm mt-1">
              {search || statusFilter !== 'all' || typeFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Start by adding your first property'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((property) => (
            <Card
              key={property.id}
              className="border-border/50 hover:border-border transition-colors group animate-slide-up overflow-hidden"
            >
              <div className="h-40 bg-gradient-to-br from-primary/10 to-chart-2/10 flex items-center justify-center relative">
                {property.images && property.images.length > 0 ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img 
                    src={property.images[0]} 
                    alt={property.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Building2 className="h-12 w-12 text-muted-foreground/20" />
                )}
                <Badge className={`absolute top-3 right-3 ${statusColors[property.status]}`}>
                  {property.status}
                </Badge>
              </div>

              <CardContent className="pt-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold truncate">{property.title}</h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{property.locality}, {property.city}</span>
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-accent">
                      <MoreVertical className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => window.location.href = `/properties/${property.id}`}>
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => window.location.href = `/properties/${property.id}/edit`}>
                        Edit Property
                      </DropdownMenuItem>
                      {property.status === 'available' && (
                        <DropdownMenuItem onClick={() => handleStatusChange(property.id, 'rent')}>
                          Mark as Rented
                        </DropdownMenuItem>
                      )}
                      {property.status === 'rented' && (
                        <DropdownMenuItem onClick={() => handleStatusChange(property.id, 'available')}>
                          Mark as Available
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => handleDelete(property.id)}
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" className="text-xs">
                    {PROPERTY_TYPE_LABELS[property.property_type]}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    <Armchair className="h-3 w-3 mr-1" />
                    {FURNISHING_LABELS[property.furnishing]}
                  </Badge>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                  <div className="flex items-center gap-1">
                    <IndianRupee className="h-4 w-4 text-primary" />
                    <span className="font-bold text-lg">
                      {property.rent.toLocaleString('en-IN')}
                    </span>
                    <span className="text-xs text-muted-foreground">/mo</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Deposit: ₹{property.deposit.toLocaleString('en-IN')}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
