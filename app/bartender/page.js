'use client';

import React, { useEffect, useState, useRef, useCallback, Component } from 'react';
import { supabase } from '../../lib/supabase';
import { CoffeeIllustration, Logo } from '../../components/ui/Logo';
import { Button, IconButton } from '../../components/ui/Button';
import { Badge, EmptyState } from '../../components/ui/Badge';
import {
  Volume2,
  VolumeX,
  Play,
  Clock,
  Flame,
  Coffee,
  Check,
  LogOut,
  RefreshCw,
  AlertCircle,
  Bell,
  Sparkles,
  CheckCircle2,
  DollarSign,
  XCircle,
} from 'lucide-react';

// ─── ERROR BOUNDARY FOR INDIVIDUAL ORDER CARDS ─────────────────────────────
class OrderCardErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('OrderCard render error caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="card"
          style={{
            backgroundColor: '#251A12',
            border: '1.5px solid var(--color-terracotta)',
            borderRadius: 'var(--radius-card)',
            padding: 24,
            color: '#FFFDF9',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-terracotta)', fontWeight: 700 }}>
            <AlertCircle size={20} />
            <span>Something went wrong with this order</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--color-muted)' }}>
            {this.state.error?.message || 'Display error rendering order items.'}
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              this.setState({ hasError: false, error: null });
              if (this.props.onReload) this.props.onReload();
            }}
            icon={<RefreshCw size={14} />}
          >
            Reload Order
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── PAGE LEVEL ERROR BOUNDARY ──────────────────────────────────────────────
class BartenderPageErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Bartender page error boundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
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
              {this.state.error?.message || 'An unexpected display error occurred. Orders and database remain intact.'}
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <Button
                variant="accent"
                size="md"
                onClick={() => this.setState({ hasError: false, error: null })}
                icon={<RefreshCw size={16} />}
              >
                Reload Station
              </Button>
              <Button
                variant="ghost"
                size="md"
                onClick={() => { window.location.href = '/login'; }}
              >
                Back to Login
              </Button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── SAFE STRING & OBJECT PARSERS ──────────────────────────────────────────
function formatItemName(itemName, locale = 'en') {
  if (!itemName) return 'Unknown Item';
  if (typeof itemName === 'string') return itemName;
  if (typeof itemName === 'object') {
    return itemName[locale] || itemName.en || itemName.am || Object.values(itemName)[0] || 'Unknown Item';
  }
  return String(itemName);
}

function formatText(val, fallback = '') {
  if (!val) return fallback;
  if (typeof val === 'string') return val;
  if (typeof val === 'object') return val.en || Object.values(val)[0] || fallback;
  return String(val);
}

