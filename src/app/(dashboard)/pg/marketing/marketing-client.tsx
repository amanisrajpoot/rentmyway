'use client';

import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ExternalLink, Printer, MapPin, Phone, Building2 } from 'lucide-react';
import type { Property } from '@/types/database';
import Link from 'next/link';

export function MarketingClient({ properties }: { properties: Property[] }) {
  const [selectedId, setSelectedId] = useState<string>(properties[0]?.id || '');
  const property = properties.find(p => p.id === selectedId);

  if (properties.length === 0) return <div className="text-center py-10 text-muted-foreground">No PG properties found.</div>;

  const brandName = property?.pg_brand_name || property?.title || 'My PG';
  const tagline = property?.pg_tagline || 'Premium Living Space';
  const logoUrl = property?.pg_logo_url;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-wrap items-center gap-4">
        <Select value={selectedId} onValueChange={(val: any) => setSelectedId(val)}>
          <SelectTrigger className="w-[300px] bg-background">
            <SelectValue placeholder="Select Property" />
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Live Preview of Business Card */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">Business Card Preview</h3>
            <Button onClick={handlePrint} variant="secondary" size="sm">
              <Printer className="h-4 w-4 mr-2" /> Print / Save PDF
            </Button>
          </div>
          
          <p className="text-sm text-muted-foreground">Tip: Use your browser's Print dialog and set "Background graphics" to enabled, and Margins to "None" for the best result.</p>

          <div className="print-area mt-4">
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
        </div>

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
    </div>
  );
}
