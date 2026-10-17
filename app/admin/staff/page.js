'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import { useStaff } from '../../../lib/useStaff';
import { useToast } from '../../../components/ui/Toast';
import { useI18n } from '../../../lib/i18n';
import { AppShell } from '../../../components/ui/AppShell';
import { Button, IconButton } from '../../../components/ui/Button';
import { Input, Select } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import { Badge, EmptyState, Skeleton, ConfirmDialog } from '../../../components/ui/Badge';
import {
  Users,
  UserPlus,
  KeyRound,
  Copy,
  Check,
  RefreshCw,
  ShieldCheck,
  Mail,
  User,
  Coffee,
  CheckCircle2,
  Lock,
} from 'lucide-react';

function authHeader(session) {
  return { Authorization: 'Bearer ' + session.access_token };
}

const SAFE = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
function genPassword(len = 10) {
  let p = '';
  for (let i = 0; i < len; i++) p += SAFE[Math.floor(Math.random() * SAFE.length)];
  const upper = 'ABCDEFGHJKMNPQRSTUVWXYZ';
  const digits = '23456789';
  const arr = p.split('');
  arr[0] = upper[Math.floor(Math.random() * upper.length)];
  arr[1] = digits[Math.floor(Math.random() * digits.length)];
  return arr.sort(() => Math.random() - 0.5).join('');
}

