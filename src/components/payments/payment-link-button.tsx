'use client';

import { useState } from 'react';
import { generatePaymentLink } from '@/lib/actions/online-payments';
import { Button } from '@/components/ui/button';
import { Link as LinkIcon, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface PaymentLinkButtonProps {
  scheduleId: string;
  existingUrl?: string | null;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function PaymentLinkButton({ scheduleId, existingUrl, variant = 'outline', size = 'sm' }: PaymentLinkButtonProps) {
  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState<string | null>(existingUrl || null);
  const [copied, setCopied] = useState(false);

  const handleGenerateOrCopy = async () => {
    if (url) {
      navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
      return;
    }

    setLoading(true);
    try {
      const res = await generatePaymentLink(scheduleId);
      if (res.error) throw new Error(res.error);
      if (res.url) {
        setUrl(res.url);
        navigator.clipboard.writeText(res.url);
        setCopied(true);
        toast.success('Link generated and copied!');
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
      variant={url ? 'secondary' : variant} 
      size={size} 
      onClick={handleGenerateOrCopy}
      disabled={loading}
      className="gap-2"
      title={url ? "Copy Payment Link" : "Generate Payment Link"}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : copied ? (
        <Check className="w-4 h-4 text-green-500" />
      ) : (
        <LinkIcon className="w-4 h-4" />
      )}
      {url ? (copied ? 'Copied!' : 'Copy Link') : 'Get Link'}
    </Button>
  );
}
