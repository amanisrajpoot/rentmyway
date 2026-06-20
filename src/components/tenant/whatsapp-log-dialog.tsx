'use client';

import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MessageCircle, Send, CheckCircle2, Loader2, Bot } from 'lucide-react';
import { getWhatsAppLogs, sendRentReminder } from '@/lib/actions/reminders';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface WhatsAppLogDialogProps {
  tenantId: string;
  tenantPhone: string;
  currentRentAmount: number;
}

export function WhatsAppLogDialog({ tenantId, tenantPhone, currentRentAmount }: WhatsAppLogDialogProps) {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [sendingReminder, setSendingReminder] = useState(false);

  useEffect(() => {
    if (open) {
      loadLogs();
    }
  }, [open]);

  async function loadLogs() {
    setLoadingLogs(true);
    const { data } = await getWhatsAppLogs(tenantId);
    if (data) {
      setLogs(data);
    }
    setLoadingLogs(false);
  }

  async function handleSendReminder() {
    setSendingReminder(true);
    const currentMonthYear = format(new Date(), 'MMMM yyyy');
    const res = await sendRentReminder(tenantId, currentMonthYear, currentRentAmount, tenantPhone);
    
    if ('error' in res && res.error) {
      toast.error(res.error);
    } else {
      toast.success('Rent reminder sent via WhatsApp!');
      await loadLogs();
    }
    setSendingReminder(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button variant="outline" size="sm" className="w-full sm:w-auto bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 hover:text-[#25D366] border-[#25D366]/20">
          <MessageCircle className="h-4 w-4 mr-2" />
          WhatsApp Logs
        </Button>
      } />
      <DialogContent className="sm:max-w-lg h-[80vh] flex flex-col">
        <DialogHeader className="pb-4 border-b border-border/50 shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-[#25D366]" />
            Interakt WhatsApp Comms
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            +91 {tenantPhone}
          </p>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {loadingLogs ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12">
              <Bot className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">No WhatsApp messages sent yet.</p>
            </div>
          ) : (
            logs.map(log => (
              <div key={log.id} className="flex flex-col items-end gap-1">
                <div className="bg-[#25D366]/10 border border-[#25D366]/20 rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[85%] relative">
                  <p className="text-sm leading-relaxed">{log.message_content}</p>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground pr-1">
                  {format(new Date(log.created_at), 'dd MMM yyyy, HH:mm')}
                  <CheckCircle2 className="h-3 w-3 text-blue-400" />
                </div>
              </div>
            ))
          )}
        </div>

        <div className="pt-4 border-t border-border/50 shrink-0 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Messages are sent via Interakt Official API.
          </p>
          <Button onClick={handleSendReminder} disabled={sendingReminder} className="bg-[#25D366] hover:bg-[#128C7E] text-white">
            {sendingReminder ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            Send Rent Reminder
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
