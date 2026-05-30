'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { OwnerDocument } from '@/types/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { format } from 'date-fns';
import {
  FileText, Upload, Trash2, Download, Search, Building2,
  FileBadge, Shield, FileCheck, FileCode, Loader2, ExternalLink,
} from 'lucide-react';
import { createOwnerDocument, deleteOwnerDocument } from '@/lib/actions/owner-operations';
import { createClient } from '@/lib/supabase/client';
import { MediaUploader } from '@/components/ui/media-uploader';
import { toast } from 'sonner';

const docTypeLabels: Record<string, string> = {
  sale_deed: 'Sale Deed',
  property_tax_receipt: 'Property Tax Receipt',
  insurance_policy: 'Insurance Policy',
  society_noc: 'Society NOC',
  encumbrance_certificate: 'Encumbrance Certificate',
  index_ii: 'Index II',
  '7_12_extract': '7/12 Extract',
  building_plan: 'Building Plan',
  completion_certificate: 'Completion Certificate',
  other: 'Other Document',
};

const docIcons: Record<string, any> = {
  sale_deed: FileBadge,
  insurance_policy: Shield,
  property_tax_receipt: FileCheck,
  building_plan: FileCode,
  other: FileText,
};

export function DocumentsClient({ initialDocuments }: { initialDocuments: OwnerDocument[] }) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fileUrls, setFileUrls] = useState<string[]>([]);
  const [properties, setProperties] = useState<{ id: string; title: string }[]>([]);
  const [ownerId, setOwnerId] = useState<string>('');

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: owners } = await supabase.from('owners').select('id').eq('profile_id', user.id).single();
      if (owners) setOwnerId(owners.id);

      const { data: props } = await supabase.from('properties').select('id, title').eq('owner_id', owners?.id).order('title');
      setProperties(props || []);
    }
    load();
  }, []);

  const filtered = initialDocuments.filter((doc) =>
    !search ||
    doc.file_name?.toLowerCase().includes(search.toLowerCase()) ||
    doc.property?.title.toLowerCase().includes(search.toLowerCase()) ||
    docTypeLabels[doc.doc_type].toLowerCase().includes(search.toLowerCase())
  );

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (fileUrls.length === 0) {
      toast.error('Please upload a file');
      return;
    }
    setSaving(true);
    const fd = new FormData(e.currentTarget);

    try {
      const res = await createOwnerDocument({
        owner_id: ownerId,
        property_id: fd.get('property_id') as string || null,
        doc_type: fd.get('doc_type') as any,
        file_url: fileUrls[0],
        file_name: fd.get('file_name') as string || null,
        expiry_date: fd.get('expiry_date') as string || null,
      });
      if ('error' in res && res.error) {
        throw new Error(res.error);
      }
      toast.success('Document uploaded to vault');
      setDialogOpen(false);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to remove this document?')) return;
    try {
      const res = await deleteOwnerDocument(id);
      if ('error' in res && res.error) {
        throw new Error(res.error);
      }
      toast.success('Document removed');
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Property Vault</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Secure storage for your property documents and receipts
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button className="bg-gradient-to-r from-[oklch(0.55_0.2_265)] to-[oklch(0.60_0.19_280)] hover:from-[oklch(0.60_0.22_265)] hover:to-[oklch(0.65_0.21_280)] text-white" />}>
            <Upload className="h-4 w-4 mr-2" />
            Upload Document
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Document to Vault</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpload} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Document Type *</Label>
                <Select name="doc_type" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(docTypeLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Linked Property</Label>
                <Select name="property_id">
                  <SelectTrigger>
                    <SelectValue placeholder="Select property (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">General / No Property</SelectItem>
                    {properties.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Custom Name (Optional)</Label>
                <Input name="file_name" placeholder="e.g. Sale Deed 2023" />
              </div>
              <div className="space-y-2">
                <Label>Expiry Date (if any)</Label>
                <Input name="expiry_date" type="date" />
              </div>
              <div className="space-y-2">
                <Label>File *</Label>
                <MediaUploader
                  value={fileUrls}
                  onChange={setFileUrls}
                  maxFiles={1}
                  acceptedTypes="application/pdf,image/*"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={saving || fileUrls.length === 0}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Save to Vault
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or property..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-card"
        />
      </div>

      {/* Document Grid */}
      {filtered.length === 0 ? (
        <Card className="border-border/50 border-dashed">
          <CardContent className="py-16 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="font-semibold text-lg">Your vault is empty</h3>
            <p className="text-muted-foreground text-sm mt-1">
              Upload important property documents for easy access.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
          {filtered.map((doc) => {
            const Icon = docIcons[doc.doc_type] || FileText;
            return (
              <Card key={doc.id} className="border-border/50 group hover:border-primary/20 transition-all overflow-hidden">
                <CardContent className="p-0">
                  <div className="p-4 flex items-start gap-3 bg-muted/20 border-b border-border/40">
                    <div className="p-2 rounded-lg bg-background border border-border/50 shadow-sm shrink-0">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-sm truncate leading-tight">
                        {doc.file_name || docTypeLabels[doc.doc_type]}
                      </h3>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mt-0.5">
                        {docTypeLabels[doc.doc_type]}
                      </p>
                    </div>
                  </div>
                  <div className="p-4 space-y-3">
                    {doc.property && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Building2 className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{doc.property.title}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-2">
                      <p className="text-[10px] text-muted-foreground">
                        Uploaded {format(new Date(doc.uploaded_at), 'dd MMM yyyy')}
                      </p>
                      <div className="flex items-center gap-1">
                        <a 
                          href={doc.file_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }))}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-red-400 hover:text-red-500 hover:bg-red-500/10"
                          onClick={() => handleDelete(doc.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
