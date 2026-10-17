'use client';

import React, { useEffect } from 'react';
import { CoffeeIllustration } from '../../components/ui/Logo';
import { Button } from '../../components/ui/Button';
import { RefreshCw, ArrowLeft } from 'lucide-react';

export default function BartenderError({ error, reset }) {
  useEffect(() => {
    console.error('Bartender dashboard error boundary caught:', error);
  }, [error]);

  return (
    <div
      className="theme-dark anim-fade-in"
      style={{
        minHeight: '100vh',
        backgroundColor: '#1A120C',
        color: '#FFFDF9',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        className="card"
        style={{
          maxWidth: 480,
          width: '100%',
          backgroundColor: '#251A12',
          border: '1px solid #3B2A1E',
          textAlign: 'center',
          padding: 36,
          borderRadius: 'var(--radius-card)',
        }}
      >
        <CoffeeIllustration size={100} />
        <h2
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 24,
            fontWeight: 700,
            color: '#FFFDF9',
            marginTop: 20,
            marginBottom: 10,
          }}
        >
          Barista Station Notice
        </h2>
        <p
          style={{
            fontSize: 14,
            color: 'var(--color-muted)',
            lineHeight: 1.5,
            marginBottom: 24,
          }}
        >
          {error?.message || 'A temporary display exception occurred in the queue. Your orders and database remain safe.'}
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <Button
            variant="accent"
            size="md"
            onClick={() => reset ? reset() : window.location.reload()}
            icon={<RefreshCw size={16} />}
          >
            Try Again
          </Button>
          <Button
            variant="ghost"
            size="md"
            onClick={() => { window.location.href = '/login'; }}
            icon={<ArrowLeft size={16} />}
          >
            Back to Login
          </Button>
        </div>
      </div>
    </div>
  );
}
