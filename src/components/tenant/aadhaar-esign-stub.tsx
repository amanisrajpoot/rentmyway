'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Fingerprint, Loader2, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { initiateESign, verifyAadhaarOtp } from '@/lib/actions/esign';
import { toast } from 'sonner';

interface AadhaarESignStubProps {
  tenantId: string;
  onSuccess?: () => void;
}

export function AadhaarESignStub({ tenantId, onSuccess }: AadhaarESignStubProps) {
  const [step, setStep] = useState<'init' | 'otp' | 'success'>('init');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  const [aadhaar, setAadhaar] = useState('');
  const [otp, setOtp] = useState('');

  async function handleInitiate(e: React.FormEvent) {
    e.preventDefault();
    if (aadhaar.replace(/\D/g, '').length !== 12) {
      toast.error('Please enter a valid 12-digit Aadhaar number');
      return;
    }
    setLoading(true);
    try {
      const res = await initiateESign(tenantId);
      if (res.error) throw new Error(res.error);
      setSessionId(res.data.id);
      setStep('otp');
      toast.success('OTP sent to Aadhaar linked mobile number');
    } catch (err: any) {
      toast.error(err.message || 'Failed to initiate e-Sign');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!sessionId) return;
    if (otp.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP');
      return;
    }
    setLoading(true);
    try {
      const last4 = aadhaar.replace(/\D/g, '').slice(-4);
      const res = await verifyAadhaarOtp(sessionId, otp, last4, tenantId);
      if (res.error) throw new Error(res.error);
      
      setStep('success');
      toast.success('Agreement successfully e-Signed!');
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-emerald-500/20 bg-emerald-500/5">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Fingerprint className="h-5 w-5 text-emerald-500" />
          e-Sign Agreement
        </CardTitle>
        <CardDescription>Digitally sign your rental agreement using Aadhaar</CardDescription>
      </CardHeader>
      <CardContent>
        {step === 'init' && (
          <form onSubmit={handleInitiate} className="space-y-4">
            <div className="space-y-2">
              <Label>Aadhaar Number</Label>
              <Input 
                placeholder="XXXX XXXX XXXX" 
                value={aadhaar}
                onChange={(e) => setAadhaar(e.target.value)}
                maxLength={14}
              />
              <p className="text-xs text-muted-foreground mt-1 flex items-center">
                <ShieldCheck className="h-3 w-3 mr-1" />
                Your data is securely transmitted to UIDAI
              </p>
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Send OTP
            </Button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleVerify} className="space-y-4">
            <div className="p-3 bg-muted/50 rounded-md text-sm mb-2 text-center">
              OTP sent to mobile number linked with Aadhaar ending in <strong>{aadhaar.replace(/\D/g, '').slice(-4)}</strong>
            </div>
            <div className="space-y-2">
              <Label className="text-center block">Enter 6-digit OTP</Label>
              <Input 
                className="text-center tracking-widest text-lg font-semibold"
                placeholder="------"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Verify & Sign
            </Button>
            <Button type="button" variant="ghost" className="w-full text-xs" onClick={() => setStep('init')}>
              Change Aadhaar Number
            </Button>
          </form>
        )}

        {step === 'success' && (
          <div className="py-6 text-center space-y-3">
            <div className="mx-auto w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-emerald-500" />
            </div>
            <h3 className="font-semibold text-emerald-500">Document e-Signed!</h3>
            <p className="text-sm text-muted-foreground max-w-[250px] mx-auto">
              Your rental agreement has been successfully signed and secured.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
