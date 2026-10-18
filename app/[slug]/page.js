'use client';

import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { supabase, pick } from '../../lib/supabase';
import { useI18n } from '../../lib/i18n';
import { Logo, CoffeeIllustration } from '../../components/ui/Logo';
import { CafeLogo } from '../../components/ui/CafeLogo';
import { getDerivedTextColor, getDerivedButtonTextColor, getDerivedCardStyle } from '../../lib/theme';
import { Button, IconButton } from '../../components/ui/Button';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { QtyStepper, Badge, EmptyState, Skeleton } from '../../components/ui/Badge';
import { LanguageSwitcher } from '../../components/ui/LanguageSwitcher';
import {
  Search,
  ShoppingBag,
  Plus,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Coffee,
  Check,
  Flame,
  ArrowRight,
  Info,
  X,
  Volume2,
  ClipboardList,
  WifiOff,
  RotateCw,
} from 'lucide-react';

export function getOrderStep(order) {
  if (!order) return 1;
  const status = (order.status || '').toLowerCase();
  if (status === 'cancelled') return -1;
  if (status === 'served' || status === 'paid') return 4;

  const stations = order.stations || [];
  if (stations.length > 0) {
    const hasReady = stations.some((s) => s.status === 'ready');
    const hasPreparing = stations.some((s) => s.status === 'preparing' || s.status === 'accepted');
    const hasNew = stations.some((s) => s.status === 'new');

    if (hasReady && !hasPreparing && !hasNew) return 3;
    if (hasReady || hasPreparing) return 2;
    if (hasNew) return 1;
  }

  if (status === 'ready') return 3;
  if (status === 'preparing') return 2;
  return 1;
}

