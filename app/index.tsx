// app/index.tsx
// Entry point. Redirects based on auth state.
// Renders nothing visible — it's a route guard only.
//
// Three states:
//   • initialized=false → render null (splash screen still showing)
//   • initialized=true, session=null  → /login
//   • initialized=true, session=exists → /(app)/today

import React from 'react';
import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/state/authStore';

export default function Index(): React.ReactElement | null {
  const { session, initialized } = useAuthStore();

  // Hold at splash until the Supabase session check completes
  if (!initialized) {
    return null;
  }

  if (session) {
    return <Redirect href="/(app)/today" />;
  }

  return <Redirect href="/login" />;
}
