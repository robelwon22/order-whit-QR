'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { CoffeeIllustration, Logo } from '../../components/ui/Logo';
import { Button, IconButton } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  Volume2,
  VolumeX,
  Play,
  CheckCircle2,
  Clock,
  Flame,
  Coffee,
  Check,
  LogOut,
  RefreshCw,
  AlertCircle,
  Bell,
  Sparkles,
} from 'lucide-react';

// Web Audio API Synthesizer for Cafe Order Chime
class ChimePlayer {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playOrderBell(volume = 0.8) {
    try {
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      // High harmonious double bell chime (F6 + A6)
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(1396.91, now); // F6
      osc1.frequency.exponentialRampToValueAtTime(1318.51, now + 0.6);

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1760.0, now + 0.08); // A6
      osc2.frequency.exponentialRampToValueAtTime(1661.22, now + 0.9);

      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(volume * 0.45, now + 0.04);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(this.ctx.destination);

      osc1.start(now);
      osc2.start(now + 0.08);
      osc1.stop(now + 1.2);
      osc2.stop(now + 1.2);
    } catch (e) {
      console.warn('Audio chime playback notice:', e);
    }
  }
}

const chimeInstance = new ChimePlayer();

export default function BartenderDashboard() {
  const [me, setMe] = useState(null);
  const [cafe, setCafe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  // Shift & Audio State
  const [shiftStarted, setShiftStarted] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);

  // Orders State
  const [orders, setOrders] = useState([]);
  const [orderItemsMap, setOrderItemsMap] = useState({}); // orderId -> [items]
  const [updatingOrderId, setUpdatingOrderId] = useState(null);

  // Clock state for timer chips
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  // Initialize staff auth
  useEffect(() => {
    async function init() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          window.location.href = '/login';
          return;
        }

        const { data: staff, error } = await supabase
          .from('staff')
          .select('*, cafes(*)')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (error || !staff) {
          setErr('No staff record found.');
          setLoading(false);
          return;
        }

        if (staff.role !== 'bartender' && staff.role !== 'cafe_admin' && staff.role !== 'super_admin') {
          setErr('Access denied: Barista / Bartender station only.');
          setLoading(false);
          return;
        }

        setMe(staff);
        setCafe(staff.cafes);
        setLoading(false);
      } catch (e) {
        setErr(e.message || 'Error initializing station');
        setLoading(false);
      }
    }
    init();
  }, []);

  // Fetch active queue orders
  const loadOrders = useCallback(async () => {
    if (!me?.cafe_id) return;
    try {
      // Query active orders (status open, preparing, or ready)
      const { data: activeOrders, error: orderErr } = await supabase
        .from('orders')
        .select('*')
        .eq('cafe_id', me.cafe_id)
        .in('status', ['open', 'preparing', 'ready'])
        .order('created_at', { ascending: true }); // Oldest first (FIFO)

      if (orderErr) throw orderErr;

      setOrders(activeOrders || []);

      if (activeOrders && activeOrders.length > 0) {
        const orderIds = activeOrders.map((o) => o.id);
        const { data: items, error: itemsErr } = await supabase
          .from('order_items')
          .select('*')
          .in('order_id', orderIds);

        if (!itemsErr && items) {
          const map = {};
          items.forEach((item) => {
            if (!map[item.order_id]) map[item.order_id] = [];
            map[item.order_id].push(item);
          });
          setOrderItemsMap(map);
        }
      }
    } catch (e) {
      console.error('Error loading barista orders:', e);
    }
  }, [me?.cafe_id]);

  // Initial orders load and Supabase Realtime subscription
  useEffect(() => {
    if (!me?.cafe_id) return;
    loadOrders();

    const channel = supabase
      .channel(`bartender-orders-${me.cafe_id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders', filter: `cafe_id=eq.${me.cafe_id}` },
        (payload) => {
          loadOrders();
          if (!isMuted && shiftStarted) {
            chimeInstance.playOrderBell(volume);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `cafe_id=eq.${me.cafe_id}` },
        () => loadOrders()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [me?.cafe_id, loadOrders, isMuted, shiftStarted, volume]);

  // Start shift unlocks audio context
  const handleStartShift = () => {
    chimeInstance.init();
    chimeInstance.playOrderBell(volume);
    setShiftStarted(true);
  };

  // Sound test button
  const handleTestSound = () => {
    chimeInstance.init();
    chimeInstance.playOrderBell(volume);
  };

  // Status transitions
  const handleUpdateStatus = async (orderId, newStatus) => {
    setUpdatingOrderId(orderId);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;

      if (newStatus === 'delivered' || newStatus === 'cancelled') {
        setOrders((prev) => prev.filter((o) => o.id !== orderId));
      } else {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
        );
      }
    } catch (e) {
      alert(e.message || 'Failed to update order status');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  if (loading) {
    return (
      <div
        className="theme-dark"
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#1A120C',
          color: '#FFFDF9',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <CoffeeIllustration size={100} />
          <h2 style={{ fontFamily: 'var(--font-serif)', marginTop: 16 }}>
            Connecting to Barista Queue...
          </h2>
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div
        className="theme-dark"
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#1A120C',
          padding: 20,
        }}
      >
        <div
          className="card"
          style={{ maxWidth: 440, width: '100%', textAlign: 'center', backgroundColor: '#251A12' }}
        >
          <div className="err" style={{ marginBottom: 20 }}>{err}</div>
          <Button variant="primary" onClick={handleLogout}>Back to Login</Button>
        </div>
      </div>
    );
  }

  // ─── START SHIFT WELCOME SCREEN ───────────────────────────────────────────
  if (!shiftStarted) {
    return (
      <div
        className="theme-dark anim-fade-in"
        style={{
          minHeight: '100vh',
          backgroundColor: '#1A120C',
          color: '#FFFDF9',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          textAlign: 'center',
          position: 'relative',
        }}
      >
        <div style={{ position: 'absolute', top: 24, right: 24 }}>
          <IconButton icon={<LogOut size={18} />} onClick={handleLogout} variant="ghost" title="Log out" />
        </div>

        <div style={{ maxWidth: 480, width: '100%' }}>
          <CoffeeIllustration size={180} />

          <div style={{ margin: '24px 0 10px' }}>
            <Badge variant="caramel" size="sm" dot>
              {cafe?.name || 'Specialty Coffee Bar'}
            </Badge>
          </div>

          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 'clamp(28px, 5vw, 42px)',
              fontWeight: 700,
              color: '#FFFDF9',
              marginBottom: 12,
            }}
          >
            Ready for your shift, {me.full_name}?
          </h1>

          <p
            style={{
              fontSize: 16,
              color: 'var(--color-muted)',
              marginBottom: 36,
              lineHeight: 1.5,
            }}
          >
            Start your shift to unlock real-time acoustic chimes and live FIFO order queuing from customer table scans.
          </p>

          <Button
            size="lg"
            variant="accent"
            fullWidth
            onClick={handleStartShift}
            style={{
              minHeight: 58,
              fontSize: 18,
              borderRadius: 'var(--radius-full)',
              boxShadow: '0 8px 30px rgba(201, 138, 75, 0.4)',
            }}
            iconRight={<Play size={20} />}
          >
            Start Shift & Activate Audio
          </Button>
        </div>
      </div>
    );
  }

  // ─── MAIN BARTENDER DASHBOARD (DARK MODE) ─────────────────────────────────
  const openCount = orders.filter((o) => o.status === 'open').length;
  const preparingCount = orders.filter((o) => o.status === 'preparing').length;

  return (
    <div
      className="theme-dark"
      style={{
        minHeight: '100vh',
        backgroundColor: '#1A120C',
        color: '#FFFDF9',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ─── STICKY TOP BAR ─────────────────────────────────────────────────── */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          backgroundColor: '#251A12',
          borderBottom: '1px solid #3B2A1E',
          padding: '14px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Logo size={32} showText={false} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  color: '#FFFDF9',
                  fontFamily: 'var(--font-serif)',
                  margin: 0,
                }}
              >
                {cafe?.name || 'Barista Station'}
              </h1>
              {/* Pulsing Live Dot */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '3px 10px',
                  borderRadius: 999,
                  backgroundColor: 'rgba(107, 143, 113, 0.2)',
                  border: '1px solid rgba(107, 143, 113, 0.4)',
                  fontSize: 12,
                  fontWeight: 700,
                  color: 'var(--color-sage)',
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    backgroundColor: 'var(--color-sage)',
                    animation: 'livePulse 1.8s infinite',
                  }}
                />
                <span>LIVE</span>
              </div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-muted)' }}>
              Barista: {me.full_name} · {orders.length} in queue ({openCount} waiting)
            </div>
          </div>
        </div>

        {/* Volume & Audio Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => setIsMuted(!isMuted)}
              style={{
                background: 'transparent',
                border: 'none',
                color: isMuted ? 'var(--color-terracotta)' : 'var(--color-caramel)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>

            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                setVolume(Number(e.target.value));
                if (isMuted) setIsMuted(false);
              }}
              style={{ width: 80, cursor: 'pointer', accentColor: 'var(--color-caramel)' }}
              title="Alert Volume"
            />

            <Button size="sm" variant="secondary" onClick={handleTestSound} icon={<Bell size={13} />}>
              Sound Test
            </Button>
          </div>

          <IconButton icon={<LogOut size={16} />} onClick={handleLogout} title="Log out" variant="ghost" />
        </div>
      </header>

      {/* ─── ORDERS QUEUE (READABLE FROM 1 METER AWAY) ───────────────────────── */}
      <main style={{ flex: 1, padding: '24px 20px', maxWidth: 1400, margin: '0 auto', width: '100%' }}>
        {orders.length === 0 ? (
          <div style={{ maxWidth: 500, margin: '60px auto', textAlign: 'center' }}>
            <EmptyState
              type="coffee"
              title="All Caught Up!"
              description="No orders currently in the queue. New orders from table QR scans will automatically appear here with an audible bell chime."
            />
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
              gap: 20,
              alignItems: 'start',
            }}
          >
            {orders.map((order) => {
              const items = orderItemsMap[order.id] || [];
              const elapsedMinutes = Math.floor((now - new Date(order.created_at).getTime()) / 60000);

              // Timer chip colors: <5m Sage, 5-10m Amber, >10m Terracotta
              let timerBg = 'var(--color-sage-light)';
              let timerColor = 'var(--color-sage)';
              let timerBorder = 'var(--color-sage)';

              if (elapsedMinutes >= 10) {
                timerBg = 'rgba(196, 85, 61, 0.25)';
                timerColor = 'var(--color-terracotta)';
                timerBorder = 'var(--color-terracotta)';
              } else if (elapsedMinutes >= 5) {
                timerBg = 'rgba(227, 163, 43, 0.25)';
                timerColor = 'var(--color-amber)';
                timerBorder = 'var(--color-amber)';
              }

              const isOpen = order.status === 'open';
              const isPreparing = order.status === 'preparing';
              const isReady = order.status === 'ready';
              const isBusy = updatingOrderId === order.id;

              return (
                <div
                  key={order.id}
                  className="card"
                  style={{
                    backgroundColor: '#251A12',
                    border: isOpen ? '2px solid var(--color-caramel)' : '1px solid #3B2A1E',
                    borderRadius: 'var(--radius-card)',
                    padding: 24,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 18,
                    boxShadow: isOpen ? '0 10px 30px rgba(201, 138, 75, 0.25)' : 'var(--shadow)',
                    animation: isOpen ? 'pulseSoft 3s infinite ease-in-out' : 'fadeIn 0.2s',
                  }}
                >
                  {/* Card Top: Huge Table Name & Timer Chip */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                    <div>
                      {/* HUGE TABLE NAME READABLE FROM 1 METER */}
                      <h2
                        style={{
                          fontSize: 32,
                          fontWeight: 800,
                          color: '#FFFDF9',
                          letterSpacing: '-0.02em',
                          margin: 0,
                        }}
                      >
                        {order.table_name || 'Table ?'}
                      </h2>
                      <div style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 2 }}>
                        Order #{order.id.slice(0, 6).toUpperCase()}
                      </div>
                    </div>

                    {/* Timer Chip */}
                    <div
                      style={{
                        padding: '6px 14px',
                        borderRadius: 999,
                        backgroundColor: timerBg,
                        color: timerColor,
                        border: `1.5px solid ${timerBorder}`,
                        fontWeight: 700,
                        fontSize: 13,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <Clock size={15} />
                      <span>{elapsedMinutes} min ago</span>
                    </div>
                  </div>

                  {/* Customer Order Note */}
                  {order.note && (
                    <div
                      style={{
                        backgroundColor: 'rgba(201, 138, 75, 0.15)',
                        border: '1px solid rgba(201, 138, 75, 0.3)',
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: 13,
                        color: 'var(--color-caramel)',
                        fontWeight: 600,
                      }}
                    >
                      📝 Note: {order.note}
                    </div>
                  )}

                  {/* Big Quantities and Items */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {items.length === 0 ? (
                      <div style={{ fontSize: 13, color: 'var(--color-muted)' }}>Loading items...</div>
                    ) : (
                      items.map((item, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 12,
                            paddingBottom: 8,
                            borderBottom: '1px solid rgba(255,255,255,0.06)',
                          }}
                        >
                          {/* BIG QUANTITY BADGE */}
                          <div
                            style={{
                              width: 38,
                              height: 38,
                              borderRadius: 10,
                              backgroundColor: 'var(--color-roast)',
                              color: '#FFF',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 18,
                              fontWeight: 800,
                              flexShrink: 0,
                            }}
                          >
                            {item.quantity}×
                          </div>

                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 17, fontWeight: 700, color: '#FFFDF9', lineHeight: 1.2 }}>
                              {item.item_name}
                            </div>
                            {item.note && (
                              <div style={{ fontSize: 12, color: 'var(--color-amber)', marginTop: 2, fontWeight: 600 }}>
                                ↳ {item.note}
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Status Indicator */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>Status:</span>
                    <Badge
                      variant={isOpen ? 'warning' : isPreparing ? 'caramel' : 'success'}
                      size="sm"
                      dot
                    >
                      {isOpen ? 'New Order (Waiting)' : isPreparing ? 'Being Prepared' : 'Ready for Guest'}
                    </Badge>
                  </div>

                  {/* BIG ACTION BUTTONS */}
                  <div style={{ marginTop: 'auto' }}>
                    {isOpen && (
                      <Button
                        fullWidth
                        size="lg"
                        variant="accent"
                        disabled={isBusy}
                        onClick={() => handleUpdateStatus(order.id, 'preparing')}
                        style={{ minHeight: 52, fontSize: 16 }}
                        icon={<Flame size={18} />}
                      >
                        Accept & Start Preparing
                      </Button>
                    )}

                    {isPreparing && (
                      <Button
                        fullWidth
                        size="lg"
                        variant="primary"
                        disabled={isBusy}
                        onClick={() => handleUpdateStatus(order.id, 'ready')}
                        style={{ minHeight: 52, fontSize: 16, backgroundColor: 'var(--color-sage)' }}
                        icon={<Coffee size={18} />}
                      >
                        Mark as Ready ☕
                      </Button>
                    )}

                    {isReady && (
                      <Button
                        fullWidth
                        size="lg"
                        variant="secondary"
                        disabled={isBusy}
                        onClick={() => handleUpdateStatus(order.id, 'delivered')}
                        style={{ minHeight: 52, fontSize: 16 }}
                        icon={<Check size={18} />}
                      >
                        Delivered to Table ✓
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