export function formatOrderTime(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function OrderStepper({ step, isAmharic, t }) {
  const tr = typeof t === 'function' ? t : (k) => k;
  if (step === -1) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          borderRadius: 8,
          backgroundColor: 'rgba(229, 62, 62, 0.1)',
          color: '#E53E3E',
          fontSize: 12,
          fontWeight: 600,
          marginTop: 10,
        }}
      >
        <AlertCircle size={15} style={{ flexShrink: 0 }} />
        <span>
          {tr('menu.order_cancelled') ||
            (isAmharic ? 'ተሰርዟል፣ እባክዎ ሰራተኞችን ይጠይቁ' : 'Cancelled, please ask the staff')}
        </span>
      </div>
    );
  }

  const steps = [
    { key: 1, label: tr('menu.order_received') || (isAmharic ? 'ደርሷል' : 'Received') },
    { key: 2, label: tr('menu.order_preparing') || (isAmharic ? 'በመዘጋጀት ላይ' : 'Being prepared') },
    { key: 3, label: tr('menu.order_ready') || (isAmharic ? 'ዝግጁ ሆኗል' : 'Ready') },
    { key: 4, label: tr('menu.order_served') || (isAmharic ? 'ቀርቧል' : 'Served') },
  ];

  return (
    <div style={{ marginTop: 12, marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
        {steps.map((s, idx) => {
          const isDone = step > s.key;
          const isCurrent = step === s.key;

          return (
            <React.Fragment key={s.key}>
              {idx > 0 && (
                <div
                  style={{
                    flex: 1,
                    height: 3,
                    backgroundColor: step >= s.key ? 'var(--color-sage)' : 'var(--color-line)',
                    transition: 'background-color 0.4s ease',
                  }}
                />
              )}
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 700,
                  flexShrink: 0,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  backgroundColor:
                    isDone || isCurrent ? 'var(--color-sage)' : 'var(--color-line)',
                  color: isDone || isCurrent ? '#FFF' : 'var(--color-muted)',
                  boxShadow:
                    isCurrent
                      ? '0 0 0 3px rgba(107, 143, 113, 0.25)'
                      : 'none',
                  transform: isCurrent ? 'scale(1.08)' : 'scale(1)',
                }}
              >
                {isDone ? <Check size={13} strokeWidth={3} /> : s.key}
              </div>
            </React.Fragment>
          );
        })}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          textAlign: 'center',
          marginTop: 6,
          gap: 2,
        }}
      >
        {steps.map((s) => {
          const isCurrent = step === s.key;
          const isDone = step > s.key;
          return (
            <div
              key={s.key}
              style={{
                fontSize: 10.5,
                fontWeight: isCurrent ? 700 : isDone ? 600 : 500,
                color:
                  isCurrent
                    ? 'var(--color-sage)'
                    : isDone
                    ? 'var(--color-espresso)'
                    : 'var(--color-muted)',
                lineHeight: 1.2,
                transition: 'color 0.3s ease',
              }}
            >
              {s.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function CustomerMenuPage() {
  const { slug } = useParams();
  const searchParams = useSearchParams();
  const { lang, setLang, t, isAmharic } = useI18n();

  // Data State
  const [cafe, setCafe] = useState(null);

  // Set browser tab icon (favicon) and title from cafe branding
  useEffect(() => {
    if (!cafe) return;
    if (cafe.name) {
      document.title = `${cafe.name} | Menu`;
    }
    if (cafe.logo_url) {
      let link = document.querySelector("link[rel*='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'shortcut icon';
        document.head.appendChild(link);
      }
      link.href = cafe.logo_url;
    }
  }, [cafe?.name, cafe?.logo_url]);
  const [cats, setCats] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  // Table & Ordering Mode State
  const [table, setTable] = useState(null); // { token, name }
  const [tableError, setTableError] = useState('');
  const [showWelcome, setShowWelcome] = useState(false);
  const [welcomeFading, setWelcomeFading] = useState(false);

  // UI State
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState(null); // for item bottom sheet
  const [itemQty, setItemQty] = useState(1);
  const [itemNote, setItemNote] = useState('');

  // Cart & Order State
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [orderNote, setOrderNote] = useState('');
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [activeOrder, setActiveOrder] = useState(null);
  const [orderSuccessModal, setOrderSuccessModal] = useState(false);

  // My Orders & Live Status State
  const [myOrdersOpen, setMyOrdersOpen] = useState(false);
  const [tableOrders, setTableOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [ordersError, setOrdersError] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [toastMessage, setToastMessage] = useState(null);

  const prevOrderStepsRef = useRef({});
  const toastTimerRef = useRef(null);

  const showToast = useCallback((msg) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMessage(msg);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 5000);
  }, []);

  // Read URL table token
  const urlToken = searchParams.get('t') || searchParams.get('table');

  // Fetch and sync table orders
  const fetchTableOrders = useCallback(async (explicitToken = null) => {
    const token =
      explicitToken ||
      table?.token ||
      (typeof window !== 'undefined' ? sessionStorage.getItem(`table_token_${slug}`) : null);

    if (!token) return;

    try {
      const { data: ordersData, error } = await supabase.rpc('get_table_orders', {
        p_token: token,
        p_hours: 6,
      });

      if (error) {
        console.warn('get_table_orders error:', error);
        setOrdersError(true);
        return;
      }

      setOrdersError(false);

      if (ordersData) {
        // Read any cached local orders
        let localCached = [];
        try {
          const raw = localStorage.getItem(`table_orders_${slug}_${token}`);
          if (raw) localCached = JSON.parse(raw);
        } catch {}

        // Merge: keep local orders that might not yet be returned by DB
        const dbIds = new Set(ordersData.map((o) => o.id));
        const localOnly = Array.isArray(localCached) ? localCached.filter((o) => !dbIds.has(o.id)) : [];
        const merged = [...localOnly, ...ordersData];

        // Check for transition to ready
        merged.forEach((order) => {
          const currentStep = getOrderStep(order);
          const prevStep = prevOrderStepsRef.current[order.id];
          if (prevStep !== undefined && prevStep < 3 && currentStep === 3) {
            showToast(t('menu.order_ready_toast') || (isAmharic ? 'ትዕዛዝዎ ዝግጁ ነው! ሊወስዱት ይችላሉ።' : 'Your order is Ready! Please collect it.'));
          }
          prevOrderStepsRef.current[order.id] = currentStep;
        });

        setTableOrders(merged);

        try {
          localStorage.setItem(`table_orders_${slug}_${token}`, JSON.stringify(merged));
          localStorage.setItem(`table_order_ids_${slug}_${token}`, JSON.stringify(merged.map((o) => o.id)));
        } catch {}
      }
    } catch (err) {
      console.warn('fetchTableOrders exception:', err);
      setOrdersError(true);
    }
  }, [table?.token, slug, showToast, t, isAmharic]);

  // Load menu data (cafe, categories, items)
  const loadMenuData = useCallback(async () => {
    try {
      const { data: c, error: cafeErr } = await supabase
        .from('cafes')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      if (cafeErr || !c) return;

      setCafe(c);

      const [catRes, itemRes] = await Promise.all([
        supabase
          .from('categories')
          .select('*')
          .eq('cafe_id', c.id)
          .eq('visible', true)
          .order('sort_order')
          .order('created_at'),
        supabase
          .from('items')
          .select('*')
          .eq('cafe_id', c.id)
          .eq('available', true)
          .order('sort_order')
          .order('created_at'),
      ]);

      setCats(catRes.data || []);
      setItems(itemRes.data || []);
    } catch (err) {
      console.warn('loadMenuData background refresh error:', err);
    }
  }, [slug]);

  // Initial load and Realtime setup
  useEffect(() => {
    let isMounted = true;

    async function init() {
      try {
        setLoading(true);

        const { data: c, error: cafeErr } = await supabase
          .from('cafes')
          .select('*')
          .eq('slug', slug)
          .maybeSingle();

        if (cafeErr || !c) {
          if (isMounted) {
            setMissing(true);
            setLoading(false);
          }
          return;
        }

        if (isMounted) {
          setCafe(c);
          if (c.default_language && !localStorage.getItem('app_lang')) {
            setLang(c.default_language);
          }
        }

        const [catRes, itemRes] = await Promise.all([
          supabase.from('categories').select('*').eq('cafe_id', c.id).eq('visible', true).order('sort_order').order('created_at'),
          supabase.from('items').select('*').eq('cafe_id', c.id).eq('available', true).order('sort_order').order('created_at'),
        ]);

        if (isMounted) {
          setCats(catRes.data || []);
          setItems(itemRes.data || []);
        }

        // Resolve Table Token
        let activeToken = urlToken;
        if (!activeToken && typeof window !== 'undefined') {
          activeToken = sessionStorage.getItem(`table_token_${slug}`);
        }

        if (activeToken) {
          const { data: resolved, error: rpcErr } = await supabase.rpc('resolve_table', {
            p_token: activeToken,
          });

          if (rpcErr || !resolved || resolved.length === 0 || resolved[0].cafe_slug !== slug) {
            if (isMounted) {
              setTableError('This table is not active. Please ask the staff.');
              sessionStorage.removeItem(`table_token_${slug}`);
              setTable(null);
            }
          } else {
            const tableData = {
              token: activeToken,
              name: resolved[0].table_name,
              cafe_name: resolved[0].cafe_name,
            };
            if (isMounted) {
              setTable(tableData);
              sessionStorage.setItem(`table_token_${slug}`, activeToken);

              const welcomeSeen = sessionStorage.getItem(`welcome_seen_${slug}_${activeToken}`);
              if (!welcomeSeen) {
                setShowWelcome(true);
                sessionStorage.setItem(`welcome_seen_${slug}_${activeToken}`, 'true');
              }

              // Instant cache display from localStorage
              try {
                const cachedOrders = localStorage.getItem(`table_orders_${slug}_${activeToken}`);
                if (cachedOrders) {
                  const parsed = JSON.parse(cachedOrders);
                  if (Array.isArray(parsed) && parsed.length > 0) {
                    setTableOrders(parsed);
                    parsed.forEach((o) => {
                      prevOrderStepsRef.current[o.id] = getOrderStep(o);
                    });
                  }
                }
              } catch {}

              // Fetch fresh orders from DB
              fetchTableOrders(activeToken);
            }
          }
        }
      } catch (err) {
        console.error('Error loading menu:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    init();

    // Subscribe to realtime item, category, cafe, and order changes
    const ch = supabase.channel(`customer-realtime-${slug}`);
    ch.on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, () => {
      loadMenuData();
    })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => {
        loadMenuData();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'cafes' }, (payload) => {
        if (payload.new && payload.new.slug === slug) {
          setCafe(payload.new);
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        const token = typeof window !== 'undefined' ? sessionStorage.getItem(`table_token_${slug}`) : null;
        if (token) fetchTableOrders(token);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_stations' }, () => {
        const token = typeof window !== 'undefined' ? sessionStorage.getItem(`table_token_${slug}`) : null;
        if (token) fetchTableOrders(token);
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(ch);
    };
  }, [slug, urlToken, setLang, fetchTableOrders, loadMenuData]);

  // Determine if there is any active open order
  const hasOpenOrder = useMemo(() => {
    return tableOrders.some((o) => {
      const step = getOrderStep(o);
      return step > 0 && step < 4;
    });
  }, [tableOrders]);

  // Active open order for hero tracker
  const activeTableOrder = useMemo(() => {
    return (
      tableOrders.find((o) => {
        const step = getOrderStep(o);
        return step > 0 && step < 4;
      }) || (activeOrder?.id ? tableOrders.find((o) => o.id === activeOrder.id) : null)
    );
  }, [tableOrders, activeOrder]);

  // Polling: every 4s if an order is open, every 15s otherwise. Pauses when hidden.
  useEffect(() => {
    const token =
      table?.token ||
      (typeof window !== 'undefined' ? sessionStorage.getItem(`table_token_${slug}`) : null);

    if (!token) return;

    let timeoutId = null;

    const schedulePoll = () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (typeof document !== 'undefined' && document.hidden) return;

      const interval = hasOpenOrder ? 4000 : 15000;
      timeoutId = setTimeout(async () => {
        if (typeof document !== 'undefined' && !document.hidden && navigator.onLine) {
          await fetchTableOrders(token);
        }
        schedulePoll();
      }, interval);
    };

    schedulePoll();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchTableOrders(token);
        loadMenuData();
        schedulePoll();
      } else {
        if (timeoutId) clearTimeout(timeoutId);
      }
    };

    const handleOnline = () => {
      setIsOnline(true);
      fetchTableOrders(token);
      loadMenuData();
      schedulePoll();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    const handleFocus = () => {
      fetchTableOrders(token);
      loadMenuData();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [table?.token, slug, hasOpenOrder, fetchTableOrders, loadMenuData]);

  // Menu periodic refresh every 30s as safety net
  useEffect(() => {
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && !document.hidden && navigator.onLine) {
        loadMenuData();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [loadMenuData]);

  // Auto-dismiss Welcome Screen after 2.5 seconds
  useEffect(() => {
    if (!showWelcome) return;
    const timer = setTimeout(() => {
      setWelcomeFading(true);
      setTimeout(() => setShowWelcome(false), 300);
    }, 2500);

    return () => clearTimeout(timer);
  }, [showWelcome]);

  const dismissWelcome = () => {
    setWelcomeFading(true);
    setTimeout(() => setShowWelcome(false), 250);
  };

  // Cart operations
  const addToCart = (item, qty = 1, note = '') => {
    setCart((prev) => {
      const existingIndex = prev.findIndex((i) => i.id === item.id && (i.note || '') === note);
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex].qty += qty;
        return updated;
      }
      return [...prev, { ...item, qty, note }];
    });
    setSelectedItem(null);
    setItemQty(1);
    setItemNote('');
  };

  const updateCartQty = (index, newQty) => {
    if (newQty <= 0) {
      setCart((prev) => prev.filter((_, idx) => idx !== index));
    } else {
      setCart((prev) => {
        const updated = [...prev];
        updated[index].qty = newQty;
        return updated;
      });
    }
  };

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + Number(item.price || 0) * item.qty, 0);
  }, [cart]);

  const cartCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.qty, 0);
  }, [cart]);

  // Send Order
  const handlePlaceOrder = async () => {
    if (!table?.token) {
      alert('Please scan a valid table QR code to place an order.');
      return;
    }
    if (cart.length === 0) return;

    setSubmittingOrder(true);
    try {
      const pItems = cart.map((i) => ({
        item_id: i.id,
        qty: i.qty,
        note: i.note || '',
      }));

      const { data, error } = await supabase.rpc('place_order', {
        p_token: table.token,
        p_items: pItems,
        p_note: orderNote.trim(),
      });

      if (error) {
        alert(error.message || 'Failed to place order.');
        return;
      }

      if (data?.order_id) {
        const newOrder = {
          id: data.order_id,
          table_name: data.table_name || table.name,
          status: 'open',
          note: orderNote.trim(),
          created_at: new Date().toISOString(),
          items: cart.map((i) => ({
            name: i.name,
            qty: i.qty,
            price: Number(i.price || 0),
            note: i.note || '',
          })),
          stations: [{ station: 'bar', status: 'new' }],
        };
        prevOrderStepsRef.current[newOrder.id] = 1;
        setTableOrders((prev) => {
          const updated = [newOrder, ...prev.filter((o) => o.id !== newOrder.id)];
          try {
            localStorage.setItem(`table_orders_${slug}_${table.token}`, JSON.stringify(updated));
            localStorage.setItem(`table_order_ids_${slug}_${table.token}`, JSON.stringify(updated.map((o) => o.id)));
          } catch {}
          return updated;
        });
        setActiveOrder(newOrder);
        setCart([]);
        setCartOpen(false);
        setOrderSuccessModal(true);
        fetchTableOrders(table.token);
      }
    } catch (err) {
      alert(err.message || 'Error submitting order');
    } finally {
      setSubmittingOrder(false);
    }
  };

  // Filter items by category & search
  const filteredItems = useMemo(() => {
    let list = items;
    if (activeCategory !== 'all') {
      list = list.filter((i) => i.category_id === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((i) => {
        const name = (pick(i.name, lang, cafe?.default_language) || '').toLowerCase();
        const desc = (pick(i.description, lang, cafe?.default_language) || '').toLowerCase();
        return name.includes(q) || desc.includes(q);
      });
    }
    return list;
  }, [items, activeCategory, searchQuery, lang, cafe?.default_language]);

  // Missing screen
  if (missing) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--bg)',
          padding: 20,
        }}
      >
        <div style={{ maxWidth: 420, width: '100%', textAlign: 'center' }}>
          <EmptyState
            type="coffee"
            title={isAmharic ? 'ይህ ካፌ አልተገኘም' : 'Cafe Not Found'}
            description={
              isAmharic
                ? 'የፈለጉት የካፌ ገጽ አልተገኘም። እባክዎ የQR ኮዱን እንደገና ይቃኙ።'
                : 'The cafe you are looking for does not exist or has been modified. Please rescan your table QR code.'
            }
          />
        </div>
      </div>
    );
  }

  // Loading skeleton
  if (loading || !cafe) {
    return (
      <div style={{ maxWidth: 640, margin: '0 auto', padding: 20 }}>
        <Skeleton height={200} borderRadius={20} style={{ marginBottom: 20 }} />
        <Skeleton height={32} width="60%" style={{ marginBottom: 12 }} />
        <Skeleton height={18} width="80%" style={{ marginBottom: 28 }} />
        <div style={{ display: 'flex', gap: 10, marginBottom: 24, overflowX: 'hidden' }}>
          <Skeleton height={40} width={100} borderRadius={999} />
          <Skeleton height={40} width={120} borderRadius={999} />
          <Skeleton height={40} width={100} borderRadius={999} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Skeleton height={88} borderRadius={16} />
          <Skeleton height={88} borderRadius={16} />
          <Skeleton height={88} borderRadius={16} />
        </div>
      </div>
    );
  }

  const defLang = cafe.default_language || 'en';
  const cafeTheme = cafe.theme || {};
  const brandColor = cafeTheme.primary || cafeTheme.button || '#6F4E37';
  const bgColor = cafeTheme.background || '#FFFFFF';
  const textColor = cafeTheme.text || getDerivedTextColor(bgColor);
  const btnTextColor = getDerivedButtonTextColor(brandColor);
  const cardStyle = getDerivedCardStyle(bgColor);
  const primaryColor = brandColor;
  const accentColor = brandColor;

  return (
    <div
      style={{
        '--bg': bgColor,
        '--color-cream': bgColor,
        '--card-bg': cardStyle.cardBg,
        '--color-foam': cardStyle.cardBg,
        '--text': textColor,
        '--color-espresso': brandColor,
        '--color-muted': cardStyle.mutedText,
        '--border': cardStyle.cardBorder,
        '--color-line': cardStyle.cardBorder,
        '--primary': brandColor,
        '--color-roast': brandColor,
        '--color-caramel': brandColor,
        '--btn-text': btnTextColor,
        backgroundColor: bgColor,
        color: textColor,
        minHeight: '100vh',
        paddingBottom: 110,
      }}
    >
      {/* ─── OFFLINE NOTICE BANNER ─────────────────────────────────────────── */}
      {!isOnline && (
        <div
          style={{
            position: 'sticky',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 99999,
            backgroundColor: '#DC2626',
            color: '#FFF',
            padding: '9px 16px',
            textAlign: 'center',
            fontSize: 13,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          }}
        >
          <WifiOff size={16} />
          <span>
            {t('menu.offline_notice') ||
              (isAmharic
                ? 'የኢንተርኔት ግንኙነት የለም። እንደገና በመገናኘት ላይ...'
                : 'No connection. Trying to reconnect...')}
          </span>
        </div>
      )}

      {/* ─── ORDER READY TOAST NOTIFICATION ──────────────────────────────────── */}
      {toastMessage && (
        <div
          className="anim-slide-up"
          style={{
            position: 'fixed',
            top: !isOnline ? 52 : 20,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 100000,
            backgroundColor: 'var(--color-espresso)',
            color: '#FFFDF9',
            padding: '12px 20px',
            borderRadius: 999,
            boxShadow: 'var(--shadow-float)',
            border: '1.5px solid var(--color-sage)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 14,
            fontWeight: 600,
            maxWidth: '90vw',
          }}
        >
          <Sparkles size={18} color="var(--color-sage)" />
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            style={{
              background: 'none',
              border: 'none',
              color: '#FFF',
              cursor: 'pointer',
              padding: 2,
              display: 'flex',
              marginLeft: 4,
            }}
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* ─── 4. CAFE WELCOME SPLASH SCREEN (Shown once per table session) ─────── */}
      {showWelcome && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'var(--color-espresso)',
            color: '#FFFDF9',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '36px 24px',
            opacity: welcomeFading ? 0 : 1,
            transform: welcomeFading ? 'translateY(-10px)' : 'none',
            transition: 'opacity 0.28s ease, transform 0.28s ease',
          }}
        >
          {/* Top Skip / Language Buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              {cafe.languages?.map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 999,
                    background: lang === l ? 'var(--color-caramel)' : 'rgba(255,255,255,0.15)',
                    color: '#FFF',
                    fontWeight: 700,
                    fontSize: 13,
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {l === 'am' ? 'አማ' : l.toUpperCase()}
                </button>
              ))}
            </div>

            <button
              onClick={dismissWelcome}
              style={{
                color: 'rgba(255,255,255,0.7)',
                fontSize: 13,
                fontWeight: 600,
                border: 'none',
                background: 'none',
                cursor: 'pointer',
              }}
            >
              {isAmharic ? 'ዝለል' : 'Skip'}
            </button>
          </div>

          {/* Center Brand & Table Chip */}
          <div style={{ textAlign: 'center', margin: 'auto 0' }}>
            <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'center' }}>
              <CafeLogo
                logoUrl={cafe.logo_url}
                name={cafe.name}
                brandColor={brandColor}
                size={84}
                radius={20}
                border="3px solid rgba(255,255,255,0.25)"
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 16px',
                  borderRadius: 999,
                  backgroundColor: 'rgba(201, 138, 75, 0.22)',
                  color: 'var(--color-caramel)',
                  fontWeight: 700,
                  fontSize: 14,
                  border: '1px solid rgba(201, 138, 75, 0.4)',
                }}
              >
                <span>🪑</span>
                <span>{table?.name || (isAmharic ? 'ጠረጴዛ' : 'Table')}</span>
              </span>
            </div>

            <h1
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 32,
                color: '#FFFDF9',
                marginBottom: 10,
              }}
            >
              {isAmharic ? `እንኳን ወደ ${cafe.name} በደህና መጡ` : `Welcome to ${cafe.name}`}
            </h1>

            {cafe.description && (
              <p
                style={{
                  color: 'var(--color-muted-light)',
                  fontSize: 15,
                  maxWidth: 320,
                  margin: '0 auto',
                  lineHeight: 1.5,
                }}
              >
                {pick(cafe.description, lang, defLang)}
              </p>
            )}
          </div>

          {/* Bottom Action button */}
          <div>
            <Button
              fullWidth
              size="lg"
              variant="accent"
              onClick={dismissWelcome}
              iconRight={<ArrowRight size={18} />}
            >
              {isAmharic ? 'ሜኑውን ይመልከቱ' : 'View Menu'}
            </Button>
          </div>
        </div>
      )}

      {/* ─── CAFE COVER & HERO HEADER ────────────────────────────────────────── */}
      <div style={{ position: 'relative', width: '100%', maxWidth: 720, margin: '0 auto' }}>
        {/* Cover image or warm coffee gradient */}
        <div
          style={{
            height: 180,
            width: '100%',
            background: cafe.cover_url
              ? `linear-gradient(to bottom, rgba(43,29,20,0.2), rgba(43,29,20,0.8)), url(${cafe.cover_url}) center/cover`
              : 'linear-gradient(135deg, #6F4E37 0%, #2B1D14 100%)',
            position: 'relative',
          }}
        >
          {/* Top-right language picker */}
          <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 10 }}>
            <LanguageSwitcher languages={cafe.languages || ['en', 'am']} size="sm" />
          </div>
        </div>

        {/* Cafe Info card overlapping cover */}
        <div
          style={{
            padding: '0 20px',
            marginTop: -40,
            position: 'relative',
            zIndex: 5,
          }}
        >
          <div
            className="card"
            style={{
              padding: 24,
              backgroundColor: 'var(--color-foam)',
              border: '1px solid var(--color-line)',
              boxShadow: 'var(--shadow)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
              <CafeLogo
                logoUrl={cafe.logo_url}
                name={cafe.name}
                brandColor={brandColor}
                size={64}
                radius={16}
                border="2px solid var(--color-line)"
              />

              <div style={{ flex: 1, minWidth: 0 }}>
                <h1
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: 24,
                    color: 'var(--color-espresso)',
                    lineHeight: 1.2,
                    marginBottom: 4,
                  }}
                >
                  {cafe.name}
                </h1>
                <p style={{ fontSize: 13, color: 'var(--color-muted)', lineHeight: 1.4 }}>
                  {pick(cafe.description, lang, defLang) || (isAmharic ? 'ልዩ የቡናና የምግብ መስተንግዶ' : 'Specialty coffee & artisan pastries')}
                </p>
              </div>
            </div>

            {/* Chips & Table Status */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginTop: 16,
                flexWrap: 'wrap',
                paddingTop: 12,
                borderTop: '1px solid var(--color-line)',
              }}
            >
              {/* Live Status indicator */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '3px 9px',
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 700,
                  backgroundColor: isOnline ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                  color: isOnline ? '#16A34A' : '#DC2626',
                  border: `1px solid ${isOnline ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    backgroundColor: isOnline ? '#22C55E' : '#EF4444',
                    animation: isOnline ? 'livePulse 1.8s infinite' : 'none',
                  }}
                />
                <span>{isOnline ? (t('menu.live_indicator') || (isAmharic ? 'ቀጥታ' : 'Live')) : (isAmharic ? 'ከመስመር ውጭ' : 'Offline')}</span>
              </div>

              <Badge variant="success" size="sm" dot>
                {isAmharic ? 'እስከ 4:00 ክፍት ነው' : 'Open until 10 PM'}
              </Badge>

              {table ? (
                <Badge variant="caramel" size="sm">
                  🪑 {table.name} · {isAmharic ? 'ትዕዛዝ ክፍት ነው' : 'Ordering enabled'}
                </Badge>
              ) : (
                <Badge variant="neutral" size="sm">
                  👀 {isAmharic ? 'የእይታ ሁነታ' : 'View-only mode'}
                </Badge>
              )}

              {/* My Orders shortcut — only in table ordering mode */}
              {table && (
                <button
                  onClick={() => setMyOrdersOpen(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '4px 12px',
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 600,
                    border: '1.5px solid var(--color-roast)',
                    background: 'transparent',
                    color: 'var(--color-roast)',
                    cursor: 'pointer',
                    marginLeft: 'auto',
                  }}
                >
                  <ClipboardList size={13} />
                  <span>{t('menu.my_orders') || (isAmharic ? 'ትዕዛዞቼ' : 'My Orders')}</span>
                  {tableOrders.length > 0 && (
                    <span
                      style={{
                        minWidth: 18,
                        height: 18,
                        borderRadius: '50%',
                        background: 'var(--color-roast)',
                        color: '#FFF',
                        fontSize: 10,
                        fontWeight: 800,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0 4px',
                      }}
                    >
                      {tableOrders.length}
                    </span>
                  )}
                </button>
              )}
            </div>

            {/* Table Inactive Error Banner */}
            {tableError && (
              <div
                className="err anim-fade-in"
                style={{ marginTop: 14, marginBottom: 0, fontSize: 13 }}
              >
                <AlertCircle size={17} style={{ flexShrink: 0 }} />
                <span>{tableError}</span>
              </div>
            )}
          </div>
        </div>

        {/* ─── LIVE ORDER STATUS TRACKER (If active table order) ───────────── */}
        {activeTableOrder && (
          <div style={{ padding: '0 20px', marginTop: 16 }}>
            <div
              className="card anim-slide-up"
              style={{
                backgroundColor: 'var(--color-espresso)',
                color: '#FFFDF9',
                padding: 18,
                border: '1.5px solid var(--color-roast)',
                boxShadow: 'var(--shadow)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--color-sage)', animation: 'livePulse 2s infinite' }} />
                  <span style={{ fontWeight: 700, fontSize: 14 }}>
                    {isAmharic ? 'የቀጥታ የትዕዛዝ ሁኔታ' : 'Live Order Tracker'}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--color-caramel)', fontWeight: 600 }}>
                    · {activeTableOrder.table_name || table?.name}
                  </span>
                </div>
                <button
                  onClick={() => setMyOrdersOpen(true)}
                  style={{
                    background: 'rgba(255,255,255,0.12)',
                    border: '1px solid rgba(255,255,255,0.25)',
                    color: '#FFF',
                    borderRadius: 999,
                    padding: '2px 9px',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {isAmharic ? 'ሁሉንም ተመልከት' : 'View Orders'} ({tableOrders.length})
                </button>
              </div>

              {/* 4-Step Progress Stepper */}
              <OrderStepper
                step={getOrderStep(activeTableOrder)}
                isAmharic={isAmharic}
                t={t}
              />
            </div>
          </div>
        )}

        {/* ─── SEARCH & STICKY CATEGORIES BAR ─────────────────────────────────── */}
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 40,
            backgroundColor: 'var(--bg)',
            padding: '16px 20px 8px',
            borderBottom: '1px solid var(--color-line)',
            marginTop: 16,
          }}
        >
          {/* Search box */}
          <div style={{ position: 'relative', marginBottom: 12 }}>
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
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isAmharic ? 'መጠጦችን ወይም ምግቦችን ይፈልጉ...' : 'Search drinks, pastries, beans...'}
              style={{
                width: '100%',
                minHeight: 44,
                padding: '10px 14px 10px 42px',
                borderRadius: 'var(--radius-full)',
                border: '1.5px solid var(--color-line)',
                background: 'var(--color-foam)',
                fontSize: 14,
                outline: 'none',
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-muted)',
                  cursor: 'pointer',
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Category Chips Scroll strip */}
          <div
            style={{
              display: 'flex',
              gap: 8,
              overflowX: 'auto',
              paddingBottom: 6,
              WebkitOverflowScrolling: 'touch',
            }}
          >
            <button
              onClick={() => setActiveCategory('all')}
              style={{
                padding: '8px 16px',
                borderRadius: 'var(--radius-full)',
                fontSize: 13,
                fontWeight: activeCategory === 'all' ? 700 : 500,
                background: activeCategory === 'all' ? 'var(--color-roast)' : 'var(--color-foam)',
                color: activeCategory === 'all' ? 'var(--btn-text, #FFF)' : 'var(--text)',
                border: `1.5px solid ${activeCategory === 'all' ? 'var(--color-roast)' : 'var(--color-line)'}`,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all var(--transition-fast)',
              }}
            >
              {isAmharic ? 'ሁሉም' : 'All'}
            </button>

            {cats.map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: 13,
                    fontWeight: isActive ? 700 : 500,
                    background: isActive ? 'var(--color-roast)' : 'var(--color-foam)',
                    color: isActive ? 'var(--btn-text, #FFF)' : 'var(--text)',
                    border: `1.5px solid ${isActive ? 'var(--color-roast)' : 'var(--color-line)'}`,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  {pick(cat.name, lang, defLang)}
                </button>
              );
            })}
          </div>
        </div>

        {/* ─── MENU ITEMS LIST ───────────────────────────────────────────────── */}
        <div style={{ padding: '20px 20px 40px' }}>
          {filteredItems.length === 0 ? (
            <EmptyState
              type="search"
              title={isAmharic ? 'ምንም አልተገኘም' : 'No items found'}
              description={
                isAmharic
                  ? 'ከፈለጉት ቃል ጋር የሚዛመድ ነገር የለም። ሌላ ቃል ይሞክሩ።'
                  : 'No items match your search. Try adjusting keywords.'
              }
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {filteredItems.map((item) => {
                const name = pick(item.name, lang, defLang);
                const desc = pick(item.description, lang, defLang);

                return (
                  <div
                    key={item.id}
                    className="card"
                    style={{
                      padding: 14,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 16,
                      backgroundColor: 'var(--color-foam)',
                      border: '1px solid var(--color-line)',
                      borderRadius: 'var(--radius-card)',
                      cursor: 'pointer',
                      transition: 'transform var(--transition-fast), box-shadow var(--transition-fast)',
                    }}
                    onClick={() => {
                      setSelectedItem(item);
                      setItemQty(1);
                      setItemNote('');
                    }}
                  >
                    {/* Item Image or Elegant Placeholder */}
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={name}
                        style={{
                          width: 84,
                          height: 84,
                          borderRadius: 14,
                          objectFit: 'cover',
                          flexShrink: 0,
                          backgroundColor: 'var(--color-cream)',
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 84,
                          height: 84,
                          borderRadius: 14,
                          backgroundColor: 'var(--color-cream)',
                          border: '1.5px solid var(--color-line)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--color-roast)',
                          fontSize: 26,
                          flexShrink: 0,
                        }}
                      >
                        ☕
                      </div>
                    )}

                    {/* Item Details */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3
                        style={{
                          fontSize: 16,
                          fontWeight: 700,
                          color: 'var(--color-espresso)',
                          marginBottom: 4,
                          lineHeight: 1.3,
                        }}
                      >
                        {name}
                      </h3>
                      {desc && (
                        <p
                          style={{
                            fontSize: 13,
                            color: 'var(--color-muted)',
                            lineHeight: 1.4,
                            marginBottom: 8,
                            overflow: 'hidden',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                          }}
                        >
                          {desc}
                        </p>
                      )}
                      <div
                        style={{
                          fontSize: 15,
                          fontWeight: 700,
                          color: accentColor,
                          fontFamily: 'var(--font-serif)',
                        }}
                      >
                        {Number(item.price).toFixed(2)} {cafe.currency || 'ETB'}
                      </div>
                    </div>

                    {/* Round Add Button (Ordering mode only) */}
                    {table && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          addToCart(item, 1, '');
                        }}
                        style={{
                          width: 40,
                          height: 40,
                          minWidth: 40,
                          borderRadius: '50%',
                          background: 'var(--color-roast)',
                          color: '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: 'none',
                          cursor: 'pointer',
                          boxShadow: '0 2px 8px rgba(111, 78, 55, 0.25)',
                          transition: 'transform var(--transition-fast)',
                        }}
                        title="Add item"
                      >
                        <Plus size={20} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ─── ITEM DETAILS BOTTOM SHEET ───────────────────────────────────────── */}
      <BottomSheet
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        title={selectedItem ? pick(selectedItem.name, lang, defLang) : ''}
        subtitle={
          selectedItem
            ? `${Number(selectedItem.price).toFixed(2)} ${cafe?.currency || 'ETB'}`
            : ''
        }
      >
        {selectedItem && (
          <div>
            {selectedItem.image_url && (
              <img
                src={selectedItem.image_url}
                alt=""
                style={{
                  width: '100%',
                  height: 200,
                  borderRadius: 'var(--radius)',
                  objectFit: 'cover',
                  marginBottom: 16,
                }}
              />
            )}

            {pick(selectedItem.description, lang, defLang) && (
              <p style={{ fontSize: 14, color: 'var(--color-muted)', marginBottom: 20, lineHeight: 1.6 }}>
                {pick(selectedItem.description, lang, defLang)}
              </p>
            )}

            {table ? (
              <>
                {/* Quantity Stepper */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 20,
                    padding: '12px 0',
                    borderTop: '1px solid var(--color-line)',
                    borderBottom: '1px solid var(--color-line)',
                  }}
                >
                  <span style={{ fontSize: 15, fontWeight: 600 }}>
                    {isAmharic ? 'ብዛት' : 'Quantity'}
                  </span>
                  <QtyStepper value={itemQty} onChange={(v) => setItemQty(v)} />
                </div>

                {/* Optional Note */}
                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                    {isAmharic ? 'ልዩ ማስታወሻ (አማራጭ)' : 'Special Request (Optional)'}
                  </label>
                  <input
                    type="text"
                    value={itemNote}
                    onChange={(e) => setItemNote(e.target.value)}
                    placeholder={isAmharic ? 'ለምሳሌ፡ ስኳር አይጨመር፣ ለብ ያለ...' : 'e.g., extra foam, no sugar...'}
                    maxLength={100}
                    style={{
                      borderRadius: 'var(--radius)',
                      padding: '10px 14px',
                      fontSize: 14,
                    }}
                  />
                </div>

                {/* Add Button */}
                <Button
                  fullWidth
                  size="lg"
                  variant="primary"
                  onClick={() => addToCart(selectedItem, itemQty, itemNote)}
                >
                  {isAmharic ? 'ወደ ትዕዛዝ ጨምር · ' : 'Add to Order · '}
                  {(Number(selectedItem.price) * itemQty).toFixed(2)} {cafe?.currency || 'ETB'}
                </Button>
              </>
            ) : (
              <div
                style={{
                  padding: 16,
                  borderRadius: 'var(--radius)',
                  backgroundColor: 'var(--color-cream)',
                  border: '1.5px dashed var(--color-line)',
                  textAlign: 'center',
                  fontSize: 14,
                  color: 'var(--color-muted)',
                }}
              >
                {isAmharic
                  ? 'ይህንን እቃ ለማዘዝ እባክዎ በጠረጴዛዎ ላይ ያለውን የQR ኮድ ስካን ያድርጉ።'
                  : 'To place an order from your table, please scan the QR code located on your table.'}
              </div>
            )}
          </div>
        )}
      </BottomSheet>

      {/* ─── FLOATING CART PILL (Appears when items are in cart) ─────────────── */}
      {table && cart.length > 0 && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            left: 20,
            right: 20,
            maxWidth: 520,
            margin: '0 auto',
            zIndex: 90,
          }}
          className="anim-slide-up"
        >
          <button
            onClick={() => setCartOpen(true)}
            style={{
              width: '100%',
              minHeight: 54,
              padding: '12px 22px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--color-roast)',
              color: '#FFFFFF',
              boxShadow: 'var(--shadow-float)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontWeight: 700,
              fontSize: 15,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  backgroundColor: '#FFFFFF',
                  color: 'var(--color-roast)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                  fontWeight: 800,
                }}
              >
                {cartCount}
              </div>
              <span>{isAmharic ? 'ትዕዛዝ ይመልከቱ' : 'View Order'}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>{cartTotal.toFixed(2)} {cafe.currency || 'ETB'}</span>
              <ArrowRight size={17} />
            </div>
          </button>
        </div>
      )}

      {/* ─── CART BOTTOM SHEET ──────────────────────────────────────────────── */}
      <BottomSheet
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        title={isAmharic ? 'የእርስዎ ትዕዛዝ' : 'Your Table Order'}
        subtitle={table ? `${table.name} · ${cafe.name}` : ''}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Cart Item rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {cart.map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  paddingBottom: 12,
                  borderBottom: '1px solid var(--color-line)',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--color-espresso)' }}>
                    {pick(item.name, lang, defLang)}
                  </div>
                  {item.note && (
                    <div style={{ fontSize: 12, color: 'var(--color-caramel)', marginTop: 2 }}>
                      📝 {item.note}
                    </div>
                  )}
                  <div style={{ fontSize: 13, color: 'var(--color-muted)', marginTop: 2 }}>
                    {(Number(item.price) * item.qty).toFixed(2)} {cafe.currency || 'ETB'}
                  </div>
                </div>

                <QtyStepper
                  value={item.qty}
                  size="sm"
                  onChange={(v) => updateCartQty(idx, v)}
                />
              </div>
            ))}
          </div>

          {/* Table order note */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              {isAmharic ? 'የትዕዛዝ ማስታወሻ ለባርቴንደር' : 'Note for Barista'}
            </label>
            <input
              type="text"
              value={orderNote}
              onChange={(e) => setOrderNote(e.target.value)}
              placeholder={isAmharic ? 'ለምሳሌ፡ አንድ ላይ ይምጣ...' : 'e.g., serve together, please hurry...'}
              maxLength={120}
            />
          </div>

          {/* Subtotal */}
          <div
            style={{
              padding: '14px 16px',
              backgroundColor: 'var(--color-cream)',
              borderRadius: 'var(--radius)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontWeight: 700,
              fontSize: 16,
            }}
          >
            <span>{isAmharic ? 'ጠቅላላ ድምር' : 'Total'}</span>
            <span style={{ color: 'var(--color-caramel)', fontFamily: 'var(--font-serif)', fontSize: 18 }}>
              {cartTotal.toFixed(2)} {cafe.currency || 'ETB'}
            </span>
          </div>

          {/* Place order CTA */}
          <Button
            fullWidth
            size="lg"
            variant="primary"
            loading={submittingOrder}
            onClick={handlePlaceOrder}
            iconRight={<ArrowRight size={18} />}
          >
            {isAmharic ? 'ትዕዛዙን ላክ' : 'Send Order to Barista'}
          </Button>
        </div>
      </BottomSheet>

      {/* ─── MY ORDERS HISTORY BOTTOM SHEET ─────────────────────────────────── */}
      <BottomSheet
        isOpen={myOrdersOpen}
        onClose={() => setMyOrdersOpen(false)}
        title={t('menu.my_orders') || (isAmharic ? 'የጠረጴዛ ትዕዛዞቼ' : 'My Orders')}
        subtitle={table ? `${table.name} · ${isAmharic ? 'ከ6 ሰዓት ወዲህ' : 'Last 6 hours'}` : ''}
      >
        {loadingOrders && tableOrders.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '12px 0' }}>
            <Skeleton height={110} borderRadius={16} />
            <Skeleton height={110} borderRadius={16} />
          </div>
        ) : ordersError && tableOrders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 16px' }}>
            <AlertCircle size={40} color="#E53E3E" style={{ margin: '0 auto 12px' }} />
            <h4 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-espresso)', marginBottom: 6 }}>
              {isAmharic ? 'ትዕዛዞችን መጫን አልተቻለም' : 'Could not load orders'}
            </h4>
            <p style={{ fontSize: 13, color: 'var(--color-muted)', marginBottom: 18 }}>
              {isAmharic ? 'የግንኙነት ችግር አጋጥሟል። እባክዎ እንደገና ይሞክሩ።' : 'A connection issue occurred. Please check your network and retry.'}
            </p>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setLoadingOrders(true);
                fetchTableOrders().finally(() => setLoadingOrders(false));
              }}
              iconLeft={<RotateCw size={14} />}
            >
              {isAmharic ? 'እንደገና ሞክር' : 'Retry'}
            </Button>
          </div>
        ) : tableOrders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--color-muted)' }}>
            <ClipboardList size={44} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
            <h4 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-espresso)', marginBottom: 6 }}>
              {t('menu.no_orders_yet') || (isAmharic ? 'ምንም ትዕዛዝ የለም' : 'No orders yet')}
            </h4>
            <p style={{ fontSize: 13, maxWidth: 280, margin: '0 auto', lineHeight: 1.5 }}>
              {t('menu.no_orders_desc') ||
                (isAmharic
                  ? 'ከዚህ ጠረጴዛ የሚታዘዙ ትዕዛዞች እዚህ በቀጥታ ይታያሉ።'
                  : 'Orders placed from this table will appear here in real time.')}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {tableOrders.map((order) => {
              const orderStep = getOrderStep(order);
              return (
                <div
                  key={order.id}
                  style={{
                    border: '1px solid var(--color-line)',
                    borderRadius: 'var(--radius-card)',
                    padding: 16,
                    backgroundColor: 'var(--color-foam)',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  {/* Order header */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 8,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--color-espresso)' }}>
                        {order.table_name || table?.name || (isAmharic ? 'ጠረጴዛ' : 'Table')}
                      </span>
                      <span
                        style={{
                          fontSize: 10.5,
                          fontWeight: 700,
                          padding: '2px 7px',
                          borderRadius: 999,
                          backgroundColor:
                            orderStep === 3
                              ? 'var(--color-sage-light)'
                              : orderStep === 2
                              ? 'var(--color-amber-light)'
                              : orderStep === 4
                              ? 'var(--color-cream)'
                              : 'var(--color-cream)',
                          color:
                            orderStep === 3
                              ? 'var(--color-sage)'
                              : orderStep === 2
                              ? 'var(--color-amber)'
                              : orderStep === 4
                              ? 'var(--color-muted)'
                              : 'var(--color-caramel)',
                          border: '1px solid currentColor',
                        }}
                      >
                        {orderStep === 3
                          ? (t('menu.order_ready') || (isAmharic ? 'ዝግጁ ሆኗል' : 'Ready'))
                          : orderStep === 2
                          ? (t('menu.order_preparing') || (isAmharic ? 'በመዘጋጀት ላይ' : 'Being prepared'))
                          : orderStep === 4
                          ? (t('menu.order_served') || (isAmharic ? 'ቀርቧል' : 'Served'))
                          : orderStep === -1
                          ? (isAmharic ? 'ተሰርዟል' : 'Cancelled')
                          : (t('menu.order_received') || (isAmharic ? 'ደርሷል' : 'Received'))}
                      </span>
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--color-muted)' }}>
                      {formatOrderTime(order.created_at)}
                    </span>
                  </div>

                  {/* Stepper */}
                  <OrderStepper step={orderStep} isAmharic={isAmharic} t={t} />

                  {/* Items */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
                    {(order.items || []).map((it, idx) => {
                      const itemName = pick(it.name, lang, cafe?.default_language);
                      return (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: 13,
                            color: 'var(--color-espresso)',
                            lineHeight: 1.4,
                          }}
                        >
                          <span>
                            <strong>{it.qty}×</strong> {itemName}
                            {it.note ? (
                              <span style={{ color: 'var(--color-muted)', fontSize: 11, marginLeft: 4 }}>
                                ({it.note})
                              </span>
                            ) : null}
                          </span>
                          <span style={{ fontWeight: 600 }}>
                            {Number(it.price * it.qty).toFixed(2)}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Order note */}
                  {order.note && (
                    <div
                      style={{
                        marginTop: 8,
                        fontSize: 12,
                        fontStyle: 'italic',
                        color: 'var(--color-muted)',
                        backgroundColor: 'rgba(0,0,0,0.02)',
                        padding: '4px 8px',
                        borderRadius: 6,
                      }}
                    >
                      📝 {order.note}
                    </div>
                  )}

                  {/* Total */}
                  {order.items?.length > 0 && (
                    <div
                      style={{
                        marginTop: 10,
                        paddingTop: 8,
                        borderTop: '1px dashed var(--color-line)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontWeight: 700,
                        fontSize: 13,
                      }}
                    >
                      <span style={{ color: 'var(--color-muted)' }}>
                        {isAmharic ? 'ጠቅላላ' : 'Total'}
                      </span>
                      <span style={{ color: 'var(--color-espresso)' }}>
                        {order.items.reduce((s, it) => s + Number(it.price || 0) * it.qty, 0).toFixed(2)}{' '}
                        {cafe.currency || 'ETB'}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </BottomSheet>

      {/* ─── ORDER PLACED CONFIRMATION MODAL ─────────────────────────────────── */}
      {orderSuccessModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            backgroundColor: 'rgba(43, 29, 20, 0.7)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            className="card anim-fade-in"
            style={{
              maxWidth: 420,
              width: '100%',
              padding: 32,
              textAlign: 'center',
              borderRadius: 'var(--radius-card)',
              backgroundColor: 'var(--color-foam)',
            }}
          >
            {/* Animated check circle */}
            <div
              style={{
                width: 68,
                height: 68,
                borderRadius: '50%',
                backgroundColor: 'var(--color-sage-light)',
                color: 'var(--color-sage)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
              }}
            >
              <Check size={36} strokeWidth={3} />
            </div>

            <h2
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 24,
                color: 'var(--color-espresso)',
                marginBottom: 8,
              }}
            >
              {isAmharic ? 'ትዕዛዝዎ ደርሷል!' : 'Order Placed!'}
            </h2>
            <p style={{ color: 'var(--color-muted)', fontSize: 14, marginBottom: 24, lineHeight: 1.5 }}>
              {isAmharic
                ? `ትዕዛዝዎ ለ${table?.name || 'ጠረጴዛ'} ለባርቴንደሩ ደርሷል። ሲዘጋጅ ወደ ጠረጴዛዎ ይደርሳል።`
                : `Your order has been sent to the barista for ${table?.name || 'your table'}. We'll notify you as it prepares.`}
            </p>

            <Button
              fullWidth
              size="lg"
              variant="primary"
              onClick={() => setOrderSuccessModal(false)}
            >
              {isAmharic ? 'እሺ' : 'Back to Menu'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
