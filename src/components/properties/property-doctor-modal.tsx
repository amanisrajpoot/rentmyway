'use client';

import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog';
import { Button, buttonVariants } from '@/components/ui/button';
import { Camera, Upload, AlertTriangle, CheckCircle2, ScanFace, ScanLine } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export function PropertyDoctorModal() {
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<'idle' | 'scanning' | 'results'>('idle');
  const [progress, setProgress] = useState(0);
  const [image, setImage] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      setImage(e.target?.result as string);
      startScan();
    };
    reader.readAsDataURL(file);
  };

  const startScan = () => {
    setStage('scanning');
    setProgress(0);

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setStage('results');
          return 100;
        }
        return prev + 5;
      });
    }, 150);
  };

  const reset = () => {
    setStage('idle');
    setImage(null);
    setProgress(0);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) setTimeout(reset, 200); }}>
      <DialogTrigger>
        <Button variant="outline" size="sm" className="bg-purple-500/10 text-purple-500 hover:bg-purple-500/20 hover:text-purple-600 border-purple-500/20">
          <ScanFace className="h-4 w-4 mr-2" />
          Property Doctor™
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-purple-600">
            <ScanFace className="h-5 w-5" />
            AI Property Doctor
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {stage === 'idle' && (
            <div className="border-2 border-dashed rounded-lg p-12 text-center hover:bg-muted/50 transition-colors">
              <Camera className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
              <p className="text-sm font-medium mb-1">Upload a photo of the property</p>
              <p className="text-xs text-muted-foreground mb-4">Our AI will detect cracks, dampness, and damages.</p>
              
              <label className={buttonVariants({ variant: 'secondary' }) + " cursor-pointer inline-flex"}>
                <Upload className="h-4 w-4 mr-2" />
                Select Image
                <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
              </label>
            </div>
          )}

          {stage === 'scanning' && image && (
            <div className="space-y-6 text-center">
              <div className="relative rounded-lg overflow-hidden border">
                <img src={image} alt="Upload" className="w-full h-auto object-cover opacity-50" />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-500/20 to-transparent animate-scan" style={{ top: `${progress}%`, height: '20%' }} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <ScanLine className="h-16 w-16 text-purple-500 animate-pulse" />
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-purple-600 animate-pulse">Analyzing structures & surfaces...</p>
                <Progress value={progress} className="h-2" />
              </div>
            </div>
          )}

          {stage === 'results' && image && (
            <div className="space-y-4">
              <div className="relative rounded-lg overflow-hidden border">
                <img src={image} alt="Upload" className="w-full h-48 object-cover opacity-80" />
                <div className="absolute top-4 left-4">
                  <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-lg">
                    Defect Detected
                  </span>
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 space-y-3 border">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  AI Diagnostic Report
                </h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                    <span><span className="font-medium text-amber-600">Level 2 Dampness</span> detected on the lower wall. Recommended waterproofing.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Electrical fittings appear intact.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>No structural cracks detected in the visible frame.</span>
                  </li>
                </ul>
              </div>

              <Button onClick={reset} variant="outline" className="w-full">Scan Another Area</Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
