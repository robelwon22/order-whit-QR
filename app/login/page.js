'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import { useI18n } from '../../lib/i18n';
import { LanguageSwitcher } from '../../components/ui/LanguageSwitcher';
import { Logo, CoffeeIllustration } from '../../components/ui/Logo';
import { Button, IconButton } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Eye, EyeOff, Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const { t, isAmharic } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [showForgotHint, setShowForgotHint] = useState(false);

  useEffect(() => {
    async function checkExistingSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await routeUserByRole(session.user.id);
        }
      } catch (e) {
        console.error('Session check failed:', e);
      } finally {
        setCheckingAuth(false);
      }
    }
    checkExistingSession();
  }, []);

  async function routeUserByRole(userId) {
    const { data: staff, error } = await supabase
      .from('staff')
      .select('role, active, cafe_id, full_name')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !staff) {
      await supabase.auth.signOut();
      setErrorMsg(t('auth.no_staff_record') || 'No staff account found for this user.');
      return;
    }

    if (!staff.active) {
      await supabase.auth.signOut();
      setErrorMsg(t('auth.account_disabled') || 'Your staff account is currently inactive.');
      return;
    }

    // Check cafe active status for cafe-scoped roles
    if (staff.cafe_id && staff.role !== 'super_admin') {
      const { data: cafe } = await supabase
        .from('cafes')
        .select('active, name')
        .eq('id', staff.cafe_id)
        .maybeSingle();

      if (cafe && !cafe.active) {
        await supabase.auth.signOut();
        setErrorMsg(t('auth.cafe_unavailable') || 'This cafe account is currently deactivated.');
        return;
      }
    }

    // Redirect to proper destination
    if (staff.role === 'super_admin') {
      window.location.href = '/super';
    } else if (staff.role === 'cafe_admin') {
      window.location.href = '/admin';
    } else if (staff.role === 'bartender') {
      window.location.href = '/bartender';
    } else {
      setErrorMsg(`Unknown role: ${staff.role}`);
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    setErrorMsg('');
    setShowForgotHint(false);
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setErrorMsg(t('auth.invalid_credentials') || 'Invalid email or password.');
        return;
      }

      if (data?.user) {
        await routeUserByRole(data.user.id);
      }
    } catch (e) {
      setErrorMsg(e.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (checkingAuth) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--bg)',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <Logo size={44} showText={false} />
          <div
            style={{
              marginTop: 16,
              fontSize: 14,
              color: 'var(--color-muted)',
              fontFamily: 'var(--font-serif)',
            }}
          >
            {isAmharic ? 'በመጫን ላይ...' : 'Loading staff portal...'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        backgroundColor: 'var(--bg)',
      }}
    >
      {/* ─── DESKTOP LEFT PANEL: Warm illustrated hero ──────────────────────── */}
      <div
        className="login-left-panel"
        style={{
          flex: 1,
          backgroundColor: 'var(--color-espresso)',
          color: 'var(--color-cream)',
          padding: '48px 48px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Subtle warm background radial gradient */}
        <div
          style={{
            position: 'absolute',
            bottom: '-15%',
            left: '-10%',
            width: 500,
            height: 500,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(201, 138, 75, 0.16) 0%, rgba(43, 29, 20, 0) 70%)',
            pointerEvents: 'none',
          }}
        />

        {/* Top brand header */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          <Link href="/">
            <Logo size={36} color="#FFFDF9" />
          </Link>
        </div>

        {/* Middle illustration and message */}
        <div style={{ position: 'relative', zIndex: 2, maxWidth: 440, margin: '40px 0' }}>
          <div style={{ marginBottom: 24 }}>
            <CoffeeIllustration size={160} />
          </div>
          <h2
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 32,
              color: '#FFFDF9',
              lineHeight: 1.25,
              marginBottom: 14,
            }}
          >
            {isAmharic
              ? 'እንኳን ወደ ካፌ አስተዳደር ገጽዎ በደህና መጡ'
              : 'Specialty coffee craftsmanship meets modern hospitality.'}
          </h2>
          <p style={{ color: 'var(--color-muted-light)', fontSize: 16, lineHeight: 1.6 }}>
            {isAmharic
              ? 'የጠረጴዛ ትዕዛዞችን በቀጥታ ይቀበሉ፣ ዋጋዎችን ወዲያውኑ ያስተካክሉ፣ የካፌዎን ሰራተኞች በቅጽበት ይቆጣጠሩ።'
              : 'Manage live orders, monitor barista stations, and keep your menu fresh and welcoming every single day.'}
          </p>
        </div>

        {/* Bottom copyright notice */}
        <div style={{ position: 'relative', zIndex: 2, fontSize: 12, color: 'var(--color-muted-light)' }}>
          © {new Date().getFullYear()} BunaQR · Addis Ababa, Ethiopia
        </div>
      </div>

      {/* ─── RIGHT PANEL: Form card (Full screen on mobile) ─────────────────── */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '32px 24px',
          position: 'relative',
        }}
      >
        {/* Top-right Language Switcher */}
        <div style={{ position: 'absolute', top: 24, right: 24 }}>
          <LanguageSwitcher size="sm" />
        </div>

        <div
          className="card anim-fade-in"
          style={{
            width: '100%',
            maxWidth: 420,
            padding: '36px 32px',
            borderRadius: 'var(--radius-card)',
            boxShadow: 'var(--shadow-lg)',
            backgroundColor: 'var(--color-foam)',
            border: '1.5px solid var(--color-line)',
          }}
        >
          <div style={{ marginBottom: 28 }}>
            <div className="mobile-brand" style={{ marginBottom: 16 }}>
              <Logo size={32} />
            </div>
            <h1
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 26,
                fontWeight: 700,
                color: 'var(--color-espresso)',
                marginBottom: 6,
              }}
            >
              {isAmharic ? 'የሰራተኞች መግቢያ' : 'Staff Portal'}
            </h1>
            <p style={{ fontSize: 14, color: 'var(--color-muted)' }}>
              {isAmharic
                ? 'ለአስተዳዳሪ፣ ለባርቴንደር እና ለሱፐር አድሚን መግቢያ'
                : 'Sign in to access your cafe station or administration.'}
            </p>
          </div>

          {errorMsg && (
            <div className="err anim-fade-in" style={{ marginBottom: 20 }}>
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column' }}>
            <Input
              label={isAmharic ? 'ኢሜይል' : 'Email Address'}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="barista@yourcafe.com"
              required
              autoComplete="email"
              icon={<Mail size={18} />}
            />

            <Input
              label={isAmharic ? 'የይለፍ ቃል' : 'Password'}
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••"
              required
              autoComplete="current-password"
              icon={<Lock size={18} />}
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--color-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: 4,
                  }}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              }
            />

            <div style={{ marginTop: 8, marginBottom: 24 }}>
              <Button
                type="submit"
                fullWidth
                size="lg"
                variant="primary"
                loading={loading}
                iconRight={<ArrowRight size={18} />}
              >
                {isAmharic ? 'ግባ' : 'Sign In'}
              </Button>
            </div>
          </form>

          <div
            style={{
              paddingTop: 16,
              borderTop: '1px solid var(--color-line)',
              textAlign: 'center',
              fontSize: 13,
              color: 'var(--color-muted)',
            }}
          >
            <button
              type="button"
              onClick={() => setShowForgotHint(!showForgotHint)}
              style={{
                color: 'var(--color-roast)',
                fontWeight: 600,
                cursor: 'pointer',
                background: 'none',
                border: 'none',
                fontSize: 13,
              }}
            >
              {isAmharic ? 'የይለፍ ቃል ረሱ?' : 'Forgot your password?'}
            </button>

            {showForgotHint && (
              <div
                className="anim-fade-in"
                style={{
                  marginTop: 12,
                  padding: 12,
                  borderRadius: 'var(--radius)',
                  backgroundColor: 'var(--color-cream)',
                  fontSize: 12,
                  lineHeight: 1.5,
                  textAlign: 'left',
                  color: 'var(--color-espresso)',
                  border: '1px solid var(--color-line)',
                }}
              >
                {isAmharic
                  ? 'የይለፍ ቃልዎን ለመቀየር እባክዎ የካፌዎን ዋና አስተዳዳሪ ወይም ሱፐር አድሚን ያነጋግሩ።'
                  : 'Please contact your cafe administrator or manager to issue a temporary password or reset credentials.'}
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media (max-width: 860px) {
          .login-left-panel {
            display: none !important;
          }
          .mobile-brand {
            display: block !important;
          }
        }
        @media (min-width: 861px) {
          .mobile-brand {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
