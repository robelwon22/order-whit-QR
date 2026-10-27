'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import { useStaff } from '../../lib/useStaff';
import { useI18n } from '../../lib/i18n';
import { useToast } from '../../components/ui/Toast';
import { Logo } from '../../components/ui/Logo';
import { Button, IconButton } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Input';
import { BusinessTypeFields } from '../../components/ui/AdminBackground';
import { Modal } from '../../components/ui/Modal';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { Badge, EmptyState, Skeleton, ConfirmDialog } from '../../components/ui/Badge';
import { LanguageSwitcher } from '../../components/ui/LanguageSwitcher';
import { ThemeToggle } from '../../components/ui/ThemeToggle';
import {
  ShieldCheck,
  Plus,
  Search,
  Filter,
  Calendar,
  KeyRound,
  ExternalLink,
  Edit2,
  Copy,
  RefreshCw,
  LogOut,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Coffee,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

const RESERVED_SLUGS = ['admin', 'login', 'bartender', 'super', 'api'];

export default function SuperAdminPage() {
  const { staff, loading: authLoading, logout } = useStaff(['super_admin']);
  const { t, isAmharic } = useI18n();
  const { showToast } = useToast();

  const [cafes, setCafes] = useState([]);
  const [overview, setOverview] = useState({
    total_cafes: 0,
    active_cafes: 0,
    expiring_soon: 0,
    orders_today: 0,
  });
  const [loadingData, setLoadingData] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'suspended', 'expired'

  // Modals & Drawers
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedCafe, setSelectedCafe] = useState(null);
  const [cafeStaff, setCafeStaff] = useState([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [credentialsModal, setCredentialsModal] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);

  // New Cafe Form
  const [newName, setNewName] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [newLanguages, setNewLanguages] = useState(['en', 'am']);
  const [newDefaultLang, setNewDefaultLang] = useState('en');
  const [newCurrency, setNewCurrency] = useState('ETB');
  const [newBusinessSettings, setNewBusinessSettings] = useState({
    business_type: 'coffee_house',
    business_category: 'bakery',
    business_what: '',
  });
  const [newMaxTables, setNewMaxTables] = useState('');
  const [newActiveUntil, setNewActiveUntil] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [creating, setCreating] = useState(false);

  // Edit Cafe State
  const [editForm, setEditForm] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [tempPassResult, setTempPassResult] = useState(null);

  const getAuthToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || '';
  };

  const loadData = useCallback(async () => {
    try {
      setLoadingData(true);
      const token = await getAuthToken();
      const res = await fetch('/api/super/cafes', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setCafes(data.cafes || []);
      setOverview(data.overview || {});
    } catch (e) {
      showToast(e.message || 'Failed to load cafes', 'error');
    } finally {
      setLoadingData(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (staff?.role === 'super_admin') {
      loadData();
    }
  }, [staff, loadData]);

  const handleNameChange = (name) => {
    setNewName(name);
    if (!slugManuallyEdited) {
      const generated = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setNewSlug(generated);
    }
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pass = 'BunaPass!';
    for (let i = 0; i < 6; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  };

  // Create Cafe
  const handleCreateCafe = async (e) => {
    e.preventDefault();
    if (!newSlug || RESERVED_SLUGS.includes(newSlug.toLowerCase())) {
      showToast(`The slug "${newSlug}" is reserved or invalid.`, 'error');
      return;
    }

    setCreating(true);
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/super/cafes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newName,
          slug: newSlug,
          languages: newLanguages,
          default_language: newDefaultLang,
          currency: newCurrency,
          max_tables: newMaxTables ? Number(newMaxTables) : null,
          active_until: newActiveUntil,
          ...newBusinessSettings,
          admin_name: adminName,
          admin_email: adminEmail,
          admin_password: adminPassword,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      showToast('New cafe registered successfully.', 'success');
      setShowNewModal(false);

      setCredentialsModal({
        name: data.cafe.name,
        slug: data.cafe.slug,
        email: data.admin.email,
        password: adminPassword,
      });

      setNewName('');
      setNewSlug('');
      setSlugManuallyEdited(false);
      setAdminName('');
      setAdminEmail('');
      setAdminPassword('');
      setNewBusinessSettings({ business_type: 'coffee_house', business_category: 'bakery', business_what: '' });

      await loadData();
    } catch (e) {
      showToast(e.message || 'Creation failed', 'error');
    } finally {
      setCreating(false);
    }
  };

  // Open Cafe Detail
  const handleOpenDetail = async (c) => {
    setSelectedCafe(c);
    setEditForm({
      name: c.name,
      slug: c.slug,
      max_tables: c.max_tables || '',
      currency: c.currency || 'ETB',
      languages: c.languages || ['en', 'am'],
      default_language: c.default_language || 'en',
      active_until: c.active_until ? c.active_until.split('T')[0] : '',
      business_type: c.settings?.business_type || 'coffee_house',
      business_category: c.settings?.business_category || 'bakery',
      business_what: c.settings?.business_what || '',
    });
    setTempPassResult(null);

    try {
      setLoadingStaff(true);
      const token = await getAuthToken();
      const res = await fetch(`/api/super/cafes/${c.id}/staff`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setCafeStaff(data.staff || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingStaff(false);
    }
  };

  // Save updates to Cafe
  const handleSaveCafe = async () => {
    if (!selectedCafe || !editForm) return;
    setUpdating(true);
    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/super/cafes/${selectedCafe.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editForm),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      showToast('Cafe details saved.', 'success');
      await loadData();
      setSelectedCafe((prev) => ({ ...prev, ...editForm }));
    } catch (e) {
      showToast(e.message || 'Update failed', 'error');
    } finally {
      setUpdating(false);
    }
  };

  // Toggle Suspend / Reactivate
  const handleToggleActive = (c) => {
    const isActivating = !c.active;
    const actionText = isActivating ? 'Reactivate' : 'Suspend';

    setConfirmDialog({
      title: `${actionText}: ${c.name}`,
      message: isActivating
        ? 'Reactivating this cafe will allow staff to log in and customers to access the menu.'
        : 'Suspending this cafe will immediately block staff logins and customer ordering.',
      confirmText: actionText,
      danger: !isActivating,
      onConfirm: async () => {
        try {
          const token = await getAuthToken();
          const res = await fetch(`/api/super/cafes/${c.id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ active: isActivating }),
          });
          const data = await res.json();
          if (!data.success) throw new Error(data.error);

          showToast(isActivating ? 'Cafe reactivated' : 'Cafe suspended', 'success');
          await loadData();
          if (selectedCafe?.id === c.id) {
            setSelectedCafe((prev) => ({
              ...prev,
              active: isActivating,
              status: isActivating ? 'active' : 'suspended',
            }));
          }
        } catch (e) {
          showToast(e.message || 'Action failed', 'error');
        }
      },
    });
  };

  // Quick Extend Subscription
  const handleExtendSubscription = async (months) => {
    if (!selectedCafe) return;
    const currentBase = selectedCafe.active_until ? new Date(selectedCafe.active_until) : new Date();
    const baseDate = currentBase < new Date() ? new Date() : currentBase;

    const newDate = new Date(baseDate);
    newDate.setMonth(newDate.getMonth() + months);
    const dateStr = newDate.toISOString().split('T')[0];

    setUpdating(true);
    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/super/cafes/${selectedCafe.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ active_until: newDate.toISOString() }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      showToast(`Subscription extended by ${months} month(s)`, 'success');
      setEditForm((prev) => ({ ...prev, active_until: dateStr }));
      setSelectedCafe((prev) => ({ ...prev, active_until: newDate.toISOString(), status: 'active' }));
      await loadData();
    } catch (e) {
      showToast(e.message || 'Extension failed', 'error');
    } finally {
      setUpdating(false);
    }
  };

  // Reset Staff Member Password
  const handleResetStaffPassword = async (staffMember) => {
    const newPass = generateRandomPassword();
    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/staff/${staffMember.user_id}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ password: newPass }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setTempPassResult({
        name: staffMember.full_name,
        email: staffMember.email,
        password: newPass,
      });
      showToast('Password reset.', 'success');
    } catch (e) {
      showToast(e.message || 'Password reset failed', 'error');
    }
  };

  // Filter cafes
  const filteredCafes = useMemo(() => {
    return cafes.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.slug.toLowerCase().includes(search.toLowerCase());
      const matchesStatus =
        statusFilter === 'all' ? true : (c.status || (c.active ? 'active' : 'suspended')) === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [cafes, search, statusFilter]);

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Skeleton height={60} width={200} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
      {/* ─── TOP BAR ────────────────────────────────────────────────────────── */}
      <header
        style={{
          height: 70,
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
          <Logo size={36} subtitle="Super Administration" />
          <Badge variant="danger" size="sm">
            Platform Master
          </Badge>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Button
            variant="primary"
            icon={<Plus size={16} />}
            onClick={() => {
              setAdminPassword(generateRandomPassword());
              setShowNewModal(true);
            }}
          >
            New Cafe
          </Button>
          <ThemeToggle compact />
          <LanguageSwitcher size="sm" />
          <IconButton icon={<LogOut size={16} />} onClick={logout} title="Log out" variant="ghost" />
        </div>
      </header>

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 20px 80px' }}>
        {/* ─── STATS OVERVIEW CARDS ───────────────────────────────────────────── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 18,
            marginBottom: 32,
          }}
        >
          {[
            { label: 'Total Registered Cafes', val: overview.total_cafes, icon: Coffee, color: 'var(--color-roast)' },
            { label: 'Active Subscriptions', val: overview.active_cafes, icon: CheckCircle2, color: 'var(--color-sage)' },
            { label: 'Expiring Soon (7 Days)', val: overview.expiring_soon, icon: AlertTriangle, color: 'var(--color-amber)' },
            { label: 'Orders Placed Today', val: overview.orders_today, icon: TrendingUp, color: 'var(--color-caramel)' },
          ].map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div
                key={idx}
                className="card"
                style={{
                  padding: '20px 24px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  backgroundColor: 'var(--color-foam)',
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 'var(--radius)',
                    backgroundColor: 'var(--color-cream)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: stat.color,
                  }}
                >
                  <Icon size={24} />
                </div>
                <div>
                  <div style={{ fontSize: 13, color: 'var(--color-muted)' }}>{stat.label}</div>
                  <div
                    style={{
                      fontSize: 26,
                      fontWeight: 800,
                      fontFamily: 'var(--font-serif)',
                      color: 'var(--color-espresso)',
                      marginTop: 2,
                    }}
                  >
                    {stat.val}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ─── SEARCH & FILTER TABS ───────────────────────────────────────────── */}
        <div
          className="card"
          style={{
            padding: '16px 20px',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          {/* Search box */}
          <div style={{ position: 'relative', flex: 1, minWidth: 240, maxWidth: 420 }}>
            <Search
              size={17}
              style={{
                position: 'absolute',
                left: 14,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--color-muted)',
              }}
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search cafe name or slug..."
              style={{
                paddingLeft: 42,
                borderRadius: 'var(--radius-full)',
                minHeight: 42,
                fontSize: 14,
              }}
            />
          </div>

          {/* Status filter buttons */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: 'All Cafes' },
              { id: 'active', label: 'Active' },
              { id: 'suspended', label: 'Suspended' },
              { id: 'expired', label: 'Expired' },
            ].map((flt) => (
              <button
                key={flt.id}
                onClick={() => setStatusFilter(flt.id)}
                style={{
                  padding: '7px 16px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: 13,
                  fontWeight: statusFilter === flt.id ? 700 : 500,
                  backgroundColor: statusFilter === flt.id ? 'var(--color-roast)' : 'var(--color-cream)',
                  color: statusFilter === flt.id ? '#FFF' : 'var(--color-espresso)',
                  border: '1px solid var(--color-line)',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                }}
              >
                {flt.label}
              </button>
            ))}
          </div>
        </div>

        {/* ─── CAFES TABLE ────────────────────────────────────────────────────── */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div
            style={{
              padding: '16px 24px',
              borderBottom: '1px solid var(--color-line)',
              backgroundColor: 'var(--color-cream)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-espresso)' }}>
              Registered Cafes ({filteredCafes.length})
            </span>
            <Button variant="ghost" size="sm" icon={<RefreshCw size={14} />} onClick={loadData}>
              Refresh
            </Button>
          </div>

          {loadingData ? (
            <div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Skeleton height={60} borderRadius={12} />
              <Skeleton height={60} borderRadius={12} />
            </div>
          ) : filteredCafes.length === 0 ? (
            <div style={{ padding: 40 }}>
              <EmptyState
                type="coffee"
                title="No matching cafes found"
                description="Try another search term or click 'New Cafe' to add a cafe to the platform."
              />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {filteredCafes.map((c) => {
                const status = c.status || (c.active ? 'active' : 'suspended');
                let badgeVariant = 'success';
                if (status === 'suspended') badgeVariant = 'warning';
                if (status === 'expired') badgeVariant = 'danger';

                return (
                  <div
                    key={c.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '18px 24px',
                      borderBottom: '1px solid var(--color-line)',
                      gap: 16,
                      flexWrap: 'wrap',
                      transition: 'background var(--transition-fast)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 'var(--radius)',
                          backgroundColor: 'var(--color-cream)',
                          border: '1.5px solid var(--color-line)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 22,
                        }}
                      >
                        ☕
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--color-espresso)' }}>
                            {c.name}
                          </span>
                          <Badge variant={badgeVariant} size="sm" dot>
                            {status.toUpperCase()}
                          </Badge>
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--color-muted)', marginTop: 2 }}>
                          Slug: <span style={{ fontFamily: 'monospace' }}>/{c.slug}</span> · Currency: {c.currency} · Max tables: {c.max_tables || '∞'}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <Link href={`/admin?cafe=${c.id}`}>
                        <Button size="sm" variant="secondary" icon={<ExternalLink size={14} />}>
                          Impersonate Admin
                        </Button>
                      </Link>

                      <Button size="sm" variant="primary" onClick={() => handleOpenDetail(c)}>
                        Manage Cafe
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* ─── NEW CAFE MODAL ─────────────────────────────────────────────────── */}
      <Modal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        title="Register New Cafe"
        subtitle="Provision a cafe account with slug, initial administrator, and subscription"
        maxWidth={580}
      >
        <form onSubmit={handleCreateCafe} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input
            label="Cafe Brand Name"
            value={newName}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="e.g. Tomoca Coffee"
            required
            autoFocus
          />

          <Input
            label="URL Slug (Unique)"
            value={newSlug}
            onChange={(e) => {
              setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
              setSlugManuallyEdited(true);
            }}
            placeholder="e.g. tomoca"
            helper={`Menu will be available at: /${newSlug || 'your-slug'}`}
            required
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input
              label="Initial Subscription Days"
              type="date"
              value={newActiveUntil}
              onChange={(e) => setNewActiveUntil(e.target.value)}
              required
            />
            <Input
              label="Max Tables (Limit)"
              type="number"
              min="1"
              value={newMaxTables}
              onChange={(e) => setNewMaxTables(e.target.value)}
              placeholder="e.g. 20 (or blank for unlimited)"
            />
          </div>

          <BusinessTypeFields value={newBusinessSettings} onChange={setNewBusinessSettings} t={t} />

          <div
            style={{
              padding: '14px 16px',
              backgroundColor: 'var(--color-cream)',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--color-line)',
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, color: 'var(--color-espresso)' }}>
              Initial Cafe Admin Credentials
            </div>
            <Input
              label="Admin Full Name"
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              placeholder="e.g. Dawit Haile"
              required
            />
            <Input
              label="Admin Email"
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              placeholder="admin@tomoca.com"
              required
            />
            <Input
              label="Admin Password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 12 }}>
            <Button variant="ghost" type="button" onClick={() => setShowNewModal(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={creating}>
              Create Cafe
            </Button>
          </div>
        </form>
      </Modal>

      {/* ─── CAFE DETAIL MODAL ──────────────────────────────────────────────── */}
      {selectedCafe && editForm && (
        <Modal
          isOpen={!!selectedCafe}
          onClose={() => setSelectedCafe(null)}
          title={`Manage ${selectedCafe.name}`}
          subtitle={`Slug: /${selectedCafe.slug} · Subscription active until: ${editForm.active_until || 'N/A'}`}
          maxWidth={620}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Subscription Quick Extension Buttons */}
            <div
              style={{
                backgroundColor: 'var(--color-cream)',
                padding: '16px 20px',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--color-line)',
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: 'var(--color-espresso)' }}>
                Subscription Shortcuts
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Button size="sm" variant="secondary" onClick={() => handleExtendSubscription(1)}>
                  +1 Month
                </Button>
                <Button size="sm" variant="secondary" onClick={() => handleExtendSubscription(3)}>
                  +3 Months
                </Button>
                <Button size="sm" variant="secondary" onClick={() => handleExtendSubscription(12)}>
                  +1 Year
                </Button>
                <Button
                  size="sm"
                  variant={selectedCafe.active ? 'danger' : 'primary'}
                  onClick={() => handleToggleActive(selectedCafe)}
                >
                  {selectedCafe.active ? 'Suspend Cafe' : 'Reactivate Cafe'}
                </Button>
              </div>
            </div>

            {/* Editable Fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Input
                label="Cafe Name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
              <Input
                label="Max Tables Allowed"
                type="number"
                value={editForm.max_tables}
                onChange={(e) => setEditForm({ ...editForm, max_tables: e.target.value })}
                placeholder="Leave blank for unlimited"
              />
              <Input
                label="Active Until Date"
                type="date"
                value={editForm.active_until}
                onChange={(e) => setEditForm({ ...editForm, active_until: e.target.value })}
              />
              <BusinessTypeFields
                value={editForm}
                onChange={(businessSettings) => setEditForm({ ...editForm, ...businessSettings })}
                t={t}
              />
            </div>

            <Button variant="primary" loading={updating} onClick={handleSaveCafe}>
              Save Cafe Settings
            </Button>

            {/* Cafe Staff list inside modal */}
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10, color: 'var(--color-espresso)' }}>
                Cafe Staff Accounts ({cafeStaff.length})
              </div>
              {loadingStaff ? (
                <Skeleton height={50} />
              ) : cafeStaff.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--color-muted)' }}>No staff members found.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {cafeStaff.map((s) => (
                    <div
                      key={s.user_id}
                      style={{
                        padding: '10px 14px',
                        backgroundColor: 'var(--color-cream)',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: 13,
                      }}
                    >
                      <div>
                        <b>{s.full_name}</b> ({s.role}) - {s.email}
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => handleResetStaffPassword(s)}>
                        Reset Pass
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {tempPassResult && (
              <div
                style={{
                  backgroundColor: '#FEF9C3',
                  padding: 14,
                  borderRadius: 'var(--radius)',
                  border: '1px solid #F59E0B',
                  fontSize: 13,
                }}
              >
                <div>New password for <b>{tempPassResult.name}</b>:</div>
                <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 15, marginTop: 4 }}>
                  {tempPassResult.password}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ─── CREDENTIALS CREATED MODAL ───────────────────────────────────────── */}
      {credentialsModal && (
        <Modal
          isOpen={!!credentialsModal}
          onClose={() => setCredentialsModal(null)}
          title="Cafe Created Successfully!"
        >
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontSize: 40 }}>🎉</div>
            <p style={{ fontSize: 14, color: 'var(--color-muted)' }}>
              Save these credentials to hand over to the cafe owner:
            </p>
            <div
              style={{
                backgroundColor: 'var(--color-cream)',
                padding: 16,
                borderRadius: 'var(--radius)',
                textAlign: 'left',
                fontFamily: 'monospace',
                fontSize: 14,
                lineHeight: 1.8,
              }}
            >
              <div><b>Cafe:</b> {credentialsModal.name}</div>
              <div><b>Menu URL:</b> /{credentialsModal.slug}</div>
              <div><b>Admin Email:</b> {credentialsModal.email}</div>
              <div><b>Admin Password:</b> {credentialsModal.password}</div>
              <div><b>Staff Login:</b> /login</div>
            </div>
            <Button
              variant="secondary"
              icon={<Copy size={15} />}
              onClick={async () => {
                const text = `Cafe: ${credentialsModal.name}\nMenu: /${credentialsModal.slug}\nAdmin Email: ${credentialsModal.email}\nAdmin Password: ${credentialsModal.password}\nLogin: /login`;
                await navigator.clipboard.writeText(text);
                showToast('Credentials copied to clipboard!', 'success');
              }}
            >
              Copy Credentials
            </Button>
            <Button variant="primary" onClick={() => setCredentialsModal(null)}>
              Done
            </Button>
          </div>
        </Modal>
      )}

      {/* ─── CONFIRM DIALOG ─────────────────────────────────────────────────── */}
      {confirmDialog && (
        <ConfirmDialog
          isOpen={!!confirmDialog}
          onClose={() => setConfirmDialog(null)}
          onConfirm={confirmDialog.onConfirm}
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmText={confirmDialog.confirmText}
          danger={confirmDialog.danger}
        />
      )}
    </div>
  );
}
