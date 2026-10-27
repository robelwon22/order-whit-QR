'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useStaff } from '../../../lib/useStaff';
import { useToast } from '../../../components/ui/Toast';
import { useI18n } from '../../../lib/i18n';
import { AppShell } from '../../../components/ui/AppShell';
import { Button, IconButton } from '../../../components/ui/Button';
import { CafeLogo } from '../../../components/ui/CafeLogo';
import { DESIGN_FEATURES, DEFAULT_THEME } from '../../../config/plans';
import {
  COLOR_PRESETS,
  isValidHex,
  normalizeHex,
  getContrastRatio,
  getDerivedTextColor,
  getDerivedButtonTextColor,
  getDerivedCardStyle,
  autoFixBrandColor,
  mergeCafeTheme,
  deriveDarkPalette,
  resizeImageIfNeeded,
} from '../../../lib/theme';
import {
  Upload,
  Trash2,
  AlertTriangle,
  Wand2,
  RotateCcw,
  Save,
  Eye,
  X,
  CheckCircle2,
  Sparkles,
  Smartphone,
  Palette,
  Search,
  Plus,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

export default function AdminDesignPage() {
  const { staff, cafe, cafes, setCafe, loading: authLoading, logout, error: authError } = useStaff([
    'cafe_admin',
    'super_admin',
  ]);
  const { showToast } = useToast();
  const { t, isAmharic, lang } = useI18n();

  // Active cafe for multi-cafe super-admins
  const activeCafe = cafe;

  // Real items & categories for live preview
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [loadingData, setLoadingData] = useState(false);

  // Design state
  const [initialBrandColor, setInitialBrandColor] = useState(DEFAULT_THEME.primary);
  const [initialBgColor, setInitialBgColor] = useState(DEFAULT_THEME.background);
  const [initialLogoUrl, setInitialLogoUrl] = useState(null);
  const [initialDarkLogoUrl, setInitialDarkLogoUrl] = useState(null);

  const [brandColor, setBrandColor] = useState(DEFAULT_THEME.primary);
  const [bgColor, setBgColor] = useState(DEFAULT_THEME.background);
  const [logoUrl, setLogoUrl] = useState(null);
  const [darkLogoUrl, setDarkLogoUrl] = useState(null);
  const [darkEnabled, setDarkEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState('auto');
  const [defaultMode, setDefaultMode] = useState('system');
  const [darkBackground, setDarkBackground] = useState('#1A120C');
  const [darkText, setDarkText] = useState('#F3EADF');
  const [darkPrimary, setDarkPrimary] = useState('#D9A066');
  const [darkButton, setDarkButton] = useState('#D9A066');
  const [previewMode, setPreviewMode] = useState('light');

  // Hex input strings for typing
  const [brandInput, setBrandInput] = useState(DEFAULT_THEME.primary);
  const [bgInput, setBgInput] = useState(DEFAULT_THEME.background);
  const [colorError, setColorError] = useState('');

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const darkLogoInputRef = useRef(null);

  // Tracking deleted files to remove on save
  const [oldLogosToDelete, setOldLogosToDelete] = useState([]);
  const [oldDarkLogosToDelete, setOldDarkLogosToDelete] = useState([]);

  // Saving state
  const [saving, setSaving] = useState(false);

  // Mobile preview modal
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);
  const [previewActiveTab, setPreviewActiveTab] = useState('all');

  // Load initial theme from activeCafe
  useEffect(() => {
    if (!activeCafe) return;

    const theme = mergeCafeTheme(activeCafe.theme || {});
    const darkPalette = theme.dark.mode === 'custom' ? theme.dark : deriveDarkPalette(theme);
    const bColor = theme.primary || theme.button || DEFAULT_THEME.primary;
    const bg = theme.background || DEFAULT_THEME.background;
    const logo = activeCafe.logo_url || null;

    setInitialBrandColor(bColor);
    setInitialBgColor(bg);
    setInitialLogoUrl(logo);
    setInitialDarkLogoUrl(theme.dark.logo_url || null);

    setBrandColor(bColor);
    setBgColor(bg);
    setLogoUrl(logo);
    setDarkLogoUrl(theme.dark.logo_url || null);
    setDarkEnabled(theme.dark.enabled);
    setDarkMode(theme.dark.mode);
    setDefaultMode(theme.default_mode);
    setDarkBackground(darkPalette.background);
    setDarkText(darkPalette.text);
    setDarkPrimary(darkPalette.primary);
    setDarkButton(darkPalette.button);
    setPreviewMode('light');

    setBrandInput(bColor);
    setBgInput(bg);
    setColorError('');
    setOldLogosToDelete([]);
    setOldDarkLogosToDelete([]);
  }, [activeCafe?.id, activeCafe?.updated_at]);

  // Load cafe categories & items for preview
  useEffect(() => {
    if (!activeCafe?.id) return;
    let isMounted = true;

    async function fetchMenu() {
      setLoadingData(true);
      try {
        const [catsRes, itemsRes] = await Promise.all([
          supabase
            .from('categories')
            .select('*')
            .eq('cafe_id', activeCafe.id)
            .eq('visible', true)
            .order('sort_order'),
          supabase
            .from('items')
            .select('*')
            .eq('cafe_id', activeCafe.id)
            .eq('available', true)
            .order('sort_order'),
        ]);

        if (isMounted) {
          setCategories(catsRes.data || []);
          setItems(itemsRes.data || []);
        }
      } catch (err) {
        console.error('Error loading preview menu:', err);
      } finally {
        if (isMounted) setLoadingData(false);
      }
    }

    fetchMenu();
    return () => {
      isMounted = false;
    };
  }, [activeCafe?.id]);

  // Derived readability tokens
  const derivedTextColor = useMemo(() => getDerivedTextColor(bgColor), [bgColor]);
  const derivedBtnTextColor = useMemo(() => getDerivedButtonTextColor(brandColor), [brandColor]);
  const cardStyle = useMemo(() => getDerivedCardStyle(bgColor), [bgColor]);
  const autoDarkPalette = useMemo(
    () => deriveDarkPalette({ primary: brandColor, button: brandColor, background: bgColor }),
    [brandColor, bgColor]
  );
  const effectiveDarkPalette = darkMode === 'custom'
    ? { ...autoDarkPalette, background: darkBackground, text: darkText, primary: darkPrimary, button: darkButton }
    : autoDarkPalette;

  // Contrast ratios
  const textBgContrast = useMemo(() => getContrastRatio(derivedTextColor, bgColor), [derivedTextColor, bgColor]);
  const brandBgContrast = useMemo(() => getContrastRatio(brandColor, bgColor), [brandColor, bgColor]);
  const btnContrast = useMemo(() => getContrastRatio(derivedBtnTextColor, brandColor), [derivedBtnTextColor, brandColor]);

  // The critical contrast between brand color and background
  const darkButtonText = getDerivedButtonTextColor(effectiveDarkPalette.button);
  const darkButtonContrast = getContrastRatio(darkButtonText, effectiveDarkPalette.button);
  const darkButtonVisibility = getContrastRatio(effectiveDarkPalette.button, effectiveDarkPalette.background);
  const lightButtonVisibility = getContrastRatio(brandColor, bgColor);
  const lowestContrast = Math.min(brandBgContrast, textBgContrast, darkButtonContrast, darkButtonVisibility, lightButtonVisibility);
  const showContrastWarning = lowestContrast < 4.5;
  const isSaveBlocked = lightButtonVisibility < 3 || darkButtonVisibility < 3;

  // Dirty state tracking
  const isDirty = useMemo(() => {
    const brandChanged = normalizeHex(brandColor) !== normalizeHex(initialBrandColor);
    const bgChanged = normalizeHex(bgColor) !== normalizeHex(initialBgColor);
    const logoChanged = logoUrl !== initialLogoUrl;
    const darkLogoChanged = darkLogoUrl !== initialDarkLogoUrl;
    const darkSettingsChanged = darkEnabled !== (activeCafe?.theme?.dark?.enabled !== false)
      || darkMode !== (activeCafe?.theme?.dark?.mode === 'custom' ? 'custom' : 'auto')
      || defaultMode !== (activeCafe?.theme?.default_mode || 'system')
      || (darkMode === 'custom' && (
        darkBackground !== activeCafe?.theme?.dark?.background
        || darkText !== activeCafe?.theme?.dark?.text
        || darkPrimary !== activeCafe?.theme?.dark?.primary
        || darkButton !== activeCafe?.theme?.dark?.button
      ));
    return brandChanged || bgChanged || logoChanged || darkLogoChanged || darkSettingsChanged;
  }, [brandColor, bgColor, logoUrl, darkLogoUrl, darkEnabled, darkMode, defaultMode, darkBackground, darkText, darkPrimary, darkButton, initialBrandColor, initialBgColor, initialLogoUrl, initialDarkLogoUrl, activeCafe]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Color input change handlers
  const handleBrandColorChange = (hex) => {
    setBrandColor(hex);
    setBrandInput(hex);
    setColorError('');
  };

  const handleBrandTextChange = (e) => {
    const val = e.target.value.trim();
    setBrandInput(val);
    if (isValidHex(val)) {
      setBrandColor(normalizeHex(val));
      setColorError('');
    } else {
      setColorError(t('errors.invalid_color') || 'Enter a valid color like #6F4E37.');
    }
  };

  const handleBgColorChange = (hex) => {
    setBgColor(hex);
    setBgInput(hex);
    setColorError('');
  };

  const handleBgTextChange = (e) => {
    const val = e.target.value.trim();
    setBgInput(val);
    if (isValidHex(val)) {
      setBgColor(normalizeHex(val));
      setColorError('');
    } else {
      setColorError(t('errors.invalid_color') || 'Enter a valid color like #6F4E37.');
    }
  };

  // Preset palette click
  const handleApplyPreset = (preset) => {
    setBrandColor(preset.brand);
    setBrandInput(preset.brand);
    setBgColor(preset.background);
    setBgInput(preset.background);
    setColorError('');
  };

  // Auto-fix contrast
  const handleAutoFix = () => {
    const fixedBrand = autoFixBrandColor(brandColor, bgColor);
    setBrandColor(fixedBrand);
    setBrandInput(fixedBrand);
    setColorError('');
    showToast(t('admin.design.auto_fix_done') || 'Brand color adjusted for readability.', 'success');
  };

  // Reset to default
  const handleResetToDefault = () => {
    setBrandColor(DEFAULT_THEME.primary);
    setBrandInput(DEFAULT_THEME.primary);
    setBgColor(DEFAULT_THEME.background);
    setBgInput(DEFAULT_THEME.background);
    setColorError('');
  };

  // Extract storage path from a publicUrl
  const getStoragePathFromUrl = (url) => {
    if (!url) return null;
    try {
      const match = url.match(/\/cafe-assets\/(.+)$/);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  };

  // File upload processing
  const handleFileSelect = async (file) => {
    if (!file) return;

    // 1. Validation: file type
    const acceptedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
    const ext = file.name.split('.').pop()?.toLowerCase();
    const validExts = ['png', 'jpg', 'jpeg', 'webp', 'svg'];

    if (!acceptedTypes.includes(file.type) && !validExts.includes(ext)) {
      showToast(
        t('errors.file_type_not_supported') || 'That file type is not supported. Use PNG, JPG, WEBP or SVG.',
        'error'
      );
      return;
    }

    // 2. Validation: size limit 2 MB
    if (file.size > 2 * 1024 * 1024) {
      showToast(
        t('errors.image_too_large') || 'That image is too large. Please use one under 2 MB.',
        'error'
      );
      return;
    }

    // 3. Process & upload
    try {
      setUploading(true);
      setUploadProgress(15);

      // Resize raster image in browser to max 600px wide; sanitize SVG
      const processedFile = await resizeImageIfNeeded(file, 600);
      setUploadProgress(40);

      // Determine upload destination: <cafe_id>/logo-<timestamp>.<ext>
      const cleanExt = ext === 'jpeg' ? 'jpg' : ext;
      const filePath = `${activeCafe.id}/logo-${Date.now()}.${cleanExt}`;

      setUploadProgress(65);
      const { error: uploadError } = await supabase.storage
        .from('cafe-assets')
        .upload(filePath, processedFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        if (!navigator.onLine) {
          throw new Error(t('errors.network_error') || 'No connection. Please check your internet and try again.');
        }
        throw uploadError;
      }

      setUploadProgress(90);
      const { data: publicData } = supabase.storage.from('cafe-assets').getPublicUrl(filePath);

      // Keep track of old logo to delete from storage on save
      if (logoUrl) {
        const oldPath = getStoragePathFromUrl(logoUrl);
        if (oldPath) {
          setOldLogosToDelete((prev) => [...prev, oldPath]);
        }
      }

      setLogoUrl(publicData.publicUrl);
      setUploadProgress(100);
      showToast(isAmharic ? 'ሎጎ በተሳካ ሁኔታ ተጭኗል' : 'Logo uploaded successfully.', 'success');
    } catch (err) {
      console.error('Logo upload error:', err);
      const msg = !navigator.onLine
        ? t('errors.network_error') || 'No connection. Please check your internet and try again.'
        : err.message || 'Failed to upload logo';
      showToast(msg, 'error');
    } finally {
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 400);
    }
  };

  // Remove logo
  const handleRemoveLogo = () => {
    if (!logoUrl) return;
    const oldPath = getStoragePathFromUrl(logoUrl);
    if (oldPath) {
      setOldLogosToDelete((prev) => [...prev, oldPath]);
    }
    setLogoUrl(null);
  };

  // Save changes
  const handleSave = async () => {
    if (!isDirty || isSaveBlocked || saving || !activeCafe?.id) return;

    setSaving(true);
    try {
      if (!navigator.onLine) {
        throw new Error(t('errors.network_error') || 'No connection. Please check your internet and try again.');
      }

      // Merge choices into existing cafes.theme without losing other keys
      const currentTheme = activeCafe.theme || {};
      const updatedTheme = {
        ...currentTheme,
        primary: brandColor,
        background: bgColor,
        text: derivedTextColor,
        button: brandColor,
      };

      // 1. Update cafe row in database
      const { data: updatedCafe, error: updateError } = await supabase
        .from('cafes')
        .update({
          logo_url: logoUrl,
          theme: updatedTheme,
        })
        .eq('id', activeCafe.id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      // 2. Clean up old removed/replaced files from storage to save space
      if (oldLogosToDelete.length > 0) {
        try {
          await supabase.storage.from('cafe-assets').remove(oldLogosToDelete);
          setOldLogosToDelete([]);
        } catch (cleanupErr) {
          console.warn('Old logo cleanup non-critical error:', cleanupErr);
        }
      }

      // 3. Update local state
      setInitialBrandColor(brandColor);
      setInitialBgColor(bgColor);
      setInitialLogoUrl(logoUrl);
      if (setCafe && updatedCafe) {
        setCafe(updatedCafe);
      }

      showToast(t('admin.design.saved_success') || 'Your menu design is updated.', 'success');
    } catch (err) {
      console.error('Error saving design:', err);
      const msg = !navigator.onLine
        ? t('errors.network_error') || 'No connection. Please check your internet and try again.'
        : err.message || 'Failed to update design';
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Render auth loading skeleton
  if (authLoading) {
    return (
      <AppShell cafe={cafe} user={staff} title={t('admin.design.title') || 'Design'}>
        <div style={{ maxWidth: 1040, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ height: 48, background: 'var(--color-line)', borderRadius: 12, opacity: 0.4 }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
            <div style={{ height: 320, background: 'var(--color-foam)', borderRadius: 16, border: '1px solid var(--color-line)' }} />
            <div style={{ height: 500, background: 'var(--color-foam)', borderRadius: 16, border: '1px solid var(--color-line)' }} />
          </div>
        </div>
      </AppShell>
    );
  }

  // Security: Bartender restriction or not staff
  if (authError || !staff || (staff.role !== 'cafe_admin' && staff.role !== 'super_admin')) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--bg)',
          padding: 24,
        }}
      >
        <div
          className="card"
          style={{
            maxWidth: 440,
            width: '100%',
            textAlign: 'center',
            padding: 36,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              backgroundColor: 'var(--color-terracotta-light)',
              color: 'var(--color-terracotta)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ShieldAlert size={28} />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-espresso)' }}>
            {t('errors.no_access') || 'No access'}
          </h2>
          <p style={{ fontSize: 14, color: 'var(--color-muted)' }}>
            {t('auth.no_staff_record') || 'You do not have permission to access cafe design.'}
          </p>
          <Button variant="secondary" onClick={() => (window.location.href = '/admin')}>
            {t('common.back') || 'Back'}
          </Button>
        </div>
      </div>
    );
  }

  // Package / Subscription rule: check if cafe is active
  if (!activeCafe?.active) {
    return (
      <AppShell cafe={cafe} cafes={cafes} onSelectCafe={setCafe} user={staff} onLogout={logout}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            textAlign: 'center',
            padding: 24,
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: 480,
              padding: 40,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 16,
            }}
          >
            <AlertTriangle size={48} color="var(--color-amber)" />
            <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-espresso)' }}>
              {t('errors.cafe_inactive') || 'This cafe is currently unavailable.'}
            </h2>
            <p style={{ fontSize: 14, color: 'var(--color-muted)', lineHeight: 1.5 }}>
              {isAmharic
                ? 'የካፌው አገልግሎት ለአፍታ ተቋርጧል። እባክዎ አስተዳዳሪን ወይም ድጋፍ ሰጪን ያነጋግሩ።'
                : 'This cafe account is suspended or expired. Please contact support or reactivate your subscription in Super Admin.'}
            </p>
          </div>
        </div>
      </AppShell>
    );
  }

  // Sample items if the cafe menu has no items yet
  const sampleItems = [
    {
      id: 'sample-1',
      name: { en: 'Signature Cappuccino', am: 'ካፑቺኖ' },
      description: { en: 'Double shot espresso with silky micro-foam', am: 'በጥራት የተዘጋጀ ወተትና እውነተኛ ቡና' },
      price: '180.00',
    },
    {
      id: 'sample-2',
      name: { en: 'Artisan Croissant', am: 'ክሮሳን' },
      description: { en: 'Flaky French butter pastry freshly baked', am: 'ትኩስ በቅቤ የተጋገረ ክሮሳን' },
      price: '160.00',
    },
    {
      id: 'sample-3',
      name: { en: 'Iced Caramel Latte', am: 'ቀዝቃዛ ካራሜል ላቴ' },
      description: { en: 'Chilled espresso with house caramel & oat milk', am: 'ከካራሜልና ከወተት ጋር የተቀላቀለ ቀዝቃዛ ቡና' },
      price: '220.00',
    },
  ];

  const previewItemsList = items.length > 0 ? items.slice(0, 5) : sampleItems;

  const previewCategoriesList =
    categories.length > 0
      ? [{ id: 'all', name: { en: 'All', am: 'ሁሉም' } }, ...categories]
      : [
          { id: 'all', name: { en: 'All', am: 'ሁሉም' } },
          { id: 'coffee', name: { en: 'Coffee', am: 'ቡና' } },
          { id: 'pastries', name: { en: 'Pastries', am: 'ዳቦዎች' } },
          { id: 'iced', name: { en: 'Cold Drinks', am: 'ቀዝቃዛ' } },
        ];

  // Live Preview Component (Rendered on desktop side & mobile modal)
  const renderLivePreviewContent = () => {
    const previewColors = previewMode === 'dark' ? effectiveDarkPalette : null;
    const bgColor = previewColors?.background || bgColor;
    const brandColor = previewColors?.primary || brandColor;
    const derivedTextColor = previewColors?.text || derivedTextColor;
    const derivedBtnTextColor = getDerivedButtonTextColor(previewColors?.button || brandColor);
    const cardStyle = previewColors
      ? { cardBg: previewColors.surface || '#251A12', cardBorder: previewColors.border || '#3A2B20', mutedText: previewColors.muted || '#B7A593' }
      : getDerivedCardStyle(bgColor);
    const previewLogoUrl = previewMode === 'dark' ? (darkLogoUrl || logoUrl) : logoUrl;
    return (
    <div
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: bgColor,
        color: derivedTextColor,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflowY: 'auto',
        fontFamily: 'var(--font-sans)',
        boxSizing: 'border-box',
      }}
    >
      {/* Phone status bar simulation */}
      <div
        style={{
          padding: '8px 18px 4px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 11,
          fontWeight: 600,
          opacity: 0.65,
          color: derivedTextColor,
        }}
      >
        <span>9:41</span>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span>5G</span>
          <span>100%</span>
        </div>
      </div>

      {/* Hero Cover Header */}
      <div
        style={{
          height: 120,
          background: activeCafe.cover_url
            ? `linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.6)), url(${activeCafe.cover_url}) center/cover`
            : `linear-gradient(135deg, ${brandColor} 0%, rgba(0,0,0,0.65) 100%)`,
          position: 'relative',
          padding: '12px 14px',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'flex-end',
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            padding: '3px 8px',
            borderRadius: 999,
            backgroundColor: 'rgba(0,0,0,0.4)',
            color: '#FFF',
          }}
        >
          {lang === 'am' ? 'አማ' : 'EN'}
        </span>
      </div>

      {/* Cafe Info Header Box */}
      <div style={{ padding: '0 14px', marginTop: -32, position: 'relative', zIndex: 5 }}>
        <div
          style={{
            backgroundColor: cardStyle.cardBg,
            border: `1px solid ${cardStyle.cardBorder}`,
            borderRadius: 14,
            padding: '14px 12px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <CafeLogo
              logoUrl={previewLogoUrl}
              name={activeCafe.name}
              brandColor={brandColor}
              size={52}
              radius={12}
              border={`1.5px solid ${cardStyle.cardBorder}`}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 17,
                  fontWeight: 700,
                  color: brandColor,
                  lineHeight: 1.2,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {activeCafe.name}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: cardStyle.mutedText,
                  marginTop: 2,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {isAmharic ? 'ልዩ የቡናና የምግብ መስተንግዶ' : 'Specialty coffee & artisan pastries'}
              </div>
            </div>
          </div>

          {/* Table badge pill */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              marginTop: 10,
              padding: '3px 10px',
              borderRadius: 999,
              backgroundColor: brandColor + '18',
              color: brandColor,
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            <span>🪑</span>
            <span>{isAmharic ? 'ጠረጴዛ 01' : 'Table 01'}</span>
          </div>
        </div>
      </div>

      {/* Category Pills Strip */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          padding: '14px 14px 8px',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {previewCategoriesList.map((cat) => {
          const isActive = previewActiveTab === cat.id;
          const catLabel =
            typeof cat.name === 'object' ? cat.name[lang] || cat.name.en || 'Category' : cat.name;
          return (
            <button
              key={cat.id}
              onClick={() => setPreviewActiveTab(cat.id)}
              style={{
                padding: '6px 14px',
                borderRadius: 999,
                fontSize: 12,
                fontWeight: isActive ? 700 : 500,
                backgroundColor: isActive ? brandColor : cardStyle.cardBg,
                color: isActive ? derivedBtnTextColor : derivedTextColor,
                border: `1px solid ${isActive ? brandColor : cardStyle.cardBorder}`,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              {catLabel}
            </button>
          );
        })}
      </div>

      {/* Menu Item Cards */}
      <div style={{ padding: '4px 14px 70px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {previewItemsList.map((item) => {
          const itemName =
            typeof item.name === 'object' ? item.name[lang] || item.name.en || 'Item' : item.name;
          const itemDesc =
            typeof item.description === 'object'
              ? item.description[lang] || item.description.en || ''
              : item.description || '';

          return (
            <div
              key={item.id}
              style={{
                backgroundColor: cardStyle.cardBg,
                border: `1px solid ${cardStyle.cardBorder}`,
                borderRadius: 12,
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              {item.image_url ? (
                <img
                  src={item.image_url}
                  alt={itemName}
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 10,
                    objectFit: 'cover',
                    flexShrink: 0,
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 10,
                    backgroundColor: bgColor,
                    border: `1px solid ${cardStyle.cardBorder}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 22,
                    flexShrink: 0,
                  }}
                >
                  ☕
                </div>
              )}

              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: brandColor,
                    marginBottom: 2,
                    lineHeight: 1.25,
                  }}
                >
                  {itemName}
                </div>
                {itemDesc && (
                  <div
                    style={{
                      fontSize: 11,
                      color: cardStyle.mutedText,
                      lineHeight: 1.3,
                      marginBottom: 4,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {itemDesc}
                  </div>
                )}
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: brandColor,
                    fontFamily: 'var(--font-serif)',
                  }}
                >
                  {Number(item.price).toFixed(2)} {activeCafe.currency || 'ETB'}
                </div>
              </div>

              {/* Add Button */}
              <button
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  backgroundColor: brandColor,
                  color: derivedBtnTextColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 'none',
                  cursor: 'pointer',
                  flexShrink: 0,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                }}
                title="Add to order"
              >
                <Plus size={16} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Floating Bottom Cart Bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 12,
          left: 14,
          right: 14,
          backgroundColor: brandColor,
          color: derivedBtnTextColor,
          borderRadius: 999,
          padding: '10px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 8px 20px rgba(0,0,0,0.22)',
          fontSize: 13,
          fontWeight: 700,
        }}
      >
        <span>{isAmharic ? 'ትዕዛዝዎ (1 እቃ)' : 'View Order (1 item)'}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>180.00 {activeCafe.currency || 'ETB'}</span>
          <ArrowRight size={15} />
        </div>
      </div>
    </div>
  );
};

  return (
    <AppShell
      cafe={activeCafe}
      cafes={cafes}
      onSelectCafe={setCafe}
      user={staff}
      onLogout={logout}
      title={t('admin.design.title') || 'Design'}
    >
      <div style={{ maxWidth: 1140, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Header Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <div>
            <h1
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 26,
                fontWeight: 700,
                color: 'var(--color-espresso)',
                marginBottom: 4,
              }}
            >
              {t('admin.design.title') || 'Menu Design & Branding'}
            </h1>
            <p style={{ fontSize: 14, color: 'var(--color-muted)' }}>
              {t('admin.design.subtitle') || 'Customize your customer menu with your cafe logo and brand colors.'}
            </p>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Mobile Preview Trigger Button */}
            <div className="visible-mobile-flex">
              <Button
                variant="secondary"
                size="md"
                onClick={() => setMobilePreviewOpen(true)}
                icon={<Smartphone size={16} />}
              >
                {t('admin.design.preview_btn') || 'Preview'}
              </Button>
            </div>

            <Button
              variant="ghost"
              size="md"
              onClick={handleResetToDefault}
              disabled={saving}
              icon={<RotateCcw size={15} />}
            >
              {t('admin.design.reset_default') || 'Reset to default'}
            </Button>

            <Button
              variant="primary"
              size="md"
              onClick={handleSave}
              loading={saving}
              disabled={!isDirty || isSaveBlocked || saving}
              icon={<Save size={16} />}
            >
              {t('admin.design.save_changes') || 'Save changes'}
            </Button>
          </div>
        </div>

        {/* 2-Column Responsive Layout: Left Controls, Right Preview */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) 390px',
            gap: 28,
            alignItems: 'start',
          }}
          className="design-grid"
        >
          {/* ─── LEFT: CUSTOMIZATION CONTROLS ───────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* 1. CAFE LOGO CARD */}
            {DESIGN_FEATURES.logo && (
              <div className="card" style={{ padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-espresso)' }}>
                    {t('admin.design.logo_card_title') || 'Cafe Logo'}
                  </h2>
                </div>
                <p style={{ fontSize: 13, color: 'var(--color-muted)', marginBottom: 20 }}>
                  {t('admin.design.logo_card_subtitle') ||
                    'Upload your logo. Accepted formats: PNG, JPG, WEBP, or SVG up to 2 MB.'}
                </p>

                {/* Logo Display & Actions */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 20,
                    flexWrap: 'wrap',
                    marginBottom: 20,
                  }}
                >
                  <CafeLogo
                    logoUrl={logoUrl}
                    name={activeCafe.name}
                    brandColor={brandColor}
                    size={80}
                    radius={16}
                    border="2px solid var(--color-line)"
                  />

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileSelect(file);
                          e.target.value = '';
                        }}
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={uploading}
                        onClick={() => fileInputRef.current?.click()}
                        icon={<Upload size={14} />}
                      >
                        {logoUrl
                          ? t('admin.design.replace_logo') || 'Replace logo'
                          : t('admin.design.upload_logo') || 'Upload logo'}
                      </Button>

                      {logoUrl && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={uploading}
                          onClick={handleRemoveLogo}
                          icon={<Trash2 size={14} color="var(--color-terracotta)" />}
                          style={{ color: 'var(--color-terracotta)' }}
                        >
                          {t('admin.design.remove_logo') || 'Remove logo'}
                        </Button>
                      )}
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>
                      {logoUrl
                        ? isAmharic
                          ? 'የተመረጠውን ሎጎ ማስወገድ ወይም መተካት ይችላሉ'
                          : 'Custom logo active on your menu & QR cards'
                        : isAmharic
                        ? 'ምንም ሎጎ ካልተጫነ የካፌው የመጀመሪያ ፊደል በክብ ይታያል'
                        : 'Default neat letter circle is displayed when no logo exists'}
                    </span>
                  </div>
                </div>

                {/* Drag & Drop Dropzone */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleFileSelect(file);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: `2px dashed ${dragOver ? 'var(--color-roast)' : 'var(--color-line)'}`,
                    borderRadius: 14,
                    padding: '24px 16px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    backgroundColor: dragOver ? 'var(--color-foam)' : 'rgba(0,0,0,0.01)',
                    transition: 'all 0.18s ease',
                  }}
                >
                  <Upload
                    size={24}
                    style={{
                      margin: '0 auto 8px',
                      color: dragOver ? 'var(--color-roast)' : 'var(--color-muted)',
                    }}
                  />
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-espresso)' }}>
                    {t('admin.design.drag_drop_hint') || 'Drag & drop your logo here, or click to browse'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 4 }}>
                    PNG, JPG, WEBP, SVG • Max 2 MB (Auto-resized to 600px)
                  </div>
                </div>

                {/* Upload Progress Bar */}
                {uploading && (
                  <div style={{ marginTop: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                      <span>{t('admin.design.uploading') || 'Uploading...'}</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div
                      style={{
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: 'var(--color-line)',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${uploadProgress}%`,
                          backgroundColor: 'var(--color-roast)',
                          transition: 'width 0.2s ease',
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 2. BRAND & BACKGROUND COLORS CARD */}
            {DESIGN_FEATURES.brandColor && (
              <div className="card" style={{ padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-espresso)' }}>
                    {t('admin.design.colors_card_title') || 'Brand Colors'}
                  </h2>
                </div>
                <p style={{ fontSize: 13, color: 'var(--color-muted)', marginBottom: 20 }}>
                  {t('admin.design.colors_card_subtitle') ||
                    'Choose your brand and page background colors. Text, buttons, and borders adapt automatically for readability.'}
                </p>

                {/* Brand Color & Page Background Color Inputs */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                    gap: 20,
                    marginBottom: 24,
                  }}
                >
                  {/* Brand Color Input */}
                  <div
                    style={{
                      border: '1px solid var(--color-line)',
                      borderRadius: 14,
                      padding: 16,
                      backgroundColor: 'var(--color-foam)',
                    }}
                  >
                    <label
                      htmlFor="brand-color-picker"
                      style={{
                        display: 'block',
                        fontSize: 14,
                        fontWeight: 700,
                        color: 'var(--color-espresso)',
                        marginBottom: 4,
                      }}
                    >
                      {t('admin.design.brand_color') || 'Brand color'}
                    </label>
                    <p style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 12 }}>
                      {t('admin.design.brand_color_desc') ||
                        'Used for headings, prices, buttons, and active category chip'}
                    </p>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <input
                        id="brand-color-picker"
                        type="color"
                        value={isValidHex(brandColor) ? brandColor : DEFAULT_THEME.primary}
                        onChange={(e) => handleBrandColorChange(e.target.value)}
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 10,
                          border: '2px solid var(--color-line)',
                          cursor: 'pointer',
                          padding: 2,
                          backgroundColor: 'transparent',
                        }}
                      />
                      <input
                        type="text"
                        value={brandInput}
                        onChange={handleBrandTextChange}
                        placeholder="#6F4E37"
                        maxLength={7}
                        aria-label="Brand color hex"
                        style={{
                          flex: 1,
                          minHeight: 44,
                          borderRadius: 10,
                          border: '1.5px solid var(--color-line)',
                          padding: '8px 12px',
                          fontSize: 14,
                          fontWeight: 600,
                          fontFamily: 'monospace',
                          backgroundColor: '#FFF',
                          outline: 'none',
                        }}
                      />
                    </div>
                  </div>

                  {/* Background Color Input */}
                  <div
                    style={{
                      border: '1px solid var(--color-line)',
                      borderRadius: 14,
                      padding: 16,
                      backgroundColor: 'var(--color-foam)',
                    }}
                  >
                    <label
                      htmlFor="bg-color-picker"
                      style={{
                        display: 'block',
                        fontSize: 14,
                        fontWeight: 700,
                        color: 'var(--color-espresso)',
                        marginBottom: 4,
                      }}
                    >
                      {t('admin.design.bg_color') || 'Page background color'}
                    </label>
                    <p style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 12 }}>
                      {t('admin.design.bg_color_desc') || 'Used for customer menu background'}
                    </p>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <input
                        id="bg-color-picker"
                        type="color"
                        value={isValidHex(bgColor) ? bgColor : DEFAULT_THEME.background}
                        onChange={(e) => handleBgColorChange(e.target.value)}
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 10,
                          border: '2px solid var(--color-line)',
                          cursor: 'pointer',
                          padding: 2,
                          backgroundColor: 'transparent',
                        }}
                      />
                      <input
                        type="text"
                        value={bgInput}
                        onChange={handleBgTextChange}
                        placeholder="#FFFFFF"
                        maxLength={7}
                        aria-label="Background color hex"
                        style={{
                          flex: 1,
                          minHeight: 44,
                          borderRadius: 10,
                          border: '1.5px solid var(--color-line)',
                          padding: '8px 12px',
                          fontSize: 14,
                          fontWeight: 600,
                          fontFamily: 'monospace',
                          backgroundColor: '#FFF',
                          outline: 'none',
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Friendly Hex Error if any */}
                {colorError && (
                  <div
                    style={{
                      marginBottom: 16,
                      padding: '10px 14px',
                      borderRadius: 10,
                      backgroundColor: 'var(--color-terracotta-light)',
                      color: 'var(--color-terracotta)',
                      fontSize: 13,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <AlertTriangle size={16} />
                    <span>{colorError}</span>
                  </div>
                )}

                {/* 3. READY-MADE PRESET SWATCHES */}
                <div style={{ marginBottom: 24 }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 13,
                      fontWeight: 700,
                      color: 'var(--color-espresso)',
                      marginBottom: 10,
                    }}
                  >
                    {t('admin.design.ready_made_title') || 'Ready-made palettes'}
                  </label>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(135px, 1fr))',
                      gap: 10,
                    }}
                  >
                    {COLOR_PRESETS.map((preset) => {
                      const isSelected =
                        normalizeHex(brandColor) === normalizeHex(preset.brand) &&
                        normalizeHex(bgColor) === normalizeHex(preset.background);

                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => handleApplyPreset(preset)}
                          style={{
                            padding: '10px 12px',
                            borderRadius: 10,
                            border: `1.5px solid ${isSelected ? 'var(--color-roast)' : 'var(--color-line)'}`,
                            backgroundColor: isSelected ? 'var(--color-foam)' : '#FFF',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 8,
                            textAlign: 'left',
                            transition: 'all 0.15s ease',
                            boxShadow: isSelected ? 'var(--shadow-sm)' : 'none',
                          }}
                        >
                          <div style={{ display: 'flex', height: 22, borderRadius: 6, overflow: 'hidden' }}>
                            <div style={{ flex: 1, backgroundColor: preset.brand }} />
                            <div
                              style={{
                                flex: 1,
                                backgroundColor: preset.background,
                                border: '1px solid rgba(0,0,0,0.06)',
                              }}
                            />
                          </div>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: isSelected ? 700 : 600,
                              color: isSelected ? 'var(--color-roast)' : 'var(--color-espresso)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {isAmharic ? preset.nameAm : preset.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 4. CONTRAST WARNING & AUTO-FIX BANNER */}
                {showContrastWarning && (
                  <div
                    style={{
                      padding: '14px 16px',
                      borderRadius: 12,
                      backgroundColor: isSaveBlocked ? 'var(--color-terracotta-light)' : 'var(--color-amber-light)',
                      border: `1px solid ${isSaveBlocked ? 'var(--color-terracotta)' : 'var(--color-amber)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 12,
                      marginBottom: 16,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <AlertTriangle
                        size={20}
                        color={isSaveBlocked ? 'var(--color-terracotta)' : 'var(--color-amber)'}
                      />
                      <div>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: isSaveBlocked ? 'var(--color-terracotta)' : '#92400E',
                          }}
                        >
                          {isSaveBlocked
                            ? t('admin.design.contrast_blocked') ||
                              'Contrast is too low (below 3.0). Please adjust colors or use Auto-fix before saving.'
                            : t('admin.design.contrast_warning') || 'These colors may be hard to read.'}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: isSaveBlocked ? 'var(--color-terracotta)' : '#B45309',
                            marginTop: 2,
                          }}
                        >
                          Contrast ratio: {lowestContrast.toFixed(2)}:1 (Minimum recommended is 4.5:1)
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleAutoFix}
                      icon={<Wand2 size={14} />}
                      style={{
                        backgroundColor: '#FFF',
                        borderColor: isSaveBlocked ? 'var(--color-terracotta)' : 'var(--color-amber)',
                      }}
                    >
                      {t('admin.design.auto_fix') || 'Auto-fix'}
                    </Button>
                  </div>
                )}

                {/* Derived Colors Summary info bar */}
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: 10,
                    backgroundColor: 'rgba(0,0,0,0.02)',
                    border: '1px solid var(--color-line)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 10,
                    fontSize: 12,
                  }}
                >
                  <span style={{ color: 'var(--color-muted)' }}>
                    {isAmharic ? 'በራስ-ሰር የሚሰሉ ቀለሞች፡' : 'Automatically derived tokens:'}
                  </span>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span
                        style={{
                          width: 14,
                          height: 14,
                          borderRadius: '50%',
                          backgroundColor: derivedTextColor,
                          border: '1px solid #CCC',
                        }}
                      />
                      <span>Text: {derivedTextColor}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span
                        style={{
                          width: 14,
                          height: 14,
                          borderRadius: '50%',
                          backgroundColor: derivedBtnTextColor,
                          border: '1px solid #CCC',
                        }}
                      />
                      <span>Button text: {derivedBtnTextColor}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ─── RIGHT: DESKTOP LIVE PHONE PREVIEW ─────────────────────────── */}
          <div
            className="hidden-mobile"
            style={{
              position: 'sticky',
              top: 88,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 10,
                alignSelf: 'flex-start',
              }}
            >
              <Smartphone size={16} color="var(--color-muted)" />
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-espresso)' }}>
                {t('admin.design.live_preview') || 'Live Customer Preview'}
              </span>
            </div>

            {/* Realistic Phone Frame Container */}
            <div
              style={{
                width: 375,
                height: 680,
                borderRadius: 40,
                border: '10px solid #2B1D14',
                boxShadow: '0 20px 48px rgba(43, 29, 20, 0.18)',
                overflow: 'hidden',
                position: 'relative',
                backgroundColor: bgColor,
              }}
            >
              {/* Phone Speaker Notch */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 110,
                  height: 18,
                  backgroundColor: '#2B1D14',
                  borderBottomLeftRadius: 12,
                  borderBottomRightRadius: 12,
                  zIndex: 50,
                }}
              />

              {renderLivePreviewContent()}
            </div>
          </div>
        </div>
      </div>

      {/* ─── MOBILE FULL SCREEN PREVIEW MODAL ─────────────────────────────── */}
      {mobilePreviewOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(0,0,0,0.85)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 12,
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 420,
              height: '92vh',
              borderRadius: 24,
              overflow: 'hidden',
              backgroundColor: bgColor,
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            }}
          >
            {/* Top Close Bar */}
            <div
              style={{
                padding: '10px 14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: 'rgba(0,0,0,0.06)',
                borderBottom: '1px solid rgba(0,0,0,0.08)',
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 700, color: derivedTextColor }}>
                {t('admin.design.live_preview') || 'Live Preview'}
              </span>
              <IconButton
                icon={<X size={18} />}
                onClick={() => setMobilePreviewOpen(false)}
                title={t('admin.design.close_preview') || 'Close'}
                size={36}
              />
            </div>

            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
              {renderLivePreviewContent()}
            </div>
          </div>
        </div>
      )}

      {/* Responsive styles */}
      <style jsx>{`
        @media (max-width: 900px) {
          .design-grid {
            grid-template-columns: 1fr !important;
          }
          .visible-mobile-flex {
            display: flex !important;
          }
        }
        @media (min-width: 901px) {
          .visible-mobile-flex {
            display: none !important;
          }
        }
      `}</style>
    </AppShell>
  );
}
