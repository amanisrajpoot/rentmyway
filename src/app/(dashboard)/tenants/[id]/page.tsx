import { getTenant } from '@/lib/actions/tenants';
import { notFound } from 'next/navigation';
import { DOCUMENT_TYPE_LABELS } from '@/types/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import { format } from 'date-fns';
import {
  ArrowLeft, Phone, Mail, IndianRupee, Calendar, Building2, FileText,
  ExternalLink, CheckCircle, AlertCircle,
} from 'lucide-react';
import { CopyButton } from '@/components/ui/copy-button';
import { cn } from '@/lib/utils';

export default async function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let tenant;
  try {
    const tenantRes = await getTenant(id);
    if ('data' in tenantRes && tenantRes.data) {
      tenant = tenantRes.data;
    }
  } catch {
    notFound();
  }

  if (!tenant) notFound();

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
  const kycUrl = tenant.kyc_token ? `${baseUrl}/kyc?token=${tenant.kyc_token}` : null;

  const documents = tenant.documents || [];
  const requiredDocs = ['aadhaar', 'pan'] as const;
  const uploadedDocTypes = documents.map((d: { doc_type: string }) => d.doc_type);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/tenants" className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }))}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{tenant.name}</h1>
            <Badge variant={tenant.is_active ? 'default' : 'secondary'}>
              {tenant.is_active ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Since {format(new Date(tenant.move_in_date), 'dd MMM yyyy')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Contact */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base">Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{tenant.phone}</span>
              </div>
              {tenant.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{tenant.email}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Documents */}
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                KYC Documents
              </CardTitle>
              {kycUrl && (
                <Badge variant="outline" className="gap-1 text-xs">
                  <ExternalLink className="h-3 w-3" /> KYC Link Active
                </Badge>
              )}
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(DOCUMENT_TYPE_LABELS).map(([type, label]) => {
                  const doc = documents.find((d: { doc_type: string }) => d.doc_type === type);
                  return (
                    <div
                      key={type}
                      className={`flex items-center gap-3 p-3 rounded-lg border ${
                        doc ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-border/50'
                      }`}
                    >
                      {doc ? (
                        <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{label}</p>
                        {doc && (
                          <p className="text-xs text-muted-foreground truncate">
                            Uploaded {format(new Date(doc.uploaded_at), 'dd MMM yyyy')}
                          </p>
                        )}
                      </div>
                      {doc && (
                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>

              {kycUrl && (
                <>
                  <Separator className="my-4" />
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-2">Share this link with the tenant to upload documents:</p>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-background rounded px-2 py-1 flex-1 truncate">
                        {kycUrl}
                      </code>
                      <CopyButton text={kycUrl} />
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Rent Info */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <IndianRupee className="h-4 w-4 text-primary" />
                Rental Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Monthly Rent</span>
                <span className="font-bold">₹{tenant.rent_amount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Deposit</span>
                <span className="font-semibold">₹{tenant.deposit_amount.toLocaleString('en-IN')}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Move-in</span>
                <span className="text-sm">{format(new Date(tenant.move_in_date), 'dd MMM yyyy')}</span>
              </div>
              {tenant.lease_end_date && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Lease End</span>
                  <span className="text-sm">{format(new Date(tenant.lease_end_date), 'dd MMM yyyy')}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Property */}
          {tenant.property && (
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  Property
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Link
                  href={`/properties/${tenant.property.id}`}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  {tenant.property.title}
                </Link>
                <p className="text-xs text-muted-foreground mt-1">
                  {tenant.property.locality}, {tenant.property.city}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
