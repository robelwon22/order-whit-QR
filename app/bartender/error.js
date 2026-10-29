'use client';

import React, { useEffect } from 'react';
import { AppErrorFallback } from '../../components/ui/AppErrorFallback';

export default function BartenderError({ error }) {
  useEffect(() => {
    console.error('Bartender dashboard error boundary caught:', error);
  }, [error]);

  return <AppErrorFallback />;
}
