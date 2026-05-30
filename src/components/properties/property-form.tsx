'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createProperty, updateProperty, createOwner } from '@/lib/actions/properties';
import type { Owner, Property, PropertyType, FurnishingType, PreferredTenant, PropertyStatus } from '@/types/database';
import { PROPERTY_TYPE_LABELS, FURNISHING_LABELS } from '@/types/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Save, Plus, Building2, MapPin, IndianRupee, Settings, UserPlus, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { MediaUploader } from '@/components/ui/media-uploader';
import dynamic from 'next/dynamic';

const MapPicker = dynamic(() => import('@/components/ui/map-picker'), { 
  ssr: false,
  loading: () => <div className="h-[300px] w-full bg-muted animate-pulse rounded-xl flex items-center justify-center text-muted-foreground text-sm">Loading Interactive Map...</div>
});
import { VoiceAssistant } from '@/components/ui/voice-assistant';

interface PropertyFormProps {
  owners: Owner[];
  property?: Property;
}

export function PropertyForm({ owners: initialOwners, property }: PropertyFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [owners, setOwners] = useState(initialOwners);
  const [ownerDialogOpen, setOwnerDialogOpen] = useState(false);

  // Form state
  const [form, setForm] = useState({
    title: property?.title || '',
    owner_id: property?.owner_id || '',
    status: (property?.status || 'available') as PropertyStatus,
    property_type: (property?.property_type || '2bhk') as PropertyType,
    furnishing: (property?.furnishing || 'semi_furnished') as FurnishingType,
    rent: property?.rent?.toString() || '',
    deposit: property?.deposit?.toString() || '',
    maintenance_charge: property?.maintenance_charge?.toString() || '0',
    locality: property?.locality || '',
    city: property?.city || '',
    state: property?.state || 'Maharashtra',
    address: property?.address || '',
    pincode: property?.pincode || '',
    floor_number: property?.floor_number?.toString() || '',
    total_floors: property?.total_floors?.toString() || '',
    area_sqft: property?.area_sqft?.toString() || '',
    facing: property?.facing || '',
    parking: property?.parking ?? false,
    pet_friendly: property?.pet_friendly ?? false,
    non_veg_allowed: property?.non_veg_allowed ?? true,
    bachelor_allowed: property?.bachelor_allowed ?? true,
    preferred_tenant: (property?.preferred_tenant || 'any') as PreferredTenant,
    description: property?.description || '',
    images: property?.images || [] as string[],
  });

  const update = (field: string, value: string | boolean | null | string[]) => {
    setForm((prev) => ({ ...prev, [field]: value ?? '' }));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.owner_id) {
      toast.error('Please select an owner first. Use the + button to add one if needed.');
      return;
    }

    if (!form.images || form.images.length === 0) {
      toast.error('At least one property image is mandatory.');
      return;
    }

    setLoading(true);

    try {
      const payload: Record<string, any> = {
        ...form,
        rent: parseFloat(form.rent) || 0,
        deposit: parseFloat(form.deposit) || 0,
        maintenance_charge: parseFloat(form.maintenance_charge) || 0,
        floor_number: form.floor_number ? parseInt(form.floor_number) : null,
        total_floors: form.total_floors ? parseInt(form.total_floors) : null,
        area_sqft: form.area_sqft ? parseFloat(form.area_sqft) : null,
        pincode: form.pincode || null,
        facing: form.facing || null,
        description: form.description || null,
        images: form.images.length > 0 ? form.images : null,
      };

      if (property) {
        const { broker_id, ...updatePayload } = payload;
        const res = await updateProperty(property.id, updatePayload);
        if (res && 'error' in res && res.error) throw new Error(res.error);
        toast.success('Property updated successfully');
        router.push(`/properties/${property.id}`);
      } else {
        const res = await createProperty(payload as any);
        if (res && 'error' in res && res.error) throw new Error(res.error);
        const newProperty = res && 'data' in res ? res.data : res;
        toast.success('Property created successfully');
        router.push(`/properties/${newProperty.id}`);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }


  async function handleCreateOwner(formData: FormData) {
    try {
      const res = await createOwner({
        name: formData.get('owner_name') as string,
        phone: formData.get('owner_phone') as string,
        email: (formData.get('owner_email') as string) || undefined,
      });
      if (res && 'error' in res && res.error) throw new Error(res.error);
      const owner = res && 'data' in res ? res.data : res;
      setOwners((prev) => [...prev, owner]);
      update('owner_id', owner.id);
      setOwnerDialogOpen(false);
      toast.success('Owner added');
    } catch {
      toast.error('Failed to create owner');
    }
  }

  const handleVoiceData = (data: any) => {
    setForm(prev => ({
      ...prev,
      title: data.title || prev.title,
      property_type: data.property_type || prev.property_type,
      furnishing: data.furnishing || prev.furnishing,
      rent: data.rent ? data.rent.toString() : prev.rent,
      deposit: data.deposit ? data.deposit.toString() : prev.deposit,
      locality: data.locality || prev.locality,
      city: data.city || prev.city,
      parking: data.parking !== null ? data.parking : prev.parking,
      pet_friendly: data.pet_friendly !== null ? data.pet_friendly : prev.pet_friendly,
    }));
  };

  const handleLocationSelect = (data: any) => {
    setForm(prev => ({
      ...prev,
      locality: data.locality || prev.locality,
      city: data.city || prev.city,
      state: data.state || prev.state,
      pincode: data.pincode || prev.pincode,
      address: data.address || prev.address,
    }));
  };

  return (
    <>
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex justify-end mb-2">
        <VoiceAssistant formType="property" onParsed={handleVoiceData} />
      </div>
      {/* Basic Info */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            Basic Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="prop-title">Property Title *</Label>
            <Input
              id="prop-title"
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
              placeholder="e.g., Spacious 2BHK in Andheri West"
              required
              className="bg-background/50"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Owner *</Label>
              <div className="flex gap-2">
                <Select value={form.owner_id} onValueChange={(v) => update('owner_id', v)} required>
                  <SelectTrigger className="bg-background/50 flex-1 w-full">
                    <span className={!form.owner_id ? "text-muted-foreground" : ""}>
                      {form.owner_id ? (owners.find(o => o.id === form.owner_id)?.name || "Unknown Owner") : "Select owner"}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {owners.map((o) => (
                      <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setOwnerDialogOpen(true)}
                >
                  <UserPlus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => update('status', v)}>
                <SelectTrigger className="bg-background/50 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Property Type *</Label>
              <Select value={form.property_type} onValueChange={(v) => update('property_type', v)}>
                <SelectTrigger className="bg-background/50 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PROPERTY_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Furnishing *</Label>
              <Select value={form.furnishing} onValueChange={(v) => update('furnishing', v)}>
                <SelectTrigger className="bg-background/50 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(FURNISHING_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Media & Images */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-primary" />
            Media & Images *
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MediaUploader
            value={form.images}
            onChange={(urls) => update('images', urls)}
            maxFiles={10}
            acceptedTypes="image/*,video/*"
          />
        </CardContent>
      </Card>

      {/* Location */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            Location & Map Picker
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <MapPicker onLocationSelect={handleLocationSelect} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Locality *</Label>
              <Input
                value={form.locality}
                onChange={(e) => update('locality', e.target.value)}
                placeholder="e.g., Andheri West"
                required
                className="bg-background/50"
              />
            </div>
            <div className="space-y-2">
              <Label>City *</Label>
              <Input
                value={form.city}
                onChange={(e) => update('city', e.target.value)}
                placeholder="e.g., Mumbai"
                required
                className="bg-background/50"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Full Address *</Label>
            <Textarea
              value={form.address}
              onChange={(e) => update('address', e.target.value)}
              placeholder="Complete address with building name, street"
              required
              className="bg-background/50"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>State</Label>
              <Input
                value={form.state}
                onChange={(e) => update('state', e.target.value)}
                className="bg-background/50"
              />
            </div>
            <div className="space-y-2">
              <Label>Pincode</Label>
              <Input
                value={form.pincode}
                onChange={(e) => update('pincode', e.target.value)}
                placeholder="400053"
                className="bg-background/50"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pricing */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <IndianRupee className="h-4 w-4 text-primary" />
            Pricing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Monthly Rent (₹) *</Label>
              <Input
                type="number"
                value={form.rent}
                onChange={(e) => update('rent', e.target.value)}
                placeholder="25000"
                required
                className="bg-background/50"
              />
            </div>
            <div className="space-y-2">
              <Label>Security Deposit (₹) *</Label>
              <Input
                type="number"
                value={form.deposit}
                onChange={(e) => update('deposit', e.target.value)}
                placeholder="50000"
                required
                className="bg-background/50"
              />
            </div>
            <div className="space-y-2">
              <Label>Maintenance (₹)</Label>
              <Input
                type="number"
                value={form.maintenance_charge}
                onChange={(e) => update('maintenance_charge', e.target.value)}
                placeholder="2000"
                className="bg-background/50"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Details */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="h-4 w-4 text-primary" />
            Details & Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Area (sq.ft)</Label>
              <Input
                type="number"
                value={form.area_sqft}
                onChange={(e) => update('area_sqft', e.target.value)}
                placeholder="850"
                className="bg-background/50"
              />
            </div>
            <div className="space-y-2">
              <Label>Floor</Label>
              <Input
                type="number"
                value={form.floor_number}
                onChange={(e) => update('floor_number', e.target.value)}
                placeholder="3"
                className="bg-background/50"
              />
            </div>
            <div className="space-y-2">
              <Label>Total Floors</Label>
              <Input
                type="number"
                value={form.total_floors}
                onChange={(e) => update('total_floors', e.target.value)}
                placeholder="12"
                className="bg-background/50"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Facing</Label>
              <Select value={form.facing} onValueChange={(v) => update('facing', v)}>
                <SelectTrigger className="bg-background/50 w-full">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {['North', 'South', 'East', 'West', 'North-East', 'North-West', 'South-East', 'South-West'].map(d => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Preferred Tenant</Label>
              <Select value={form.preferred_tenant} onValueChange={(v) => update('preferred_tenant', v)}>
                <SelectTrigger className="bg-background/50 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="family">Family</SelectItem>
                  <SelectItem value="bachelor">Bachelor</SelectItem>
                  <SelectItem value="company">Company</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { key: 'parking', label: 'Parking' },
              { key: 'pet_friendly', label: 'Pet Friendly' },
              { key: 'non_veg_allowed', label: 'Non-Veg Allowed' },
              { key: 'bachelor_allowed', label: 'Bachelor Allowed' },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center gap-2">
                <Switch
                  checked={form[key as keyof typeof form] as boolean}
                  onCheckedChange={(v) => update(key, v)}
                />
                <Label className="text-sm">{label}</Label>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              placeholder="Additional details about the property..."
              className="bg-background/50"
              rows={3}
            />
          </div>
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
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {property ? 'Update Property' : 'Create Property'}
        </Button>
      </div>
    </form>

    <Dialog open={ownerDialogOpen} onOpenChange={setOwnerDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Owner</DialogTitle>
        </DialogHeader>
        <form action={handleCreateOwner} className="space-y-4">
          <div className="space-y-2">
            <Label>Name *</Label>
            <Input name="owner_name" required />
          </div>
          <div className="space-y-2">
            <Label>Phone *</Label>
            <Input name="owner_phone" type="tel" required />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input name="owner_email" type="email" />
          </div>
          <Button type="submit" className="w-full">Add Owner</Button>
        </form>
      </DialogContent>
    </Dialog>
    </>
  );
}
