'use client';

import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { PDFGenerator } from '@/lib/utils/pdf-generator';

interface LeaseDownloadButtonProps {
  lease: any;
}

export function LeaseDownloadButton({ lease }: LeaseDownloadButtonProps) {
  const handleDownload = () => {
    PDFGenerator.generateLeasePDF(lease);
  };

  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={handleDownload}
      className="border-primary/50 text-primary hover:bg-primary/10 transition-colors"
      title="Download Lease Agreement PDF"
    >
      <Download className="h-4 w-4 mr-2" />
      Download Agreement
    </Button>
  );
}
