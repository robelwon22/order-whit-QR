'use client';

import { useEffect } from 'react';
import { AppErrorFallback } from '../../components/ui/AppErrorFallback';

export default function LoginError({ error }) {
  useEffect(() => {
    console.error('Login screen error boundary caught:', error);
  }, [error]);

  return <AppErrorFallback />;
}
