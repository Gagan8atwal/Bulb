// src/features/auth/SignIn.tsx
// NATIVE sign-in surface for the login screen.
//
// On native this is simply the Apple Sign In button — the real, App-Store-ready
// path, fully preserved. The login screen renders <SignIn> and stays agnostic to
// which method a platform uses; Metro resolves SignIn.web.tsx on web (email/
// password) and this file on native (Apple).

import React from 'react';
import { AppleSignInButton } from './AppleSignInButton';

interface Props {
  onSuccess: () => void;
  onError?: (message: string) => void;
}

export function SignIn({ onSuccess, onError }: Props): React.ReactElement {
  return <AppleSignInButton onSuccess={onSuccess} onError={onError} />;
}
