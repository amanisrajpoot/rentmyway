'use client';

import { ESignDialog } from './esign-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  FileText, ExternalLink, ShieldCheck, AlertCircle, RefreshCw 
} from 'lucide-react';

interface LeaseActionsWorkspaceProps {
  lease: any;
  userRole: string;
}

export function LeaseActionsWorkspace({ lease, userRole }: LeaseActionsWorkspaceProps) {
  const isBroker = userRole === 'broker';

  return (
    <div className="space-y-6">
      {lease.agreement_url ? (
        <Card className="border-border/50 bg-gradient-to-br from-background to-emerald-500/5">
          <CardHeader className="pb-3 border-b border-border/40">
            <CardTitle className="text-sm font-semibold flex items-center justify-between text-emerald-400">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4" />
                Signed Rent Agreement
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="flex items-start gap-3 bg-emerald-500/10 p-3.5 rounded-xl border border-emerald-500/20">
              <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-xs text-emerald-200">Vaulted & Legally Binding</p>
                <p className="text-[10px] text-emerald-200/70 mt-0.5 leading-relaxed">
                  This lease agreement has been securely compiled, e-signed by all parties, and vaulted to RentMyWay storage vaults.
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <a
                href={lease.agreement_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1"
              >
                <Button variant="outline" className="w-full text-xs h-9 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 gap-1.5">
                  <ExternalLink className="h-3.5 w-3.5" />
                  View PDF Agreement
                </Button>
              </a>
            </div>

            {isBroker && (
              <div className="pt-2 border-t border-border/40">
                <ESignDialog 
                  lease={lease}
                  triggerButton={
                    <Button variant="ghost" size="sm" className="w-full text-xs text-slate-400 hover:text-slate-200 gap-1.5 h-8">
                      <RefreshCw className="h-3.5 w-3.5" />
                      Re-Draft / Re-Sign
                    </Button>
                  }
                />
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/50 bg-gradient-to-br from-background to-amber-500/5">
          <CardHeader className="pb-3 border-b border-border/40">
            <CardTitle className="text-sm font-semibold flex items-center justify-between text-amber-400">
              <span className="flex items-center gap-1.5">
                <FileText className="h-4 w-4" />
                Agreement Vault
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="flex items-start gap-3 bg-amber-500/10 p-3.5 rounded-xl border border-amber-500/20">
              <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-xs text-amber-200">No Signed Agreement Vaulted</p>
                <p className="text-[10px] text-amber-200/70 mt-0.5 leading-relaxed">
                  No rent agreement is vaulted yet. E-signatures of all parties are required to bind this agreement legally.
                </p>
              </div>
            </div>

            {isBroker ? (
              <ESignDialog lease={lease} />
            ) : (
              <p className="text-xs text-muted-foreground text-center py-2 italic">
                Awaiting broker to initiate and request e-signatures.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
