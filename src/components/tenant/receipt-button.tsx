'use client';

import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { PDFGenerator } from '@/lib/utils/pdf-generator';
import { format } from 'date-fns';

interface ReceiptDownloadButtonProps {
  payment: {
    id: string;
    month_year: string;
    amount: number;
    payment_mode: string | null;
    payment_date: string;
    notes?: string | null;
    receipt_number?: string | null;
    property?: {
      title: string;
      address: string;
      locality: string;
      city: string;
    } | null;
    tenant?: {
      name: string;
    } | null;
  };
  tenantName: string;
}

export function ReceiptDownloadButton({ payment, tenantName }: ReceiptDownloadButtonProps) {
  const handleDownload = () => {
    const propertyTitle = payment.property?.title || 'Rented Property';
    const propertyAddress = payment.property?.address || 'N/A';
    const propertyLocality = payment.property?.locality || 'N/A';
    const propertyCity = payment.property?.city || 'N/A';

    PDFGenerator.generateRentReceipt({
      receiptNo: payment.receipt_number || payment.id.slice(0, 8).toUpperCase(),
      date: format(new Date(payment.payment_date), 'dd MMM yyyy'),
      tenantName: tenantName,
      propertyName: propertyTitle,
      propertyAddress: `${propertyAddress}, ${propertyLocality}, ${propertyCity}`,
      amount: payment.amount,
      monthYear: payment.month_year,
      paymentMode: payment.payment_mode || 'other',
      notes: payment.notes || undefined,
    });
  };

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      onClick={handleDownload}
      className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
      title="Download Receipt"
    >
      <Download className="h-4 w-4" />
    </Button>
  );
}
