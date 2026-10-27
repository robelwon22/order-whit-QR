'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { siteConfig } from '../config/site';
import { useI18n } from '../lib/i18n';
import { Logo, CoffeeIllustration } from '../components/ui/Logo';
import { Button, IconButton } from '../components/ui/Button';
import { LanguageSwitcher } from '../components/ui/LanguageSwitcher';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { Badge } from '../components/ui/Badge';
import {
  QrCode,
  Smartphone,
  BellRing,
  Languages,
  Palette,
  TrendingUp,
  Clock,
  Sparkles,
  CheckCircle2,
  ChevronDown,
  ArrowRight,
  Phone,
  Send,
  Mail,
  ShieldCheck,
  Check,
  Plus,
  Coffee,
} from 'lucide-react';

export default function LandingPage() {
  const { lang, setLang, isAmharic } = useI18n();
  const [openFaq, setOpenFaq] = useState(0);

  // Interactive Demo State
  const [demoCategory, setDemoCategory] = useState('coffee');
  const [demoCart, setDemoCart] = useState([]);
  const [demoLang, setDemoLang] = useState('en');

  const demoItems = {
    coffee: [
      { id: 1, nameEn: 'Single Origin Jebena Buna', nameAm: 'የጀበና ቡና', price: 45, descEn: 'Authentic Ethiopian roast, served with traditional popcorn', descAm: 'ባህላዊ የጀበና ቡና ከፈንዲሻ ጋር' },
      { id: 2, nameEn: 'Honey Caramel Macchiato', nameAm: 'ማኪያቶ ከማር ጋር', price: 75, descEn: 'Double espresso layered with steamed microfoam and wild honey', descAm: 'ድርብ ኤስፕሬሶ ከለሰለሰ ወተት አረፋ ጋር' },
      { id: 3, nameEn: 'Cold Brew Crema', nameAm: 'ቀዝቃዛ ኮልድ ብሩ', price: 90, descEn: '18-hour cold steeped roast served over slow-melt ice', descAm: 'ለ18 ሰዓታት በቀዝቃዛ ውሃ የተጠመቀ' },
    ],
    pastry: [
      { id: 4, nameEn: 'Fresh Butter Croissant', nameAm: 'ክሩሳን', price: 85, descEn: 'Flaky artisanal French pastry baked fresh daily', descAm: 'በቅቤ የተዘጋጀ ለስላሳ ኬክ' },
      { id: 5, nameEn: 'Cardamom Cinnamon Swirl', nameAm: 'ሲናሞን ሮል', price: 95, descEn: 'Infused with roasted Korarima cardamom', descAm: 'ከቆረሪማ ጣዕም ጋር የተጋገረ' },
    ],
  };

  const handleDemoAdd = (item) => {
    setDemoCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) => (i.id === item.id ? { ...i, qty: i.qty + 1 } : i));
      }
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const demoCartTotal = demoCart.reduce((sum, i) => sum + i.price * i.qty, 0);

  const t = (obj) => {
    if (!obj) return '';
    return obj[lang] || obj.en || '';
  };

  return (
    <div style={{ backgroundColor: 'var(--bg)', color: 'var(--text)', minHeight: '100vh', overflowX: 'hidden' }}>
      {/* ─── 1. NAVBAR ────────────────────────────────────────────────────────── */}
      <header
        className="landing-header"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          backgroundColor: 'var(--surface)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid var(--color-line)',
          transition: 'all var(--transition-fast)',
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Logo size={36} />

          <nav
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 28,
            }}
            className="hidden-mobile"
          >
            <a href="#how-it-works" style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-espresso)' }}>
              {isAmharic ? 'እንዴት ይሰራል' : 'How it works'}
            </a>
            <a href="#features" style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-espresso)' }}>
              {isAmharic ? 'ገጽታዎች' : 'Features'}
            </a>
            <a href="#demo" style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-espresso)' }}>
              {isAmharic ? 'የሙከራ ማሳያ' : 'Interactive Demo'}
            </a>
            <a href="#pricing" style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-espresso)' }}>
              {isAmharic ? 'ዋጋ' : 'Pricing'}
            </a>
            <a href="#faq" style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-espresso)' }}>
              {isAmharic ? 'ጥያቄዎች' : 'FAQ'}
            </a>
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <LanguageSwitcher size="sm" />
            <ThemeToggle compact />
            <Link href="/login">
              <Button variant="ghost" size="sm" className="hidden-mobile-xs">
                {isAmharic ? 'የሰራተኛ መግቢያ' : 'Staff login'}
              </Button>
            </Link>
            <a href={`tel:${siteConfig.contact.phone}`}>
              <Button variant="primary" size="sm">
                {isAmharic ? 'ጀምር' : 'Get started'}
              </Button>
            </a>
          </div>
        </div>
      </header>

      {/* ─── 2. HERO SECTION ─────────────────────────────────────────────────── */}
      <section
        style={{
          padding: '64px 20px 72px',
          maxWidth: 1200,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: '1.1fr 0.9fr',
          gap: 48,
          alignItems: 'center',
        }}
        className="hero-grid"
      >
        <div>
          <div style={{ marginBottom: 18 }}>
            <Badge variant="caramel" size="sm" dot>
              {isAmharic ? 'ለዘመናዊ የኢትዮጵያ ካፌዎች የተዘጋጀ' : 'Engineered for Modern Ethiopian Cafes'}
            </Badge>
          </div>

          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 'clamp(34px, 5.5vw, 56px)',
              fontWeight: 700,
              color: 'var(--color-espresso)',
              lineHeight: 1.12,
              marginBottom: 20,
              letterSpacing: '-0.025em',
            }}
          >
            {t(siteConfig.tagline)}
          </h1>

          <p
            style={{
              fontSize: 'clamp(16px, 2vw, 19px)',
              color: 'var(--color-muted)',
              lineHeight: 1.6,
              marginBottom: 32,
              maxWidth: 540,
            }}
          >
            {t(siteConfig.subheading)}
          </p>

          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 36 }}>
            <a href={`tel:${siteConfig.contact.phone}`}>
              <Button size="lg" variant="primary" iconRight={<ArrowRight size={18} />}>
                {isAmharic ? 'የካፌዎን ሜኑ ዛሬውኑ ይጀምሩ' : 'Get started today'}
              </Button>
            </a>
            <a href="#demo">
              <Button size="lg" variant="secondary" icon={<Smartphone size={18} />}>
                {isAmharic ? 'የሙከራ ሜኑ ይመልከቱ' : 'See a demo menu'}
              </Button>
            </a>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ display: 'flex', marginLeft: -4 }}>
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    border: '2px solid var(--color-cream)',
                    background: i === 1 ? '#6F4E37' : i === 2 ? '#C98A4B' : i === 3 ? '#2B1D14' : '#6B8F71',
                    color: '#FFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    fontWeight: 700,
                    marginLeft: -8,
                  }}
                >
                  {i === 1 ? '☕' : i === 2 ? '✨' : i === 3 ? '🌿' : '✓'}
                </div>
              ))}
            </div>
            <span style={{ fontSize: 13, color: 'var(--color-muted)', fontWeight: 500 }}>
              {isAmharic ? 'ከ20+ በላይ ታዋቂ ካፌዎች በየቀኑ ይጠቀሙበታል' : 'Trusted by leading specialty cafes in Addis Ababa'}
            </span>
          </div>
        </div>

        {/* Hero Visual Mockup */}
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
          {/* Warm background glow */}
          <div
            style={{
              position: 'absolute',
              width: 380,
              height: 380,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(201, 138, 75, 0.22) 0%, rgba(247, 241, 232, 0) 70%)',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 0,
            }}
          />

          {/* Phone Frame */}
          <div
            style={{
              position: 'relative',
              zIndex: 1,
              width: 290,
              background: '#1A120C',
              padding: '12px',
              borderRadius: 38,
              boxShadow: 'var(--shadow-float)',
              border: '4px solid #3B2A1E',
            }}
          >
            {/* Phone Screen */}
            <div
              style={{
                background: 'var(--color-cream)',
                borderRadius: 28,
                overflow: 'hidden',
                color: 'var(--color-espresso)',
                minHeight: 460,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Fake Cover */}
              <div
                style={{
                  height: 110,
                  background: 'linear-gradient(135deg, #6F4E37, #2B1D14)',
                  position: 'relative',
                  padding: 14,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: 'var(--color-foam)',
                      border: '2px solid #FFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 16,
                    }}
                  >
                    ☕
                  </div>
                  <div>
                    <div style={{ color: '#FFF', fontWeight: 700, fontSize: 14 }}>Aroma Cafe</div>
                    <div style={{ color: 'var(--color-caramel)', fontSize: 11 }}>Table 4 · Active</div>
                  </div>
                </div>
              </div>

              {/* Sample menu cards */}
              <div style={{ padding: 14, flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'var(--color-foam)',
                    padding: 10,
                    borderRadius: 12,
                    border: '1px solid var(--color-line)',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 12 }}>Jebena Buna Special</div>
                    <div style={{ color: 'var(--color-caramel)', fontWeight: 700, fontSize: 12 }}>45 ETB</div>
                  </div>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: 'var(--color-roast)',
                      color: '#FFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 14,
                    }}
                  >
                    +
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'var(--color-foam)',
                    padding: 10,
                    borderRadius: 12,
                    border: '1px solid var(--color-line)',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 12 }}>Honey Macchiato</div>
                    <div style={{ color: 'var(--color-caramel)', fontWeight: 700, fontSize: 12 }}>70 ETB</div>
                  </div>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: 'var(--color-roast)',
                      color: '#FFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 14,
                    }}
                  >
                    +
                  </div>
                </div>

                {/* Live Bartender Alert mockup pill */}
                <div
                  style={{
                    marginTop: 'auto',
                    background: 'var(--color-sage-light)',
                    border: '1px solid var(--color-sage)',
                    color: 'var(--color-sage)',
                    padding: '8px 12px',
                    borderRadius: 12,
                    fontSize: 11,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-sage)', animation: 'livePulse 2s infinite' }} />
                  <span>Order sent to Barista · 1 min ago</span>
                </div>
              </div>
            </div>
          </div>

          {/* QR Code Floating Card */}
          <div
            className="anim-fade-in hidden-mobile-xs"
            style={{
              position: 'absolute',
              bottom: 20,
              right: -10,
              zIndex: 2,
              background: 'var(--color-foam)',
              padding: 16,
              borderRadius: 'var(--radius-card)',
              boxShadow: 'var(--shadow-float)',
              border: '1.5px solid var(--color-line)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: 140,
            }}
          >
            <div
              style={{
                width: 96,
                height: 96,
                background: '#FFFFFF',
                borderRadius: 8,
                padding: 6,
                border: '1px solid var(--color-line)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <QrCode size={84} color="#2B1D14" />
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, marginTop: 8, color: 'var(--color-espresso)' }}>
              Table 4
            </div>
            <div style={{ fontSize: 9, color: 'var(--color-muted)', textAlign: 'center' }}>
              Scan to order
            </div>
          </div>
        </div>
      </section>

      {/* ─── 3. TRUST STRIP ─────────────────────────────────────────────────── */}
      <div
        style={{
          borderTop: '1px solid var(--color-line)',
          borderBottom: '1px solid var(--color-line)',
          backgroundColor: 'var(--color-foam)',
          padding: '16px 20px',
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 'clamp(12px, 3vw, 36px)',
            flexWrap: 'wrap',
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--color-espresso)',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Check size={16} color="var(--color-sage)" />
            {isAmharic ? 'ምንም አፕሊኬሽን መጫን አያስፈልግም' : 'No app to install'}
          </span>
          <span style={{ color: 'var(--color-line)' }}>•</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Check size={16} color="var(--color-sage)" />
            {isAmharic ? 'በአማርኛ እና በእንግሊዝኛ' : 'Amharic and English'}
          </span>
          <span style={{ color: 'var(--color-line)' }}>•</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Check size={16} color="var(--color-sage)" />
            {isAmharic ? 'በማንኛውም ስልክ ይሰራል' : 'Works on any phone'}
          </span>
          <span style={{ color: 'var(--color-line)' }}>•</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Check size={16} color="var(--color-sage)" />
            {isAmharic ? 'ፈጣን የቀጥታ የትዕዛዝ ማሳወቂያ' : 'Live order alerts'}
          </span>
        </div>
      </div>

      {/* ─── 4. HOW IT WORKS ────────────────────────────────────────────────── */}
      <section
        id="how-it-works"
        style={{
          padding: '80px 20px',
          maxWidth: 1200,
          margin: '0 auto',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 54 }}>
          <Badge variant="caramel" size="sm" dot>
            {isAmharic ? 'ቀላል አሰራር' : 'Simple 3-Step Process'}
          </Badge>
          <h2
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 'clamp(28px, 4vw, 38px)',
              marginTop: 12,
              color: 'var(--color-espresso)',
            }}
          >
            {isAmharic ? 'እንዴት እንደሚሰራ' : 'How it works'}
          </h2>
          <p style={{ color: 'var(--color-muted)', fontSize: 16, marginTop: 8 }}>
            {isAmharic
              ? 'ከጠረጴዛ እስከ ባርቴንደሩ ትዕዛዝ ለማድረስ 3 ቀላል ደረጃዎች'
              : 'Effortless ordering from table scan to fresh brew.'}
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 28,
          }}
        >
          {[
            {
              step: '01',
              titleEn: 'Scan the table QR',
              titleAm: 'የጠረጴዛውን QR ስካን ያድርጉ',
              descEn: 'Customer sits down and scans the high-contrast QR card with their native camera app. No login needed.',
              descAm: 'ደንበኛው በስልኩ ካሜራ የጠረጴዛውን QR ኮድ ስካን ያደርጋል። ምንም መመዝገብ አያስፈልገውም።',
              icon: QrCode,
            },
            {
              step: '02',
              titleEn: 'Browse and order',
              titleAm: 'ይመልከቱ እና ይዘዙ',
              descEn: 'Explore your beautiful branded menu with photos, choose drink customizations, and place the order with a tap.',
              descAm: 'የተሟላውን የካፌዎን ሜኑ በፎቶ ይመለከታሉ፣ የፈለጉትን መርጠው በአንድ ጠቅታ ያዛሉ።',
              icon: Smartphone,
            },
            {
              step: '03',
              titleEn: 'The bar gets it instantly',
              titleAm: 'ባርቴንደሩ ወዲያውኑ ይቀበላል',
              descEn: 'Your barista station chimes with an audio alert and displays the table number and order details in real time.',
              descAm: 'የካፌው ባርቴንደር ወይም ባሬስታ በድምፅ ማሳወቂያ ትዕዛዙን ከጠረጴዛው ቁጥር ጋር በስክሪኑ ይቀበላል።',
              icon: BellRing,
            },
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="card"
                style={{
                  padding: 32,
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: 16,
                    right: 20,
                    fontSize: 48,
                    fontWeight: 800,
                    fontFamily: 'var(--font-serif)',
                    color: 'rgba(201, 138, 75, 0.15)',
                    lineHeight: 1,
                  }}
                >
                  {item.step}
                </div>
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 14,
                    background: 'var(--color-cream)',
                    border: '1.5px solid var(--color-line)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-roast)',
                    marginBottom: 20,
                  }}
                >
                  <Icon size={26} />
                </div>
                <h3 style={{ fontSize: 20, marginBottom: 10, fontFamily: 'var(--font-serif)' }}>
                  {isAmharic ? item.titleAm : item.titleEn}
                </h3>
                <p style={{ fontSize: 15, color: 'var(--color-muted)', lineHeight: 1.6 }}>
                  {isAmharic ? item.descAm : item.descEn}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── 5. FEATURES GRID (6 CARDS) ─────────────────────────────────────── */}
      <section
        id="features"
        style={{
          padding: '80px 20px',
          backgroundColor: 'var(--color-foam)',
          borderTop: '1px solid var(--color-line)',
          borderBottom: '1px solid var(--color-line)',
        }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 54 }}>
            <Badge variant="caramel" size="sm" dot>
              {isAmharic ? 'የላቁ አገልግሎቶች' : 'Crafted for Cafes'}
            </Badge>
            <h2
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 'clamp(28px, 4vw, 38px)',
                marginTop: 12,
                color: 'var(--color-espresso)',
              }}
            >
              {isAmharic ? 'ለምን BunaQR ይመረጣል?' : 'Features built for hospitality'}
            </h2>
            <p style={{ color: 'var(--color-muted)', fontSize: 16, marginTop: 8 }}>
              {isAmharic
                ? 'የካፌዎን አሰራር የሚያቀላጥፉ እና ደንበኞችዎን የሚያስደስቱ ቴክኖሎጂዎች'
                : 'Everything your cafe needs to boost table turns and delight guests.'}
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: 24,
            }}
          >
            {[
              {
                icon: Languages,
                titleEn: 'Multi-language Menu',
                titleAm: 'ባለብዙ ቋንቋ ሜኑ',
                descEn: 'Native Amharic & English support with balanced typography so tourists and locals alike feel at home.',
                descAm: 'የአማርኛና የእንግሊዝኛ ሙሉ ድጋፍ ለደንበኞችዎ ምቹ ሁኔታ ይፈጥራል።',
              },
              {
                icon: BellRing,
                titleEn: 'Live Order Queue with Audio Chime',
                titleAm: 'የቀጥታ ትዕዛዝ መስመር ከድምፅ ጋር',
                descEn: 'The bartender screen rings with a chime as new orders arrive and updates live with color-coded timers.',
                descAm: 'ትዕዛዝ ሲመጣ የሚያሰማ የድምፅ ማሳወቂያ እና የቀጥታ ሰዓት ቆጣሪ አለው።',
              },
              {
                icon: Palette,
                titleEn: 'Your Own Colors & Design',
                titleAm: 'የራስዎ ቀለምና ዲዛይን',
                descEn: 'Display your cafe logo, photography, welcoming note, and match your brand colors effortlessly.',
                descAm: 'የካፌዎን ሎጎ፣ ፎቶዎች እና የምርት መለያ ቀለማት በቀላሉ ማሳየት ይችላሉ።',
              },
              {
                icon: QrCode,
                titleEn: 'Table-Specific QR Codes',
                titleAm: 'ለእያንዳንዱ ጠረጴዛ የተዘጋጀ QR',
                descEn: 'Every table has its own unique, scannable QR token. The bartender always knows exactly where to deliver.',
                descAm: 'እያንዳንዱ ጠረጴዛ የራሱ መለያ ስላለው ባርቴንደሩ ትዕዛዙ የየትኛው ጠረጴዛ እንደሆነ ያውቃል።',
              },
              {
                icon: TrendingUp,
                titleEn: 'Update Prices Instantly',
                titleAm: 'ዋጋዎችን ወዲያውኑ ማስተካከል',
                descEn: 'No expensive menu reprints. Change drink prices or hide sold-out beans with one tap in your admin.',
                descAm: 'ያለ ምንም ወጪ በማንኛውም ሰዓት ዋጋዎችን መቀየር ወይም ያለቀውን እቃ ማጥፋት ይችላሉ።',
              },
              {
                icon: ShieldCheck,
                titleEn: 'Staff Accounts & Roles',
                titleAm: 'የሰራተኞች ሚና እና ቁጥጥር',
                descEn: 'Grant tailored access for cafe admins, supervisors, and baristas with clean role-based dashboards.',
                descAm: 'ለአስተዳዳሪው፣ ለባርቴንደሩ እና ለሰራተኞች የተመደበ የተለያየ የስራ ገጽ።',
              },
            ].map((feat, idx) => {
              const Icon = feat.icon;
              return (
                <div
                  key={idx}
                  style={{
                    backgroundColor: 'var(--color-foam)',
                    padding: 28,
                    borderRadius: 'var(--radius-card)',
                    border: '1.5px solid var(--color-line)',
                    transition: 'all var(--transition-fast)',
                  }}
                  className="card"
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      background: 'var(--color-cream)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--color-roast)',
                      marginBottom: 18,
                    }}
                  >
                    <Icon size={24} />
                  </div>
                  <h3 style={{ fontSize: 18, marginBottom: 8, fontFamily: 'var(--font-serif)' }}>
                    {isAmharic ? feat.titleAm : feat.titleEn}
                  </h3>
                  <p style={{ fontSize: 14, color: 'var(--color-muted)', lineHeight: 1.55 }}>
                    {isAmharic ? feat.descAm : feat.descEn}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── 6. INTERACTIVE DEMO ────────────────────────────────────────────── */}
      <section
        id="demo"
        style={{
          padding: '80px 20px',
          maxWidth: 1200,
          margin: '0 auto',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <Badge variant="caramel" size="sm" dot>
            {isAmharic ? 'የሙከራ ገጽ' : 'Try it Live'}
          </Badge>
          <h2
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 'clamp(28px, 4vw, 38px)',
              marginTop: 12,
              color: 'var(--color-espresso)',
            }}
          >
            {isAmharic ? 'የደንበኛውን ልምድ እራስዎ ይሞክሩ' : 'Experience the guest journey'}
          </h2>
          <p style={{ color: 'var(--color-muted)', fontSize: 16, marginTop: 8 }}>
            {isAmharic
              ? 'ቋንቋ በመቀያየር ወይም ትዕዛዝ በማከል የደንበኞችን ሜኑ እዚህ ይሞክሩ'
              : 'Tap tabs, switch languages, and add items to experience the real guest flow.'}
          </p>
        </div>

        {/* Interactive Phone Mockup Container */}
        <div
          style={{
            maxWidth: 390,
            margin: '0 auto',
            background: 'var(--color-espresso)',
            borderRadius: 42,
            padding: 12,
            boxShadow: 'var(--shadow-float)',
            border: '4px solid #3D2C20',
          }}
        >
          {/* Internal Screen */}
          <div
            style={{
              background: 'var(--color-cream)',
              borderRadius: 32,
              overflow: 'hidden',
              minHeight: 560,
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
            }}
          >
            {/* Cafe Header */}
            <div
              style={{
                background: 'linear-gradient(135deg, #6F4E37, #2B1D14)',
                padding: '20px 16px',
                color: '#FFF',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      background: 'var(--color-foam)',
                      color: 'var(--color-roast)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 20,
                    }}
                  >
                    ☕
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: 16, color: '#FFF' }}>Alem Specialty Coffee</h4>
                    <span style={{ fontSize: 11, color: 'var(--color-caramel)', fontWeight: 600 }}>
                      Table 7 · {demoLang === 'am' ? 'አማርኛ' : 'English'}
                    </span>
                  </div>
                </div>

                {/* Demo language toggle */}
                <div
                  style={{
                    display: 'flex',
                    background: 'rgba(255,255,255,0.18)',
                    borderRadius: 999,
                    padding: 2,
                  }}
                >
                  <button
                    onClick={() => setDemoLang('en')}
                    style={{
                      padding: '3px 8px',
                      borderRadius: 999,
                      background: demoLang === 'en' ? 'var(--color-caramel)' : 'transparent',
                      color: '#FFF',
                      fontSize: 10,
                      fontWeight: 700,
                    }}
                  >
                    EN
                  </button>
                  <button
                    onClick={() => setDemoLang('am')}
                    style={{
                      padding: '3px 8px',
                      borderRadius: 999,
                      background: demoLang === 'am' ? 'var(--color-caramel)' : 'transparent',
                      color: '#FFF',
                      fontSize: 10,
                      fontWeight: 700,
                    }}
                  >
                    አማ
                  </button>
                </div>
              </div>
            </div>

            {/* Category Filter Chips */}
            <div
              style={{
                display: 'flex',
                gap: 8,
                padding: '12px 16px',
                backgroundColor: 'var(--color-foam)',
                borderBottom: '1px solid var(--color-line)',
              }}
            >
              <button
                onClick={() => setDemoCategory('coffee')}
                style={{
                  padding: '6px 14px',
                  borderRadius: 999,
                  background: demoCategory === 'coffee' ? 'var(--color-roast)' : 'var(--color-cream)',
                  color: demoCategory === 'coffee' ? '#FFF' : 'var(--color-espresso)',
                  fontSize: 12,
                  fontWeight: 600,
                  border: '1px solid var(--color-line)',
                }}
              >
                ☕ {demoLang === 'am' ? 'ቡናና መጠጦች' : 'Specialty Coffee'}
              </button>
              <button
                onClick={() => setDemoCategory('pastry')}
                style={{
                  padding: '6px 14px',
                  borderRadius: 999,
                  background: demoCategory === 'pastry' ? 'var(--color-roast)' : 'var(--color-cream)',
                  color: demoCategory === 'pastry' ? '#FFF' : 'var(--color-espresso)',
                  fontSize: 12,
                  fontWeight: 600,
                  border: '1px solid var(--color-line)',
                }}
              >
                🥐 {demoLang === 'am' ? 'መክሰስ' : 'Pastries'}
              </button>
            </div>

            {/* Menu Items List */}
            <div style={{ padding: 14, flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {demoItems[demoCategory].map((item) => (
                <div
                  key={item.id}
                  style={{
                    backgroundColor: 'var(--color-foam)',
                    padding: 12,
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--color-line)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-espresso)' }}>
                      {demoLang === 'am' ? item.nameAm : item.nameEn}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 2 }}>
                      {demoLang === 'am' ? item.descAm : item.descEn}
                    </div>
                    <div style={{ color: 'var(--color-caramel)', fontWeight: 700, fontSize: 13, marginTop: 4 }}>
                      {item.price.toFixed(2)} ETB
                    </div>
                  </div>

                  <button
                    onClick={() => handleDemoAdd(item)}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: 'var(--color-roast)',
                      color: '#FFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 6px rgba(111,78,55,0.3)',
                    }}
                    title="Add to order"
                  >
                    <Plus size={18} />
                  </button>
                </div>
              ))}
            </div>

            {/* Floating Order Bar */}
            {demoCart.length > 0 && (
              <div
                className="anim-slide-up"
                style={{
                  padding: 12,
                  backgroundColor: 'var(--color-foam)',
                  borderTop: '1px solid var(--color-line)',
                }}
              >
                <div
                  style={{
                    background: 'var(--color-roast)',
                    color: '#FFF',
                    padding: '10px 16px',
                    borderRadius: 999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontWeight: 600,
                    fontSize: 13,
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  <span>
                    {demoCart.reduce((s, i) => s + i.qty, 0)} {demoLang === 'am' ? 'እቃዎች' : 'items'}
                  </span>
                  <span>{demoCartTotal.toFixed(2)} ETB</span>
                  <span style={{ fontSize: 11, color: 'var(--color-caramel)' }}>
                    {demoLang === 'am' ? 'ቀጥታ ይዘዙ →' : 'Send Order →'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ─── 7. FOR CAFE OWNERS: BENEFITS ─────────────────────────────────────── */}
      <section
        style={{
          padding: '80px 20px',
          backgroundColor: 'var(--color-espresso)',
          color: 'var(--color-cream)',
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 54,
            alignItems: 'center',
          }}
          className="hero-grid"
        >
          <div>
            <Badge variant="caramel" size="sm" dot>
              {isAmharic ? 'የካፌ ባለቤቶች ጥቅም' : 'Return on Investment'}
            </Badge>
            <h2
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 'clamp(28px, 4vw, 42px)',
                marginTop: 14,
                color: '#FFFDF9',
                lineHeight: 1.2,
              }}
            >
              {isAmharic ? 'ለካፌዎ የሚሰጠው እውነተኛ ጥቅም' : 'Why cafe owners switch to BunaQR'}
            </h2>
            <p style={{ color: 'var(--color-muted-light)', fontSize: 16, marginTop: 14, lineHeight: 1.6 }}>
              {isAmharic
                ? 'የሰራተኞችን ድካም በመቀነስ፣ ትዕዛዞች ሳይዘገዩና ሳይሳሳቱ በፍጥነት እንዲደርሱ ያደርጋል።'
                : 'Cut wait times, eliminate order confusion, and never print a paper menu again.'}
            </p>

            <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 20 }}>
              {[
                {
                  titleEn: 'Faster Service & Higher Table Turns',
                  titleAm: 'ፈጣን አገልግሎትና የጠረጴዛ ፈጣን መስተንግዶ',
                  descEn: 'Guests order the second they sit down. No waiting for a waiter to bring a menu.',
                  descAm: 'ደንበኛው እንደተቀመጠ ወዲያውኑ ያዛል። አስተናጋጅ መጠበቅ አይኖርበትም።',
                },
                {
                  titleEn: 'Zero Ordering Mistakes',
                  titleAm: 'የትዕዛዝ ስህተት አይኖርም',
                  descEn: 'Drink customizations and notes are directly sent to the barista queue without misunderstandings.',
                  descAm: 'ደንበኛው የፈለገው የተለየ ማስታወሻ በቀጥታ ለባሬስታው ስክሪን ይደርሳል።',
                },
                {
                  titleEn: 'No Reprinting Costs',
                  titleAm: 'ለህትመት የሚወጣውን ወጪ ያድናል',
                  descEn: 'Coffee bean prices shift often. Update prices digitally in real time with zero print fees.',
                  descAm: 'የቡና ወይም የምግብ ዋጋ ሲጨምር በሰከንዶች ውስጥ በስልክዎ ያስተካክላሉ።',
                },
                {
                  titleEn: 'Happier Customers & Baristas',
                  titleAm: 'ደስተኛ ደንበኞችና ባሬስታዎች',
                  descEn: 'Tourists easily read in English, locals in Amharic, and baristas stay focused on craft coffee.',
                  descAm: 'የውጭ ዜጎች በእንግሊዝኛ፣ የአገር ውስጥ ደንበኞች በአማርኛ ተደስተው ይጠቀማሉ።',
                },
              ].map((benefit, i) => (
                <div key={i} style={{ display: 'flex', gap: 14 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: 'var(--color-caramel)',
                      color: '#FFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: 2,
                    }}
                  >
                    <Check size={16} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: 16, color: '#FFF', fontWeight: 600 }}>
                      {isAmharic ? benefit.titleAm : benefit.titleEn}
                    </h4>
                    <p style={{ fontSize: 14, color: 'var(--color-muted-light)', marginTop: 4 }}>
                      {isAmharic ? benefit.descAm : benefit.descEn}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <CoffeeIllustration size={260} />
          </div>
        </div>
      </section>

      {/* ─── 8. PRICING TEASER ──────────────────────────────────────────────── */}
      <section
        id="pricing"
        style={{
          padding: '80px 20px',
          maxWidth: 1100,
          margin: '0 auto',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 54 }}>
          <Badge variant="caramel" size="sm" dot>
            {t(siteConfig.pricing.badge)}
          </Badge>
          <h2
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 'clamp(28px, 4vw, 38px)',
              marginTop: 12,
              color: 'var(--color-espresso)',
            }}
          >
            {t(siteConfig.pricing.title)}
          </h2>
          <p style={{ color: 'var(--color-muted)', fontSize: 16, marginTop: 8 }}>
            {t(siteConfig.pricing.teaserCard)}
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 28,
            alignItems: 'stretch',
          }}
        >
          {siteConfig.pricing.plans.map((plan) => (
            <div
              key={plan.id}
              className="card"
              style={{
                padding: 36,
                borderRadius: 'var(--radius-card)',
                backgroundColor: 'var(--color-foam)',
                border: plan.highlight ? '2px solid var(--color-roast)' : '1.5px solid var(--color-line)',
                boxShadow: plan.highlight ? 'var(--shadow-lg)' : 'var(--shadow)',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {plan.highlight && (
                <div
                  style={{
                    position: 'absolute',
                    top: -12,
                    right: 24,
                    background: 'var(--color-roast)',
                    color: '#FFF',
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '4px 12px',
                    borderRadius: 999,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  Most Popular
                </div>
              )}

              <h3 style={{ fontSize: 22, fontFamily: 'var(--font-serif)', color: 'var(--color-espresso)' }}>
                {t(plan.name)}
              </h3>
              <p style={{ fontSize: 14, color: 'var(--color-muted)', marginTop: 6, minHeight: 40 }}>
                {t(plan.description)}
              </p>

              <div style={{ margin: '24px 0 20px', display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span
                  style={{
                    fontSize: 38,
                    fontWeight: 800,
                    color: 'var(--color-espresso)',
                    fontFamily: 'var(--font-serif)',
                  }}
                >
                  {plan.price}
                </span>
                <span style={{ color: 'var(--color-muted)', fontSize: 14 }}>{t(plan.period)}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32, flex: 1 }}>
                {plan.features.map((feat, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
                    <CheckCircle2 size={17} color="var(--color-sage)" style={{ flexShrink: 0 }} />
                    <span>{t(feat)}</span>
                  </div>
                ))}
              </div>

              <a href={`tel:${siteConfig.contact.phone}`} style={{ display: 'block' }}>
                <Button fullWidth variant={plan.highlight ? 'primary' : 'secondary'} size="lg">
                  {isAmharic ? 'አሁን ያነጋግሩን' : 'Contact for setup'}
                </Button>
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* ─── 9. FAQ ACCORDION ──────────────────────────────────────────────── */}
      <section
        id="faq"
        style={{
          padding: '80px 20px',
          backgroundColor: 'var(--color-foam)',
          borderTop: '1px solid var(--color-line)',
        }}
      >
        <div style={{ maxWidth: 840, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <Badge variant="caramel" size="sm" dot>
              {isAmharic ? 'የሚጠየቁ ጥያቄዎች' : 'Common Inquiries'}
            </Badge>
            <h2
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 'clamp(28px, 4vw, 38px)',
                marginTop: 12,
                color: 'var(--color-espresso)',
              }}
            >
              {isAmharic ? 'ተደጋግመው የሚጠየቁ ጥያቄዎች' : 'Frequently asked questions'}
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {siteConfig.faq.map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  style={{
                    backgroundColor: 'var(--card-bg)',
                    borderRadius: 'var(--radius)',
                    border: '1.5px solid var(--color-line)',
                    overflow: 'hidden',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    style={{
                      width: '100%',
                      padding: '18px 20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      textAlign: 'left',
                      fontWeight: 600,
                      fontSize: 16,
                      color: 'var(--color-espresso)',
                      cursor: 'pointer',
                    }}
                  >
                    <span>{t(item.q)}</span>
                    <ChevronDown
                      size={18}
                      color="var(--color-roast)"
                      style={{
                        transform: isOpen ? 'rotate(180deg)' : 'none',
                        transition: 'transform var(--transition-fast)',
                        flexShrink: 0,
                        marginLeft: 12,
                      }}
                    />
                  </button>
                  {isOpen && (
                    <div
                      style={{
                        padding: '0 20px 20px',
                        fontSize: 14,
                        color: 'var(--color-muted)',
                        lineHeight: 1.65,
                      }}
                    >
                      {t(item.a)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── 10. FINAL CALL TO ACTION & FOOTER ──────────────────────────────── */}
      <section
        style={{
          padding: '80px 20px',
          textAlign: 'center',
          backgroundColor: 'var(--color-cream)',
          borderTop: '1px solid var(--color-line)',
        }}
      >
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <h2
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 'clamp(30px, 4.5vw, 44px)',
              color: 'var(--color-espresso)',
              marginBottom: 16,
            }}
          >
            {isAmharic ? 'የካፌዎን ሜኑ ዛሬውኑ ወደ ዘመናዊ ዲጂታል ይቀይሩ' : 'Ready to modernize your cafe?'}
          </h2>
          <p style={{ color: 'var(--color-muted)', fontSize: 17, marginBottom: 32, lineHeight: 1.6 }}>
            {isAmharic
              ? 'በቀጥታ ይደውሉልን ወይም በቴሌግራም ያነጋግሩን። በ24 ሰዓት ውስጥ የካፌዎን QR እናዘጋጅልዎታለን።'
              : 'Call or message us on Telegram. We will have your custom QR codes and menu running within 24 hours.'}
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
            <a href={`tel:${siteConfig.contact.phone}`}>
              <Button size="lg" variant="primary" icon={<Phone size={18} />}>
                {siteConfig.contact.phone}
              </Button>
            </a>
            <a href={siteConfig.contact.telegram} target="_blank" rel="noreferrer">
              <Button size="lg" variant="secondary" icon={<Send size={18} />}>
                Telegram: {siteConfig.contact.telegramHandle}
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          backgroundColor: 'var(--color-foam)',
          borderTop: '1px solid var(--color-line)',
          padding: '40px 20px',
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 20,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Logo size={28} />
            <span style={{ fontSize: 13, color: 'var(--color-muted)' }}>
              © {new Date().getFullYear()} BunaQR · Addis Ababa, Ethiopia
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 20, fontSize: 13 }}>
            <a href={`mailto:${siteConfig.contact.email}`} style={{ color: 'var(--color-muted)' }}>
              {siteConfig.contact.email}
            </a>
            <span style={{ color: 'var(--color-line)' }}>•</span>
            <Link href="/login" style={{ color: 'var(--color-roast)', fontWeight: 600 }}>
              {isAmharic ? 'የሰራተኛ መግቢያ' : 'Staff Login'}
            </Link>
          </div>
        </div>
      </footer>

      {/* Layout responsive styles */}
      <style jsx global>{`
        @media (max-width: 768px) {
          .hero-grid {
            grid-template-columns: 1fr !important;
            gap: 36px !important;
          }
        }
      `}</style>
    </div>
  );
}
