'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { User, Mail, Phone, Shield, Edit2, Loader2, Save, X } from 'lucide-react';
import { updateProfile } from '@/lib/actions/auth';
import { toast } from 'sonner';

import { MediaUploader } from '@/components/ui/media-uploader';

type Profile = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: string;
  avatar_url?: string | null;
};

export function SettingsClient({ initialProfile }: { initialProfile: Profile }) {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState(initialProfile);
  const [avatarUrl, setAvatarUrl] = useState<string[]>(initialProfile.avatar_url ? [initialProfile.avatar_url] : []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const fullName = fd.get('full_name') as string;
    const phone = fd.get('phone') as string;
    const finalAvatar = avatarUrl.length > 0 ? avatarUrl[0] : null;

    try {
      await updateProfile({ full_name: fullName, phone, avatar_url: finalAvatar });
      setProfile(prev => ({ ...prev, full_name: fullName, phone, avatar_url: finalAvatar }));
      toast.success('Profile updated successfully');
      setIsEditing(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your account</p>
      </div>

      <Card className="border-border/50">
        <CardHeader className="flex flex-row items-center justify-between py-4">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            Profile
          </CardTitle>
          {!isEditing && (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              <Edit2 className="h-3.5 w-3.5 mr-1" /> Edit
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {!isEditing ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="Profile" className="h-16 w-16 rounded-full object-cover border" />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-bold">
                    {profile.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <h2 className="text-lg font-semibold">{profile.full_name}</h2>
                  <Badge variant="outline" className="capitalize mt-1">
                    <Shield className="h-3 w-3 mr-1" />
                    {profile.role}
                  </Badge>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                {profile.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{profile.email}</span>
                  </div>
                )}
                {profile.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{profile.phone}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="space-y-2">
                <Label>Profile Picture</Label>
                <MediaUploader
                  value={avatarUrl}
                  onChange={setAvatarUrl}
                  maxFiles={1}
                  acceptedTypes="image/*"
                />
              </div>
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input name="full_name" defaultValue={profile.full_name} required />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input name="phone" defaultValue={profile.phone} required />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={profile.email} disabled className="bg-muted" />
                <p className="text-xs text-muted-foreground">Email cannot be changed.</p>
              </div>
              
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                  <X className="h-4 w-4 mr-1" /> Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Save Changes
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
