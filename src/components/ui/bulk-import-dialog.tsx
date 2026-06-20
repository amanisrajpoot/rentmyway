'use client';

import { useState, useRef } from 'react';
import Papa from 'papaparse';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, FileUp, AlertCircle, CheckCircle2, Loader2, Download } from 'lucide-react';
import { toast } from 'sonner';

interface BulkImportDialogProps {
  title: string;
  description: string;
  triggerButton?: React.ReactNode;
  templateHeaders: string[];
  templateData?: any[];
  templateFilename?: string;
  onImport: (data: any[]) => Promise<{ created: number; skipped: number; errors: string[] }>;
  onSuccess?: () => void;
}

export function BulkImportDialog({
  title,
  description,
  triggerButton,
  templateHeaders,
  templateData = [],
  templateFilename = 'template.csv',
  onImport,
  onSuccess,
}: BulkImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [results, setResults] = useState<{ created: number; skipped: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = () => {
    const csv = Papa.unparse({
      fields: templateHeaders,
      data: templateData.length > 0 ? templateData : [templateHeaders.reduce((acc, h) => ({ ...acc, [h]: '' }), {})],
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', templateFilename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
      toast.error('Please upload a valid CSV file');
      return;
    }

    setFile(selectedFile);
    setIsParsing(true);
    setResults(null);

    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setParsedData(results.data);
        setIsParsing(false);
      },
      error: (error) => {
        toast.error(`Error parsing CSV: ${error.message}`);
        setIsParsing(false);
      }
    });
  };

  const handleImport = async () => {
    if (parsedData.length === 0) {
      toast.error('No data found in the CSV file');
      return;
    }

    setIsUploading(true);
    try {
      const res = await onImport(parsedData);
      setResults(res);
      
      if (res.created > 0) {
        toast.success(`Successfully imported ${res.created} records`);
        if (onSuccess) onSuccess();
      }
    } catch (err: any) {
      toast.error(err.message || 'Import failed');
    } finally {
      setIsUploading(false);
    }
  };

  const resetState = () => {
    setFile(null);
    setParsedData([]);
    setResults(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      setOpen(val);
      if (!val) setTimeout(resetState, 200); // reset after animation
    }}>
      <DialogTrigger>
        {triggerButton || (
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Bulk Import
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {!results ? (
          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border/50">
              <div>
                <p className="text-sm font-medium">Need a template?</p>
                <p className="text-xs text-muted-foreground mt-0.5">Download the CSV template to see required columns.</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Template
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Upload CSV File</Label>
              <div className="flex items-center gap-3">
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  disabled={isUploading || isParsing}
                />
              </div>
            </div>

            {parsedData.length > 0 && (
              <div className="p-3 rounded-md bg-primary/5 border border-primary/20 text-sm">
                Found <strong>{parsedData.length}</strong> records ready to import.
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setOpen(false)} disabled={isUploading}>
                Cancel
              </Button>
              <Button 
                onClick={handleImport} 
                disabled={parsedData.length === 0 || isUploading || isParsing}
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileUp className="h-4 w-4 mr-2" />
                )}
                {isUploading ? 'Importing...' : 'Start Import'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
                <div className="flex items-center gap-2 text-emerald-600 mb-2">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-semibold text-sm">Imported</span>
                </div>
                <p className="text-2xl font-bold text-emerald-700">{results.created}</p>
              </div>
              
              <div className="p-4 rounded-lg border border-amber-500/20 bg-amber-500/5">
                <div className="flex items-center gap-2 text-amber-600 mb-2">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-semibold text-sm">Skipped</span>
                </div>
                <p className="text-2xl font-bold text-amber-700">{results.skipped}</p>
              </div>
            </div>

            {results.errors.length > 0 && (
              <div className="mt-4 border border-destructive/20 rounded-md overflow-hidden">
                <div className="bg-destructive/10 px-3 py-2 border-b border-destructive/20 font-medium text-sm text-destructive flex items-center justify-between">
                  <span>Errors ({results.errors.length})</span>
                </div>
                <div className="max-h-32 overflow-y-auto p-3 bg-destructive/5 space-y-1">
                  {results.errors.map((err, i) => (
                    <p key={i} className="text-xs text-destructive/80 font-mono">• {err}</p>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-4">
              <Button onClick={() => setOpen(false)}>Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
