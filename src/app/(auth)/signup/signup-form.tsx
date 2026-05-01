'use client';

import { useState } from 'react';
import Link from 'next/link';
import { signUp } from '@/lib/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { UserPlus, Loader2, Mail, Lock, User, Phone, Building2, Home, UserCheck } from 'lucide-react';
import type { UserRole } from '@/types/database';

const roles: { value: UserRole; label: string; icon: React.ComponentType<{ className?: string }>; desc: string }[] = [
  { value: 'broker', label: 'Broker', icon: Building2, desc: 'Manage properties & leads' },
  { value: 'owner', label: 'Owner', icon: Home, desc: 'Track your properties' },
  { value: 'tenant', label: 'Tenant', icon: UserCheck, desc: 'Manage your rental' },
];

export default function SignUpForm() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>('broker');

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    formData.set('role', selectedRole);
    const result = await signUp(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <Card className="glass border-border/50 animate-fade-in">
      <form action={handleSubmit}>
        <CardContent className="pt-6 space-y-4">
          {/* Role selection */}
          <div className="space-y-2">
            <Label>I am a</Label>
            <div className="grid grid-cols-3 gap-2">
              {roles.map((role) => {
                const Icon = role.icon;
                return (
                  <button
                    key={role.value}
                    type="button"
                    onClick={() => setSelectedRole(role.value)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border text-center transition-all duration-200 ${
                      selectedRole === role.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border/50 text-muted-foreground hover:border-border hover:bg-accent/50'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-xs font-medium">{role.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="signup-name">Full Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
              <Input
                id="signup-name"
                name="full_name"
                placeholder="Your full name"
                required
                className="pl-10 bg-background/50"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="signup-phone">Phone</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
              <Input
                id="signup-phone"
                name="phone"
                type="tel"
                placeholder="+91 98765 43210"
                required
                className="pl-10 bg-background/50"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="signup-email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
              <Input
                id="signup-email"
                name="email"
                type="email"
                placeholder="you@example.com"
                required
                className="pl-10 bg-background/50"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="signup-password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
              <Input
                id="signup-password"
                name="password"
                type="password"
                placeholder="Min. 6 characters"
                required
                minLength={6}
                className="pl-10 bg-background/50"
              />
            </div>
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3 animate-slide-up">
              {error}
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-[oklch(0.55_0.2_265)] to-[oklch(0.60_0.19_280)] hover:from-[oklch(0.60_0.22_265)] hover:to-[oklch(0.65_0.21_280)] text-white transition-all duration-300"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <UserPlus className="h-4 w-4 mr-2" />
            )}
            Create Account
          </Button>

          <p className="text-sm text-muted-foreground text-center">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