// ─── WEB AUDIO CHIME PLAYER ────────────────────────────────────────────────
class ChimePlayer {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (typeof window === 'undefined') return;
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    } catch (e) {
      console.warn('AudioContext initialization notice:', e);
    }
  }

  playOrderBell(volume = 0.8) {
    if (typeof window === 'undefined') return;
    try {
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(1396.91, now); // F6
      osc1.frequency.exponentialRampToValueAtTime(1318.51, now + 0.6);

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1760.0, now + 0.08); // A6
      osc2.frequency.exponentialRampToValueAtTime(1661.22, now + 0.9);

      const targetVol = Math.max(0, Math.min(1, Number(volume) || 0.8));
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(targetVol * 0.45, now + 0.04);
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

// ─── MAIN BARTENDER COMPONENT ──────────────────────────────────────────────
function BartenderDashboardInner() {
  const [mounted, setMounted] = useState(false);
  const [me, setMe] = useState(null);
  const [cafe, setCafe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [errType, setErrType] = useState('access'); // 'access', 'disabled', 'unavailable', 'config'

  // Shift & Audio State
  const [shiftStarted, setShiftStarted] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);

  // Orders State
  const [orders, setOrders] = useState([]);
  const [orderItemsMap, setOrderItemsMap] = useState({});
  const [updatingId, setUpdatingId] = useState(null);
  const [filterTab, setFilterTab] = useState('active'); // 'active', 'served', 'all'

  // Clock state for timer chips
  const [now, setNow] = useState(Date.now());

  // Wake Lock Ref
  const wakeLockRef = useRef(null);
  const isMountedRef = useRef(true);
  const shiftStartedRef = useRef(false);
  const isMutedRef = useRef(false);
  const volumeRef = useRef(0.8);

  useEffect(() => {
    shiftStartedRef.current = shiftStarted;
  }, [shiftStarted]);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  // Request & Release Screen Wake Lock safely
  const requestWakeLock = useCallback(async () => {
    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
      } catch (err) {
        console.warn('Wake Lock notice (screen lock unavailable):', err?.message || err);
      }
    }
  }, []);

  const releaseWakeLock = useCallback(() => {
    try {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    } catch (err) {
      console.warn('Wake Lock release notice:', err);
    }
  }, []);

  // Handle visibility change for Wake Lock
  useEffect(() => {
    setMounted(true);
    isMountedRef.current = true;

    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible' && shiftStartedRef.current) {
        requestWakeLock();
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      isMountedRef.current = false;
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
      releaseWakeLock();
    };
  }, [requestWakeLock, releaseWakeLock]);

  // Live timer interval
  useEffect(() => {
    const timer = setInterval(() => {
      if (isMountedRef.current) {
        setNow(Date.now());
      }
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // Auth & Station Initialization
  useEffect(() => {
    async function init() {
      try {
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
          setErr('Missing Supabase configuration in environment.');
          setErrType('config');
          setLoading(false);
          return;
        }

        const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
        if (sessionErr || !session) {
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
          return;
        }

        const { data: staff, error: staffErr } = await supabase
          .from('staff')
          .select('*, cafes(*)')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (staffErr || !staff) {
          setErr('No access: No staff record found for this account.');
          setErrType('access');
          setLoading(false);
          return;
        }

        if (staff.active === false) {
          setErr('Account disabled. Please contact your cafe manager.');
          setErrType('disabled');
          setLoading(false);
          return;
        }

        if (staff.role !== 'bartender' && staff.role !== 'cafe_admin' && staff.role !== 'super_admin') {
          setErr('No access: Barista / Bartender station only.');
          setErrType('access');
          setLoading(false);
          return;
        }

        // Handle super_admin previewing bartender station
        if (staff.role === 'super_admin' && !staff.cafe_id) {
          const { data: defaultCafe } = await supabase.from('cafes').select('*').limit(1).maybeSingle();
          if (defaultCafe) {
            staff.cafe_id = defaultCafe.id;
            staff.cafes = defaultCafe;
          }
        }

        if (!staff.cafe_id) {
          setErr('No access: Staff account is not associated with an active cafe.');
          setErrType('access');
          setLoading(false);
          return;
        }

        const cafeRecord = staff.cafes;
        if (cafeRecord && (cafeRecord.active === false || cafeRecord.status === 'suspended' || cafeRecord.status === 'expired')) {
          setErr('This cafe is currently unavailable.');
          setErrType('unavailable');
          setLoading(false);
          return;
        }

        if (isMountedRef.current) {
          setMe(staff);
          setCafe(cafeRecord);
          setLoading(false);
        }
      } catch (e) {
        if (isMountedRef.current) {
          setErr(e?.message || 'Error initializing barista station');
          setErrType('access');
          setLoading(false);
        }
      }
    }
    init();
  }, []);

  // Fetch active queue orders
  const loadOrders = useCallback(async () => {
    if (!me?.cafe_id) return;
    try {
      // Query active orders (open or served, oldest first FIFO)
      const { data: activeOrders, error: orderErr } = await supabase
        .from('orders')
        .select('*, order_stations(*)')
        .eq('cafe_id', me.cafe_id)
        .in('status', ['open', 'served'])
        .order('created_at', { ascending: true });

      if (orderErr) {
        console.error('Error fetching orders:', orderErr);
        return;
      }

      const safeOrders = Array.isArray(activeOrders) ? activeOrders : [];
      if (isMountedRef.current) {
        setOrders(safeOrders);
      }

      if (safeOrders.length > 0) {
        const orderIds = safeOrders.map((o) => o?.id).filter(Boolean);
        if (orderIds.length > 0) {
          const { data: items, error: itemsErr } = await supabase
            .from('order_items')
            .select('*')
            .in('order_id', orderIds);

          if (!itemsErr && Array.isArray(items)) {
            const map = {};
            items.forEach((item) => {
              if (!item?.order_id) return;
              if (!map[item.order_id]) map[item.order_id] = [];
              map[item.order_id].push(item);
            });
            if (isMountedRef.current) {
              setOrderItemsMap(map);
            }
          }
        }
      } else {
        if (isMountedRef.current) {
          setOrderItemsMap({});
        }
      }
    } catch (e) {
      console.error('Error in loadOrders:', e);
    }
  }, [me?.cafe_id]);

  // Realtime subscription setup
  useEffect(() => {
    if (!me?.cafe_id) return;
    loadOrders();

    const cafeId = me.cafe_id;
    let channel = null;

    try {
      channel = supabase
        .channel(`bartender-orders-${cafeId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'orders', filter: `cafe_id=eq.${cafeId}` },
          (payload) => {
            if (!isMountedRef.current) return;
            loadOrders();
            if (payload?.eventType === 'INSERT') {
              if (shiftStartedRef.current && !isMutedRef.current) {
                chimeInstance.playOrderBell(volumeRef.current);
                if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                  try {
                    navigator.vibrate([200, 100, 200]);
                  } catch (e) {}
                }
              }
            }
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'order_stations', filter: `cafe_id=eq.${cafeId}` },
          () => {
            if (!isMountedRef.current) return;
            loadOrders();
          }
        )
        .subscribe();
    } catch (err) {
      console.warn('Realtime subscription notice:', err);
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel).catch(() => {});
      }
    };
  }, [me?.cafe_id, loadOrders]);

  // Handle Start Shift click
  const handleStartShift = async () => {
    try {
      chimeInstance.init();
      chimeInstance.playOrderBell(volume);
    } catch (e) {
      console.warn('Audio chime on start shift notice:', e);
    }
    requestWakeLock();
    setShiftStarted(true);
  };

  // Sound test button
  const handleTestSound = () => {
    try {
      chimeInstance.init();
      chimeInstance.playOrderBell(volume);
    } catch (e) {
      console.warn('Audio test sound notice:', e);
    }
  };

  // Station & Order Status Updates
  const handleStationTransition = async (orderId, newStationStatus) => {
    setUpdatingId(orderId);
    try {
      const order = orders.find((o) => o?.id === orderId);
      const stationRecord = order?.order_stations?.[0];

      const updates = {
        status: newStationStatus,
      };

      if (newStationStatus === 'accepted') {
        updates.accepted_by = me?.user_id || null;
        updates.accepted_at = new Date().toISOString();
      } else if (newStationStatus === 'ready') {
        updates.ready_at = new Date().toISOString();
      }

      if (stationRecord?.id) {
        const { error } = await supabase
          .from('order_stations')
          .update(updates)
          .eq('id', stationRecord.id);

        if (error) throw error;
      } else {
        // If no station record existed, insert one
        await supabase
          .from('order_stations')
          .insert({
            order_id: orderId,
            cafe_id: me?.cafe_id,
            station: 'bar',
            ...updates,
          });
      }

      await loadOrders();
    } catch (e) {
      alert(e?.message || 'Failed to update station status');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleOrderStatusTransition = async (orderId, newOrderStatus) => {
    setUpdatingId(orderId);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newOrderStatus })
        .eq('id', orderId);

      if (error) throw error;

      if (newOrderStatus === 'paid' || newOrderStatus === 'cancelled') {
        setOrders((prev) => prev.filter((o) => o?.id !== orderId));
      } else {
        await loadOrders();
      }
    } catch (e) {
      alert(e?.message || 'Failed to update order status');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleLogout = async () => {
    releaseWakeLock();
    try {
      await supabase.auth.signOut();
    } catch (e) {}
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  };

  // ─── LOADING STATE ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div
        className="theme-dark anim-fade-in"
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#1A120C',
          color: '#FFFDF9',
        }}
      >
        <div style={{ textAlign: 'center', padding: 24 }}>
          <CoffeeIllustration size={90} />
          <h2 style={{ fontFamily: 'var(--font-serif)', marginTop: 20, color: '#FFFDF9' }}>
            Connecting to Barista Station...
          </h2>
          <p style={{ fontSize: 14, color: 'var(--color-muted)', marginTop: 6 }}>
            Securing live connection
          </p>
        </div>
      </div>
    );
  }

  // ─── ERROR & ACCESS SCREENS ───────────────────────────────────────────────
  if (err) {
    return (
      <div
        className="theme-dark anim-fade-in"
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#1A120C',
          padding: 24,
        }}
      >
        <div
          className="card"
          style={{
            maxWidth: 460,
            width: '100%',
            textAlign: 'center',
            backgroundColor: '#251A12',
            border: '1px solid #3B2A1E',
            padding: 36,
            borderRadius: 'var(--radius-card)',
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              backgroundColor: 'rgba(196, 85, 61, 0.15)',
              color: 'var(--color-terracotta)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <AlertCircle size={28} />
          </div>

          <h2
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 22,
              fontWeight: 700,
              color: '#FFFDF9',
              marginBottom: 8,
            }}
          >
            {errType === 'disabled'
              ? 'Account Disabled'
              : errType === 'unavailable'
              ? 'Cafe Unavailable'
              : 'Station Access Notice'}
          </h2>

          <p style={{ fontSize: 14, color: 'var(--color-muted)', lineHeight: 1.5, marginBottom: 24 }}>
            {err}
          </p>

          <Button variant="accent" fullWidth onClick={handleLogout}>
            Back to Login
          </Button>
        </div>
      </div>
    );
  }

  // ─── START SHIFT WELCOME SCREEN ───────────────────────────────────────────
  if (!shiftStarted) {
    const baristaName = formatText(me?.full_name, 'Barista');
    const cafeName = formatText(cafe?.name, 'Specialty Coffee Bar');

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
          <CoffeeIllustration size={160} />

          <div style={{ margin: '24px 0 10px' }}>
            <Badge variant="caramel" size="sm" dot>
              {cafeName}
            </Badge>
          </div>

          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 'clamp(26px, 5vw, 40px)',
              fontWeight: 700,
              color: '#FFFDF9',
              marginBottom: 12,
            }}
          >
            Ready for your shift, {baristaName}?
          </h1>

          <p
            style={{
              fontSize: 15,
              color: 'var(--color-muted)',
              marginBottom: 32,
              lineHeight: 1.5,
            }}
          >
            Start your shift to unlock real-time acoustic chimes, stay awake display, and live FIFO order queuing from customer table scans.
          </p>

          <Button
            size="lg"
            variant="accent"
            fullWidth
            onClick={handleStartShift}
            style={{
              minHeight: 56,
              fontSize: 17,
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

  // ─── FILTERING ORDERS ─────────────────────────────────────────────────────
  const validOrders = orders.filter((o) => o && o.id);

  const displayedOrders = validOrders.filter((order) => {
    if (filterTab === 'active') {
      return order.status === 'open';
    }
    if (filterTab === 'served') {
      return order.status === 'served';
    }
    return true; // 'all'
  });

  const openCount = validOrders.filter((o) => o.status === 'open').length;
  const servedCount = validOrders.filter((o) => o.status === 'served').length;

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
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Logo size={30} showText={false} />
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
                {formatText(cafe?.name, 'Barista Station')}
              </h1>
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
                  }}
                />
                <span>LIVE</span>
              </div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 2 }}>
              Barista: {formatText(me?.full_name, 'Staff')} · {validOrders.length} active ({openCount} in queue)
            </div>
          </div>
        </div>

        {/* Tab Filters and Audio Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          {/* Queue Filter Tabs */}
          <div
            style={{
              display: 'flex',
              backgroundColor: '#1A120C',
              padding: 3,
              borderRadius: 'var(--radius-sm)',
              border: '1px solid #3B2A1E',
            }}
          >
            <button
              onClick={() => setFilterTab('active')}
              style={{
                background: filterTab === 'active' ? 'var(--color-roast)' : 'transparent',
                color: filterTab === 'active' ? '#FFF' : 'var(--color-muted)',
                border: 'none',
                padding: '6px 12px',
                borderRadius: 'var(--radius-xs)',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Queue ({openCount})
            </button>
            <button
              onClick={() => setFilterTab('served')}
              style={{
                background: filterTab === 'served' ? 'var(--color-roast)' : 'transparent',
                color: filterTab === 'served' ? '#FFF' : 'var(--color-muted)',
                border: 'none',
                padding: '6px 12px',
                borderRadius: 'var(--radius-xs)',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Served / Pay ({servedCount})
            </button>
          </div>

          {/* Volume & Audio Controls */}
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
              {isMuted ? <VolumeX size={19} /> : <Volume2 size={19} />}
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
              style={{ width: 75, cursor: 'pointer', accentColor: 'var(--color-caramel)' }}
              title="Alert Volume"
            />

            <Button size="sm" variant="secondary" onClick={handleTestSound} icon={<Bell size={13} />}>
              Test Sound
            </Button>
          </div>

          <IconButton icon={<LogOut size={16} />} onClick={handleLogout} title="Log out" variant="ghost" />
        </div>
      </header>

      {/* ─── ORDERS QUEUE ───────────────────────────────────────────────────── */}
      <main style={{ flex: 1, padding: '24px 20px', maxWidth: 1400, margin: '0 auto', width: '100%' }}>
        {displayedOrders.length === 0 ? (
          <div style={{ maxWidth: 500, margin: '60px auto', textAlign: 'center' }}>
            <EmptyState
              type="coffee"
              title={filterTab === 'served' ? 'No Orders Awaiting Payment' : 'All Caught Up!'}
              description={
                filterTab === 'served'
                  ? 'Orders marked as served will wait here until guests settle their tab.'
                  : 'No orders currently in the queue. New orders from table QR scans will automatically arrive here with an audible bell chime.'
              }
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
            {displayedOrders.map((order) => (
              <OrderCardErrorBoundary key={order.id} onReload={loadOrders}>
                <OrderCard
                  order={order}
                  items={orderItemsMap[order.id] || []}
                  now={now}
                  mounted={mounted}
                  isBusy={updatingId === order.id}
                  onStationTransition={handleStationTransition}
                  onOrderStatusTransition={handleOrderStatusTransition}
                />
              </OrderCardErrorBoundary>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

// ─── ORDER CARD COMPONENT ──────────────────────────────────────────────────
function OrderCard({
  order,
  items,
  now,
  mounted,
  isBusy,
  onStationTransition,
  onOrderStatusTransition,
}) {
  const stationRecord = Array.isArray(order?.order_stations) ? order.order_stations[0] : null;
  const stationStatus = stationRecord?.status || (order?.status === 'open' ? 'new' : 'ready');
  const orderStatus = order?.status || 'open';

  // Safely parse elapsed minutes
  const createdAtTime = order?.created_at ? new Date(order.created_at).getTime() : now;
  const elapsedMinutes =
    mounted && !isNaN(createdAtTime)
      ? Math.max(0, Math.floor((now - createdAtTime) / 60000))
      : 0;

  // Timer chip color coding
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

  const isNew = stationStatus === 'new' && orderStatus === 'open';
  const isAccepted = stationStatus === 'accepted' && orderStatus === 'open';
  const isPreparing = stationStatus === 'preparing' && orderStatus === 'open';
  const isReady = stationStatus === 'ready' && orderStatus === 'open';
  const isServed = orderStatus === 'served';

  const tableName = formatText(order?.table_name, 'Table ?');
  const shortOrderId = order?.id ? String(order.id).slice(0, 6).toUpperCase() : '------';
  const orderNote = formatText(order?.note, '');

  return (
    <div
      className="card"
      style={{
        backgroundColor: '#251A12',
        border: isNew ? '2px solid var(--color-caramel)' : '1px solid #3B2A1E',
        borderRadius: 'var(--radius-card)',
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
        boxShadow: isNew ? '0 10px 30px rgba(201, 138, 75, 0.25)' : 'var(--shadow)',
      }}
    >
      {/* Card Header: Table Name & Timer Chip */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div>
          <h2
            style={{
              fontSize: 32,
              fontWeight: 800,
              color: '#FFFDF9',
              letterSpacing: '-0.02em',
              margin: 0,
            }}
          >
            {tableName}
          </h2>
          <div style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 2 }}>
            Order #{shortOrderId}
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

      {/* Customer Note */}
      {orderNote && (
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
          📝 Note: {orderNote}
        </div>
      )}

      {/* Item List with Big Quantities */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {!items || items.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--color-muted)' }}>Loading items...</div>
        ) : (
          items.map((item, idx) => {
            const itemName = formatItemName(item?.item_name, 'en');
            const itemNote = formatText(item?.note, '');
            const qty = item?.quantity || 1;

            return (
              <div
                key={item?.id || idx}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  paddingBottom: 8,
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                }}
              >
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
                  {qty}×
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#FFFDF9', lineHeight: 1.25 }}>
                    {itemName}
                  </div>
                  {itemNote && (
                    <div style={{ fontSize: 12, color: 'var(--color-amber)', marginTop: 2, fontWeight: 600 }}>
                      ↳ {itemNote}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Status Badge */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>Status:</span>
          <Badge
            variant={
              isNew
                ? 'warning'
                : isAccepted
                ? 'caramel'
                : isPreparing
                ? 'caramel'
                : isReady
                ? 'success'
                : 'default'
            }
            size="sm"
            dot
          >
            {isNew
              ? 'New Order'
              : isAccepted
              ? 'Accepted'
              : isPreparing
              ? 'Being Prepared'
              : isReady
              ? 'Ready for Guest'
              : isServed
              ? 'Served / Settle Bill'
              : orderStatus}
          </Badge>
        </div>

        {/* Quick Cancel button for open order */}
        {orderStatus === 'open' && (
          <button
            onClick={() => {
              if (window.confirm(`Cancel order for ${tableName}?`)) {
                onOrderStatusTransition(order.id, 'cancelled');
              }
            }}
            disabled={isBusy}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--color-muted)',
              fontSize: 11,
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            Cancel
          </button>
        )}
      </div>

      {/* Action Buttons */}
      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {isNew && (
          <Button
            fullWidth
            size="lg"
            variant="accent"
            disabled={isBusy}
            onClick={() => onStationTransition(order.id, 'accepted')}
            style={{ minHeight: 52, fontSize: 16 }}
            icon={<CheckCircle2 size={18} />}
          >
            Accept Order
          </Button>
        )}

        {isAccepted && (
          <Button
            fullWidth
            size="lg"
            variant="accent"
            disabled={isBusy}
            onClick={() => onStationTransition(order.id, 'preparing')}
            style={{ minHeight: 52, fontSize: 16 }}
            icon={<Flame size={18} />}
          >
            Start Preparing 🔥
          </Button>
        )}

        {isPreparing && (
          <Button
            fullWidth
            size="lg"
            variant="primary"
            disabled={isBusy}
            onClick={() => onStationTransition(order.id, 'ready')}
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
            onClick={() => onOrderStatusTransition(order.id, 'served')}
            style={{ minHeight: 52, fontSize: 16 }}
            icon={<Check size={18} />}
          >
            Delivered / Served ✓
          </Button>
        )}

        {isServed && (
          <Button
            fullWidth
            size="lg"
            variant="accent"
            disabled={isBusy}
            onClick={() => onOrderStatusTransition(order.id, 'paid')}
            style={{ minHeight: 52, fontSize: 16, backgroundColor: 'var(--color-roast)' }}
            icon={<DollarSign size={18} />}
          >
            Mark as Paid 💵
          </Button>
        )}
      </div>
    </div>
  );
}

export default function BartenderDashboard() {
  return (
    <BartenderPageErrorBoundary>
      <BartenderDashboardInner />
    </BartenderPageErrorBoundary>
  );
}
