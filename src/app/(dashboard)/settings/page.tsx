import { getUserProfile } from '@/lib/actions/auth';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { User, Mail, Phone, Shield } from 'lucide-react';

export default async function SettingsPage() {
  const profile = await getUserProfile();
  if (!profile) redirect('/login');

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your account</p>
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-bold">
              {profile.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
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
        </CardContent>
      </Card>
    </div>
  );
}
