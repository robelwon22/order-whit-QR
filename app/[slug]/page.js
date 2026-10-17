'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { supabase, pick } from '../../lib/supabase';
import { useI18n } from '../../lib/i18n';
import { Logo, CoffeeIllustration } from '../../components/ui/Logo';
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
} from 'lucide-react';

export default function CustomerMenuPage() {
  const { slug } = useParams();
  const searchParams = useSearchParams();
  const { lang, setLang, isAmharic } = useI18n();

  // Data State
  const [cafe, setCafe] = useState(null);
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
  const [activeOrder, setActiveOrder] = useState(null); // { id, table_name, status }
  const [orderSuccessModal, setOrderSuccessModal] = useState(false);

  // Read URL table token
  const urlToken = searchParams.get('t') || searchParams.get('table');

  // Load Cafe, Categories, Items, and Table Token
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setLoading(true);

        // 1. Fetch Cafe by slug
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

        // 2. Fetch categories and items
        const [catRes, itemRes] = await Promise.all([
          supabase.from('categories').select('*').eq('cafe_id', c.id).eq('visible', true).order('sort_order').order('created_at'),
          supabase.from('items').select('*').eq('cafe_id', c.id).eq('available', true).order('sort_order').order('created_at'),
        ]);

        if (isMounted) {
          setCats(catRes.data || []);
          setItems(itemRes.data || []);
        }

        // 3. Resolve Table Token
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

              // Check if welcome screen has been seen in this session
              const welcomeSeen = sessionStorage.getItem(`welcome_seen_${slug}_${activeToken}`);
              if (!welcomeSeen) {
                setShowWelcome(true);
                sessionStorage.setItem(`welcome_seen_${slug}_${activeToken}`, 'true');
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

    loadData();

    // Subscribe to realtime item changes
    const ch = supabase.channel(`menu-realtime-${slug}`);
    ch.on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, () => {
      loadData();
    }).subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(ch);
    };
  }, [slug, urlToken, setLang]);

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

  // Poll Active Order Status if an order was placed
  useEffect(() => {
    if (!activeOrder?.id) return;

    const interval = setInterval(async () => {
      try {
        const { data: statusData } = await supabase.rpc('get_order_status', {
          p_order_id: activeOrder.id,
        });

        if (statusData?.status) {
          setActiveOrder((prev) => ({
            ...prev,
            status: statusData.status,
          }));
        }
      } catch (e) {
        console.error('Error polling order status:', e);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [activeOrder?.id]);

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
        setActiveOrder({
          id: data.order_id,
          table_name: data.table_name || table.name,
          status: 'open', // 'open' = Received
        });
        setCart([]);
        setCartOpen(false);
        setOrderSuccessModal(true);
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
  const primaryColor = cafeTheme.primary || 'var(--color-roast)';
  const accentColor = 'var(--color-caramel)';

  return (
    <div
      style={{
        backgroundColor: 'var(--bg)',
        color: 'var(--text)',
        minHeight: '100vh',
        paddingBottom: 110,
      }}
    >
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
            <div style={{ marginBottom: 20 }}>
              {cafe.logo_url ? (
                <img
                  src={cafe.logo_url}
                  alt={cafe.name}
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 'var(--radius-card)',
                    objectFit: 'cover',
                    margin: '0 auto',
                    border: '3px solid rgba(255,255,255,0.2)',
                  }}
                />
              ) : (
                <CoffeeIllustration size={130} />
              )}
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
              {cafe.logo_url ? (
                <img
                  src={cafe.logo_url}
                  alt={cafe.name}
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 16,
                    objectFit: 'cover',
                    border: '2px solid var(--color-line)',
                    boxShadow: 'var(--shadow-sm)',
                    flexShrink: 0,
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 16,
                    backgroundColor: 'var(--color-cream)',
                    border: '2px solid var(--color-line)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 28,
                    flexShrink: 0,
                  }}
                >
                  ☕
                </div>
              )}

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

        {/* ─── LIVE ORDER STATUS TRACKER (If active customer order) ───────────── */}
        {activeOrder && (
          <div style={{ padding: '0 20px', marginTop: 16 }}>
            <div
              className="card anim-slide-up"
              style={{
                backgroundColor: 'var(--color-espresso)',
                color: '#FFFDF9',
                padding: 20,
                border: '1.5px solid var(--color-roast)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--color-sage)', animation: 'livePulse 2s infinite' }} />
                  <span style={{ fontWeight: 700, fontSize: 15 }}>
                    {isAmharic ? 'የቀጥታ የትዕዛዝ ሁኔታ' : 'Live Order Tracker'}
                  </span>
                </div>
                <span style={{ fontSize: 12, color: 'var(--color-caramel)', fontWeight: 600 }}>
                  {activeOrder.table_name}
                </span>
              </div>

              {/* 3-Step Progress */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, textAlign: 'center' }}>
                {/* Step 1: Received */}
                <div
                  style={{
                    padding: '8px 4px',
                    borderRadius: 8,
                    background: activeOrder.status ? 'rgba(107, 143, 113, 0.25)' : 'rgba(255,255,255,0.06)',
                    color: activeOrder.status ? 'var(--color-sage)' : 'rgba(255,255,255,0.4)',
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  <CheckCircle2 size={16} style={{ margin: '0 auto 4px' }} />
                  <div>{isAmharic ? 'ተቀብለናል' : 'Received'}</div>
                </div>

                {/* Step 2: Preparing */}
                <div
                  style={{
                    padding: '8px 4px',
                    borderRadius: 8,
                    background: activeOrder.status === 'preparing' || activeOrder.status === 'ready'
                      ? 'rgba(227, 163, 43, 0.25)'
                      : 'rgba(255,255,255,0.06)',
                    color: activeOrder.status === 'preparing' || activeOrder.status === 'ready'
                      ? 'var(--color-amber)'
                      : 'rgba(255,255,255,0.4)',
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  <Flame size={16} style={{ margin: '0 auto 4px' }} />
                  <div>{isAmharic ? 'በመዘጋጀት ላይ' : 'Preparing'}</div>
                </div>

                {/* Step 3: Ready */}
                <div
                  style={{
                    padding: '8px 4px',
                    borderRadius: 8,
                    background: activeOrder.status === 'ready'
                      ? 'rgba(107, 143, 113, 0.35)'
                      : 'rgba(255,255,255,0.06)',
                    color: activeOrder.status === 'ready'
                      ? 'var(--color-sage)'
                      : 'rgba(255,255,255,0.4)',
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  <Coffee size={16} style={{ margin: '0 auto 4px' }} />
                  <div>{isAmharic ? 'ዝግጁ ነው!' : 'Ready!'}</div>
                </div>
              </div>
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
                color: activeCategory === 'all' ? '#FFF' : 'var(--color-espresso)',
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
                    color: isActive ? '#FFF' : 'var(--color-espresso)',
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
