'use client';

import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { supabase, pick } from '../../lib/supabase';
import { useI18n } from '../../lib/i18n';
import { Logo, CoffeeIllustration } from '../../components/ui/Logo';
import { CafeLogo } from '../../components/ui/CafeLogo';
import { getDerivedTextColor, getDerivedButtonTextColor, getDerivedCardStyle, mergeCafeTheme, deriveDarkPalette, autoFixBrandColor, getContrastRatio } from '../../lib/theme';
import { Button, IconButton } from '../../components/ui/Button';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { QtyStepper, Badge, EmptyState, Skeleton } from '../../components/ui/Badge';
import { LanguageSwitcher } from '../../components/ui/LanguageSwitcher';
import { ThemeToggle, useTheme } from '../../components/ui/ThemeToggle';
import {
  Search,
  ShoppingBag,
  Plus,
  Minus,
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
  Edit2,
  Trash2,
  XCircle,
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

export function getDeviceKey(cafeSlug) {
  if (typeof window === 'undefined') return '';
  const keyName = `deviceKey:${cafeSlug}`;
  try {
    let key = localStorage.getItem(keyName);
    if (!key) {
      key =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : Math.random().toString(36).substring(2) + Date.now().toString(36);
      localStorage.setItem(keyName, key);
    }

    function createSessionId() {
      return typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    }

    function getScanSessionKey(cafeSlug, tableToken) {
      return `session:${cafeSlug}:${tableToken}`;
    }

    function getSessionCartKey(id) {
      return `cart:${id}`;
    }

    function CustomerThemeSync({ isDark, background }) {
      useEffect(() => {
        document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute('content', background || (isDark ? '#1A120C' : '#F7F1E8'));
      }, [isDark, background]);
      return null;
    }
    return key;
  } catch {
    return '';
  }
}

export function mapOrderError(err, isAmharic = false) {
  const raw = typeof err === 'string' ? err : err?.message || err?.details || '';
  const code = raw.toLowerCase();
  if (code.includes('order_in_progress')) {
    return isAmharic
      ? 'ባሩ ትዕዛዝዎን ማዘጋጀት ጀምሯል። እባክዎን ሰራተኞቹን ለውጥ እንዲያደርጉ ይጠይቁ።'
      : 'The bar has already started your order. Please ask the staff to change it.';
  }
  if (code.includes('order_closed')) {
    return isAmharic ? 'ይህ ትዕዛዝ አስቀድሞ ተጠናቋል።' : 'This order is already finished.';
  }
  if (code.includes('order_not_found')) {
    return isAmharic ? 'ትዕዛዙ አልተገኘም።' : 'We could not find this order.';
  }
  if (code.includes('too_many_edits')) {
    return isAmharic
      ? 'ይህንን ትዕዛዝ ደጋግመው ቀይረዋል። እባክዎን ሰራተኞቹን ይጠይቁ።'
      : 'You changed this order too many times. Please ask the staff.';
  }
  if (code.includes('item_unavailable')) {
    return isAmharic
      ? 'አንዳንድ እቃዎች በአሁኑ ወቅት አይገኙም። እባክዎ ትዕዛዝዎን ይመልከቱ።'
      : 'An item is no longer available. Please check your order.';
  }
  if (code.includes('too_many_orders')) {
    return isAmharic
      ? 'በጠረጴዛው ላይ ብዙ ትዕዛዞች አሉ። እባክዎ ሰራተኞቹን ይጠይቁ።'
      : 'There are already several open orders at this table. Please ask the staff for help.';
  }
  if (code.includes('table_inactive')) {
    return isAmharic
      ? 'ይህ ጠረጴዛ አሁን አይሰራም። እባክዎ ሰራተኞቹን ይጠይቁ።'
      : 'This table is not active. Please ask the staff.';
  }
  if (code.includes('invalid_quantity') || code.includes('invalid_items')) {
    return isAmharic
      ? 'በትዕዛዝዎ ላይ ስህተት ተከስቷል። እባክዎ እንደገና ይሞክሩ።'
      : 'Something is wrong with your order. Please try again.';
  }
  if (code.includes('not_allowed')) {
    return isAmharic ? 'ይህንን ለማድረግ ፈቃድ የለዎትም።' : 'You do not have permission to do that.';
  }
  if (code.includes('network') || code.includes('fetch') || code.includes('failed to fetch')) {
    return isAmharic
      ? 'የኢንተርኔት ግንኙነት የለም። እባክዎ ግንኙነትዎን ፈትሸው እንደገና ይሞክሩ።'
      : 'No connection. Please check your internet and try again.';
  }
  return raw || (isAmharic ? 'ስህተት ተከስቷል፣ እባክዎ እንደገና ይሞክሩ።' : 'An error occurred. Please try again.');
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
  const { choice: themeChoice, systemDark } = useTheme();

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
  const [cafeUnavailable, setCafeUnavailable] = useState(false);

  // Table & Ordering Mode State
  const [table, setTable] = useState(null); // { token, name }
  const [tableError, setTableError] = useState('');
  const [showWelcome, setShowWelcome] = useState(false);
  const [welcomeFading, setWelcomeFading] = useState(false);
  const [welcomeBack, setWelcomeBack] = useState(null);
  const [scanNotice, setScanNotice] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [lastOrderItems, setLastOrderItems] = useState([]);
  const [lastOrderAt, setLastOrderAt] = useState(0);

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

  // Customer Edit & Cancel Order State
  const [editingOrder, setEditingOrder] = useState(null);
  const [editItems, setEditItems] = useState([]);
  const [editOrderNote, setEditOrderNote] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [cancellingOrderId, setCancellingOrderId] = useState(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(null);
  const [showAddItemInEdit, setShowAddItemInEdit] = useState(false);
  const [addItemSearch, setAddItemSearch] = useState('');

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

  const touchSession = useCallback(() => {
    if (!sessionId || !slug || !table?.token) return;
    try {
      const key = getScanSessionKey(slug, table.token);
      const current = JSON.parse(localStorage.getItem(key) || 'null');
      if (current?.id !== sessionId) return;
      const updated = { ...current, lastActiveAt: new Date().toISOString() };
      localStorage.setItem(key, JSON.stringify(updated));
    } catch (error) {
      console.warn('Could not update order session activity:', error);
    }
  }, [sessionId, slug, table?.token]);

  useEffect(() => {
    if (!sessionId || !table?.token) return;
    try {
      localStorage.setItem(getSessionCartKey(sessionId), JSON.stringify(cart));
      const key = getScanSessionKey(slug, table.token);
      const current = JSON.parse(localStorage.getItem(key) || 'null');
      if (current?.id === sessionId) {
        localStorage.setItem(key, JSON.stringify({ ...current, lastActiveAt: new Date().toISOString() }));
      }
    } catch (error) {
      console.warn('Could not persist this table cart:', error);
    }
  }, [cart, sessionId, slug, table?.token]);

  // Fetch and sync table orders for this phone's device_key
  const fetchTableOrders = useCallback(async (explicitToken = null) => {
    const token =
      explicitToken ||
      table?.token ||
      (typeof window !== 'undefined' ? sessionStorage.getItem(`table_token_${slug}`) : null);

    if (!token) return [];

    const deviceKey = getDeviceKey(slug);
    if (!deviceKey) return [];

    // Clean up any legacy table_orders cache
    try {
      localStorage.removeItem(`table_orders_${slug}_${token}`);
      localStorage.removeItem(`table_order_ids_${slug}_${token}`);
    } catch {}

    try {
      const { data: ordersData, error } = await supabase.rpc('get_my_orders', {
        p_token: token,
        p_device_key: deviceKey,
      });

      if (error) {
        console.warn('get_my_orders error:', error);
        setOrdersError(true);
        return null;
      }

      setOrdersError(false);

      if (ordersData && Array.isArray(ordersData)) {
        let sessionOrders = [];
        try {
          const currentSession = JSON.parse(localStorage.getItem(getScanSessionKey(slug, token)) || 'null');
          const ownedOrderIds = Array.isArray(currentSession?.orderIds) ? currentSession.orderIds.map(String) : [];
          sessionOrders = ordersData.filter((order) => ownedOrderIds.includes(String(order.id)));
        } catch (storageError) {
          console.warn('Could not match orders to this scan session:', storageError);
        }
        // Check for transition to ready
        sessionOrders.forEach((order) => {
          const currentStep = getOrderStep(order);
          const prevStep = prevOrderStepsRef.current[order.id];
          if (prevStep !== undefined && prevStep < 3 && currentStep === 3) {
            showToast(
              t('menu.order_ready_toast') ||
                (isAmharic ? 'ትዕዛዝዎ ዝግጁ ነው! ሊወስዱት ይችላሉ።' : 'Your order is Ready! Please collect it.')
            );
          }
          prevOrderStepsRef.current[order.id] = currentStep;
        });

        // Set table orders strictly from get_my_orders
        setTableOrders(sessionOrders);
        return sessionOrders;
      }
      setTableOrders([]);
      return [];
    } catch (err) {
      console.warn('fetchTableOrders exception:', err);
      setOrdersError(true);
      return null;
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
        setCart([]);
        setTable(null);
        setTableOrders([]);
        setSessionId('');
        setWelcomeBack(null);
        setShowWelcome(false);
        setTableError('');
        setScanNotice('');

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

        const activeUntil = c.active_until ? new Date(c.active_until).getTime() : null;
        if (c.active === false || (activeUntil && activeUntil <= Date.now())) {
          if (isMounted) {
            setCafeUnavailable(true);
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
              const staleSessionKey = getScanSessionKey(slug, activeToken);
              try {
                const staleSession = JSON.parse(localStorage.getItem(staleSessionKey) || 'null');
                if (staleSession?.id) localStorage.removeItem(getSessionCartKey(staleSession.id));
                localStorage.removeItem(staleSessionKey);
              } catch (storageError) {
                console.warn('Could not clear inactive table session:', storageError);
              }
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

              // Clean up any legacy order cache from localStorage
              try {
                localStorage.removeItem(`table_orders_${slug}_${activeToken}`);
                localStorage.removeItem(`table_order_ids_${slug}_${activeToken}`);
              } catch {}

              const navigationType = performance.getEntriesByType('navigation')[0]?.type;
              const isNewScan = navigationType === 'navigate' && Boolean(urlToken);
              const sessionKey = getScanSessionKey(slug, activeToken);
              let storedSession = null;
              let storedCart = [];
              let previousOrder = null;
              try {
                storedSession = JSON.parse(localStorage.getItem(sessionKey) || 'null');
                if (storedSession?.id) {
                  storedCart = JSON.parse(localStorage.getItem(getSessionCartKey(storedSession.id)) || '[]');
                  if (!Array.isArray(storedCart)) storedCart = [];
                }
                previousOrder = JSON.parse(localStorage.getItem(`last-order:${slug}:${activeToken}`) || 'null');
              } catch (storageError) {
                console.warn('Could not restore table session from this device:', storageError);
              }
              const hours = Math.max(1, Number(c.settings?.session_hours) || 3);
              const expired = !storedSession || !Number.isFinite(Date.parse(storedSession.lastActiveAt))
                || Date.now() - Date.parse(storedSession.lastActiveAt) > hours * 60 * 60 * 1000;
              let returnedOrders = await fetchTableOrders(activeToken);
              if (expired) {
                returnedOrders = [];
                setTableOrders([]);
              }
              const activeOrders = Array.isArray(returnedOrders)
                ? returnedOrders.filter((order) => !['paid', 'cancelled'].includes(String(order.status).toLowerCase()))
                : [];
              const retainedFinishedIds = !expired && Array.isArray(returnedOrders)
                ? returnedOrders
                    .filter((order) => ['paid', 'cancelled'].includes(String(order.status).toLowerCase()))
                    .map((order) => String(order.id))
                : [];
              const startNewSession = expired || (isNewScan && !activeOrders.length && storedCart.length === 0);
              const nextSession = !startNewSession && storedSession ? storedSession : {
                id: createSessionId(),
                startedAt: new Date().toISOString(),
                lastActiveAt: new Date().toISOString(),
                orderIds: retainedFinishedIds,
              };

              if (startNewSession && storedSession?.id) {
                localStorage.removeItem(getSessionCartKey(storedSession.id));
                localStorage.removeItem(sessionKey);
              }
              if (isMounted) {
                setSessionId(nextSession.id);
                localStorage.setItem(sessionKey, JSON.stringify(nextSession));
                if (!isNewScan) {
                  setCart(expired ? [] : storedCart);
                } else if (startNewSession) {
                  if (storedSession?.id) localStorage.removeItem(getSessionCartKey(storedSession.id));
                  setCart([]);
                  setWelcomeBack(null);
                  setShowWelcome(true);
                } else {
                  setCart(storedCart);
                  setShowWelcome(false);
                  if (activeOrders.length) {
                    setWelcomeBack({ type: 'orders', order: activeOrders[0], count: activeOrders.length });
                  } else {
                    setWelcomeBack({ type: 'cart', count: storedCart.reduce((sum, item) => sum + Number(item.qty || 0), 0) });
                  }
                }
                if (previousOrder && Array.isArray(previousOrder.items)
                  && Date.now() - Number(previousOrder.at || 0) <= 24 * 60 * 60 * 1000) {
                  setLastOrderItems(previousOrder.items);
                  setLastOrderAt(Number(previousOrder.at) || 0);
                } else {
                  setLastOrderItems([]);
                  setLastOrderAt(0);
                }
                if (returnedOrders === null) {
                  setCart([]);
                  setScanNotice(isAmharic
                    ? 'ትዕዛዞችዎን ማረጋገጥ አልተቻለም። አዲስ ትዕዛዝ በደህና ይጀምሩ።'
                    : 'We could not check for earlier orders. You can safely start a fresh order.');
                  if (isNewScan) setShowWelcome(true);
                }
              }
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

  const openMyOrders = () => {
    touchSession();
    setMyOrdersOpen(true);
  };

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

  // Part B: Orders countdown ticker (paid and cancelled orders countdown and auto-fade out)
  useEffect(() => {
    const hasExpiring = tableOrders.some(
      (o) => (o.status === 'paid' || o.status === 'cancelled') && typeof o.seconds_left === 'number'
    );
    if (!hasExpiring) return;

    const timer = setInterval(() => {
      setTableOrders((prev) => {
        let changed = false;
        const updated = [];
        for (const o of prev) {
          if ((o.status === 'paid' || o.status === 'cancelled') && typeof o.seconds_left === 'number') {
            const nextSec = o.seconds_left - 1;
            if (nextSec <= 0) {
              changed = true;
              continue; // Exclude expired card; auto-fades and is removed
            }
            changed = true;
            updated.push({ ...o, seconds_left: nextSec });
          } else {
            updated.push(o);
          }
        }
        return changed ? updated : prev;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [tableOrders]);

  // Part C: Open Edit Order BottomSheet
  const openEditOrderSheet = (order) => {
    if (!order) return;
    setEditingOrder(order);
    const initialItems = (order.items || []).map((it) => ({
      item_id: it.item_id || it.id,
      name: it.name,
      qty: it.qty || 1,
      price: Number(it.price || 0),
      note: it.note || '',
    }));
    setEditItems(initialItems);
    setEditOrderNote(order.note || '');
    setShowAddItemInEdit(false);
    setAddItemSearch('');
  };

  const handleEditItemQty = (index, delta) => {
    setEditItems((prev) => {
      const copy = [...prev];
      const item = copy[index];
      if (!item) return prev;
      const nextQty = item.qty + delta;
      if (nextQty <= 0) {
        copy.splice(index, 1);
      } else {
        copy[index] = { ...item, qty: nextQty };
      }
      return copy;
    });
  };

  const handleEditItemNote = (index, noteVal) => {
    setEditItems((prev) => {
      const copy = [...prev];
      if (copy[index]) {
        copy[index] = { ...copy[index], note: noteVal };
      }
      return copy;
    });
  };

  const handleAddItemToEdit = (menuItem) => {
    setEditItems((prev) => {
      const idx = prev.findIndex((i) => i.item_id === menuItem.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], qty: copy[idx].qty + 1 };
        return copy;
      }
      return [
        ...prev,
        {
          item_id: menuItem.id,
          name: menuItem.name,
          qty: 1,
          price: Number(menuItem.price || 0),
          note: '',
        },
      ];
    });
    setShowAddItemInEdit(false);
    setAddItemSearch('');
  };

  // Save changes via customer_edit_order
  const handleSaveCustomerEdit = async () => {
    if (!editingOrder) return;
    const deviceKey = getDeviceKey(slug);
    if (!deviceKey) return;

    if (editItems.length === 0) {
      alert(isAmharic ? 'ቢያንስ አንድ እቃ በትዕዛዝዎ ውስጥ መኖር አለበት።' : 'At least one item must remain in your order.');
      return;
    }

    setSavingEdit(true);
    try {
      const pItems = editItems.map((i) => ({
        item_id: i.item_id,
        qty: i.qty,
        note: i.note || '',
      }));

      const { data, error } = await supabase.rpc('customer_edit_order', {
        p_order_id: editingOrder.id,
        p_device_key: deviceKey,
        p_items: pItems,
        p_note: editOrderNote.trim(),
      });

      if (error) {
        const msg = mapOrderError(error, isAmharic);
        if ((error.message || '').toLowerCase().includes('order_in_progress')) {
          setEditingOrder(null);
          showToast(msg);
          await fetchTableOrders(table?.token);
          return;
        }
        alert(msg);
        return;
      }

      setEditingOrder(null);
      showToast(t('menu.order_updated_toast') || (isAmharic ? 'ትዕዛዝዎ ተስተካክሏል' : 'Order updated'));
      await fetchTableOrders(table?.token);
    } catch (err) {
      alert(mapOrderError(err, isAmharic));
    } finally {
      setSavingEdit(false);
    }
  };

  // Cancel customer order via customer_cancel_order
  const handleCancelCustomerOrder = async (order) => {
    if (!order) return;
    const deviceKey = getDeviceKey(slug);
    if (!deviceKey) return;

    setCancellingOrderId(order.id);
    try {
      const { data, error } = await supabase.rpc('customer_cancel_order', {
        p_order_id: order.id,
        p_device_key: deviceKey,
      });

      if (error) {
        alert(mapOrderError(error, isAmharic));
        return;
      }

      setShowCancelConfirm(null);
      if (editingOrder?.id === order.id) {
        setEditingOrder(null);
      }
      showToast(t('menu.order_cancelled_toast') || (isAmharic ? 'ትዕዛዝዎ ተሰርዟል' : 'Order cancelled'));
      await fetchTableOrders(table?.token);
    } catch (err) {
      alert(mapOrderError(err, isAmharic));
    } finally {
      setCancellingOrderId(null);
    }
  };

  // Menu periodic refresh every 30s as safety net
  useEffect(() => {
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && !document.hidden && navigator.onLine) {
        loadMenuData();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [loadMenuData]);

  const dismissWelcome = () => {
    setWelcomeFading(true);
    setTimeout(() => setShowWelcome(false), 250);
  };

  // Cart operations
  const addToCart = (item, qty = 1, note = '') => {
    touchSession();
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
    touchSession();
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
      alert(isAmharic ? 'እባክዎን ትዕዛዝ ለማስገባት የጠረጴዛውን QR ኮድ ይቃኙ።' : 'Please scan a valid table QR code to place an order.');
      return;
    }
    if (cart.length === 0) return;

    const deviceKey = getDeviceKey(slug);
    if (!deviceKey) {
      alert(isAmharic ? 'የስልክ መለያ ማግኘት አልተቻለም። እባክዎ ገጹን ያድሱ።' : 'Device key could not be initialized. Please refresh the page.');
      return;
    }

    setSubmittingOrder(true);
    touchSession();
    try {
      const pItems = cart.map((i) => ({
        item_id: i.id,
        qty: i.qty,
        note: i.note || '',
      }));

      const { data, error } = await supabase.rpc('place_order_v2', {
        p_token: table.token,
        p_items: pItems,
        p_note: orderNote.trim(),
        p_device_key: deviceKey,
      });

      if (error) {
        alert(mapOrderError(error, isAmharic));
        return;
      }

      if (data?.order_id) {
        try {
          const sessionKey = getScanSessionKey(slug, table.token);
          const currentSession = JSON.parse(localStorage.getItem(sessionKey) || 'null');
          if (currentSession?.id === sessionId) {
            const orderIds = Array.isArray(currentSession.orderIds) ? currentSession.orderIds.map(String) : [];
            localStorage.setItem(sessionKey, JSON.stringify({
              ...currentSession,
              lastActiveAt: new Date().toISOString(),
              orderIds: [...new Set([...orderIds, String(data.order_id)])],
            }));
          }
        } catch (storageError) {
          console.warn('Could not associate the new order with this scan session:', storageError);
        }
        try {
          const previousItems = cart.map((item) => ({ id: item.id, qty: item.qty }));
          localStorage.setItem(`last-order:${slug}:${table.token}`, JSON.stringify({
            at: Date.now(),
            items: previousItems,
          }));
          setLastOrderItems(previousItems);
          setLastOrderAt(Date.now());
        } catch (storageError) {
          console.warn('Could not save this device’s recent order items:', storageError);
        }
        setCart([]);
        setCartOpen(false);
        setOrderSuccessModal(true);
        await fetchTableOrders(table.token);
      }
    } catch (err) {
      alert(mapOrderError(err, isAmharic));
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

  const orderSameAgain = (savedItems = lastOrderItems) => {
    const availableById = new Map(items.map((item) => [String(item.id), item]));
    let skipped = 0;
    const repeatCart = savedItems.reduce((rows, previous) => {
      const item = availableById.get(String(previous.id ?? previous.item_id));
      if (!item) {
        skipped += 1;
        return rows;
      }
      rows.push({ ...item, qty: Math.max(1, Number(previous.qty) || 1), note: '' });
      return rows;
    }, []);
    setCart(repeatCart);
    setWelcomeBack(null);
    setShowWelcome(false);
    if (skipped) {
      showToast(isAmharic
        ? `${skipped} የማይገኙ እቃዎች ተወግደዋል።`
        : `${skipped} unavailable item${skipped === 1 ? ' was' : 's were'} skipped.`);
    }
    if (!repeatCart.length) {
      showToast(isAmharic ? 'የቀድሞው ትዕዛዝ እቃዎች አሁን አይገኙም።' : 'Those items are no longer available.');
    } else {
      setCartOpen(true);
    }
  };

  if (cafeUnavailable) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: 'var(--bg)' }}>
        <div className="card" style={{ maxWidth: 420, textAlign: 'center' }}>
          <h1 style={{ fontSize: 24 }}>{isAmharic ? 'ይህ ካፌ አሁን አይገኝም' : 'This cafe is currently unavailable.'}</h1>
        </div>
      </div>
    );
  }

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
  const cafeTheme = mergeCafeTheme(cafe.theme || {});
  const darkTheme = cafeTheme.dark.mode === 'custom' ? cafeTheme.dark : deriveDarkPalette(cafeTheme);
  const customerDarkEnabled = cafeTheme.dark.enabled !== false;
  const customerIsDark = customerDarkEnabled && (themeChoice === 'dark'
    || (themeChoice === 'auto' && (cafeTheme.default_mode === 'dark'
      || (cafeTheme.default_mode === 'system' && systemDark))));
  const rawBrandColor = customerIsDark
    ? (darkTheme.primary || '#D9A066')
    : (cafeTheme.primary || cafeTheme.button || '#6F4E37');
  const bgColor = customerIsDark
    ? (darkTheme.background || '#1A120C')
    : (cafeTheme.background || '#FFFFFF');
  const textColor = customerIsDark
    ? (darkTheme.text || '#F3EADF')
    : (cafeTheme.text || getDerivedTextColor(bgColor));
  const surfaceColor = customerIsDark ? (darkTheme.surface || '#251A12') : getDerivedCardStyle(bgColor).cardBg;
  const surface2Color = customerIsDark ? (darkTheme.surface || '#2F221A') : '#F5F0E9';
  const borderColor = customerIsDark ? (darkTheme.border || '#3A2B20') : getDerivedCardStyle(bgColor).cardBorder;
  const brandColor = getContrastRatio(rawBrandColor, bgColor) >= 3
    ? rawBrandColor
    : autoFixBrandColor(rawBrandColor, bgColor);
  const rawButtonColor = customerIsDark ? (darkTheme.button || brandColor) : (cafeTheme.button || brandColor);
  const buttonColor = getContrastRatio(rawButtonColor, bgColor) >= 3
    ? rawButtonColor
    : autoFixBrandColor(rawButtonColor, bgColor);
  const btnTextColor = getDerivedButtonTextColor(buttonColor);
  const cardStyle = {
    cardBg: surfaceColor,
    cardBorder: borderColor,
    mutedText: customerIsDark ? (darkTheme.muted || '#B7A593') : getDerivedCardStyle(bgColor).mutedText,
  };
  const primaryColor = brandColor;
  const accentColor = brandColor;
  const customerLogoUrl = customerIsDark ? (darkTheme.logo_url || cafe.logo_url) : cafe.logo_url;
  const needsLogoChip = customerIsDark && !darkTheme.logo_url && Boolean(cafe.logo_url);

  return (
    <div
      className="customer-menu"
      data-theme={customerIsDark ? 'dark' : 'light'}
      style={{
        '--bg': bgColor,
        '--surface': surfaceColor,
        '--surface-2': surface2Color,
        '--color-cream': bgColor,
        '--card-bg': surfaceColor,
        '--color-foam': cardStyle.cardBg,
        '--text': textColor,
        '--text-muted': cardStyle.mutedText,
        '--color-espresso': textColor,
        '--color-muted': cardStyle.mutedText,
        '--border': borderColor,
        '--color-line': borderColor,
        '--primary': brandColor,
        '--color-roast': buttonColor,
        '--primary-contrast': btnTextColor,
        '--accent': customerIsDark ? (darkTheme.accent || '#E3A32B') : brandColor,
        '--color-caramel': customerIsDark ? (darkTheme.accent || '#E3A32B') : brandColor,
        '--btn-text': btnTextColor,
        '--success': customerIsDark ? '#7FB88A' : '#507B56',
        '--warning': customerIsDark ? '#E3A32B' : '#8A5A00',
        '--danger': customerIsDark ? '#E27D68' : '#A43D2B',
        backgroundColor: bgColor,
        color: textColor,
        minHeight: '100vh',
        paddingBottom: 110,
      }}
    >
      <CustomerThemeSync isDark={customerIsDark} />
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
              <span style={needsLogoChip ? { background: '#FFFDF9', borderRadius: 24, padding: 6, display: 'inline-flex' } : undefined}>
              <CafeLogo
                logoUrl={customerLogoUrl}
                name={cafe.name}
                brandColor={brandColor}
                size={84}
                radius={20}
                border="3px solid rgba(255,255,255,0.25)"
              />
              </span>
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
                <span>{table ? `${isAmharic ? 'ጠረጴዛ' : 'Table'}: ${table.name}` : (isAmharic ? 'ጠረጴዛ' : 'Table')}</span>
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
            {scanNotice && (
              <p style={{ color: '#F3EADF', marginBottom: 10, textAlign: 'center', fontSize: 13 }}>{scanNotice}</p>
            )}
            {lastOrderItems.length > 0 && lastOrderAt && (
              <Button
                fullWidth
                size="lg"
                variant="secondary"
                style={{ minHeight: 48, marginBottom: 10 }}
                onClick={orderSameAgain}
              >
                {isAmharic ? 'ያለፈውን ትዕዛዝ እንደገና ይዘዙ' : 'Order the same again'}
              </Button>
            )}
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
          <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
            {customerDarkEnabled && <ThemeToggle compact />}
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
              <span style={needsLogoChip ? { background: '#FFFDF9', borderRadius: 20, padding: 5, display: 'inline-flex' } : undefined}>
              <CafeLogo
                logoUrl={customerLogoUrl}
                name={cafe.name}
                brandColor={brandColor}
                size={64}
                radius={16}
                border="2px solid var(--color-line)"
              />
              </span>

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
                  🪑 {isAmharic ? 'ጠረጴዛ' : 'Table'}: {table.name} · {isAmharic ? 'ትዕዛዝ ክፍት ነው' : 'Ordering enabled'}
                </Badge>
              ) : (
                <Badge variant="neutral" size="sm">
                  👀 {isAmharic ? 'የእይታ ሁነታ' : 'View-only mode'}
                </Badge>
              )}

              {/* My Orders shortcut — only in table ordering mode */}
              {table && (
                <button
                  onClick={openMyOrders}
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
                  onClick={openMyOrders}
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

      <BottomSheet
        isOpen={Boolean(welcomeBack)}
        onClose={() => setWelcomeBack(null)}
        title={isAmharic ? 'እንኳን ተመልሰው መጡ' : 'Welcome back'}
        subtitle={table ? `${isAmharic ? 'ጠረጴዛ' : 'Table'}: ${table.name}` : ''}
      >
        {welcomeBack?.type === 'cart' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ color: 'var(--text)', fontSize: 16, marginBottom: 4 }}>
              {isAmharic
                ? `በትዕዛዝዎ ውስጥ ${welcomeBack.count} እቃዎች አሉ።`
                : `You have ${welcomeBack.count} items in your order.`}
            </p>
            <Button fullWidth size="lg" style={{ minHeight: 48 }} onClick={() => setWelcomeBack(null)}>
              {isAmharic ? 'ትዕዛዜን ቀጥል' : 'Continue my order'}
            </Button>
            <Button
              fullWidth
              size="lg"
              variant="secondary"
              style={{ minHeight: 48 }}
              onClick={() => {
                if (!window.confirm(isAmharic ? 'የቀድሞውን ቅርጫት ይጥፋ?' : 'Clear your saved cart and start over?')) return;
                setCart([]);
                if (sessionId) localStorage.removeItem(getSessionCartKey(sessionId));
                touchSession();
                setWelcomeBack(null);
              }}
            >
              {isAmharic ? 'ከአዲስ ጀምር' : 'Start over'}
            </Button>
          </div>
        ) : welcomeBack?.type === 'orders' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ color: 'var(--text)', fontSize: 16, marginBottom: 4 }}>
              {isAmharic
                ? `ትዕዛዝዎ በ${table?.name || 'ጠረጴዛ'} ላይ ${welcomeBack.order?.status || 'ክፍት'} ነው።`
                : `Your order at ${table?.name || 'this table'} is ${welcomeBack.order?.status || 'open'}.`}
            </p>
            <Button fullWidth size="lg" style={{ minHeight: 48 }} onClick={() => {
              setWelcomeBack(null);
              openMyOrders();
            }}>
              {isAmharic ? 'ትዕዛዜን ተመልከት' : 'View my order'}
            </Button>
            <Button fullWidth size="lg" variant="secondary" style={{ minHeight: 48 }} onClick={() => {
              setCart([]);
              setWelcomeBack(null);
              setCartOpen(false);
              touchSession();
            }}>
              {isAmharic ? 'ሌላ ትዕዛዝ ይጨምሩ' : 'Order more'}
            </Button>
            {welcomeBack.order?.editable !== false && (
              <Button fullWidth size="lg" variant="ghost" style={{ minHeight: 48 }} onClick={() => {
                setWelcomeBack(null);
                openEditOrderSheet(welcomeBack.order);
              }}>
                {isAmharic ? 'ትዕዛዜን አስተካክል' : 'Edit my order'}
              </Button>
            )}
            {lastOrderItems.length > 0 && lastOrderAt > 0 && (
              <Button fullWidth size="lg" variant="ghost" style={{ minHeight: 48 }} onClick={() => orderSameAgain()}>
                {isAmharic ? 'ያለፈውን ትዕዛዝ እንደገና ይዘዙ' : 'Order the same again'}
              </Button>
            )}
          </div>
        ) : null}
      </BottomSheet>

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
            <p style={{ fontSize: 12, margin: '12px auto 0', color: 'var(--text-muted)' }}>
              {isAmharic ? 'ትዕዛዝዎን ማየት ካልቻሉ ሰራተኞችን ይጠይቁ።' : "Can't see your order? Ask the staff."}
            </p>
            {lastOrderItems.length > 0 && lastOrderAt > 0 && (
              <Button size="md" variant="secondary" style={{ marginTop: 14 }} onClick={() => orderSameAgain()}>
                {isAmharic ? 'ያለፈውን ትዕዛዝ እንደገና ይዘዙ' : 'Order again'}
              </Button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {tableOrders.map((order) => {
              const orderStep = getOrderStep(order);
              const isPaid = order.status === 'paid';
              const isCancelled = order.status === 'cancelled';
              const hasCountdown = typeof order.seconds_left === 'number';

              // Part B: Paid state card
              if (isPaid) {
                return (
                  <div
                    key={order.id}
                    style={{
                      border: '1.5px solid var(--color-sage)',
                      borderRadius: 'var(--radius-card)',
                      padding: 16,
                      backgroundColor: 'rgba(107, 143, 113, 0.08)',
                      boxShadow: 'var(--shadow-sm)',
                      transition: 'opacity 0.4s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <CheckCircle2 size={18} color="var(--color-sage)" />
                        <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--color-sage)' }}>
                          {t('menu.order_paid_thank_you') || (isAmharic ? 'ተከፍሏል። እናመሰግናለን!' : 'Paid. Thank you!')}
                        </span>
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--color-muted)' }}>
                        {formatOrderTime(order.created_at)}
                      </span>
                    </div>

                    <div style={{ marginTop: 8, fontSize: 12, color: 'var(--color-muted)' }}>
                      {(order.items || []).map((it) => `${it.qty}× ${pick(it.name, lang, cafe?.default_language)}`).join(', ')}
                    </div>

                    {hasCountdown && (
                      <div style={{ marginTop: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--color-muted)', marginBottom: 4 }}>
                          <span>{t('menu.closing_soon') || (isAmharic ? 'በቅርቡ ይጠፋል' : 'Closing soon')}</span>
                          <span>{order.seconds_left}s</span>
                        </div>
                        <div style={{ height: 3, width: '100%', backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                          <div
                            style={{
                              height: '100%',
                              width: `${Math.max(0, Math.min(100, (order.seconds_left / 60) * 100))}%`,
                              backgroundColor: 'var(--color-sage)',
                              transition: 'width 1s linear',
                            }}
                          />
                        </div>
                      </div>
                    )}
                    <Button
                      size="sm"
                      variant="secondary"
                      style={{ minHeight: 44, marginTop: 10 }}
                      onClick={() => {
                        setMyOrdersOpen(false);
                        orderSameAgain((order.items || []).map((item) => ({
                          id: item.item_id || item.id,
                          qty: item.qty,
                        })));
                      }}
                    >
                      {isAmharic ? 'እንደገና ይዘዙ' : 'Order again'}
                    </Button>
                  </div>
                );
              }

              // Part B: Cancelled state card
              if (isCancelled) {
                return (
                  <div
                    key={order.id}
                    style={{
                      border: '1.5px solid rgba(196, 85, 61, 0.35)',
                      borderRadius: 'var(--radius-card)',
                      padding: 16,
                      backgroundColor: 'rgba(196, 85, 61, 0.06)',
                      boxShadow: 'var(--shadow-sm)',
                      transition: 'opacity 0.4s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <AlertCircle size={18} color="var(--color-terracotta)" />
                        <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--color-terracotta)' }}>
                          {order.cancelled_by === 'staff'
                            ? (t('menu.cancelled_by_staff') || (isAmharic ? 'በሰራተኛ ተሰርዟል' : 'Cancelled by staff'))
                            : (t('menu.cancelled_by_you') || (isAmharic ? 'ተሰርዟል' : 'Cancelled'))}
                        </span>
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--color-muted)' }}>
                        {formatOrderTime(order.created_at)}
                      </span>
                    </div>

                    {order.cancel_reason && (
                      <div style={{ marginTop: 6, fontSize: 12, color: 'var(--color-terracotta)', fontWeight: 600 }}>
                        {isAmharic ? 'ምክንያት፡ ' : 'Reason: '} {order.cancel_reason}
                      </div>
                    )}

                    {hasCountdown && (
                      <div style={{ marginTop: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--color-muted)', marginBottom: 4 }}>
                          <span>{t('menu.closing_soon') || (isAmharic ? 'በቅርቡ ይጠፋል' : 'Closing soon')}</span>
                          <span>{order.seconds_left}s</span>
                        </div>
                        <div style={{ height: 3, width: '100%', backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                          <div
                            style={{
                              height: '100%',
                              width: `${Math.max(0, Math.min(100, (order.seconds_left / 60) * 100))}%`,
                              backgroundColor: 'var(--color-terracotta)',
                              transition: 'width 1s linear',
                            }}
                          />
                        </div>
                      </div>
                    )}
                    <Button
                      size="sm"
                      variant="secondary"
                      style={{ minHeight: 44, marginTop: 10 }}
                      onClick={() => {
                        setMyOrdersOpen(false);
                        orderSameAgain((order.items || []).map((item) => ({
                          id: item.item_id || item.id,
                          qty: item.qty,
                        })));
                      }}
                    >
                      {isAmharic ? 'እንደገና ይዘዙ' : 'Order again'}
                    </Button>
                  </div>
                );
              }

              // Active & Served orders card
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
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
                          : (t('menu.order_received') || (isAmharic ? 'ደርሷል' : 'Received'))}
                      </span>

                      {/* Part C: Edited badges */}
                      {order.edited_by === 'staff' && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: 4,
                            backgroundColor: 'rgba(227, 163, 43, 0.2)',
                            color: 'var(--color-amber)',
                          }}
                        >
                          {t('menu.updated_by_staff') || (isAmharic ? 'በሰራተኛ ተቀይሯል' : 'Updated by staff')}
                        </span>
                      )}
                      {order.edited_by === 'customer' && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: 4,
                            backgroundColor: 'rgba(201, 138, 75, 0.2)',
                            color: 'var(--color-caramel)',
                          }}
                        >
                          {t('menu.updated_by_you') || (isAmharic ? 'ተቀይሯል' : 'Updated')}
                        </span>
                      )}
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
                        {cafe?.currency || 'ETB'}
                      </span>
                    </div>
                  )}

                  {/* Part C: Edit and Cancel Buttons (if editable) or bar notice */}
                  {order.editable === true && (
                    <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                      <Button
                        variant="secondary"
                        size="md"
                        fullWidth
                        style={{ minHeight: 44, fontWeight: 700 }}
                        onClick={() => openEditOrderSheet(order)}
                        disabled={savingEdit || cancellingOrderId === order.id}
                        iconLeft={<Edit2 size={15} />}
                      >
                        {t('menu.edit_order') || (isAmharic ? 'ትዕዛዝ አርትዕ' : 'Edit order')}
                      </Button>
                      <Button
                        variant="ghost"
                        size="md"
                        fullWidth
                        style={{ minHeight: 44, color: 'var(--color-terracotta)', fontWeight: 700 }}
                        onClick={() => setShowCancelConfirm(order)}
                        disabled={savingEdit || cancellingOrderId === order.id}
                        iconLeft={<XCircle size={15} />}
                      >
                        {t('menu.cancel_order') || (isAmharic ? 'ትዕዛዝ ሰርዝ' : 'Cancel order')}
                      </Button>
                    </div>
                  )}

                  {order.editable === false && order.status === 'open' && (
                    <div
                      style={{
                        marginTop: 12,
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'rgba(0,0,0,0.03)',
                        color: 'var(--color-muted)',
                        fontSize: 12,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        lineHeight: 1.4,
                      }}
                    >
                      <Info size={15} style={{ flexShrink: 0, color: 'var(--color-caramel)' }} />
                      <span>
                        {t('menu.bar_started_notice') ||
                          (isAmharic
                            ? 'ባሩ ትዕዛዝዎን ማዘጋጀት ጀምሯል። እባክዎን ሰራተኞቹን ለውጥ እንዲያደርጉ ይጠይቁ።'
                            : 'The bar has started your order. Please ask the staff to change it.')}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </BottomSheet>

      {/* ─── PART C: EDIT ORDER BOTTOM SHEET ─────────────────────────────────── */}
      <BottomSheet
        isOpen={!!editingOrder}
        onClose={() => setEditingOrder(null)}
        title={t('menu.edit_order') || (isAmharic ? 'ትዕዛዝ አርትዕ' : 'Edit Order')}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, paddingBottom: 16 }}>
          {/* Items list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {editItems.map((item, idx) => (
              <div
                key={idx}
                style={{
                  border: '1px solid var(--color-line)',
                  borderRadius: 'var(--radius-sm)',
                  padding: 12,
                  backgroundColor: 'var(--color-card)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-espresso)' }}>
                      {pick(item.name, lang, cafe?.default_language)}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--color-muted)' }}>
                      {Number(item.price).toFixed(2)} {cafe?.currency || 'ETB'}
                    </div>
                  </div>

                  {/* Quantity stepper: reducing to 0 removes line */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button
                      type="button"
                      onClick={() => handleEditItemQty(idx, -1)}
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: '50%',
                        border: '1px solid var(--color-line)',
                        backgroundColor: 'var(--color-foam)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: 'var(--color-espresso)',
                      }}
                      title="Decrease"
                    >
                      {item.qty === 1 ? <Trash2 size={14} color="var(--color-terracotta)" /> : <Minus size={14} />}
                    </button>
                    <span style={{ fontWeight: 800, fontSize: 15, minWidth: 20, textAlign: 'center' }}>
                      {item.qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleEditItemQty(idx, 1)}
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: '50%',
                        border: '1px solid var(--color-line)',
                        backgroundColor: 'var(--color-foam)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: 'var(--color-espresso)',
                      }}
                      title="Increase"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                {/* Line note field */}
                <input
                  type="text"
                  value={item.note || ''}
                  onChange={(e) => handleEditItemNote(idx, e.target.value)}
                  placeholder={isAmharic ? 'ለዚህ እቃ ማስታወሻ...' : 'Note for this item...'}
                  style={{
                    fontSize: 12,
                    padding: '6px 10px',
                    borderRadius: 6,
                    border: '1px solid var(--color-line)',
                    backgroundColor: 'var(--color-foam)',
                    color: 'var(--color-espresso)',
                    width: '100%',
                  }}
                />
              </div>
            ))}
          </div>

          {/* Add more items button & search picker */}
          {!showAddItemInEdit ? (
            <Button
              variant="secondary"
              size="md"
              fullWidth
              style={{ minHeight: 44, fontWeight: 700 }}
              onClick={() => setShowAddItemInEdit(true)}
              iconLeft={<Plus size={16} />}
            >
              {t('menu.add_more_items') || (isAmharic ? 'ተጨማሪ እቃዎችን ጨምር' : 'Add more items')}
            </Button>
          ) : (
            <div
              style={{
                border: '1.5px dashed var(--color-caramel)',
                borderRadius: 'var(--radius-sm)',
                padding: 12,
                backgroundColor: 'rgba(201, 138, 75, 0.05)',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-espresso)' }}>
                  {isAmharic ? 'ከሜኑ ምረጥ' : 'Select from Menu'}
                </span>
                <button
                  onClick={() => setShowAddItemInEdit(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--color-muted)', cursor: 'pointer', fontSize: 12 }}
                >
                  {isAmharic ? 'ዝጋ' : 'Close'}
                </button>
              </div>

              <input
                type="text"
                value={addItemSearch}
                onChange={(e) => setAddItemSearch(e.target.value)}
                placeholder={isAmharic ? 'እቃ ፈልግ...' : 'Search items to add...'}
                style={{
                  fontSize: 13,
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: '1px solid var(--color-line)',
                  backgroundColor: '#FFF',
                }}
              />

              <div style={{ maxHeight: 180, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {items
                  .filter((i) => {
                    if (!addItemSearch.trim()) return true;
                    const name = pick(i.name, lang, cafe?.default_language) || '';
                    return name.toLowerCase().includes(addItemSearch.toLowerCase().trim());
                  })
                  .slice(0, 10)
                  .map((menuItem) => (
                    <div
                      key={menuItem.id}
                      onClick={() => handleAddItemToEdit(menuItem)}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 10px',
                        borderRadius: 6,
                        backgroundColor: '#FFF',
                        border: '1px solid var(--color-line)',
                        cursor: 'pointer',
                      }}
                    >
                      <span style={{ fontSize: 13, fontWeight: 600 }}>
                        {pick(menuItem.name, lang, cafe?.default_language)}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-caramel)' }}>
                        +{Number(menuItem.price).toFixed(2)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Whole order note */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4, color: 'var(--color-espresso)' }}>
              {isAmharic ? 'የትዕዛዝ ማስታወሻ' : 'Order Instructions'}
            </label>
            <textarea
              rows={2}
              value={editOrderNote}
              onChange={(e) => setEditOrderNote(e.target.value)}
              placeholder={isAmharic ? 'ለሙሉ ትዕዛዙ ልዩ መመሪያ...' : 'Special instructions for the whole order...'}
              style={{
                width: '100%',
                fontSize: 13,
                padding: '8px 10px',
                borderRadius: 8,
                border: '1px solid var(--color-line)',
                backgroundColor: 'var(--color-card)',
                color: 'var(--color-espresso)',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Total line */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: 10,
              borderTop: '1px solid var(--color-line)',
              fontWeight: 800,
              fontSize: 16,
            }}
          >
            <span>{isAmharic ? 'አዲስ ድምር' : 'New Total'}</span>
            <span style={{ color: 'var(--color-caramel)' }}>
              {editItems.reduce((sum, it) => sum + Number(it.price || 0) * it.qty, 0).toFixed(2)}{' '}
              {cafe?.currency || 'ETB'}
            </span>
          </div>

          {/* Save / Cancel buttons */}
          {editItems.length === 0 ? (
            <Button
              variant="danger"
              size="lg"
              fullWidth
              style={{ minHeight: 48, fontWeight: 700 }}
              onClick={() => handleCancelCustomerOrder(editingOrder)}
              disabled={savingEdit}
            >
              {isAmharic ? 'ትዕዛዙን ሰርዝ' : 'Cancel this order instead'}
            </Button>
          ) : (
            <Button
              variant="primary"
              size="lg"
              fullWidth
              style={{ minHeight: 48, fontWeight: 700 }}
              onClick={handleSaveCustomerEdit}
              disabled={savingEdit}
            >
              {savingEdit ? (isAmharic ? 'በመመዝገብ ላይ...' : 'Saving changes...') : (t('menu.save_changes') || (isAmharic ? 'ለውጦችን መዝግብ' : 'Save changes'))}
            </Button>
          )}
        </div>
      </BottomSheet>

      {/* ─── PART C: CANCEL CONFIRMATION MODAL ───────────────────────────────── */}
      {showCancelConfirm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            backgroundColor: 'rgba(43, 29, 20, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            className="card anim-fade-in"
            style={{
              maxWidth: 400,
              width: '100%',
              padding: 28,
              textAlign: 'center',
              borderRadius: 'var(--radius-card)',
              backgroundColor: 'var(--color-foam)',
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

            <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-espresso)', marginBottom: 8 }}>
              {t('menu.cancel_order_confirm') || (isAmharic ? 'ይህንን ትዕዛዝ መሰረዝ ይፈልጋሉ?' : 'Cancel this order?')}
            </h3>

            <p style={{ fontSize: 13, color: 'var(--color-muted)', lineHeight: 1.5, marginBottom: 20 }}>
              {isAmharic
                ? 'ትዕዛዙ ይሰረዛል እንዲሁም ከባርቴንደሩ ወረፋ ወዲያውኑ ይወገዳል።'
                : 'This order will be cancelled and removed from the barista queue immediately.'}
            </p>

            <div style={{ display: 'flex', gap: 10 }}>
              <Button
                variant="secondary"
                size="md"
                fullWidth
                style={{ minHeight: 44 }}
                onClick={() => setShowCancelConfirm(null)}
                disabled={!!cancellingOrderId}
              >
                {isAmharic ? 'ይቅር' : 'Keep Order'}
              </Button>
              <Button
                variant="danger"
                size="md"
                fullWidth
                style={{ minHeight: 44, backgroundColor: 'var(--color-terracotta)', color: '#FFF' }}
                onClick={() => handleCancelCustomerOrder(showCancelConfirm)}
                disabled={!!cancellingOrderId}
              >
                {cancellingOrderId ? (isAmharic ? 'በመሰረዝ ላይ...' : 'Cancelling...') : (isAmharic ? 'አዎ ሰርዝ' : 'Yes, Cancel')}
              </Button>
            </div>
          </div>
        </div>
      )}

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
