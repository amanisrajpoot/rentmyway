'use client';

import dynamic from 'next/dynamic';

// Render auth forms client-side only to prevent hydration mismatches
// caused by browser password manager extensions injecting buttons/styles
// into input fields before React hydrates.
const LoginForm = dynamic(() => import('./login-form'), { ssr: false });

export default function LoginPage() {
  return <LoginForm />;
}