export default function StaffAdminPage() {
  const { staff: currentStaff, cafe, cafes, setCafe, loading: authLoading, logout } = useStaff(['cafe_admin', 'super_admin']);
  const { showToast } = useToast();
  const { isAmharic } = useI18n();

  const [activeCafe, setActiveCafe] = useState(null);
  const [staffList, setStaffList] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [session, setSession] = useState(null);

  // New staff form state
  const [showAddModal, setShowAddModal] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('bartender');
  const [station, setStation] = useState('');
  const [password, setPassword] = useState(() => genPassword());
  const [adding, setAdding] = useState(false);

  // Issued credentials box
  const [issuedCreds, setIssuedCreds] = useState(null); // { email, password, name }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => setSession(s));
  }, []);

  useEffect(() => {
    if (cafe && !activeCafe) setActiveCafe(cafe);
  }, [cafe, activeCafe]);

  const fetchStaff = useCallback(async () => {
    if (!session || !activeCafe) return;
    setLoadingList(true);
    try {
      const res = await fetch(`/api/staff?cafe_id=${activeCafe.id}`, {
        headers: authHeader(session),
      });
      const json = await res.json();
      if (json.success) {
        setStaffList(json.staff || []);
      } else {
        showToast(json.error || 'Failed to load staff list.', 'error');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoadingList(false);
    }
  }, [session, activeCafe, showToast]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  // Create Staff
  const handleAddStaff = async (e) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) {
      showToast('Name and email are required.', 'error');
      return;
    }

    setAdding(true);
    try {
      const res = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader(session) },
        body: JSON.stringify({
          cafe_id: activeCafe.id,
          full_name: fullName.trim(),
          email: email.trim().toLowerCase(),
          password,
          role,
          station: station || null,
        }),
      });

      const json = await res.json();
      if (json.success) {
        showToast('Staff account created.', 'success');
        setIssuedCreds({
          name: fullName.trim(),
          email: email.trim().toLowerCase(),
          password,
        });
        setFullName('');
        setEmail('');
        setPassword(genPassword());
        setShowAddModal(false);
        fetchStaff();
      } else {
        showToast(json.error || 'Failed to create staff account.', 'error');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setAdding(false);
    }
  };

  // Toggle active status
  const handleToggleActive = async (member) => {
    if (member.user_id === currentStaff?.user_id) {
      showToast('You cannot disable your own account.', 'error');
      return;
    }

    const nextVal = !member.active;
    try {
      const res = await fetch(`/api/staff/${member.user_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeader(session) },
        body: JSON.stringify({ active: nextVal }),
      });
      const json = await res.json();
      if (json.success) {
        setStaffList((prev) =>
          prev.map((s) => (s.user_id === member.user_id ? { ...s, active: nextVal } : s))
        );
        showToast(`Staff member ${nextVal ? 'activated' : 'deactivated'}.`, 'success');
      } else {
        showToast(json.error || 'Failed to update status.', 'error');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Reset password
  const handleResetPassword = async (member) => {
    if (
      !confirm(
        `Reset password for "${member.full_name}"?\n\nTheir current password will stop working immediately.`
      )
    )
      return;

    try {
      const res = await fetch(`/api/staff/${member.user_id}/reset-password`, {
        method: 'POST',
        headers: authHeader(session),
      });
      const json = await res.json();
      if (json.success) {
        setIssuedCreds({
          name: member.full_name,
          email: json.email || member.email,
          password: json.new_password,
        });
        showToast('Password reset. Share the new credentials with the employee.', 'success');
      } else {
        showToast(json.error || 'Password reset failed.', 'error');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <AppShell
      cafe={activeCafe}
      cafes={cafes}
      onSelectCafe={(c) => {
        setActiveCafe(c);
        setCafe(c);
      }}
      user={currentStaff}
      onLogout={logout}
      title="Staff & Baristas"
    >
      <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* ─── HEADER BAR ────────────────────────────────────────────────────── */}
        <div
          className="card"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
            padding: '20px 24px',
          }}
        >
          <div>
            <h2
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 22,
                color: 'var(--color-espresso)',
                margin: 0,
              }}
            >
              Staff Members
            </h2>
            <p style={{ fontSize: 13, color: 'var(--color-muted)', marginTop: 2 }}>
              Manage barista stations, cafe managers, and credentials
            </p>
          </div>

          <Button
            variant="primary"
            icon={<UserPlus size={16} />}
            onClick={() => setShowAddModal(true)}
          >
            Add Staff Member
          </Button>
        </div>

        {/* ─── CREDENTIALS BOX (Shown immediately after creating/resetting staff) ─ */}
        {issuedCreds && (
          <div
            className="card anim-slide-up"
            style={{
              backgroundColor: '#FEF9C3',
              borderColor: '#F59E0B',
              padding: 24,
              border: '2px solid #F59E0B',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#92400E', fontWeight: 700, fontSize: 15 }}>
                <KeyRound size={20} />
                <span>Temporary Staff Credentials Generated</span>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setIssuedCreds(null)}>
                Dismiss
              </Button>
            </div>

            <p style={{ fontSize: 13, color: '#78350F', marginBottom: 14 }}>
              Share these credentials with <b>{issuedCreds.name}</b>. This will not be shown again.
            </p>

            <div
              style={{
                backgroundColor: '#FFFDF9',
                border: '1px solid #FCD34D',
                borderRadius: 'var(--radius)',
                padding: '12px 18px',
                fontFamily: 'monospace',
                fontSize: 14,
                lineHeight: 1.8,
                marginBottom: 16,
              }}
            >
              <div><b>Email:</b> {issuedCreds.email}</div>
              <div><b>Password:</b> <span style={{ backgroundColor: '#F59E0B', color: '#FFF', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>{issuedCreds.password}</span></div>
              <div><b>Portal:</b> {typeof window !== 'undefined' ? window.location.origin : ''}/login</div>
            </div>

            <Button
              variant="secondary"
              icon={<Copy size={15} />}
              onClick={async () => {
                const text = `Staff Login:\nEmail: ${issuedCreds.email}\nPassword: ${issuedCreds.password}\nLogin URL: ${window.location.origin}/login`;
                await navigator.clipboard.writeText(text);
                showToast('Login credentials copied to clipboard!', 'success');
              }}
            >
              Copy Credentials
            </Button>
          </div>
        )}

        {/* ─── STAFF CARDS LIST ──────────────────────────────────────────────── */}
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
              Active & Registered Staff ({staffList.length})
            </span>
            <Button variant="ghost" size="sm" icon={<RefreshCw size={14} />} onClick={fetchStaff}>
              Refresh
            </Button>
          </div>

          {loadingList ? (
            <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Skeleton height={60} borderRadius={12} />
              <Skeleton height={60} borderRadius={12} />
            </div>
          ) : staffList.length === 0 ? (
            <div style={{ padding: 40 }}>
              <EmptyState
                type="coffee"
                title="No staff members registered"
                description="Add bartenders and station supervisors so they can receive orders live."
                action={
                  <Button variant="primary" icon={<UserPlus size={16} />} onClick={() => setShowAddModal(true)}>
                    Add First Staff Member
                  </Button>
                }
              />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {staffList.map((member) => {
                const isSelf = member.user_id === currentStaff?.user_id;
                const initials = (member.full_name || '?')[0].toUpperCase();

                let roleBadgeVariant = 'neutral';
                if (member.role === 'super_admin') roleBadgeVariant = 'danger';
                if (member.role === 'cafe_admin') roleBadgeVariant = 'caramel';
                if (member.role === 'bartender') roleBadgeVariant = 'primary';

                return (
                  <div
                    key={member.user_id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '16px 24px',
                      borderBottom: '1px solid var(--color-line)',
                      gap: 16,
                      flexWrap: 'wrap',
                      backgroundColor: isSelf ? 'rgba(201, 138, 75, 0.05)' : 'transparent',
                      opacity: member.active ? 1 : 0.6,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: '50%',
                          backgroundColor: member.active ? 'var(--color-roast)' : 'var(--color-line)',
                          color: '#FFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: 16,
                          flexShrink: 0,
                        }}
                      >
                        {initials}
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--color-espresso)' }}>
                            {member.full_name}
                          </span>
                          <Badge variant={roleBadgeVariant} size="sm">
                            {member.role.replace('_', ' ')}
                          </Badge>
                          {isSelf && (
                            <span style={{ fontSize: 11, color: 'var(--color-caramel)', fontWeight: 700 }}>
                              (You)
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--color-muted)', marginTop: 2 }}>
                          {member.email || 'No email provided'}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      {/* Station badge if applicable */}
                      {member.station && (
                        <Badge variant="neutral" size="sm">
                          Station: {member.station}
                        </Badge>
                      )}

                      {/* Active Toggle */}
                      {!isSelf && (
                        <Button
                          size="sm"
                          variant={member.active ? 'secondary' : 'primary'}
                          onClick={() => handleToggleActive(member)}
                        >
                          {member.active ? '✓ Active' : 'Disabled'}
                        </Button>
                      )}

                      {/* Reset Password */}
                      {!isSelf && (
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={<KeyRound size={15} />}
                          onClick={() => handleResetPassword(member)}
                          title="Reset employee password"
                        >
                          Reset Pass
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ─── ADD STAFF MODAL ───────────────────────────────────────────────── */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Register New Staff Member"
        subtitle="Create an employee account for bartender orders or cafe administration"
      >
        <form onSubmit={handleAddStaff} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input
            label="Full Name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="e.g. Almaz Bekele"
            required
            autoFocus
          />

          <Input
            label="Staff Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="almaz@yourcafe.com"
            required
          />

          <Select
            label="Role & Permissions"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="bartender">Bartender / Barista (Live order queue)</option>
            <option value="cafe_admin">Cafe Admin (Full menu & table management)</option>
          </Select>

          {activeCafe?.settings?.stations_enabled && (
            <Select
              label="Assigned Station"
              value={station}
              onChange={(e) => setStation(e.target.value)}
            >
              <option value="">All Stations</option>
              <option value="bar">Bar (Drinks & Coffee)</option>
              <option value="kitchen">Kitchen (Food & Pastries)</option>
            </Select>
          )}

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              Auto-Generated Password
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ fontFamily: 'monospace', fontSize: 14 }}
                required
              />
              <Button
                type="button"
                variant="secondary"
                icon={<RefreshCw size={15} />}
                onClick={() => setPassword(genPassword())}
                title="Regenerate password"
              >
                New
              </Button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 14 }}>
            <Button variant="ghost" type="button" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={adding}>
              Create Staff Account
            </Button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
