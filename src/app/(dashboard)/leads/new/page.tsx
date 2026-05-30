'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createLead } from '@/lib/actions/leads';
import type { LeadSource } from '@/types/database';
import { LEAD_SOURCE_LABELS } from '@/types/database';
import { PROPERTY_TYPE_LABELS, FURNISHING_LABELS } from '@/types/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Save, User, Phone, MapPin, IndianRupee, Mic } from 'lucide-react';
import { toast } from 'sonner';
import { VoiceAssistant } from '@/components/ui/voice-assistant';
import { MediaUploader } from '@/components/ui/media-uploader';

export default function NewLeadPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [prefType, setPrefType] = useState<string>('');
  const [furnishing, setFurnishing] = useState<string>('');

  const handleVoiceData = (data: any) => {
    if (data.name) {
      const el = document.querySelector('input[name="name"]') as HTMLInputElement;
      if (el) el.value = data.name;
    }
    if (data.phone) {
      const el = document.querySelector('input[name="phone"]') as HTMLInputElement;
      if (el) el.value = data.phone;
    }
    if (data.email) {
      const el = document.querySelector('input[name="email"]') as HTMLInputElement;
      if (el) el.value = data.email;
    }
    if (data.budget_min) {
      const el = document.querySelector('input[name="budget_min"]') as HTMLInputElement;
      if (el) el.value = data.budget_min;
    }
    if (data.budget_max) {
      const el = document.querySelector('input[name="budget_max"]') as HTMLInputElement;
      if (el) el.value = data.budget_max;
    }
    if (data.preferred_locality) {
      const el = document.querySelector('input[name="preferred_locality"]') as HTMLInputElement;
      if (el) el.value = data.preferred_locality;
    }
    if (data.preferred_city) {
      const el = document.querySelector('input[name="preferred_city"]') as HTMLInputElement;
      if (el) el.value = data.preferred_city;
    }
    if (data.notes) {
      const el = document.querySelector('textarea[name="notes"]') as HTMLTextAreaElement;
      if (el) el.value = data.notes;
    }
    if (data.preferred_type) {
      setPrefType(data.preferred_type);
    }
    if (data.furnishing) {
      setFurnishing(data.furnishing);
    }
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);

    try {
      const result = await createLead({
        name: formData.get('name') as string,
        phone: formData.get('phone') as string,
        email: (formData.get('email') as string) || null,
        source: (formData.get('source') as LeadSource) || null,
        status: 'new',
        budget_min: formData.get('budget_min') ? parseFloat(formData.get('budget_min') as string) : null,
        budget_max: formData.get('budget_max') ? parseFloat(formData.get('budget_max') as string) : null,
        preferred_locality: (formData.get('preferred_locality') as string) || null,
        preferred_city: (formData.get('preferred_city') as string) || null,
        preferred_type: (formData.get('preferred_type') as string) || null,
        preferred_furnishing: (formData.get('preferred_furnishing') as string) || null,
        move_in_date: (formData.get('move_in_date') as string) || null,
        notes: (formData.get('notes') as string) || null,
        images: images.length > 0 ? images : null,
        lost_reason: null,
        broker_id: '',
      });

      if ('error' in result && result.error) {
        toast.error(result.error);
        return;
      }

      toast.success('Lead created successfully');
      router.push('/leads');
    } catch (err: unknown) {
      toast.error('Failed to create lead due to an unexpected error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Add Lead</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Create a new customer inquiry
          </p>
        </div>
        <VoiceAssistant formType="lead" onParsed={handleVoiceData} />
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
        {/* Contact Info */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input name="name" required placeholder="Full name" className="bg-background/50" />
              </div>
              <div className="space-y-2">
                <Label>Phone *</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input name="phone" type="tel" required placeholder="+91 98765 43210" className="pl-10 bg-background/50" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input name="email" type="email" placeholder="Optional" className="bg-background/50" />
              </div>
              <div className="space-y-2">
                <Label>Source</Label>
                <Select name="source">
                  <SelectTrigger className="bg-background/50 w-full">
                    <SelectValue placeholder="How did they find you?" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(LEAD_SOURCE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Requirements */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              Requirements
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Budget Min (₹)</Label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input name="budget_min" type="number" placeholder="10000" className="pl-10 bg-background/50" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Budget Max (₹)</Label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input name="budget_max" type="number" placeholder="25000" className="pl-10 bg-background/50" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Preferred Locality</Label>
                <Input name="preferred_locality" placeholder="e.g., Andheri West" className="bg-background/50" />
              </div>
              <div className="space-y-2">
                <Label>Preferred City</Label>
                <Input name="preferred_city" placeholder="e.g., Mumbai" className="bg-background/50" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Property Type</Label>
                <Select name="preferred_type" value={prefType} onValueChange={(v) => setPrefType(v || '')}>
                  <SelectTrigger className="bg-background/50 w-full">
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PROPERTY_TYPE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Furnishing</Label>
                <Select name="preferred_furnishing" value={furnishing} onValueChange={(v) => setFurnishing(v || '')}>
                  <SelectTrigger className="bg-background/50 w-full">
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(FURNISHING_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Move-in Date</Label>
                <Input name="move_in_date" type="date" className="bg-background/50" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                name="notes"
                placeholder="Any additional requirements or notes..."
                className="bg-background/50"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Media / Audio Notes */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Mic className="h-4 w-4 text-primary" />
              Media & Audio Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MediaUploader
              value={images}
              onChange={setImages}
              maxFiles={5}
              acceptedTypes="image/*,audio/*,video/*"
            />
            <p className="text-[10px] text-muted-foreground mt-2 italic">
              * Tip: Record a quick audio note about the lead's requirements or take photos of their profile docs.
            </p>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="bg-gradient-to-r from-[oklch(0.55_0.2_265)] to-[oklch(0.60_0.19_280)] hover:from-[oklch(0.60_0.22_265)] hover:to-[oklch(0.65_0.21_280)] text-white"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Create Lead
          </Button>
        </div>
      </form>
    </div>
  );
}
