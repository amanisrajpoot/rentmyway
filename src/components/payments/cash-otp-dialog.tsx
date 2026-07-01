'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { generateCashCollectionOTP, verifyCashCollectionOTP } from '@/lib/actions/cash-collection';
import { Loader2, Banknote } from 'lucide-react';
import { toast } from 'sonner';

interface CashOtpDialogProps {
  scheduleId: string;
  amount: number;
}

export function CashOtpDialog({ scheduleId, amount }: CashOtpDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'init' | 'verify'>('init');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await generateCashCollectionOTP(scheduleId);
      if (res.error) throw new Error(res.error);
      toast.success('OTP sent to tenant!');
      setStep('verify');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (otp.length !== 6) {
      toast.error('Please enter a 6-digit OTP');
      return;
    }
    setLoading(true);
    try {
      const res = await verifyCashCollectionOTP(scheduleId, otp, amount);
      if (res.error) throw new Error(res.error);
      toast.success('Cash payment verified and recorded!');
      setOpen(false);
      setStep('init');
      setOtp('');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setTimeout(() => {
        setStep('init');
        setOtp('');
      }, 300);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="outline" size="sm" className="gap-2" />}>
        <Banknote className="w-4 h-4 text-green-600" />
        Collect Cash
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Secure Cash Collection</DialogTitle>
          <DialogDescription>
            {step === 'init' 
              ? 'Generate a secure OTP to verify cash collection from the tenant.' 
              : 'Enter the 6-digit OTP sent to the tenant\'s WhatsApp.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'init' ? (
          <div className="py-4">
            <p className="text-sm text-gray-500 mb-4">
              Amount to collect: <strong className="text-gray-900">₹{amount.toLocaleString('en-IN')}</strong>
            </p>
            <Button onClick={handleGenerate} disabled={loading} className="w-full">
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Generate & Send OTP
            </Button>
          </div>
        ) : (
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">OTP Code</label>
              <Input 
                value={otp} 
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="text-center text-2xl tracking-widest"
                maxLength={6}
              />
            </div>
            <Button onClick={handleVerify} disabled={loading || otp.length !== 6} className="w-full">
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Verify & Record Payment
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => setStep('init')} disabled={loading}>
              Resend OTP
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
