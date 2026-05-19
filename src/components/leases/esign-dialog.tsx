'use client';

import { useState, useRef, useEffect } from 'react';
import { 
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { 
  ScrollText, RefreshCw, 
  UploadCloud, Loader2, AlertTriangle, ShieldCheck
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { uploadMedia } from '@/lib/supabase/storage';
import { updateLease } from '@/lib/actions/leases';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';

interface ESignDialogProps {
  lease: any;
  triggerButton?: React.ReactElement;
}

export function ESignDialog({ lease, triggerButton }: ESignDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Signature States (tenant + broker)
  const [tenantSigType, setTenantSigType] = useState<'draw' | 'type'>('draw');
  const [brokerSigType, setBrokerSigType] = useState<'draw' | 'type'>('draw');
  
  const [tenantSigData, setTenantSigData] = useState<string>('');
  const [brokerSigData, setBrokerSigData] = useState<string>('');

  const [tenantTypeName, setTenantTypeName] = useState(lease.tenant?.name || '');
  const [brokerTypeName, setBrokerTypeName] = useState('RentMyWay Partner');

  // Interactive Clauses Customization
  const [clauses, setClauses] = useState('');

  // Auto-populate clauses template on open
  useEffect(() => {
    if (open && lease) {
      const template = `RESIDENTIAL TENANCY CONTRACT AGREEMENT

This Residential Tenancy Contract is executed on this date ${format(new Date(), 'dd MMMM yyyy')} by and between:

LANDLORD / AUTHORIZED PARTNER:
RentMyWay authorized representation on behalf of property ownership.

TENANT:
Name: ${lease.tenant?.name || 'Tenant Name'}
Phone: ${lease.tenant?.phone || 'Tenant Phone'}
Email: ${lease.tenant?.email || 'N/A'}

PREMISES DETAILS:
Property: ${lease.property?.title || 'Tenancy Property'}
Address: ${lease.property?.address || 'Premises Address'}
Locality: ${lease.property?.locality || 'N/A'}, City: ${lease.property?.city || 'N/A'}

WHEREAS, the Landlord agreed to lease the premises and Tenant agreed to take the premises on lease under the following terms:

1. LEASE TERM & DURATIONS:
The tenancy shall begin on ${format(new Date(lease.start_date), 'dd MMM yyyy')} and terminate on ${format(new Date(lease.end_date), 'dd MMM yyyy')}. A mandatory lock-in period of ${lease.lock_in_months || 0} months shall apply from the commencement date, during which neither party may terminate.

2. FINANCIAL OBLIGATIONS:
The monthly rent payable by the Tenant is INR ${lease.monthly_rent?.toLocaleString('en-IN')}/month (exclusive of utility bills). Common society maintenance charge is ₹${(lease.maintenance_charge || 0).toLocaleString('en-IN')}/month.

3. SECURITY DEPOSIT:
The Tenant has deposited an interest-free security amount of INR ${lease.security_deposit?.toLocaleString('en-IN')}. This security deposit will be fully refunded within 30 days of standard move-out inspection, subject to standard damage deductions.

4. ESCALATION STRUCTURE:
Rent escalates at a pre-agreed rate of ${lease.escalation_percent || 5}% every ${lease.escalation_frequency_months || 12} months, computed automatically on the starting monthly rent.

5. NOTICE PERIOD:
Following the lock-in term, either party may terminate this residential contract by issuing a written notice period of ${lease.notice_period_days || 30} days.

6. USE OF PROPERTY & MAINTENANCE:
The Tenant shall keep the premises in a clean, hygienic condition, complying fully with local resident housing society guidelines. Unsanctioned modifications are prohibited. Any structural repairs remain landlord's liability.`;
      
      setClauses(template);
    }
  }, [open, lease]);

  // Canvas Refs for Drawing Signature pads
  const tenantCanvasRef = useRef<HTMLCanvasElement>(null);
  const brokerCanvasRef = useRef<HTMLCanvasElement>(null);
  const [tenantDrawing, setTenantDrawing] = useState(false);
  const [brokerDrawing, setBrokerDrawing] = useState(false);

  // Initialize Canvas stroke parameters
  const initCanvas = (canvas: HTMLCanvasElement | null) => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = '#020617'; // Dark slate blue stroke
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  useEffect(() => {
    if (tenantSigType === 'draw') initCanvas(tenantCanvasRef.current);
  }, [tenantSigType, open]);

  useEffect(() => {
    if (brokerSigType === 'draw') initCanvas(brokerCanvasRef.current);
  }, [brokerSigType, open]);

  // Mouse / Touch handlers for Tenant Canvas Drawing Pad
  const handleTenantMouseDown = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = tenantCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
    setTenantDrawing(true);
  };

  const handleTenantMouseMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!tenantDrawing) return;
    const canvas = tenantCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handleTenantMouseUp = () => {
    setTenantDrawing(false);
    const canvas = tenantCanvasRef.current;
    if (canvas) {
      setTenantSigData(canvas.toDataURL('image/png'));
    }
  };

  const clearTenantCanvas = () => {
    const canvas = tenantCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setTenantSigData('');
  };

  // Mouse / Touch handlers for Broker Canvas Drawing Pad
  const handleBrokerMouseDown = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = brokerCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
    setBrokerDrawing(true);
  };

  const handleBrokerMouseMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!brokerDrawing) return;
    const canvas = brokerCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handleBrokerMouseUp = () => {
    setBrokerDrawing(false);
    const canvas = brokerCanvasRef.current;
    if (canvas) {
      setBrokerSigData(canvas.toDataURL('image/png'));
    }
  };

  const clearBrokerCanvas = () => {
    const canvas = brokerCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setBrokerSigData('');
  };

  // Generates typed signature preview via canvas to inject it cleanly as image
  const generateTypedSigImage = (name: string): string => {
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 100;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0f172a'; // Deep slate blue color
    ctx.font = 'italic 32px Georgia, cursive, "Times New Roman"';
    ctx.fillText(name, 20, 60);
    return canvas.toDataURL('image/png');
  };

  // Main E-Sign submission handler
  const handleSignAndPublish = async () => {
    // 1. Gather signature images
    let tenantSigImg = tenantSigData;
    if (tenantSigType === 'type') {
      if (!tenantTypeName.trim()) {
        toast.error("Please enter Tenant's typed signature");
        return;
      }
      tenantSigImg = generateTypedSigImage(tenantTypeName);
    }

    let brokerSigImg = brokerSigData;
    if (brokerSigType === 'type') {
      if (!brokerTypeName.trim()) {
        toast.error("Please enter Landlord/Broker's typed signature");
        return;
      }
      brokerSigImg = generateTypedSigImage(brokerTypeName);
    }

    if (!tenantSigImg || !brokerSigImg) {
      toast.error("Both Tenant and Broker e-signatures are required to bind this agreement legally.");
      return;
    }

    setLoading(true);
    try {
      // 2. Compile signed legal PDF via jsPDF
      const doc = new jsPDF();
      
      // Top header band
      doc.setFillColor(15, 23, 42); // Primary dark slate
      doc.rect(0, 0, 210, 25, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('RENTMYWAY — SECURE E-SIGN AGREEMENT', 20, 16);
      
      // Stamp Duty Simulation Banner
      doc.setFillColor(243, 244, 246);
      doc.rect(20, 32, 170, 15, 'F');
      doc.setDrawColor(229, 231, 235);
      doc.rect(20, 32, 170, 15, 'S');
      doc.setTextColor(75, 85, 99);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('LEGAL NOTICE: This agreement is electronically signed under Section 65B of the Indian Evidence Act, 1872.', 25, 38);
      doc.text('Captured variables and user profiles verified secure by RentMyWay CRM protocols.', 25, 42);

      // Clauses Content
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');

      const splitText = doc.splitTextToSize(clauses, 170);
      let currentY = 55;
      
      for (const line of splitText) {
        if (currentY > 265) {
          doc.addPage();
          // Header band for new page
          doc.setFillColor(15, 23, 42);
          doc.rect(0, 0, 210, 15, 'F');
          currentY = 25;
        }
        doc.text(line, 20, currentY);
        currentY += 5.5;
      }

      // Ensure space for Signatures block
      if (currentY > 210) {
        doc.addPage();
        doc.setFillColor(15, 23, 42);
        doc.rect(0, 0, 210, 15, 'F');
        currentY = 30;
      } else {
        currentY += 15;
      }

      // Draw horizontal dividing line
      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(0.5);
      doc.line(20, currentY, 190, currentY);
      currentY += 10;

      // Add signature labels
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text('TENANT ELECTRONIC SIGNATURE', 20, currentY);
      doc.text('LANDLORD/PARTNER ELECTRONIC SIGNATURE', 115, currentY);
      currentY += 5;

      // Embed Base64 digital e-signatures
      doc.addImage(tenantSigImg, 'PNG', 20, currentY, 50, 18);
      doc.addImage(brokerSigImg, 'PNG', 115, currentY, 50, 18);
      currentY += 20;

      // Draw signature underscores
      doc.setDrawColor(156, 163, 175);
      doc.line(20, currentY, 70, currentY);
      doc.line(115, currentY, 165, currentY);
      currentY += 5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128);
      doc.text(`Signed by: ${lease.tenant?.name || 'Tenant'}`, 20, currentY);
      doc.text(`Signed by: ${brokerTypeName}`, 115, currentY);
      currentY += 4;
      doc.text(`Date: ${format(new Date(), 'dd MMM yyyy')}`, 20, currentY);
      doc.text(`Date: ${format(new Date(), 'dd MMM yyyy')}`, 115, currentY);

      // 3. Compile blob & upload to Supabase Storage
      const pdfBlob = doc.output('blob');
      const pdfFile = new File([pdfBlob], `Lease_Agreement_${lease.id.slice(0, 8)}_signed.pdf`, {
        type: 'application/pdf'
      });

      const uploadedUrl = await uploadMedia(pdfFile, 'media');

      // 4. Update Database
      await updateLease(lease.id, {
        agreement_url: uploadedUrl
      });

      toast.success("Rent Agreement successfully drafted, e-signed, and published to Vault!");
      setOpen(false);
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to draft and e-sign agreement");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          triggerButton || (
            <Button className="w-full bg-gradient-to-r from-amber-500 via-orange-600 to-primary text-white border-none shadow-lg shadow-orange-600/10 gap-2 h-10 hover:brightness-110">
              <ShieldCheck className="h-4 w-4" />
              Draft & Sign Agreement
            </Button>
          )
        }
      />
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto bg-slate-900 border-slate-800 text-slate-100">
        <DialogHeader className="border-b border-slate-800 pb-4">
          <DialogTitle className="text-xl font-bold flex items-center gap-2 text-amber-400">
            <ScrollText className="h-5 w-5" />
            Digital Agreement Template & E-Sign Pad Workspace
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Customize the Indian residential rental agreement terms and capture digital signatures of both parties.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
          {/* Left Column: Editable Template Clauses */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold text-slate-300">1. Draft & Review Contract Clauses</Label>
              <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/20 bg-emerald-500/5">
                Variables Injected
              </Badge>
            </div>
            <Card className="border-slate-800 bg-slate-950/60">
              <CardContent className="p-3">
                <Textarea
                  value={clauses}
                  onChange={(e) => setClauses(e.target.value)}
                  className="min-h-[380px] bg-slate-950/80 border-slate-800 text-slate-300 font-mono text-xs leading-relaxed resize-y focus-visible:ring-amber-500/50"
                  placeholder="Drafting rent agreement text..."
                />
              </CardContent>
            </Card>
            <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-800 flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-[10px] text-slate-400 leading-relaxed">
                By e-signing this draft, you affirm that the terms described match standard local rental directives and that stamp duties are handled accordingly.
              </p>
            </div>
          </div>

          {/* Right Column: E-Signatures Board */}
          <div className="space-y-6">
            <Label className="text-sm font-semibold text-slate-300">2. Authenticate & Sign Legally</Label>

            {/* Tenant Signature Pad */}
            <Card className="border-slate-800 bg-slate-950/40">
              <CardHeader className="py-3 border-b border-slate-800 bg-slate-950/60">
                <CardTitle className="text-xs font-semibold flex items-center justify-between text-slate-300">
                  <span>Party A: Tenant Signature ({lease.tenant?.name || 'Tenant'})</span>
                  <Badge variant="secondary" className="text-[9px] bg-amber-500/10 text-amber-400">Required</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-3 space-y-3">
                <Tabs value={tenantSigType} onValueChange={(val: any) => setTenantSigType(val)}>
                  <TabsList className="bg-slate-900 border border-slate-800 grid grid-cols-2 h-7 p-0.5">
                    <TabsTrigger value="draw" className="text-[10px] py-1">Draw Signature</TabsTrigger>
                    <TabsTrigger value="type" className="text-[10px] py-1">Type Signature</TabsTrigger>
                  </TabsList>

                  <TabsContent value="draw" className="mt-2.5 space-y-2">
                    <div className="relative border border-slate-800 rounded-lg overflow-hidden bg-slate-50 flex justify-center">
                      <canvas
                        ref={tenantCanvasRef}
                        width={350}
                        height={120}
                        onMouseDown={handleTenantMouseDown}
                        onMouseMove={handleTenantMouseMove}
                        onMouseUp={handleTenantMouseUp}
                        onMouseLeave={handleTenantMouseUp}
                        onTouchStart={handleTenantMouseDown}
                        onTouchMove={handleTenantMouseMove}
                        onTouchEnd={handleTenantMouseUp}
                        className="cursor-crosshair w-full max-w-[350px] h-[120px]"
                      />
                      {!tenantSigData && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400 text-[10px]">
                          Draw with Mouse, Pen, or Finger inside this area
                        </div>
                      )}
                    </div>
                    <div className="flex justify-end">
                      <Button variant="ghost" size="sm" onClick={clearTenantCanvas} className="text-[10px] h-6 text-slate-400 hover:text-slate-200">
                        <RefreshCw className="h-3 w-3 mr-1 animate-spin-hover" /> Clear Draw Board
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="type" className="mt-2.5 space-y-2.5">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-slate-400">Full Signature Name</Label>
                      <Input
                        value={tenantTypeName}
                        onChange={(e) => setTenantTypeName(e.target.value)}
                        className="h-8 bg-slate-950 border-slate-800 text-xs text-slate-200"
                        placeholder="Enter legal name to sign"
                      />
                    </div>
                    <div className="p-3 border border-dashed border-slate-800 rounded-lg bg-slate-950/60 text-center">
                      <span className="font-semibold text-2xl italic tracking-wide font-signature text-amber-500/90 font-serif">
                        {tenantTypeName || 'Cursive Signature'}
                      </span>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Broker Signature Pad */}
            <Card className="border-slate-800 bg-slate-950/40">
              <CardHeader className="py-3 border-b border-slate-800 bg-slate-950/60">
                <CardTitle className="text-xs font-semibold flex items-center justify-between text-slate-300">
                  <span>Party B: Landlord / Partner Signature ({brokerTypeName})</span>
                  <Badge variant="secondary" className="text-[9px] bg-amber-500/10 text-amber-400">Required</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-3 space-y-3">
                <Tabs value={brokerSigType} onValueChange={(val: any) => setBrokerSigType(val)}>
                  <TabsList className="bg-slate-900 border border-slate-800 grid grid-cols-2 h-7 p-0.5">
                    <TabsTrigger value="draw" className="text-[10px] py-1">Draw Signature</TabsTrigger>
                    <TabsTrigger value="type" className="text-[10px] py-1">Type Signature</TabsTrigger>
                  </TabsList>

                  <TabsContent value="draw" className="mt-2.5 space-y-2">
                    <div className="relative border border-slate-800 rounded-lg overflow-hidden bg-slate-50 flex justify-center">
                      <canvas
                        ref={brokerCanvasRef}
                        width={350}
                        height={120}
                        onMouseDown={handleBrokerMouseDown}
                        onMouseMove={handleBrokerMouseMove}
                        onMouseUp={handleBrokerMouseUp}
                        onMouseLeave={handleBrokerMouseUp}
                        onTouchStart={handleBrokerMouseDown}
                        onTouchMove={handleBrokerMouseMove}
                        onTouchEnd={handleBrokerMouseUp}
                        className="cursor-crosshair w-full max-w-[350px] h-[120px]"
                      />
                      {!brokerSigData && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400 text-[10px]">
                          Draw with Mouse, Pen, or Finger inside this area
                        </div>
                      )}
                    </div>
                    <div className="flex justify-end">
                      <Button variant="ghost" size="sm" onClick={clearBrokerCanvas} className="text-[10px] h-6 text-slate-400 hover:text-slate-200">
                        <RefreshCw className="h-3 w-3 mr-1 animate-spin-hover" /> Clear Draw Board
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="type" className="mt-2.5 space-y-2.5">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-slate-400">Authorized Signatory Title</Label>
                      <Input
                        value={brokerTypeName}
                        onChange={(e) => setBrokerTypeName(e.target.value)}
                        className="h-8 bg-slate-950 border-slate-800 text-xs text-slate-200"
                        placeholder="Enter authorized signatory title"
                      />
                    </div>
                    <div className="p-3 border border-dashed border-slate-800 rounded-lg bg-slate-950/60 text-center">
                      <span className="font-semibold text-2xl italic tracking-wide font-signature text-amber-500/90 font-serif">
                        {brokerTypeName || 'Authorized representation'}
                      </span>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Actions panel */}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)} className="border-slate-800 text-slate-300 hover:bg-slate-850 hover:text-white">
                Cancel
              </Button>
              <Button
                onClick={handleSignAndPublish}
                disabled={loading}
                className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-lg border-none"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Publishing to Vault...
                  </>
                ) : (
                  <>
                    <UploadCloud className="h-4 w-4 mr-2" />
                    Approve, Sign & Vault
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
