'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { DOCUMENT_TYPE_LABELS } from '@/types/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Upload, CheckCircle, AlertCircle, Loader2, FileText, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

interface TenantInfo {
  id: string;
  name: string;
  kyc_token_expiry: string;
}

export default function KYCUploadPage() {
  const params = useParams();
  const token = params.token as string;
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploads, setUploads] = useState<Record<string, { uploading: boolean; done: boolean }>>({});

  useEffect(() => {
    async function verifyToken() {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('tenants')
        .select('id, name, kyc_token_expiry')
        .eq('kyc_token', token)
        .single();

      if (error || !data) {
        setError('Invalid or expired link. Please contact your broker for a new link.');
        setLoading(false);
        return;
      }

      if (new Date(data.kyc_token_expiry) < new Date()) {
        setError('This link has expired. Please contact your broker for a new link.');
        setLoading(false);
        return;
      }

      setTenant(data);
      setLoading(false);
    }

    verifyToken();
  }, [token]);

  async function handleUpload(docType: string, file: File) {
    if (!tenant) return;

    setUploads((prev) => ({ ...prev, [docType]: { uploading: true, done: false } }));

    try {
      const supabase = createClient();
      const ext = file.name.split('.').pop();
      const path = `kyc/${tenant.id}/${docType}.${ext}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path);

      // Save document record
      const { error: dbError } = await supabase.from('documents').insert({
        tenant_id: tenant.id,
        doc_type: docType,
        file_url: publicUrl,
        file_name: file.name,
      });

      if (dbError) throw dbError;

      setUploads((prev) => ({ ...prev, [docType]: { uploading: false, done: true } }));
      toast.success(`${DOCUMENT_TYPE_LABELS[docType as keyof typeof DOCUMENT_TYPE_LABELS]} uploaded successfully`);
    } catch {
      setUploads((prev) => ({ ...prev, [docType]: { uploading: false, done: false } }));
      toast.error('Upload failed. Please try again.');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full border-border/50">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h2 className="text-lg font-bold">Link Invalid</h2>
            <p className="text-muted-foreground text-sm mt-2">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto p-4 py-12 space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[oklch(0.55_0.2_265)] to-[oklch(0.60_0.19_280)] flex items-center justify-center text-white font-bold text-sm">
              R
            </div>
            <span className="font-bold text-lg">
              <span className="bg-gradient-to-r from-[oklch(0.75_0.18_265)] to-[oklch(0.72_0.19_160)] bg-clip-text text-transparent">
                Rent
              </span>
              MyWay
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">KYC Document Upload</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Hi {tenant?.name}, please upload your identity documents below.
          </p>
        </div>

        {/* Security badge */}
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          Your documents are encrypted and stored securely.
        </div>

        {/* Upload Cards */}
        <div className="space-y-3">
          {(['aadhaar', 'pan', 'passport', 'driving_license'] as const).map((docType) => {
            const state = uploads[docType];
            return (
              <Card key={docType} className={`border-border/50 ${state?.done ? 'border-emerald-500/20' : ''}`}>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-4">
                    <div className={`p-2.5 rounded-lg ${state?.done ? 'bg-emerald-500/10' : 'bg-muted'}`}>
                      {state?.done ? (
                        <CheckCircle className="h-5 w-5 text-emerald-500" />
                      ) : (
                        <FileText className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">
                        {DOCUMENT_TYPE_LABELS[docType]}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {state?.done ? 'Uploaded ✓' : 'PDF, JPG, or PNG (max 5MB)'}
                      </p>
                    </div>
                    {state?.uploading ? (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    ) : state?.done ? (
                      <Badge className="bg-emerald-500/15 text-emerald-400">Done</Badge>
                    ) : (
                      <Label htmlFor={`upload-${docType}`} className="cursor-pointer">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors">
                          <Upload className="h-3.5 w-3.5" />
                          Upload
                        </div>
                        <Input
                          id={`upload-${docType}`}
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleUpload(docType, file);
                          }}
                        />
                      </Label>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Mandatory: Aadhaar & PAN. Other documents are optional.
        </p>
      </div>
    </div>
  );
}
