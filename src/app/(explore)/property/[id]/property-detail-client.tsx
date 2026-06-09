'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Shield, Phone, Sparkles, Share2, Copy, MessageCircle, Mail, Send, Share } from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { EnquiryModal } from '@/components/explore/enquiry-modal';
import { toast } from 'sonner';

interface PropertyDetailClientProps {
  propertyId: string;
  propertyTitle: string;
  brokerId: string;
}

export function PropertyDetailClient({ propertyId, propertyTitle, brokerId }: PropertyDetailClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const shareTitle = `Check out this property: ${propertyTitle}`;

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'RentMyWay',
          text: shareTitle,
          url: shareUrl,
        });
      } catch (err) {
        // user cancelled or error
      }
    } else {
      handleShare();
    }
  };

  const shareTo = (platform: string) => {
    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedTitle = encodeURIComponent(shareTitle);
    
    let url = '';
    switch (platform) {
      case 'whatsapp':
        url = `https://api.whatsapp.com/send?text=${encodedTitle} ${encodedUrl}`;
        break;
      case 'twitter':
        url = `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`;
        break;
      case 'facebook':
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
        break;
      case 'email':
        url = `mailto:?subject=${encodedTitle}&body=Check out this property I found on RentMyWay: ${encodedUrl}`;
        break;
      default:
        handleShare();
        return;
    }
    window.open(url, '_blank');
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl || window.location.href);
      toast.success('Link copied to clipboard!');
    } catch (err) {
      toast.error('Failed to copy link');
    }
  };

  return (
    <>
      {/* Desktop Sticky Sidebar */}
      <div className="hidden lg:block space-y-6 sticky top-24">
        <Card className="border-white/10 relative overflow-hidden bg-card/80 backdrop-blur-xl shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.55_0.2_265)] to-[oklch(0.60_0.19_280)] opacity-[0.08] pointer-events-none" />
          <CardContent className="pt-6 space-y-6 relative z-10">
            <div className="space-y-2">
              <span className="text-xs text-primary uppercase tracking-widest font-semibold flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Managed Property
              </span>
              <h3 className="font-bold text-xl">Interested in this property?</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Get in touch with the property manager directly to schedule a site visit or ask questions.
              </p>
            </div>

            <div className="h-[1px] bg-border/40" />

            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm text-foreground font-medium">
                <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <Shield className="h-4 w-4 text-emerald-500" />
                </div>
                <span>Verified Listing</span>
              </div>
            </div>

            <Button 
              onClick={() => setIsModalOpen(true)}
              className="w-full h-12 bg-gradient-to-r from-[oklch(0.55_0.2_265)] to-[oklch(0.60_0.19_280)] hover:from-[oklch(0.60_0.22_265)] hover:to-[oklch(0.65_0.21_280)] text-white shadow-lg shadow-primary/20 text-base font-semibold transition-all hover:scale-[1.02] gap-2"
            >
              <Phone className="h-4 w-4" />
              Contact Owner
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger className={buttonVariants({ variant: 'outline', className: "w-full h-11 border-white/10 hover:bg-white/5" })}>
                <Share2 className="h-4 w-4 mr-2" /> Share Property
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={8} className="w-64 p-2 rounded-2xl border-white/10 bg-card/95 backdrop-blur-2xl shadow-2xl">
                <div className="px-3 py-2 mb-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Share via</p>
                </div>
                <DropdownMenuItem onClick={() => shareTo('whatsapp')} className="cursor-pointer flex items-center p-3 rounded-xl transition-all text-sm font-medium focus:bg-white/5">
                  <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center mr-3 shrink-0">
                    <MessageCircle className="h-4 w-4 text-emerald-500" />
                  </div>
                  WhatsApp
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => shareTo('twitter')} className="cursor-pointer flex items-center p-3 rounded-xl transition-all text-sm font-medium focus:bg-white/5">
                  <div className="h-8 w-8 rounded-full bg-foreground/5 flex items-center justify-center mr-3 shrink-0">
                    <Send className="h-4 w-4" />
                  </div>
                  Twitter / X
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => shareTo('facebook')} className="cursor-pointer flex items-center p-3 rounded-xl transition-all text-sm font-medium focus:bg-white/5">
                  <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center mr-3 shrink-0">
                    <Share className="h-4 w-4 text-blue-500" />
                  </div>
                  Facebook
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => shareTo('email')} className="cursor-pointer flex items-center p-3 rounded-xl transition-all text-sm font-medium focus:bg-white/5">
                  <div className="h-8 w-8 rounded-full bg-amber-500/10 flex items-center justify-center mr-3 shrink-0">
                    <Mail className="h-4 w-4 text-amber-500" />
                  </div>
                  Email
                </DropdownMenuItem>
                <DropdownMenuSeparator className="my-2 bg-white/5" />
                <DropdownMenuItem onClick={handleShare} className="cursor-pointer flex items-center p-3 rounded-xl transition-all text-sm font-medium focus:bg-white/5">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center mr-3 shrink-0">
                    <Copy className="h-4 w-4 text-primary" />
                  </div>
                  Copy Link
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardContent>
        </Card>
      </div>

      {/* Mobile Bottom Bar */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 p-4 bg-background/80 backdrop-blur-xl border-t border-white/10 shadow-2xl z-50 flex items-center gap-3">
        <Button 
          onClick={handleNativeShare}
          variant="outline"
          size="icon"
          className="h-12 w-12 shrink-0 border-white/10 bg-card/50"
        >
          <Share2 className="h-5 w-5" />
        </Button>
        <Button 
          onClick={() => setIsModalOpen(true)}
          className="flex-1 h-12 bg-gradient-to-r from-[oklch(0.55_0.2_265)] to-[oklch(0.60_0.19_280)] hover:from-[oklch(0.60_0.22_265)] hover:to-[oklch(0.65_0.21_280)] text-white shadow-lg shadow-primary/20 text-base font-semibold gap-2"
        >
          <Phone className="h-4 w-4" />
          Contact Owner
        </Button>
      </div>

      <EnquiryModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        propertyId={propertyId}
        propertyTitle={propertyTitle}
        brokerId={brokerId}
      />
    </>
  );
}
