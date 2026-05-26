'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Megaphone, Plus, Trash2, Search, Building2, User, 
  Users, Globe, Loader2, Calendar, MessageSquare
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { createAnnouncement, deleteAnnouncement } from '@/lib/actions/announcements';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { PageLayout, PageHeader, PageToolbar, PageContent } from '@/components/layout/page-layout';

export function AnnouncementsClient({ initialAnnouncements }: { initialAnnouncements: any[] }) {
  const router = useRouter();
  const [announcements, setAnnouncements] = useState(initialAnnouncements);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [properties, setProperties] = useState<{ id: string; title: string }[]>([]);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase.from('properties').select('id, title').order('title');
      setProperties(data || []);
    }
    load();
  }, []);

  const filtered = announcements.filter(a => 
    !search || 
    a.title.toLowerCase().includes(search.toLowerCase()) ||
    a.message.toLowerCase().includes(search.toLowerCase())
  );

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);

    try {
      const data = {
        title: fd.get('title') as string,
        message: fd.get('message') as string,
        target_role: fd.get('target_role') as any || 'all',
        target_property_id: (fd.get('property_id') === 'all' ? null : fd.get('property_id') as string) || null,
        broker_id: '', // Set by server
        is_active: true,
      };

      const result = await createAnnouncement(data as any);
      setAnnouncements([result, ...announcements]);
      toast.success('Announcement broadcasted');
      setDialogOpen(false);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this announcement? This will not remove notifications already sent.')) return;
    try {
      await deleteAnnouncement(id);
      setAnnouncements(prev => prev.filter(a => a.id !== id));
      toast.success('Announcement deleted');
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  return (
    <PageLayout>
      <PageHeader 
        title="Broadcasts"
        description="Broadcast announcements to tenants and owners"
      >
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button className="w-full sm:w-auto bg-gradient-to-r from-[oklch(0.55_0.2_265)] to-[oklch(0.60_0.19_280)] hover:from-[oklch(0.60_0.22_265)] hover:to-[oklch(0.65_0.21_280)] text-white" />}>
            <Megaphone className="h-4 w-4 mr-2" />
            New Announcement
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Broadcast New Announcement</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input name="title" required placeholder="e.g. Scheduled Water Maintenance" />
              </div>
              <div className="space-y-2">
                <Label>Message *</Label>
                <Textarea name="message" required placeholder="Details about the announcement..." rows={4} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Target Audience</Label>
                  <Select name="target_role" defaultValue="all">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Everyone</SelectItem>
                      <SelectItem value="tenant">Tenants Only</SelectItem>
                      <SelectItem value="owner">Owners Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Linked Property</Label>
                  <Select name="property_id" defaultValue="all">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Properties</SelectItem>
                      {properties.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Broadcast
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <PageToolbar>
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search announcements..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-card"
          />
        </div>
      </PageToolbar>

      <PageContent>
      <div className="grid grid-cols-1 gap-4">
        {filtered.length === 0 ? (
          <Card className="border-border/50 border-dashed">
            <CardContent className="py-20 text-center">
              <Megaphone className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
              <h3 className="font-semibold text-lg">No announcements history</h3>
              <p className="text-muted-foreground text-sm mt-1">Start broadcasting to your network.</p>
            </CardContent>
          </Card>
        ) : (
          filtered.map((a) => (
            <Card key={a.id} className="border-border/50 overflow-hidden hover:border-primary/20 transition-all">
              <CardContent className="p-0">
                <div className="p-4 flex items-start justify-between gap-4">
                  <div className="flex gap-4">
                    <div className="p-2.5 rounded-xl bg-primary/10 text-primary h-fit">
                      <MessageSquare className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-semibold">{a.title}</h3>
                      <div className="flex flex-wrap gap-3 items-center text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(a.created_at), 'dd MMM yyyy')}
                        </span>
                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-muted">
                          {a.target_role === 'all' && <Globe className="h-3 w-3" />}
                          {a.target_role === 'tenant' && <Users className="h-3 w-3" />}
                          {a.target_role === 'owner' && <User className="h-3 w-3" />}
                          <span className="capitalize">{a.target_role || 'Everyone'}</span>
                        </span>
                        {a.property && (
                          <span className="flex items-center gap-1 text-primary/70">
                            <Building2 className="h-3 w-3" />
                            {a.property.title}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon-xs" 
                    className="text-muted-foreground hover:text-red-400"
                    onClick={() => handleDelete(a.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="px-4 pb-4 pl-16">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {a.message}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
      </PageContent>
    </PageLayout>
  );
}
