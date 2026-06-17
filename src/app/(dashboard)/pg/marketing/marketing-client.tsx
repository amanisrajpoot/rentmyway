'use client';

import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { MediaUploader } from '@/components/ui/media-uploader';
import { updateProperty } from '@/lib/actions/properties';
import { toast } from 'sonner';
import { ExternalLink, Printer, MapPin, Phone, Building2, QrCode, Copy, Loader2, MessageCircle } from 'lucide-react';
import type { Property } from '@/types/database';
import Link from 'next/link';

export function MarketingClient({ properties }: { properties: Property[] }) {
  const [selectedId, setSelectedId] = useState<string>(properties[0]?.id || '');
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'assets' | 'settings'>('assets');
  
  const property = properties.find(p => p.id === selectedId);

  if (properties.length === 0) return <div className="text-center py-10 text-muted-foreground">No PG properties found.</div>;

  const brandName = property?.pg_brand_name || property?.title || 'My PG';
  const tagline = property?.pg_tagline || 'Premium Living Space';
  const logoUrl = property?.pg_logo_url;
  
  const [micrositeUrl, setMicrositeUrl] = useState(`https://rentmyway.com/p/${property?.id?.split('-')[0]}`);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setMicrositeUrl(`${window.location.origin}/p/${property?.id}`);
    }
  }, [property?.id]);

  const [logoImages, setLogoImages] = useState<string[]>(logoUrl ? [logoUrl] : []);

  async function handleSaveBrand(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!property) return;
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const payload = {
      pg_brand_name: fd.get('pg_brand_name') as string,
      pg_tagline: fd.get('pg_tagline') as string,
      pg_logo_url: logoImages.length > 0 ? logoImages[0] : null,
    };
    
    const res = await updateProperty(property.id, payload);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success('Brand settings saved successfully');
      // Update local state by forcing a refresh or optimistically update if we had local properties state
    }
    setSaving(false);
  }

  const copyWhatsAppTemplate = () => {
    const text = `🏠 *${brandName}*\n_${tagline}_\n\nLooking for a premium PG in ${property?.locality || 'town'}?\n\nCheck out our amenities, photos, and book directly here:\n${micrositeUrl}\n\nCall ${property?.owner?.phone || 'us'} for queries!`;
    navigator.clipboard.writeText(text);
    toast.success('Template copied to clipboard!');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-wrap items-center gap-4">
        <Select value={selectedId} onValueChange={(val: any) => setSelectedId(val)}>
          <SelectTrigger className="w-[300px] bg-background">
            <SelectValue placeholder="Select Property">
              {property?.title || 'Select Property'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {properties.map(p => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
          </SelectContent>
        </Select>

        {property && (
          <Link href={`/p/${property.id}`} target="_blank">
            <Button variant="outline">
              <ExternalLink className="h-4 w-4 mr-2" /> View Microsite
            </Button>
          </Link>
        )}
      </div>

      <div className="flex gap-2 mb-6 p-1 bg-muted rounded-lg w-fit">
        <button 
          onClick={() => setActiveTab('assets')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'assets' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        >
          Brand Assets & Marketing
        </button>
        <button 
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'settings' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        >
          Brand Settings
        </button>
      </div>

      {activeTab === 'settings' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <Card>
            <CardHeader>
              <CardTitle>Configure PG Branding</CardTitle>
              <CardDescription>Update how your PG is presented on the public microsite and marketing materials.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveBrand} className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label>Brand / PG Name</Label>
                  <Input name="pg_brand_name" defaultValue={property?.pg_brand_name || property?.title} required />
                </div>
                <div className="space-y-2">
                  <Label>Tagline / Slogan</Label>
                  <Input name="pg_tagline" defaultValue={property?.pg_tagline || ''} placeholder="Premium Living Space" />
                </div>
                <div className="space-y-2">
                  <Label>Logo</Label>
                  <MediaUploader
                    value={logoImages}
                    onChange={setLogoImages}
                    maxFiles={1}
                    acceptedTypes="image/*"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Upload a square logo (1:1 aspect ratio recommended)</p>
                </div>
                <div className="pt-2">
                  <Button type="submit" disabled={saving}>
                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Save Branding
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'assets' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Live Preview of Business Card */}
            <Card className="border-border/50">
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Business Card</CardTitle>
                  <Button onClick={handlePrint} variant="outline" size="sm">
                    <Printer className="h-4 w-4 mr-2" /> Print PDF
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="print-area flex flex-col items-center">
                  {/* Front of Card */}
                  <div className="w-[400px] h-[225px] bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl shadow-xl relative overflow-hidden mb-6 flex items-center justify-center border border-white/10 group">
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
                    <div className="z-10 flex flex-col items-center text-center p-6">
                      {logoUrl ? (
                        <img src={logoUrl} alt="Logo" className="h-16 w-16 rounded-xl shadow-lg mb-3 object-cover bg-white p-1" />
                      ) : (
                        <div className="h-14 w-14 rounded-xl bg-primary/20 flex items-center justify-center mb-3">
                          <Building2 className="h-7 w-7 text-primary" />
                        </div>
                      )}
                      <h2 className="text-2xl font-bold text-white tracking-wide">{brandName}</h2>
                      <p className="text-primary-foreground/80 text-sm font-medium tracking-widest uppercase mt-1">{tagline}</p>
                    </div>
                  </div>

                  {/* Back of Card */}
                  <div className="w-[400px] h-[225px] bg-white rounded-xl shadow-xl relative overflow-hidden flex flex-col justify-between p-6 border border-border group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-[100px] -z-10"></div>
                    
                    <div className="space-y-1">
                      <h2 className="text-xl font-bold text-slate-900">{brandName}</h2>
                      <p className="text-sm text-slate-500">Premium PG Accommodation</p>
                    </div>

                    <div className="space-y-3 mt-4">
                      <div className="flex items-center gap-3 text-slate-700">
                        <div className="p-1.5 rounded-full bg-primary/10 text-primary"><Phone className="h-3.5 w-3.5" /></div>
                        <span className="text-sm font-medium">{property?.owner?.phone || '+91 98765 43210'}</span>
                      </div>
                      <div className="flex items-center gap-3 text-slate-700">
                        <div className="p-1.5 rounded-full bg-primary/10 text-primary"><MapPin className="h-3.5 w-3.5" /></div>
                        <span className="text-xs font-medium leading-tight max-w-[250px] truncate">{property?.locality}, {property?.city}</span>
                      </div>
                      <div className="flex items-center gap-3 text-slate-700">
                        <div className="p-1.5 rounded-full bg-primary/10 text-primary"><ExternalLink className="h-3.5 w-3.5" /></div>
                        <span className="text-xs font-medium truncate">rentmyway.com/p/{property?.id?.split('-')[0]}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              {/* QR Code */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center"><QrCode className="w-5 h-5 mr-2 text-primary" /> Microsite QR Code</CardTitle>
                  <CardDescription>Download and print this QR code for your reception area.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center p-6 bg-muted/30">
                  <div className="bg-white p-4 rounded-xl shadow-sm border mb-4">
                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(micrositeUrl)}`} alt="QR Code" width="150" height="150" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">Scan to view {brandName}</p>
                </CardContent>
              </Card>

              {/* Promo Templates */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center"><MessageCircle className="w-5 h-5 mr-2 text-primary" /> Promotional Templates</CardTitle>
                  <CardDescription>Ready-to-use messages for social media & WhatsApp.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted p-4 rounded-lg relative group">
                    <p className="text-sm whitespace-pre-wrap pr-10">
                      🏠 *{brandName}*{'\n'}
                      _{tagline}_{'\n\n'}
                      Looking for a premium PG in {property?.locality || 'town'}?{'\n\n'}
                      Check out our amenities, photos, and book directly here:{'\n'}
                      <span className="text-primary">{micrositeUrl}</span>{'\n\n'}
                      Call {property?.owner?.phone || 'us'} for queries!
                    </p>
                    <Button size="icon" variant="secondary" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={copyWhatsAppTemplate}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* Global Print Styles to make only the cards print */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { position: absolute; left: 0; top: 0; }
          .print-area > div { margin-bottom: 20px; break-inside: avoid; }
          nav, header, footer, aside, button { display: none !important; }
        }
      `}} />
    </div>
  );
}
