import { getUserProfile } from '@/lib/actions/auth';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Calendar, ShieldCheck } from 'lucide-react';
import { DOCUMENT_TYPE_LABELS } from '@/types/database';
import { Button } from '@/components/ui/button';

export default async function TenantDocumentsPage() {
  const profile = await getUserProfile();
  if (!profile || profile.role !== 'tenant') redirect('/dashboard');

  const supabase = await createClient();

  // Find active tenant record by email
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, kyc_token, kyc_token_expiry')
    .eq('email', profile.email)
    .eq('is_active', true)
    .single();

  if (!tenant) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 animate-fade-in">
        <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center">
          <FileText className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold">No Tenant Record Found</h2>
        <p className="text-muted-foreground max-w-md">
          We couldn't find an active tenant record for your account.
        </p>
      </div>
    );
  }

  // Fetch documents for this tenant
  const { data: documents } = await supabase
    .from('documents')
    .select('*')
    .eq('tenant_id', tenant.id)
    .order('uploaded_at', { ascending: false });

  const docs = documents || [];

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">My Documents</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Secure access to your lease and KYC documents.
          </p>
        </div>
        
        {tenant.kyc_token && (
          <Button variant="outline" className="border-primary/50 text-primary hover:bg-primary/10">
            <ShieldCheck className="h-4 w-4 mr-2" />
            Update KYC
          </Button>
        )}
      </div>

      {docs.length === 0 ? (
        <Card className="border-border/50 border-dashed">
          <CardContent className="py-16 sm:py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <FileText className="h-8 w-8 text-muted-foreground/30" />
            </div>
            <h3 className="font-semibold text-lg">No documents uploaded</h3>
            <p className="text-muted-foreground text-sm mt-1.5 max-w-sm mx-auto">
              You haven't uploaded any KYC documents or rent agreements yet. Contact your broker if you need to submit documents.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
          {docs.map((doc) => (
            <Card key={doc.id} className="border-border/50 group hover:border-primary/50 transition-colors">
              <CardContent className="p-5 flex items-start gap-4">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm truncate mb-1" title={doc.file_name || 'Document'}>
                    {doc.file_name || 'Document'}
                  </h3>
                  <Badge variant="secondary" className="text-[10px] mb-2 font-medium bg-muted">
                    {DOCUMENT_TYPE_LABELS[doc.doc_type as keyof typeof DOCUMENT_TYPE_LABELS] || doc.doc_type}
                  </Badge>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3 mr-1" />
                    {new Date(doc.uploaded_at).toLocaleDateString()}
                  </div>
                </div>
                <a 
                  href={doc.file_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="shrink-0"
                >
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10">
                    <Download className="h-4 w-4" />
                  </Button>
                </a>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-medium text-sm text-blue-100">Secure Storage</p>
          <p className="text-xs text-blue-200/70 leading-relaxed">
            Your sensitive KYC documents are securely stored and encrypted. They are only accessible by you and your authorized property broker.
          </p>
        </div>
      </div>
    </div>
  );
}
