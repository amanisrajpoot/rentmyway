'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Building2, MessageSquare, Phone, User, Mail, Sparkles, CheckCircle2 } from 'lucide-react';
import { submitEnquiry } from '@/lib/actions/enquiries';
import { toast } from 'sonner';
import Link from 'next/link';

interface EnquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId: string;
  propertyTitle: string;
  brokerId: string;
}

export function EnquiryModal({ isOpen, onClose, propertyId, propertyTitle, brokerId }: EnquiryModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const formData = new FormData(e.currentTarget);
    
    try {
      const result = await submitEnquiry({
        property_id: propertyId,
        broker_id: brokerId,
        name: formData.get('name') as string,
        phone: formData.get('phone') as string,
        email: formData.get('email') as string || null,
        message: formData.get('message') as string || null,
        source: 'explore_page'
      });
      
      if (result.error) {
        toast.error(result.error);
      } else {
        setIsSuccess(true);
      }
    } catch (err: any) {
      toast.error('Failed to submit enquiry');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[425px] border-white/10 bg-background/95 backdrop-blur-xl p-0 overflow-hidden">
        {/* Decorative background element */}
        <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-br from-[oklch(0.55_0.2_265)]/20 to-[oklch(0.60_0.19_280)]/20 blur-xl z-0 pointer-events-none" />
        
        {isSuccess ? (
          <div className="p-8 flex flex-col items-center justify-center text-center space-y-4 relative z-10 animate-fade-in">
            <div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-2">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Enquiry Sent!</h2>
            <p className="text-muted-foreground">
              The property manager has received your details and will contact you shortly regarding <span className="font-medium text-foreground">{propertyTitle}</span>.
            </p>
            <Button onClick={onClose} className="mt-4 w-full">
              Continue Exploring
            </Button>
          </div>
        ) : (
          <div className="relative z-10">
            <DialogHeader className="px-6 pt-6 pb-4 border-b border-white/5">
              <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" /> Contact Owner
              </DialogTitle>
              <DialogDescription>
                Interested in this property? Leave your details and the manager will get back to you.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="name" name="name" required placeholder="John Doe" className="pl-9 bg-card/50" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="phone" name="phone" required placeholder="+91 9876543210" className="pl-9 bg-card/50" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email <span className="text-muted-foreground text-xs font-normal">(Optional)</span></Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="email" name="email" type="email" placeholder="john@example.com" className="pl-9 bg-card/50" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea 
                    id="message" 
                    name="message" 
                    placeholder="I am interested in viewing this property..." 
                    defaultValue={`Hi, I'm interested in ${propertyTitle}. Please contact me.`}
                    className="min-h-[80px] bg-card/50 resize-none" 
                  />
                </div>
              </div>

              <Button type="submit" className="w-full h-11 bg-gradient-to-r from-[oklch(0.55_0.2_265)] to-[oklch(0.60_0.19_280)] text-white shadow-lg shadow-primary/20" disabled={isSubmitting}>
                {isSubmitting ? 'Sending Enquiry...' : 'Send Enquiry'}
              </Button>
              
              <div className="pt-4 border-t border-white/5 text-center mt-2">
                <p className="text-xs text-muted-foreground">
                  Want to skip the forms next time?
                </p>
                <Link href="/signup" className="text-sm font-medium text-primary hover:underline mt-1 inline-block">
                  Create a free RentMyWay account
                </Link>
              </div>
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
