'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface VoiceAssistantProps {
  formType: 'property' | 'lead' | 'complaint';
  onParsed: (data: any) => void;
  className?: string;
}

export function VoiceAssistant({ formType, onParsed, className }: VoiceAssistantProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Initialize Web Speech API
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-IN'; // Default to Indian English

        recognitionRef.current.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = 0; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript + ' ';
          }
          setTranscript(currentTranscript);
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech recognition error', event.error);
          setIsRecording(false);
          if (event.error !== 'aborted') {
            toast.error('Microphone error: ' + event.error);
          }
        };

        recognitionRef.current.onend = () => {
          setIsRecording(false);
        };
      } else {
      }
    }
  }, []);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      toast.error('Your browser does not support voice recording.');
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
      processTranscript();
    } else {
      setTranscript('');
      try {
        recognitionRef.current.start();
        setIsRecording(true);
        toast.info('Listening... Speak your details.');
      } catch (err) {
        console.error('Failed to start recording', err);
      }
    }
  };

  const processTranscript = async () => {
    if (!transcript || transcript.trim().length < 5) {
      toast.warning('No valid speech detected.');
      return;
    }

    setIsProcessing(true);
    const loadingToast = toast.loading('AI is analyzing your voice summary...');

    try {
      const res = await fetch('/api/parse-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: transcript, formType })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to process voice');
      }

      onParsed(data.data);
      toast.success('Form magically auto-filled!', { id: loadingToast });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'AI Processing Failed', { id: loadingToast });
    } finally {
      setIsProcessing(false);
      setTranscript('');
    }
  };

  if (!recognitionRef.current && typeof window !== 'undefined') {
    return null; // Don't render if not supported
  }

  return (
    <div className={`flex flex-col items-end gap-2 ${className}`}>
      <div className="flex items-center gap-2">
        {isRecording && (
          <span className="text-xs text-primary animate-pulse bg-primary/10 px-2 py-1 rounded-full flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-primary animate-ping"></span>
            Listening...
          </span>
        )}
        <Button
          type="button"
          onClick={toggleRecording}
          disabled={isProcessing}
          variant={isRecording ? 'destructive' : 'outline'}
          size="sm"
          className={`h-9 ${isRecording ? 'shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'border-primary/30 hover:border-primary hover:bg-primary/5 text-primary'}`}
        >
          {isProcessing ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : isRecording ? (
            <MicOff className="h-4 w-4 mr-2" />
          ) : (
            <Mic className="h-4 w-4 mr-2" />
          )}
          {isProcessing ? 'Thinking...' : isRecording ? 'Stop & Process' : 'Auto-fill with Voice'}
          {!isProcessing && !isRecording && <Sparkles className="h-3 w-3 ml-1.5 text-amber-500" />}
        </Button>
      </div>
      {transcript && isRecording && (
        <p className="text-xs text-muted-foreground italic max-w-[250px] text-right truncate">
          "{transcript}"
        </p>
      )}
    </div>
  );
}
