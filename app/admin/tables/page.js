'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../../lib/supabase';
import { useStaff } from '../../../lib/useStaff';
import { useToast } from '../../../components/ui/Toast';
import { useI18n } from '../../../lib/i18n';
import { AppShell } from '../../../components/ui/AppShell';
import { Button, IconButton } from '../../../components/ui/Button';
import { Input, Select, Toggle } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import { Badge, EmptyState, Skeleton, ConfirmDialog } from '../../../components/ui/Badge';
import {
  getSiteUrl,
  isInvalidForProduction,
  buildTableQrUrl,
  generateQRSvg,
  generateQRDataURLAsync,
} from '../../../lib/qr';
import {
  QrCode,
  Plus,
  Printer,
  Copy,
  ExternalLink,
  Edit2,
  Trash2,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Activity,
  Download,
  Share2,
} from 'lucide-react';

function authHeader(session) {
  return { Authorization: 'Bearer ' + session.access_token };
}

export default function TablesAdminPage() {
  const { staff, cafe, cafes, setCafe, loading: authLoading, logout } = useStaff(['cafe_admin', 'super_admin']);
  const { showToast } = useToast();
  const { isAmharic } = useI18n();

  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState(null);
  const [activeCafe, setActiveCafe] = useState(null);

  // Modals & Panels
  const [qrModalTable, setQrModalTable] = useState(null);
  const [renameModalTable, setRenameModalTable] = useState(null);
  const [testScanTable, setTestScanTable] = useState(null);
  const [testScanResults, setTestScanResults] = useState(null);
  const [testingScan, setTestingScan] = useState(false);
  const [deleteConfirmTable, setDeleteConfirmTable] = useState(null);

  // Add tables form
  const [addCount, setAddCount] = useState(5);
  const [addPrefix, setAddPrefix] = useState('Table ');
  const [adding, setAdding] = useState(false);

  // Print layout choice: 'a4-grid' (6 cards) or 'tent' (table tent)
  const [printLayout, setPrintLayout] = useState('a4-grid');

  const siteUrl = getSiteUrl();
  const isLocalhostWarning = isInvalidForProduction(siteUrl);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => setSession(s));
  }, []);

  useEffect(() => {
    if (cafe && !activeCafe) setActiveCafe(cafe);
  }, [cafe, activeCafe]);

  // Fetch Tables
  const fetchTables = useCallback(async () => {
    if (!session || !activeCafe) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/tables?cafe_id=${activeCafe.id}`, {
        headers: authHeader(session),
      });
      const json = await res.json();
      if (json.success) {
        setTables(json.tables || []);
      } else {
        showToast(json.error || 'Failed to load tables.', 'error');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [session, activeCafe, showToast]);

  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  // Bulk Add Tables
  const handleAddTables = async (e) => {
    e.preventDefault();
    if (!activeCafe) return;
    const n = Math.min(50, Math.max(1, parseInt(addCount, 10) || 1));
    const nums = tables
      .map((t) => {
        const m = t.name.match(/(\d+)$/);
        return m ? parseInt(m[1], 10) : 0;
      })
      .filter(Boolean);
    const startNum = nums.length > 0 ? Math.max(...nums) + 1 : 1;

    setAdding(true);
    try {
      const res = await fetch('/api/admin/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader(session) },
        body: JSON.stringify({
          count: n,
          prefix: addPrefix,
          start_number: startNum,
          cafe_id: activeCafe.id,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showToast(`Added ${json.count} table${json.count !== 1 ? 's' : ''}.`, 'success');
        fetchTables();
      } else {
        showToast(json.error || 'Failed to add tables.', 'error');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setAdding(false);
    }
  };

  // Toggle or Update Table
  const handleUpdate = async (id, updates) => {
    try {
      const res = await fetch(`/api/admin/tables/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeader(session) },
        body: JSON.stringify(updates),
      });
      const json = await res.json();
      if (json.success) {
        setTables((prev) => prev.map((t) => (t.id === id ? json.table : t)));
        showToast('Table updated successfully.', 'success');
        return { success: true };
      } else {
        showToast(json.error || 'Update failed.', 'error');
        return { error: json.error };
      }
    } catch (err) {
      showToast(err.message, 'error');
      return { error: err.message };
    }
  };

  // Delete Table
  const handleDelete = async () => {
    if (!deleteConfirmTable) return;
    try {
      const res = await fetch(`/api/admin/tables/${deleteConfirmTable.id}`, {
        method: 'DELETE',
        headers: authHeader(session),
      });
      const json = await res.json();
      if (json.success) {
        setTables((prev) => prev.filter((t) => t.id !== deleteConfirmTable.id));
        showToast(`"${deleteConfirmTable.name}" deleted.`, 'success');
        setDeleteConfirmTable(null);
      } else {
        showToast(json.error || 'Delete failed.', 'error');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Reset QR Token
  const handleResetToken = async (id) => {
    try {
      const res = await fetch(`/api/admin/tables/${id}/reset-token`, {
        method: 'POST',
        headers: authHeader(session),
      });
      const json = await res.json();
      if (json.success) {
        setTables((prev) => prev.map((t) => (t.id === id ? json.table : t)));
        showToast('Token reset. Old QR codes are now invalid — reprint new one.', 'success');
        if (qrModalTable?.id === id) {
          setQrModalTable(json.table);
        }
      } else {
        showToast(json.error || 'Reset failed.', 'error');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Test Scan Diagnostics
  const handleRunTestScan = async (tbl) => {
    setTestScanTable(tbl);
    setTestingScan(true);
    setTestScanResults(null);

    const targetUrl = buildTableQrUrl(activeCafe.slug, tbl.token);

    // Diagnostics checks
    const checks = {
      targetUrl,
      cafeFound: false,
      tableFound: false,
      tableActive: false,
      orderingEnabled: false,
      errorDetail: null,
    };

    try {
      // 1. Cafe check
      if (activeCafe && activeCafe.slug) {
        checks.cafeFound = true;
      }

      // 2. Table resolution check via RPC
      const { data: resolved, error: rpcErr } = await supabase.rpc('resolve_table', {
        p_token: tbl.token,
      });

      if (!rpcErr && resolved && resolved.length > 0) {
        if (resolved[0].cafe_slug === activeCafe.slug) {
          checks.tableFound = true;
        } else {
          checks.errorDetail = `Slug mismatch: Table belongs to "${resolved[0].cafe_slug}", but URL is for "${activeCafe.slug}".`;
        }
      } else {
        checks.errorDetail = rpcErr ? rpcErr.message : 'Token not recognized by database.';
      }

      // 3. Table active status
      if (tbl.active) {
        checks.tableActive = true;
      } else {
        checks.errorDetail = 'Table is marked inactive. Toggle table to active to enable orders.';
      }

      // 4. Ordering enabled
      if (checks.cafeFound && checks.tableFound && checks.tableActive && activeCafe.active) {
        checks.orderingEnabled = true;
      }
    } catch (e) {
      checks.errorDetail = e.message;
    } finally {
      setTestScanResults(checks);
      setTestingScan(false);
    }
  };

  // Print All QR Codes (Supports A4 Grid of 6 and Table Tent layouts)
  const handlePrintAll = (layout = 'a4-grid') => {
    if (isLocalhostWarning) {
      showToast('Cannot print while NEXT_PUBLIC_SITE_URL is localhost or missing.', 'error');
      return;
    }

    const activeTables = tables.filter((t) => t.active);
    if (activeTables.length === 0) {
      showToast('No active tables to print.', 'error');
      return;
    }

    const cardsHtml = activeTables
      .map((t) => {
        const url = buildTableQrUrl(activeCafe.slug, t.token);
        const svg = generateQRSvg(url, 240, 4);

        if (layout === 'tent') {
          return `
            <div class="tent-card">
              <div class="tent-half">
                <div class="cafe-header">
                  <h3>${activeCafe.name}</h3>
                </div>
                <div class="qr-box">${svg}</div>
                <h1 class="table-name">${t.name}</h1>
                <p class="tagline">ስካን በማድረግ ሜኑውን ይመልከቱ እና ይዘዙ</p>
                <p class="tagline-en">Scan to see the menu & order</p>
              </div>
              <div class="fold-line"><span>FOLD HERE / እዚህ ጋር እጠፉት</span></div>
              <div class="tent-half rotate">
                <div class="cafe-header">
                  <h3>${activeCafe.name}</h3>
                </div>
                <div class="qr-box">${svg}</div>
                <h1 class="table-name">${t.name}</h1>
                <p class="tagline">ስካን በማድረግ ሜኑውን ይመልከቱ እና ይዘዙ</p>
                <p class="tagline-en">Scan to see the menu & order</p>
              </div>
            </div>
          `;
        }

        // Default: A4 grid of 6 cards with cut marks
        return `
          <div class="card-wrap">
            <div class="cut-mark top-left"></div>
            <div class="cut-mark top-right"></div>
            <div class="cut-mark bottom-left"></div>
            <div class="cut-mark bottom-right"></div>
            <div class="qr-card">
              <div class="cafe-header">
                <div class="cafe-logo-placeholder">☕</div>
                <div class="cafe-title">${activeCafe.name}</div>
              </div>
              <div class="qr-box">${svg}</div>
              <h1 class="table-name">${t.name}</h1>
              <p class="scan-msg">ስካን በማድረግ ሜኑውን ይመልከቱ እና ይዘዙ</p>
              <p class="scan-msg-en">Scan to see the menu and order</p>
              <div class="qr-url">${url}</div>
            </div>
          </div>
        `;
      })
      .join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Print QR Cards - ${activeCafe.name}</title>
        <style>
          @page { size: A4; margin: 12mm; }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Inter', system-ui, sans-serif; background: #fff; color: #1f1a17; }
          .a4-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 16mm;
            justify-content: center;
          }
          .card-wrap {
            position: relative;
            padding: 8px;
            page-break-inside: avoid;
          }
          .qr-card {
            border: 2.5px solid #2B1D14;
            border-radius: 16px;
            padding: 24px 18px;
            text-align: center;
            background: #FFFDF9;
            box-shadow: 0 4px 12px rgba(0,0,0,0.05);
          }
          .cafe-header {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            margin-bottom: 14px;
          }
          .cafe-logo-placeholder { font-size: 22px; }
          .cafe-title { font-size: 16px; font-weight: 700; color: #6F4E37; letter-spacing: -0.01em; }
          .qr-box {
            display: flex;
            justify-content: center;
            padding: 10px;
            background: #fff;
            border-radius: 10px;
            margin-bottom: 14px;
            border: 1px solid #E8DCCB;
          }
          .table-name {
            font-size: 32px;
            font-weight: 800;
            color: #2B1D14;
            margin-bottom: 6px;
            letter-spacing: -0.02em;
          }
          .scan-msg { font-size: 13px; font-weight: 600; color: #6F4E37; margin-bottom: 2px; }
          .scan-msg-en { font-size: 12px; color: #7A6A5C; margin-bottom: 8px; }
          .qr-url { font-size: 8px; color: #A8988B; word-break: break-all; }
          
          /* Cut marks */
          .cut-mark { position: absolute; width: 12px; height: 12px; border-color: #999; border-style: solid; pointer-events: none; }
          .top-left { top: 0; left: 0; border-width: 1px 0 0 1px; }
          .top-right { top: 0; right: 0; border-width: 1px 1px 0 0; }
          .bottom-left { bottom: 0; left: 0; border-width: 0 0 1px 1px; }
          .bottom-right { bottom: 0; right: 0; border-width: 0 1px 1px 0; }

          /* Table Tent Styles */
          .tent-card {
            border: 2px dashed #999;
            border-radius: 14px;
            padding: 16px;
            margin-bottom: 24mm;
            page-break-inside: avoid;
            background: #FFF;
          }
          .tent-half { text-align: center; padding: 24px 16px; }
          .tent-half.rotate { transform: rotate(180deg); }
          .fold-line {
            border-top: 1.5px dashed #C98A4B;
            margin: 16px 0;
            text-align: center;
            font-size: 10px;
            color: #C98A4B;
            font-weight: 700;
            letter-spacing: 0.05em;
          }
          .tagline { font-size: 14px; font-weight: 700; color: #6F4E37; margin-top: 6px; }
          .tagline-en { font-size: 12px; color: #7A6A5C; }
        </style>
      </head>
      <body>
        <div class="${layout === 'tent' ? 'tent-container' : 'a4-grid'}">
          ${cardsHtml}
        </div>
      </body>
      </html>
    `;

    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
    }, 400);
  };

  const activeCount = tables.filter((t) => t.active).length;
  const maxTables = activeCafe?.max_tables || 'Unlimited';

  return (
    <AppShell
      cafe={activeCafe}
      cafes={cafes}
      onSelectCafe={(c) => {
        setActiveCafe(c);
        setCafe(c);
      }}
      user={staff}
      onLogout={logout}
      title="Tables & QR Codes"
    >
      <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* ─── QR HEALTH CHECK BANNER ────────────────────────────────────────── */}
        <div
          className="card"
          style={{
            backgroundColor: isLocalhostWarning ? '#3B1713' : 'var(--color-foam)',
            borderColor: isLocalhostWarning ? 'var(--color-terracotta)' : 'var(--color-line)',
            color: isLocalhostWarning ? '#FFFDF9' : 'var(--color-espresso)',
            padding: '20px 24px',
            boxShadow: 'var(--shadow)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 'var(--radius)',
                  backgroundColor: isLocalhostWarning ? 'var(--color-terracotta)' : 'var(--color-sage-light)',
                  color: isLocalhostWarning ? '#FFF' : 'var(--color-sage)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {isLocalhostWarning ? <AlertTriangle size={24} /> : <Activity size={24} />}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <h2
                    style={{
                      fontSize: 18,
                      fontFamily: 'var(--font-serif)',
                      color: isLocalhostWarning ? '#FFFDF9' : 'var(--color-espresso)',
                    }}
                  >
                    {isLocalhostWarning ? 'QR Domain Warning (Localhost Detected)' : 'QR Code System Healthy'}
                  </h2>
                  <Badge variant={isLocalhostWarning ? 'danger' : 'success'} size="sm" dot>
                    {isLocalhostWarning ? 'Blocked' : 'Production Ready'}
                  </Badge>
                </div>
                <p
                  style={{
                    fontSize: 13,
                    color: isLocalhostWarning ? '#FCA5A5' : 'var(--color-muted)',
                    marginTop: 4,
                    lineHeight: 1.5,
                  }}
                >
                  {isLocalhostWarning
                    ? 'QR codes cannot be printed with localhost. Phones cannot open a localhost address. Set NEXT_PUBLIC_SITE_URL in your Vercel project environment variables (e.g. https://order-with-qr.vercel.app).'
                    : `Live Site URL: ${siteUrl} · ${activeCount} active tables ready for instant ordering.`}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Button
                variant={isLocalhostWarning ? 'danger' : 'primary'}
                icon={<Printer size={16} />}
                disabled={isLocalhostWarning || activeCount === 0}
                onClick={() => handlePrintAll('a4-grid')}
              >
                Print All (A4 Grid)
              </Button>
              <Button
                variant="secondary"
                icon={<Printer size={16} />}
                disabled={isLocalhostWarning || activeCount === 0}
                onClick={() => handlePrintAll('tent')}
              >
                Print Table Tents
              </Button>
            </div>
          </div>
        </div>

        {/* ─── BULK ADD TABLES FORM ─────────────────────────────────────────── */}
        <div className="card" style={{ padding: 24 }}>
          <h3
            style={{
              fontSize: 18,
              fontFamily: 'var(--font-serif)',
              color: 'var(--color-espresso)',
              marginBottom: 16,
            }}
          >
            Add New Tables
          </h3>
          <form
            onSubmit={handleAddTables}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr)) 160px',
              gap: 14,
              alignItems: 'end',
            }}
          >
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                Table Name Prefix
              </label>
              <Input
                value={addPrefix}
                onChange={(e) => setAddPrefix(e.target.value)}
                placeholder="Table "
                style={{ marginBottom: 0 }}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                How Many Tables?
              </label>
              <Input
                type="number"
                min="1"
                max="50"
                value={addCount}
                onChange={(e) => setAddCount(e.target.value)}
                style={{ marginBottom: 0 }}
                required
              />
            </div>
            <div>
              <Button type="submit" fullWidth loading={adding} icon={<Plus size={16} />}>
                Add Tables
              </Button>
            </div>
          </form>
        </div>

        {/* ─── TABLES LIST / GRID ────────────────────────────────────────────── */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div
            style={{
              padding: '18px 24px',
              borderBottom: '1px solid var(--color-line)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'var(--color-cream)',
            }}
          >
            <div>
              <h3
                style={{
                  fontSize: 18,
                  fontFamily: 'var(--font-serif)',
                  color: 'var(--color-espresso)',
                }}
              >
                Configured Tables ({tables.length})
              </h3>
              <p style={{ fontSize: 13, color: 'var(--color-muted)' }}>
                {activeCount} active · Capacity limit: {maxTables}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={fetchTables} icon={<RefreshCw size={14} />}>
              Refresh
            </Button>
          </div>

          {loading ? (
            <div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Skeleton height={56} borderRadius={12} />
              <Skeleton height={56} borderRadius={12} />
              <Skeleton height={56} borderRadius={12} />
            </div>
          ) : tables.length === 0 ? (
            <div style={{ padding: 40 }}>
              <EmptyState
                type="qr"
                title="No tables created yet"
                description="Add your first set of tables using the form above to generate scannable QR codes."
              />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {tables.map((tbl) => {
                const qrUrl = buildTableQrUrl(activeCafe?.slug, tbl.token);
                return (
                  <div
                    key={tbl.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '16px 24px',
                      borderBottom: '1px solid var(--color-line)',
                      gap: 16,
                      flexWrap: 'wrap',
                      backgroundColor: tbl.active ? 'transparent' : 'rgba(0,0,0,0.02)',
                      opacity: tbl.active ? 1 : 0.6,
                      transition: 'background var(--transition-fast)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 180 }}>
                      <button
                        onClick={() => setQrModalTable(tbl)}
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 'var(--radius)',
                          backgroundColor: 'var(--color-cream)',
                          border: '1.5px solid var(--color-line)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--color-roast)',
                          cursor: 'pointer',
                        }}
                        title="View & Download QR Code"
                      >
                        <QrCode size={22} />
                      </button>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--color-espresso)' }}>
                            {tbl.name}
                          </span>
                          <Badge variant={tbl.active ? 'success' : 'neutral'} size="sm" dot>
                            {tbl.active ? 'Active' : 'Disabled'}
                          </Badge>
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: 'var(--color-muted)',
                            fontFamily: 'monospace',
                            marginTop: 2,
                          }}
                        >
                          Token: {tbl.token ? tbl.token.slice(0, 10) + '…' : '—'}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      {/* Test Scan Diagnostics Button */}
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleRunTestScan(tbl)}
                        icon={<CheckCircle2 size={15} color="var(--color-sage)" />}
                      >
                        Test Scan
                      </Button>

                      {/* View QR Code */}
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setQrModalTable(tbl)}
                        icon={<QrCode size={15} />}
                      >
                        QR Code
                      </Button>

                      {/* Rename */}
                      <IconButton
                        size={38}
                        variant="secondary"
                        icon={<Edit2 size={15} />}
                        onClick={() => setRenameModalTable(tbl)}
                        title="Rename Table"
                      />

                      {/* Toggle Active */}
                      <Button
                        size="sm"
                        variant={tbl.active ? 'secondary' : 'primary'}
                        onClick={() => handleUpdate(tbl.id, { active: !tbl.active })}
                      >
                        {tbl.active ? 'Deactivate' : 'Activate'}
                      </Button>

                      {/* Delete */}
                      <IconButton
                        size={38}
                        variant="danger"
                        icon={<Trash2 size={15} />}
                        onClick={() => setDeleteConfirmTable(tbl)}
                        title="Delete Table"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ─── TEST SCAN DIAGNOSTICS MODAL ────────────────────────────────────── */}
      <Modal
        isOpen={!!testScanTable}
        onClose={() => setTestScanTable(null)}
        title={`Scan Diagnostics · ${testScanTable?.name || ''}`}
        subtitle="Verifies database resolution, token validity, and ordering readiness"
      >
        {testingScan ? (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div className="spinner" style={{ margin: '0 auto 16px' }} />
            <p style={{ color: 'var(--color-muted)', fontSize: 14 }}>
              Testing table camera scan routing...
            </p>
          </div>
        ) : testScanResults ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Target URL */}
            <div
              style={{
                backgroundColor: 'var(--color-cream)',
                padding: '12px 16px',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--color-line)',
                fontSize: 12,
                fontFamily: 'monospace',
                wordBreak: 'break-all',
              }}
            >
              <div style={{ color: 'var(--color-muted)', marginBottom: 2 }}>Encoded QR Destination:</div>
              <div style={{ color: 'var(--color-espresso)', fontWeight: 700 }}>
                {testScanResults.targetUrl}
              </div>
            </div>

            {/* Diagnostics 4 Green Checks / Red Crosses */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Check 1: Cafe Found */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius)',
                  backgroundColor: testScanResults.cafeFound ? 'var(--color-sage-light)' : 'var(--color-terracotta-light)',
                  border: `1px solid ${testScanResults.cafeFound ? 'rgba(107,143,113,0.3)' : 'rgba(196,85,61,0.3)'}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {testScanResults.cafeFound ? (
                    <CheckCircle2 size={18} color="var(--color-sage)" />
                  ) : (
                    <XCircle size={18} color="var(--color-terracotta)" />
                  )}
                  <span style={{ fontWeight: 600, fontSize: 14 }}>Cafe found</span>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700 }}>
                  {testScanResults.cafeFound ? `"${activeCafe?.slug}"` : 'Missing'}
                </span>
              </div>

              {/* Check 2: Table Found */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius)',
                  backgroundColor: testScanResults.tableFound ? 'var(--color-sage-light)' : 'var(--color-terracotta-light)',
                  border: `1px solid ${testScanResults.tableFound ? 'rgba(107,143,113,0.3)' : 'rgba(196,85,61,0.3)'}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {testScanResults.tableFound ? (
                    <CheckCircle2 size={18} color="var(--color-sage)" />
                  ) : (
                    <XCircle size={18} color="var(--color-terracotta)" />
                  )}
                  <span style={{ fontWeight: 600, fontSize: 14 }}>Table found</span>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700 }}>
                  {testScanResults.tableFound ? 'resolve_table() OK' : 'Failed'}
                </span>
              </div>

              {/* Check 3: Table Active */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius)',
                  backgroundColor: testScanResults.tableActive ? 'var(--color-sage-light)' : 'var(--color-terracotta-light)',
                  border: `1px solid ${testScanResults.tableActive ? 'rgba(107,143,113,0.3)' : 'rgba(196,85,61,0.3)'}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {testScanResults.tableActive ? (
                    <CheckCircle2 size={18} color="var(--color-sage)" />
                  ) : (
                    <XCircle size={18} color="var(--color-terracotta)" />
                  )}
                  <span style={{ fontWeight: 600, fontSize: 14 }}>Table active</span>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700 }}>
                  {testScanResults.tableActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              {/* Check 4: Ordering Enabled */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius)',
                  backgroundColor: testScanResults.orderingEnabled ? 'var(--color-sage-light)' : 'var(--color-terracotta-light)',
                  border: `1px solid ${testScanResults.orderingEnabled ? 'rgba(107,143,113,0.3)' : 'rgba(196,85,61,0.3)'}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {testScanResults.orderingEnabled ? (
                    <CheckCircle2 size={18} color="var(--color-sage)" />
                  ) : (
                    <XCircle size={18} color="var(--color-terracotta)" />
                  )}
                  <span style={{ fontWeight: 600, fontSize: 14 }}>Ordering enabled</span>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700 }}>
                  {testScanResults.orderingEnabled ? 'Ready for Phone Camera' : 'Blocked'}
                </span>
              </div>
            </div>

            {testScanResults.errorDetail && (
              <div className="err" style={{ marginBottom: 0, fontSize: 13 }}>
                <span>{testScanResults.errorDetail}</span>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <Button
                variant="primary"
                fullWidth
                icon={<ExternalLink size={16} />}
                onClick={() => window.open(testScanResults.targetUrl, '_blank')}
              >
                Open Exact Scan Link in New Tab
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* ─── SINGLE TABLE QR CODE MODAL ─────────────────────────────────────── */}
      {qrModalTable && (
        <Modal
          isOpen={!!qrModalTable}
          onClose={() => setQrModalTable(null)}
          title={`QR Code · ${qrModalTable.name}`}
          subtitle={activeCafe?.name}
        >
          {(() => {
            const qrUrl = buildTableQrUrl(activeCafe?.slug, qrModalTable.token);
            const svgStr = generateQRSvg(qrUrl, 240, 4);

            return (
              <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    padding: 18,
                    borderRadius: 'var(--radius)',
                    border: '2px solid var(--color-line)',
                    display: 'inline-flex',
                    alignSelf: 'center',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                  dangerouslySetInnerHTML={{ __html: svgStr }}
                />

                <div
                  style={{
                    backgroundColor: 'var(--color-cream)',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 12,
                    fontFamily: 'monospace',
                    wordBreak: 'break-all',
                    color: 'var(--color-espresso)',
                  }}
                >
                  {qrUrl}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <Button
                    variant="secondary"
                    icon={<Copy size={15} />}
                    onClick={async () => {
                      await navigator.clipboard.writeText(qrUrl);
                      showToast('QR destination URL copied!', 'success');
                    }}
                  >
                    Copy Link
                  </Button>
                  <Button
                    variant="secondary"
                    icon={<Download size={15} />}
                    onClick={async () => {
                      const dataUrl = await generateQRDataURLAsync(qrUrl, 800);
                      const a = document.createElement('a');
                      a.href = dataUrl;
                      a.download = `QR-${activeCafe?.slug}-${qrModalTable.name.replace(/\s+/g, '_')}.png`;
                      a.click();
                      showToast('High-resolution QR code downloaded (800px PNG).', 'success');
                    }}
                  >
                    Save PNG (800px)
                  </Button>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <Button
                    fullWidth
                    variant="danger"
                    icon={<RefreshCw size={15} />}
                    onClick={() => {
                      if (
                        confirm(
                          `Reset QR token for "${qrModalTable.name}"?\n\nOld printed QR codes will stop functioning immediately. You must reprint a new card.`
                        )
                      ) {
                        handleResetToken(qrModalTable.id);
                      }
                    }}
                  >
                    Reset QR Token (Invalidate Old Code)
                  </Button>
                </div>
              </div>
            );
          })()}
        </Modal>
      )}

      {/* ─── RENAME TABLE MODAL ─────────────────────────────────────────────── */}
      {renameModalTable && (
        <Modal
          isOpen={!!renameModalTable}
          onClose={() => setRenameModalTable(null)}
          title={`Rename ${renameModalTable.name}`}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const newName = e.target.tableName.value.trim();
              if (!newName) return;
              const res = await handleUpdate(renameModalTable.id, { name: newName });
              if (res.success) setRenameModalTable(null);
            }}
          >
            <Input
              name="tableName"
              label="New Table Name"
              defaultValue={renameModalTable.name}
              required
              autoFocus
            />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
              <Button variant="ghost" type="button" onClick={() => setRenameModalTable(null)}>
                Cancel
              </Button>
              <Button type="submit">Save Name</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ─── CONFIRM DELETE DIALOG ──────────────────────────────────────────── */}
      <ConfirmDialog
        isOpen={!!deleteConfirmTable}
        onClose={() => setDeleteConfirmTable(null)}
        onConfirm={handleDelete}
        title={`Delete "${deleteConfirmTable?.name}"?`}
        message="This table's QR code will permanently stop functioning and will be removed from your order stations."
        confirmText="Delete Table"
        danger
      />
    </AppShell>
  );
}
