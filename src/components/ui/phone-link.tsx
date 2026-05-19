import { Phone, MessageCircle } from 'lucide-react';

interface PhoneLinkProps {
  phone: string;
  className?: string;
  showWhatsApp?: boolean;
}

export function PhoneLink({ phone, className = '', showWhatsApp = true }: PhoneLinkProps) {
  // Normalize phone: remove spaces, dashes, etc.
  const cleanPhone = phone.replace(/[\s\-()]/g, '');
  // For WhatsApp, ensure it has a country code. If it starts with 0, assume India (+91).
  const waPhone = cleanPhone.startsWith('+') 
    ? cleanPhone.replace('+', '') 
    : cleanPhone.startsWith('0') 
      ? `91${cleanPhone.slice(1)}` 
      : `91${cleanPhone}`;

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <a
        href={`tel:${cleanPhone}`}
        className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
        title="Call"
      >
        <Phone className="h-3.5 w-3.5" />
        <span>{phone}</span>
      </a>
      {showWhatsApp && (
        <a
          href={`https://wa.me/${waPhone}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 transition-colors"
          title="Open in WhatsApp"
        >
          <MessageCircle className="h-3.5 w-3.5" />
        </a>
      )}
    </span>
  );
}
