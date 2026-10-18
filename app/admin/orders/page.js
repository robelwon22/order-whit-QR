'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../../lib/supabase';
import { useStaff } from '../../../lib/useStaff';
import { useToast } from '../../../components/ui/Toast';
import { useI18n } from '../../../lib/i18n';
import { AppShell } from '../../../components/ui/AppShell';
import { Button, IconButton } from '../../../components/ui/Button';
import { Badge, EmptyState, Skeleton } from '../../../components/ui/Badge';
import {
  ShoppingBag,
  RefreshCw,
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Edit2,
  Filter,
  User,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export default function AdminOrdersPage() {
  const { staff, cafe, cafes, setCafe, loading: authLoading, logout } = useStaff(['cafe_admin', 'super_admin']);
  const { showToast } = useToast();
  const { isAmharic } = useI18n();

  const [activeCafe, setActiveCafe] = useState(null);
  const [orders, setOrders] = useState([]);
  const [orderItemsMap, setOrderItemsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all | open | served | paid | cancelled | edited
  const [expandedOrders, setExpandedOrders] = useState({});

  useEffect(() => {
    if (cafe && !activeCafe) setActiveCafe(cafe);
  }, [cafe, activeCafe]);

  const loadOrders = useCallback(async (isSilent = false) => {
    if (!activeCafe?.id) return;
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      // 1. Fetch recent 150 orders for this cafe
      const { data: ordersData, error: ordersErr } = await supabase
        .from('orders')
        .select('*')
        .eq('cafe_id', activeCafe.id)
        .order('created_at', { ascending: false })
        .limit(150);

      if (ordersErr) throw ordersErr;

      const safeOrders = Array.isArray(ordersData) ? ordersData : [];
      setOrders(safeOrders);

      // 2. Fetch associated items
      if (safeOrders.length > 0) {
        const orderIds = safeOrders.map((o) => o.id).filter(Boolean);
        const { data: itemsData, error: itemsErr } = await supabase
          .from('order_items')
          .select('*')
          .in('order_id', orderIds);

        if (!itemsErr && Array.isArray(itemsData)) {
          const map = {};
          itemsData.forEach((it) => {
            if (!map[it.order_id]) map[it.order_id] = [];
            map[it.order_id].push(it);
          });
          setOrderItemsMap(map);
        }
      } else {
        setOrderItemsMap({});
      }
    } catch (err) {
      console.error('Failed to load orders:', err);
      showToast(err.message || 'Could not load orders', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeCafe?.id, showToast]);

  useEffect(() => {
    if (activeCafe?.id) {
      loadOrders();

      // Subscribe to Realtime order changes
      const channel = supabase
        .channel(`admin-orders-${activeCafe.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'orders', filter: `cafe_id=eq.${activeCafe.id}` },
          () => {
            loadOrders(true);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [activeCafe?.id, loadOrders]);

  const toggleExpand = (id) => {
    setExpandedOrders((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // Status filter
      if (statusFilter === 'edited') {
        if (!o.edited_at) return false;
      } else if (statusFilter !== 'all') {
        if (o.status !== statusFilter) return false;
      }

      // Search filter (table name, order id, note, cancel reason)
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matchesTable = (o.table_name || '').toLowerCase().includes(q);
        const matchesId = (o.id || '').toLowerCase().includes(q);
        const matchesNote = (o.note || '').toLowerCase().includes(q);
        const matchesReason = (o.cancel_reason || '').toLowerCase().includes(q);
        const items = orderItemsMap[o.id] || [];
        const matchesItem = items.some((it) => (it.name || '').toLowerCase().includes(q));
        if (!matchesTable && !matchesId && !matchesNote && !matchesReason && !matchesItem) {
          return false;
        }
      }

      return true;
    });
  }, [orders, statusFilter, search, orderItemsMap]);

  const formatTime = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <AppShell
      cafe={activeCafe}
      cafes={cafes}
      onSelectCafe={(c) => {
        setActiveCafe(c);
        if (setCafe) setCafe(c);
      }}
      user={staff}
      onLogout={logout}
      title={isAmharic ? 'ትዕዛዞች እና ታሪክ' : 'Orders & Audit History'}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Page Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, color: 'var(--text)' }}>
              {isAmharic ? 'የትዕዛዝ ታሪክ' : 'Orders & Audit History'}
            </h1>
            <p style={{ fontSize: 14, color: 'var(--color-muted)', margin: '4px 0 0' }}>
              {isAmharic
                ? 'የተስተካከሉ እና የተሰረዙ ትዕዛዞችን ጨምሮ ሙሉ መረጃዎችን ይመልከቱ።'
                : 'Monitor incoming table orders, customer & staff edits, cancellations, and payment states.'}
            </p>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => loadOrders(true)}
            icon={<RefreshCw size={15} className={refreshing ? 'anim-spin' : ''} />}
            disabled={refreshing}
          >
            {isAmharic ? 'አድስ' : 'Refresh'}
          </Button>
        </div>

        {/* Filters and Search Bar */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            alignItems: 'center',
            backgroundColor: 'var(--color-foam)',
            border: '1px solid var(--color-line)',
            borderRadius: 'var(--radius-card)',
            padding: 14,
          }}
        >
          {/* Search Input */}
          <div style={{ flex: '1 1 240px', position: 'relative' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--color-muted)',
              }}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isAmharic ? 'በጠረጴዛ ወይም በትዕዛዝ ቁጥር ፈልግ...' : 'Search table, items, or ID...'}
              style={{
                width: '100%',
                padding: '9px 12px 9px 36px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-line)',
                backgroundColor: 'var(--color-surface)',
                color: 'var(--text)',
                fontSize: 13,
                outline: 'none',
              }}
            />
          </div>

          {/* Status Tabs */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: isAmharic ? 'ሁሉም' : 'All' },
              { id: 'open', label: isAmharic ? 'ክፍት' : 'Open' },
              { id: 'served', label: isAmharic ? 'የቀረበ' : 'Served' },
              { id: 'paid', label: isAmharic ? 'የተከፈለ' : 'Paid' },
              { id: 'cancelled', label: isAmharic ? 'የተሰረዘ' : 'Cancelled' },
              { id: 'edited', label: isAmharic ? 'የተስተካከለ' : 'Edited' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                style={{
                  padding: '7px 14px',
                  borderRadius: 999,
                  border: statusFilter === tab.id ? '1.5px solid var(--color-caramel)' : '1px solid var(--color-line)',
                  backgroundColor: statusFilter === tab.id ? 'rgba(201, 138, 75, 0.15)' : 'var(--color-surface)',
                  color: statusFilter === tab.id ? 'var(--color-caramel)' : 'var(--text)',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Orders List */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Skeleton height={90} />
            <Skeleton height={90} />
            <Skeleton height={90} />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div
            style={{
              padding: '60px 20px',
              backgroundColor: 'var(--color-surface)',
              borderRadius: 'var(--radius-card)',
              border: '1px solid var(--color-line)',
              textAlign: 'center',
            }}
          >
            <EmptyState
              type="coffee"
              title={isAmharic ? 'ምንም ትዕዛዝ አልተገኘም' : 'No Orders Found'}
              description={
                search || statusFilter !== 'all'
                  ? isAmharic
                    ? 'ከፍለጋዎ ጋር የሚዛመድ ምንም ትዕዛዝ የለም።'
                    : 'No orders match your active filter or search criteria.'
                  : isAmharic
                  ? 'እስካሁን ምንም ትዕዛዝ አልተመዘገበም።'
                  : 'Customer orders from table QR codes will appear here in real-time.'
              }
            />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {filteredOrders.map((order) => {
              const isExpanded = !!expandedOrders[order.id];
              const items = orderItemsMap[order.id] || [];
              const totalItems = items.reduce((sum, it) => sum + (it.qty || 1), 0);
              const orderTotal = items.reduce((sum, it) => sum + ((it.price || 0) * (it.qty || 1)), 0);

              // Status styles
              let statusLabel = order.status;
              let statusColor = 'var(--text)';
              let statusBg = 'var(--color-foam)';
              let statusBorder = 'var(--color-line)';

              if (order.status === 'open') {
                statusLabel = isAmharic ? 'ክፍት / ወረፋ' : 'Open / In Queue';
                statusColor = 'var(--color-caramel)';
                statusBg = 'rgba(201, 138, 75, 0.12)';
                statusBorder = 'rgba(201, 138, 75, 0.3)';
              } else if (order.status === 'served') {
                statusLabel = isAmharic ? 'የቀረበ' : 'Served';
                statusColor = '#7A5AF8';
                statusBg = 'rgba(122, 90, 248, 0.12)';
                statusBorder = 'rgba(122, 90, 248, 0.3)';
              } else if (order.status === 'paid') {
                statusLabel = isAmharic ? 'ተከፍሏል' : 'Paid';
                statusColor = '#12B76A';
                statusBg = 'rgba(18, 183, 106, 0.12)';
                statusBorder = 'rgba(18, 183, 106, 0.3)';
              } else if (order.status === 'cancelled') {
                statusLabel = isAmharic ? 'ተሰርዟል' : 'Cancelled';
                statusColor = 'var(--color-terracotta)';
                statusBg = 'rgba(196, 85, 61, 0.12)';
                statusBorder = 'rgba(196, 85, 61, 0.3)';
              }

              return (
                <div
                  key={order.id}
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-line)',
                    borderRadius: 'var(--radius-card)',
                    overflow: 'hidden',
                    boxShadow: 'var(--shadow-sm)',
                    transition: 'border-color 0.15s ease',
                  }}
                >
                  {/* Card Main Bar */}
                  <div
                    style={{
                      padding: '16px 20px',
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 16,
                      cursor: 'pointer',
                    }}
                    onClick={() => toggleExpand(order.id)}
                  >
                    {/* Left: Table & Order Identity */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 10,
                          backgroundColor: 'var(--color-foam)',
                          border: '1px solid var(--color-line)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--color-caramel)',
                          fontWeight: 800,
                          fontSize: 16,
                        }}
                      >
                        <ShoppingBag size={20} />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)' }}>
                            {order.table_name || 'Table'}
                          </span>
                          <span style={{ fontSize: 12, color: 'var(--color-muted)', fontWeight: 600 }}>
                            #{String(order.id).slice(0, 8)}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Clock size={12} />
                          <span>{formatTime(order.created_at)}</span>
                          <span>•</span>
                          <span>{totalItems} {totalItems === 1 ? 'item' : 'items'}</span>
                          {orderTotal > 0 && (
                            <>
                              <span>•</span>
                              <span style={{ fontWeight: 700, color: 'var(--text)' }}>{orderTotal.toFixed(2)} ETB</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Badges & Toggle */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      {/* EDITED BADGE */}
                      {order.edited_at && (
                        <span
                          style={{
                            padding: '4px 10px',
                            borderRadius: 6,
                            backgroundColor: 'rgba(227, 163, 43, 0.15)',
                            color: 'var(--color-amber)',
                            border: '1px solid rgba(227, 163, 43, 0.4)',
                            fontSize: 11,
                            fontWeight: 800,
                            letterSpacing: '0.02em',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                          }}
                          title={`Edited on ${formatTime(order.edited_at)} by ${order.edited_by || 'unknown'}`}
                        >
                          <Edit2 size={11} />
                          <span>
                            EDITED ({order.edited_by === 'customer' ? (isAmharic ? 'በደንበኛ' : 'by customer') : (isAmharic ? 'በሰራተኛ' : 'by staff')})
                          </span>
                        </span>
                      )}

                      {/* CANCELLED BADGE */}
                      {order.status === 'cancelled' && (
                        <span
                          style={{
                            padding: '4px 10px',
                            borderRadius: 6,
                            backgroundColor: 'rgba(196, 85, 61, 0.15)',
                            color: 'var(--color-terracotta)',
                            border: '1px solid rgba(196, 85, 61, 0.35)',
                            fontSize: 11,
                            fontWeight: 800,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                          }}
                        >
                          <XCircle size={11} />
                          <span>
                            CANCELLED ({order.cancelled_by === 'staff' ? (isAmharic ? 'በሰራተኛ' : 'by staff') : (isAmharic ? 'በደንበኛ' : 'by customer')})
                          </span>
                        </span>
                      )}

                      {/* Main Status Pill */}
                      <span
                        style={{
                          padding: '5px 12px',
                          borderRadius: 999,
                          backgroundColor: statusBg,
                          color: statusColor,
                          border: `1.5px solid ${statusBorder}`,
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        {statusLabel}
                      </span>

                      {/* Expand / Collapse Icon */}
                      <button
                        type="button"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--color-muted)',
                          padding: 4,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Detail Panel: Line Items & Audit Trail */}
                  {isExpanded && (
                    <div
                      style={{
                        padding: '16px 20px',
                        borderTop: '1px solid var(--color-line)',
                        backgroundColor: 'var(--color-foam)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 16,
                      }}
                    >
                      {/* Audit Trail Box */}
                      {(order.edited_at || order.cancelled_by || order.note) && (
                        <div
                          style={{
                            backgroundColor: 'var(--color-surface)',
                            border: '1px solid var(--color-line)',
                            borderRadius: 'var(--radius-sm)',
                            padding: 14,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 8,
                          }}
                        >
                          <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            {isAmharic ? 'የትዕዛዝ ታሪክ እና ማስታወሻ' : 'Audit Trail & Notes'}
                          </span>

                          {order.note && (
                            <div style={{ fontSize: 13, color: 'var(--text)' }}>
                              <strong>{isAmharic ? 'የደንበኛ ማስታወሻ:' : 'Order Note:'}</strong> {order.note}
                            </div>
                          )}

                          {order.edited_at && (
                            <div style={{ fontSize: 13, color: 'var(--color-amber)', display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Edit2 size={13} />
                              <span>
                                <strong>{isAmharic ? 'የተስተካከለው በ:' : 'Edited by:'}</strong>{' '}
                                {order.edited_by === 'customer' ? (isAmharic ? 'ደንበኛ' : 'Customer') : (isAmharic ? 'ሰራተኛ' : 'Staff')}
                                {' '}({formatTime(order.edited_at)})
                              </span>
                            </div>
                          )}

                          {order.status === 'cancelled' && (
                            <div style={{ fontSize: 13, color: 'var(--color-terracotta)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <XCircle size={13} />
                                <span>
                                  <strong>{isAmharic ? 'የተሰረዘው በ:' : 'Cancelled by:'}</strong>{' '}
                                  {order.cancelled_by === 'staff' ? (isAmharic ? 'ሰራተኛ' : 'Staff') : (isAmharic ? 'ደንበኛ' : 'Customer')}
                                </span>
                              </div>
                              {order.cancel_reason && (
                                <div style={{ paddingLeft: 19, fontSize: 12, color: 'var(--color-muted)' }}>
                                  <strong>{isAmharic ? 'ምክንያት:' : 'Reason:'}</strong> {order.cancel_reason}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Items List */}
                      <div>
                        <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 8 }}>
                          {isAmharic ? 'የታዘዙ እቃዎች' : 'Order Line Items'}
                        </span>
                        {items.length === 0 ? (
                          <div style={{ fontSize: 13, color: 'var(--color-muted)', fontStyle: 'italic' }}>
                            {isAmharic ? 'ምንም እቃዎች አልተመዘገቡም' : 'No items recorded'}
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {items.map((it, idx) => (
                              <div
                                key={idx}
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  backgroundColor: 'var(--color-surface)',
                                  border: '1px solid var(--color-line)',
                                  borderRadius: 6,
                                  padding: '8px 14px',
                                  fontSize: 13,
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                  <span
                                    style={{
                                      fontWeight: 800,
                                      color: 'var(--color-caramel)',
                                      minWidth: 24,
                                    }}
                                  >
                                    {it.qty}x
                                  </span>
                                  <div>
                                    <span style={{ fontWeight: 600, color: 'var(--text)' }}>
                                      {typeof it.name === 'object' ? (it.name?.en || it.name?.am || 'Item') : it.name}
                                    </span>
                                    {it.note && (
                                      <span style={{ display: 'block', fontSize: 11, color: 'var(--color-muted)', fontStyle: 'italic' }}>
                                        “{it.note}”
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {it.price !== undefined && (
                                  <span style={{ fontWeight: 700, color: 'var(--text)' }}>
                                    {((it.price || 0) * (it.qty || 1)).toFixed(2)} ETB
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
