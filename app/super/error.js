'use client';

import { useEffect } from 'react';
import { AppErrorFallback } from '../../components/ui/AppErrorFallback';

export default function SuperAdminError({ error }) {
  useEffect(() => {
    console.error('Super admin screen error boundary caught:', error);
  }, [error]);

  return <AppErrorFallback />;
}
