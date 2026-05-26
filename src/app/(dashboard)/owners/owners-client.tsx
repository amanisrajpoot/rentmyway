'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Owner } from '@/types/database';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Users, Plus, Search, Phone, Mail, MapPin, Loader2,
} from 'lucide-react';
import { createOwner } from '@/lib/actions/properties';
import { toast } from 'sonner';
import { PageLayout, PageHeader, PageToolbar, PageContent } from '@/components/layout/page-layout';

export function OwnersClient({ initialOwners }: { initialOwners: Owner[] }) {
  const router = useRouter();
  const [owners, setOwners] = useState(initialOwners);

  useEffect(() => {
    setOwners(initialOwners);
  }, [initialOwners]);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const filtered = initialOwners.filter((o) =>
    !search ||
    o.name.toLowerCase().includes(search.toLowerCase()) ||
    o.phone.includes(search) ||
    o.email?.toLowerCase().includes(search.toLowerCase())
  );

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);

    try {
      await createOwner({
        name: fd.get('name') as string,
        phone: fd.get('phone') as string,
        email: (fd.get('email') as string) || undefined,
        address: (fd.get('address') as string) || undefined,
      });
      toast.success('Owner added successfully');
      setDialogOpen(false);
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to add owner');
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageLayout>
      <PageHeader 
        title="Owners"
        description={`Manage property owners (${initialOwners.length} total)`}
      >
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button className="w-full sm:w-auto bg-gradient-to-r from-[oklch(0.55_0.2_265)] to-[oklch(0.60_0.19_280)] hover:from-[oklch(0.60_0.22_265)] hover:to-[oklch(0.65_0.21_280)] text-white" />}>
            <Plus className="h-4 w-4 mr-2" />
            Add Owner
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Owner</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <Input name="name" required placeholder="John Doe" />
              </div>
              <div className="space-y-2">
                <Label>Phone *</Label>
                <Input name="phone" required placeholder="+91 98765 43210" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input name="email" type="email" placeholder="owner@email.com" />
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input name="address" placeholder="Full address" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Add Owner
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <PageToolbar>
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search owners..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-card"
          />
        </div>
      </PageToolbar>

      <PageContent>
      {filtered.length === 0 ? (
        <Card className="border-border/50 border-dashed">
          <CardContent className="py-16 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="font-semibold text-lg">No owners found</h3>
            <p className="text-muted-foreground text-sm mt-1">
              Add property owners to start listing their properties.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/50 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Owner</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Since</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((owner) => (
                <TableRow key={owner.id} className="animate-fade-in">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-primary">
                          {owner.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <span className="font-medium">{owner.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1 text-sm">
                      <Phone className="h-3 w-3 text-muted-foreground" />
                      {owner.phone}
                    </span>
                  </TableCell>
                  <TableCell>
                    {owner.email ? (
                      <span className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        {owner.email}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground/50">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {owner.address ? (
                      <span className="flex items-center gap-1 text-sm text-muted-foreground truncate max-w-[200px]">
                        <MapPin className="h-3 w-3 shrink-0" />
                        {owner.address}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground/50">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(owner.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
      </PageContent>
    </PageLayout>
  );
}
