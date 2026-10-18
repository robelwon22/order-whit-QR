'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from './Logo';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useI18n } from '../../lib/i18n';
import { Button, IconButton } from './Button';
import {
  Coffee,
  Palette,
  QrCode,
  Users,
  ShoppingBag,
  Settings,
  ExternalLink,
  LogOut,
  Menu as MenuIcon,
  X,
  ShieldCheck,
  ChevronDown,
} from 'lucide-react';

export function AppShell({
  children,
  cafe,
  cafes = [],
  onSelectCafe,
  user,
  onLogout,
  title = '',
}) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { t } = useI18n();

  const navItems = [
    { label: t('admin.tabs.menu') || 'Menu', href: '/admin', icon: Coffee },
    { label: t('admin.tabs.design') || 'Design', href: '/admin/design', icon: Palette },
    { label: t('admin.tabs.tables') || 'Tables & QR', href: '/admin/tables', icon: QrCode },
    { label: t('admin.tabs.staff') || 'Staff', href: '/admin/staff', icon: Users },
  ];

  // If super admin, add Super Admin shortcut
  const isSuperAdmin = user?.role === 'super_admin';

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: 'var(--bg)',
        color: 'var(--text)',
      }}
    >
      {/* ─── Desktop Sidebar ────────────────────────────────────────────── */}
      <aside
        style={{
          width: 260,
          backgroundColor: 'var(--color-foam)',
          borderRight: '1px solid var(--color-line)',
          display: 'flex',
          flexDirection: 'column',
          position: 'sticky',
          top: 0,
          height: '100vh',
          zIndex: 40,
        }}
        className="hidden-mobile"
      >
        {/* Brand / Logo */}
        <div
          style={{
            padding: '24px 20px',
            borderBottom: '1px solid var(--color-line)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Logo size={36} subtitle="Cafe Management" />
        </div>

        {/* Super Admin Notice if applicable */}
        {isSuperAdmin && (
          <div
            style={{
              margin: '12px 14px 4px',
              padding: '10px 12px',
              borderRadius: 'var(--radius)',
              background: 'linear-gradient(135deg, #3B1C0B, #261207)',
              color: '#FDE68A',
              fontSize: 12,
              fontWeight: 600,
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <ShieldCheck size={16} />
              <span>Super Admin Mode</span>
            </div>
            {cafes.length > 0 && (
              <select
                value={cafe?.id || ''}
                onChange={(e) => {
                  const target = cafes.find((c) => c.id === e.target.value);
                  if (target && onSelectCafe) onSelectCafe(target);
                }}
                style={{
                  background: 'rgba(255,255,255,0.12)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: '#FFF',
                  padding: '6px 8px',
                  borderRadius: 6,
                  fontSize: 12,
                  width: '100%',
                  cursor: 'pointer',
                  minHeight: 32,
                }}
              >
                {cafes.map((c) => (
                  <option key={c.id} value={c.id} style={{ color: '#000' }}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
            <Link
              href="/super"
              style={{
                color: 'var(--color-caramel)',
                fontSize: 11,
                textDecoration: 'underline',
              }}
            >
              ← Back to Super Admin
            </Link>
          </div>
        )}

        {/* Navigation Links */}
        <nav
          style={{
            flex: 1,
            padding: '16px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            overflowY: 'auto',
          }}
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '11px 16px',
                  borderRadius: 'var(--radius)',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: 14,
                  color: isActive ? '#FFFFFF' : 'var(--color-espresso)',
                  backgroundColor: isActive ? 'var(--color-roast)' : 'transparent',
                  transition: 'all var(--transition-fast)',
                }}
              >
                <Icon size={19} color={isActive ? '#FFFFFF' : 'var(--color-roast)'} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User profile & actions */}
        <div
          style={{
            padding: '16px',
            borderTop: '1px solid var(--color-line)',
            backgroundColor: 'rgba(0,0,0,0.01)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
            }}
          >
            <div style={{ overflow: 'hidden' }}>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: 13,
                  color: 'var(--color-espresso)',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden',
                }}
              >
                {user?.full_name || 'Staff Member'}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--color-muted)',
                  textTransform: 'capitalize',
                }}
              >
                {user?.role?.replace('_', ' ') || 'Staff'}
              </div>
            </div>
            {onLogout && (
              <IconButton
                icon={<LogOut size={16} />}
                onClick={onLogout}
                title="Log out"
                size={36}
                variant="ghost"
              />
            )}
          </div>
        </div>
      </aside>

      {/* ─── Main Content Container ────────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
        }}
      >
        {/* Top Bar */}
        <header
          style={{
            height: 68,
            backgroundColor: 'var(--color-foam)',
            borderBottom: '1px solid var(--color-line)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
            position: 'sticky',
            top: 0,
            zIndex: 30,
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className="visible-mobile">
              <Logo size={32} showText={false} />
            </div>
            <div>
              <div
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 18,
                  fontWeight: 700,
                  color: 'var(--color-espresso)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span>{cafe?.name || title || 'Cafe Dashboard'}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {cafe?.slug && (
              <a
                href={`/${cafe.slug}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 14px',
                  borderRadius: 'var(--radius)',
                  fontSize: 13,
                  fontWeight: 600,
                  backgroundColor: 'var(--color-cream)',
                  border: '1.5px solid var(--color-line)',
                  color: 'var(--color-roast)',
                  transition: 'all var(--transition-fast)',
                }}
                className="hidden-mobile-xs"
              >
                <span>View Menu</span>
                <ExternalLink size={14} />
              </a>
            )}

            <LanguageSwitcher size="sm" />
          </div>
        </header>

        {/* Content Body */}
        <main
          style={{
            flex: 1,
            padding: '24px 20px 80px',
            maxWidth: 1200,
            width: '100%',
            margin: '0 auto',
          }}
        >
          {children}
        </main>
      </div>

      {/* ─── Mobile Bottom Nav Bar ────────────────────────────────────────── */}
      <nav
        className="visible-mobile mobile-bottom-nav"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: 64,
          backgroundColor: 'var(--color-foam)',
          borderTop: '1px solid var(--color-line)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          zIndex: 50,
          boxShadow: '0 -4px 16px rgba(43, 29, 20, 0.08)',
        }}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                flex: 1,
                height: '100%',
                color: isActive ? 'var(--color-roast)' : 'var(--color-muted)',
                fontWeight: isActive ? 700 : 500,
                fontSize: 11,
                minHeight: 44,
              }}
            >
              <Icon size={20} strokeWidth={isActive ? 2.4 : 1.8} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Responsive styles */}
      <style jsx global>{`
        @media (min-width: 769px) {
          .visible-mobile { display: none !important; }
        }
        @media (max-width: 768px) {
          .hidden-mobile { display: none !important; }
        }
        @media (max-width: 480px) {
          .hidden-mobile-xs { display: none !important; }
        }
      `}</style>
    </div>
  );
}
