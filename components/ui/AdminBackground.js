'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useI18n } from '../../lib/i18n';
import { Button } from './Button';
import { ImagePlus, Trash2 } from 'lucide-react';

const CATEGORIES = ['bakery', 'catering', 'juice_bar', 'fast_food', 'dessert', 'bar', 'custom'];
const CATEGORY_SETS = {
  bakery: 'bakery',
  catering: 'catering',
  juice_bar: 'juice',
  fast_food: 'fastfood',
  dessert: 'dessert',
  bar: 'bar',
};
const DEFAULT_SETTINGS = {
  business_type: 'coffee_house',
  business_category: 'bakery',
  business_what: '',
  bg: { mode: 'auto', own_photos: [], intensity: 'soft' },
};
const LOCAL_MOTION_KEY = 'admin-background-motion';
const fieldInputStyle = {
  width: '100%',
  minHeight: 42,
  padding: '8px 10px',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--card-bg)',
  color: 'var(--text)',
};

function normalizeSettings(settings = {}) {
  const bg = settings.bg || {};
  return {
    ...DEFAULT_SETTINGS,
    ...settings,
    bg: {
      ...DEFAULT_SETTINGS.bg,
      ...bg,
      own_photos: Array.isArray(bg.own_photos) ? bg.own_photos.filter((photo) => typeof photo === 'string') : [],
    },
  };
}

function sourceSet(settings) {
  if (settings.business_type === 'restaurant') return 'food';
  if (settings.business_type === 'other') return CATEGORY_SETS[settings.business_category] || null;
  return 'coffee';
}

function getPhotoPath(url, cafeId) {
  try {
    const parsed = new URL(url);
    const marker = '/storage/v1/object/public/cafe-assets/';
    const index = parsed.pathname.indexOf(marker);
    if (index < 0) return null;
    const path = decodeURIComponent(parsed.pathname.slice(index + marker.length));
    return path.startsWith(`${cafeId}/bg/`) ? path : null;
  } catch {
    return null;
  }
}

async function prepareWebp(file) {
  const bitmap = await createImageBitmap(file);
  let width = Math.min(bitmap.width, 1000);
  let height = Math.round(bitmap.height * width / bitmap.width);
  const canvas = document.createElement('canvas');
  let blob;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Image processing is not available in this browser.');
    context.drawImage(bitmap, 0, 0, width, height);
    blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', Math.max(0.45, 0.76 - attempt * 0.05)));
    if (!blob) throw new Error('Could not convert this image to WebP.');
    if (blob.size < 300 * 1024) break;
    width = Math.max(320, Math.round(width * 0.85));
    height = Math.round(bitmap.height * width / bitmap.width);
  }
  bitmap.close();
  if (!blob || blob.size >= 300 * 1024) throw new Error('This image could not be reduced below 300 KB.');
  return blob;
}

function uploadWithProgress(file, cafeId, accessToken, onProgress) {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('POST', `/api/admin/background-photos?cafeId=${encodeURIComponent(cafeId)}`);
    request.setRequestHeader('Authorization', `Bearer ${accessToken}`);
    request.setRequestHeader('Content-Type', 'image/webp');
    request.setRequestHeader('x-upload-id', crypto.randomUUID());
    request.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) onProgress(Math.round(event.loaded / event.total * 100));
    });
    request.addEventListener('load', () => {
      if (request.status >= 200 && request.status < 300) {
        try {
          resolve(JSON.parse(request.responseText).publicUrl);
        } catch {
          reject(new Error('The upload service returned an invalid response.'));
        }
      } else {
        let message = `Photo upload failed (${request.status}).`;
        try {
          message = JSON.parse(request.responseText).message || message;
        } catch {}
        reject(new Error(message));
      }
    });
    request.addEventListener('error', () => reject(new Error('Photo upload failed. Check your connection and try again.')));
    request.send(file);
  });
}

function Field({ label, children }) {
  return (
    <label
      className="admin-bg-field"
      style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0, color: 'var(--text)', fontSize: 13, fontWeight: 700 }}
    >
      <span>{label}</span>
      {children}
    </label>
  );
}

export function BusinessTypeFields({ value = {}, onChange, t }) {
  const settings = normalizeSettings(value);
  const update = (changes) => onChange({ ...settings, ...changes });
  return (
    <div className="admin-bg-fields" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12, margin: '12px 0' }}>
      <Field label={t('admin.businessBackground.businessType')}>
        <select style={fieldInputStyle} value={settings.business_type} onChange={(event) => update({ business_type: event.target.value })}>
          {['coffee_house', 'restaurant', 'other'].map((type) => (
            <option key={type} value={type}>{t(`admin.businessBackground.types.${type}`)}</option>
          ))}
        </select>
      </Field>
      {settings.business_type === 'other' && (
        <>
          <Field label={t('admin.businessBackground.category')}>
            <select style={fieldInputStyle} value={settings.business_category} onChange={(event) => update({ business_category: event.target.value })}>
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>{t(`admin.businessBackground.categories.${category}`)}</option>
              ))}
            </select>
          </Field>
          {settings.business_category === 'custom' && (
            <Field label={t('admin.businessBackground.whatSell')}>
              <input
                style={fieldInputStyle}
                value={settings.business_what}
                onChange={(event) => update({ business_what: event.target.value })}
                maxLength={120}
                placeholder={t('admin.businessBackground.customPlaceholder')}
              />
            </Field>
          )}
        </>
      )}
    </div>
  );
}

function BackgroundWall({ cafe, settings, compact = false, motion = 'on' }) {
  const [menuPhotos, setMenuPhotos] = useState([]);
  const [stockPhotos, setStockPhotos] = useState([]);
  const [failedPhotos, setFailedPhotos] = useState({});
  const [isMobile, setIsMobile] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const normalized = useMemo(() => normalizeSettings(settings || cafe?.settings), [settings, cafe?.settings]);
  const stockSet = normalized.bg.mode === 'auto' ? sourceSet(normalized) : null;

  useEffect(() => {
    if (!cafe?.id) {
      setMenuPhotos([]);
      return undefined;
    }
    let cancelled = false;
    supabase.from('items').select('image_url').eq('cafe_id', cafe.id).not('image_url', 'is', null)
      .then(({ data, error }) => {
        if (error) throw error;
        if (!cancelled) setMenuPhotos((data || []).map((item) => item.image_url).filter(Boolean));
      })
      .catch((error) => {
        console.error('Could not load menu photos for the admin background:', error);
        if (!cancelled) setMenuPhotos([]);
      });
    return () => { cancelled = true; };
  }, [cafe?.id]);

  useEffect(() => {
    if (!stockSet) {
      setStockPhotos([]);
      return undefined;
    }
    let cancelled = false;
    setStockPhotos([]);
    fetch(`/bg/${stockSet}/manifest.json`)
      .then((response) => {
        if (!response.ok) throw new Error(`Could not load the ${stockSet} image manifest.`);
        return response.json();
      })
      .then((manifest) => {
        const images = Array.isArray(manifest) ? manifest : manifest.images;
        if (!Array.isArray(images)) throw new Error(`The ${stockSet} image manifest is invalid.`);
        if (!cancelled) {
          setStockPhotos(images.map((image) => typeof image === 'string' ? `/bg/${stockSet}/${image}` : image.src)
            .filter((image) => typeof image === 'string' && image.length > 0));
        }
      })
      .catch((error) => {
        console.error('Could not load admin background stock photos:', error);
        if (!cancelled) setStockPhotos([]);
      });
    return () => { cancelled = true; };
  }, [stockSet]);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 600px)');
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const updateVisibility = () => setPageVisible(!document.hidden);
    updateVisibility();
    document.addEventListener('visibilitychange', updateVisibility);
    return () => document.removeEventListener('visibilitychange', updateVisibility);
  }, []);

  const ownPhotos = normalized.bg.own_photos.filter((photo) => getPhotoPath(photo, cafe?.id));
  const chosenPhotos = useMemo(() => {
    if (normalized.bg.mode === 'off' || motion === 'off') return [];
    if (normalized.bg.mode === 'own') return ownPhotos.length ? ownPhotos : menuPhotos;
    if (normalized.bg.mode === 'menu') return menuPhotos;
    if (normalized.business_type === 'other' && normalized.business_category === 'custom') {
      return ownPhotos.length ? ownPhotos : menuPhotos;
    }
    return ownPhotos.length
      ? ownPhotos
      : stockPhotos.length ? stockPhotos : menuPhotos;
  }, [menuPhotos, motion, normalized, ownPhotos, stockPhotos]);

  const photos = useMemo(() => {
    let valid = chosenPhotos.filter((photo) => !failedPhotos[photo]);
    if (!valid.length && normalized.bg.mode === 'auto' && !(normalized.business_type === 'other' && normalized.business_category === 'custom')) {
      valid = menuPhotos.filter((photo) => !failedPhotos[photo]);
    }
    if (!valid.length) return [];
    const count = isMobile ? 10 : 20;
    const expanded = [...valid];
    let seed = valid.join('').split('').reduce((total, character) => (total * 31 + character.charCodeAt(0)) >>> 0, 17);
    while (expanded.length < Math.min(8, count)) {
      const shuffled = [...valid];
      for (let index = shuffled.length - 1; index > 0; index -= 1) {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        const swapIndex = seed % (index + 1);
        [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
      }
      expanded.push(...shuffled);
    }
    return expanded.slice(0, count);
  }, [chosenPhotos, failedPhotos, isMobile, menuPhotos, normalized]);

  const columns = useMemo(() => {
    const columnCount = isMobile ? 2 : 4;
    const perColumn = 5;
    return Array.from({ length: columnCount }, (_, column) =>
      Array.from({ length: perColumn }, (_, index) => photos[(column * perColumn + index) % Math.max(1, photos.length)])
        .filter(Boolean));
  }, [isMobile, photos]);
  const animate = motion === 'on';
  const fallback = photos.length === 0;

  return (
    <div className={`admin-bg-wall${compact ? ' is-compact' : ''}${fallback ? ' is-fallback' : ''}${normalized.bg.intensity === 'normal' ? ' is-normal' : ''}${animate ? ' is-animated' : ''}${!pageVisible ? ' is-hidden' : ''}`}>
      {photos.length > 0 && (
        <>
          <div className="admin-bg-strips admin-bg-strip-top" aria-hidden="true">
            <div className="admin-bg-strip-track">
              {[...photos.slice(0, 8), ...photos.slice(0, 8)].map((photo, index) => (
                <img key={`top-${index}`} src={photo} alt="" loading="lazy" onError={() => setFailedPhotos((current) => ({ ...current, [photo]: true }))} />
              ))}
            </div>
          </div>
          <div className="admin-bg-vertical" aria-hidden="true">
            {columns.map((column, columnIndex) => (
              <div className={`admin-bg-column admin-bg-column-${columnIndex % 2}`} key={columnIndex}>
                <div className="admin-bg-column-track">
                  {[...column, ...column].map((photo, index) => (
                    <img key={`${columnIndex}-${index}`} src={photo} alt="" loading="lazy" onError={() => setFailedPhotos((current) => ({ ...current, [photo]: true }))} />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="admin-bg-strips admin-bg-strip-bottom" aria-hidden="true">
            <div className="admin-bg-strip-track">
              {[...photos.slice(4, 12), ...photos.slice(4, 12)].map((photo, index) => (
                <img key={`bottom-${index}`} src={photo} alt="" loading="lazy" onError={() => setFailedPhotos((current) => ({ ...current, [photo]: true }))} />
              ))}
            </div>
          </div>
        </>
      )}
      <div className="admin-bg-overlay" aria-hidden="true" />
      {!compact && (
        <span className="admin-bg-logo-pattern" aria-hidden="true">
          {cafe?.logo_url ? <img src={cafe.logo_url} alt="" /> : <span>{cafe?.name?.slice(0, 1) || '✦'}</span>}
        </span>
      )}
      <style jsx global>{`
        .admin-bg-wall { position: fixed; inset: 0; z-index: 0; overflow: hidden; pointer-events: none; background: var(--bg); isolation: isolate; }
        .admin-bg-wall.is-compact { position: relative; width: 100%; height: 280px; min-height: 220px; border-radius: 16px; border: 1px solid var(--border); }
        .admin-bg-wall.is-normal { --admin-bg-opacity: .62; }
        .admin-bg-wall { --admin-bg-opacity: .72; }
        .admin-bg-vertical { position: absolute; inset: -18% -5%; display: flex; justify-content: space-evenly; gap: 2.5vw; transform: rotate(-6deg) scale(1.08); filter: blur(1px); }
        .admin-bg-column { flex: 1 1 0; max-width: 24vw; overflow: hidden; }
        .admin-bg-column-track { display: flex; flex-direction: column; gap: 18px; will-change: transform; }
        .admin-bg-column img { display: block; width: 100%; height: clamp(120px, 19vh, 230px); object-fit: cover; border-radius: 20px; box-shadow: 0 10px 28px rgba(36, 24, 16, .16); }
        .admin-bg-strips { position: absolute; z-index: 1; left: -2%; width: 104%; overflow: hidden; transform: rotate(-2deg); filter: blur(.8px); }
        .admin-bg-strip-top { top: 4%; }
        .admin-bg-strip-bottom { bottom: 4%; transform: rotate(2deg); }
        .admin-bg-strip-track { display: flex; width: max-content; gap: 14px; }
        .admin-bg-strip-track img { width: clamp(90px, 10vw, 160px); height: 62px; object-fit: cover; border-radius: 15px; box-shadow: 0 6px 18px rgba(36, 24, 16, .14); }
        .admin-bg-overlay { position: absolute; inset: 0; z-index: 2; background: var(--bg); opacity: var(--admin-bg-opacity, .91); }
        .admin-bg-logo-pattern { position: absolute; z-index: 1; inset: 0; display: grid; place-items: center; opacity: .045; font-family: var(--font-serif); font-size: min(55vw, 640px); color: var(--text); }
        .admin-bg-logo-pattern img { width: min(45vw, 500px); max-height: 55vh; object-fit: contain; }
        .admin-bg-wall.is-compact .admin-bg-vertical { inset: -20% -10%; gap: 12px; }
        .admin-bg-wall.is-compact .admin-bg-column { max-width: none; }
        .admin-bg-wall.is-compact .admin-bg-column img { height: 145px; border-radius: 14px; }
        .admin-bg-wall.is-compact .admin-bg-strip-track img { height: 40px; }
        .admin-bg-wall.is-compact .admin-bg-overlay { opacity: .38; }
        .admin-bg-wall.is-animated .admin-bg-column-0 .admin-bg-column-track { animation: admin-bg-up 72s linear infinite; }
        .admin-bg-wall.is-animated .admin-bg-column-1 .admin-bg-column-track { animation: admin-bg-down 82s linear infinite; }
        .admin-bg-wall.is-animated .admin-bg-strip-top .admin-bg-strip-track { animation: admin-bg-left 84s linear infinite; }
        .admin-bg-wall.is-animated .admin-bg-strip-bottom .admin-bg-strip-track { animation: admin-bg-right 78s linear infinite; }
        .admin-bg-wall.is-hidden .admin-bg-column-track, .admin-bg-wall.is-hidden .admin-bg-strip-track { animation-play-state: paused !important; }
        .admin-bg-wall.is-fallback .admin-bg-overlay { opacity: 1; background: radial-gradient(ellipse at 18% 12%, rgba(201,138,75,.12), transparent 42%), linear-gradient(135deg, var(--bg), color-mix(in srgb, var(--bg), var(--color-caramel) 8%)); }
        @keyframes admin-bg-up { to { transform: translateY(-50%); } }
        @keyframes admin-bg-down { from { transform: translateY(-50%); } to { transform: translateY(0); } }
        @keyframes admin-bg-left { to { transform: translateX(-50%); } }
        @keyframes admin-bg-right { from { transform: translateX(-50%); } to { transform: translateX(0); } }
        @media (max-width: 600px) {
          .admin-bg-column { max-width: 48vw; }
          .admin-bg-vertical { gap: 10px; inset: -10% -10%; }
          .admin-bg-column img { height: 150px; border-radius: 15px; }
          .admin-bg-strip-track { gap: 8px; }
          .admin-bg-strip-track img { width: 92px; height: 44px; border-radius: 12px; }
          .admin-bg-strip-top { top: 8%; }
          .admin-bg-strip-bottom { bottom: 8%; }
        }
        @media (prefers-reduced-motion: reduce) {
          .admin-bg-wall .admin-bg-column-track, .admin-bg-wall .admin-bg-strip-track { animation: none !important; }
        }
      `}</style>
    </div>
  );
}

export function AdminBackground({ cafe, user, settings: settingsProp, editor = false, onChange, onSave, saving = false, compact = false }) {
  const { t } = useI18n();
  const [motion, setMotion] = useState('on');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');
  const [savingMotion, setSavingMotion] = useState(false);
  const settings = normalizeSettings(settingsProp || cafe?.settings);

  useEffect(() => {
    const stored = window.localStorage.getItem(LOCAL_MOTION_KEY);
    if (stored === 'on' || stored === 'reduced' || stored === 'off') setMotion(stored);
  }, []);

  const change = (next) => onChange?.(normalizeSettings(next));
  const updateBg = (bgChanges) => change({ ...settings, bg: { ...settings.bg, ...bgChanges } });
  const setLocalMotion = (value) => {
    window.localStorage.setItem(LOCAL_MOTION_KEY, value);
    setMotion(value);
  };

  const uploadPhoto = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setUploadError(t('admin.businessBackground.imageOnly'));
      return;
    }
    if (!cafe?.id || !['cafe_admin', 'super_admin'].includes(user?.role)) {
      setUploadError(t('admin.businessBackground.uploadUnavailable'));
      return;
    }
    if (settings.bg.own_photos.length >= 12) {
      setUploadError(t('admin.businessBackground.photoLimit'));
      return;
    }
    setUploadError('');
    setUploading(true);
    setUploadProgress(0);
    try {
      const processed = await prepareWebp(file);
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session?.access_token) throw new Error(t('admin.businessBackground.sessionExpired'));
      const publicUrl = await uploadWithProgress(processed, cafe.id, session.access_token, setUploadProgress);
      if (!publicUrl) throw new Error('The upload service did not return a photo URL.');
      updateBg({ own_photos: [...settings.bg.own_photos, publicUrl] });
    } catch (error) {
      console.error('Background photo upload failed:', error);
      setUploadError(error.message || t('admin.businessBackground.uploadFailed'));
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const removePhoto = async (url) => {
    setUploadError('');
    const path = getPhotoPath(url, cafe?.id);
    if (!path) {
      setUploadError(t('admin.businessBackground.invalidPhotoPath'));
      return;
    }
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session?.access_token) throw new Error(t('admin.businessBackground.sessionExpired'));
      const response = await fetch(`/api/admin/background-photos?cafeId=${encodeURIComponent(cafe.id)}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ path }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || t('admin.businessBackground.uploadFailed'));
    } catch (error) {
      console.error('Could not delete background photo:', error);
      setUploadError(error.message || t('admin.businessBackground.uploadFailed'));
      return;
    }
    updateBg({ own_photos: settings.bg.own_photos.filter((photo) => photo !== url) });
  };

  const changeMotion = async (value) => {
    setLocalMotion(value);
    setSavingMotion(true);
    try {
      window.localStorage.setItem(LOCAL_MOTION_KEY, value);
    } finally {
      setSavingMotion(false);
    }
  };

  const renderedMotion = motion === 'off' || motion === 'reduced' ? 'reduced' : 'on';
  const normalizedMotion = motion === 'off' ? 'off' : renderedMotion;

  return (
    <>
      {!editor && <BackgroundWall cafe={cafe} settings={settings} compact={compact} motion={renderedMotion} />}
      {editor && (
        <section className="admin-bg-editor" aria-label={t('admin.businessBackground.section')}>
          <div className="admin-bg-editor-grid">
            <div className="admin-bg-editor-controls">
              <h2>{t('admin.businessBackground.section')}</h2>
              <BusinessTypeFields value={settings} onChange={change} t={t} />
              <div className="admin-bg-fields">
                <Field label={t('admin.businessBackground.mode')}>
                  <select value={settings.bg.mode} onChange={(event) => updateBg({ mode: event.target.value })}>
                    {['auto', 'own', 'menu', 'off'].map((mode) => (
                      <option key={mode} value={mode}>{t(`admin.businessBackground.modes.${mode}`)}</option>
                    ))}
                  </select>
                </Field>
                <Field label={t('admin.businessBackground.intensity')}>
                  <select value={settings.bg.intensity} onChange={(event) => updateBg({ intensity: event.target.value })}>
                    {['soft', 'normal'].map((intensity) => (
                      <option key={intensity} value={intensity}>{t(`admin.businessBackground.intensities.${intensity}`)}</option>
                    ))}
                  </select>
                </Field>
                <Field label={t('admin.businessBackground.motion')}>
                  <select value={motion} onChange={(event) => changeMotion(event.target.value)} disabled={savingMotion}>
                    {['on', 'reduced', 'off'].map((value) => (
                      <option key={value} value={value}>{t(`admin.businessBackground.motionOptions.${value}`)}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="admin-bg-own-photos">
                <div>
                  <strong>{t('admin.businessBackground.ownPhotos')}</strong>
                  <small>{t('admin.businessBackground.photoGuidance', { count: settings.bg.own_photos.length })}</small>
                </div>
                <label className="admin-bg-upload">
                  <ImagePlus size={17} />
                  {uploading ? t('admin.businessBackground.uploading', { progress: uploadProgress }) : t('admin.businessBackground.upload')}
                  <input type="file" accept="image/*" disabled={uploading || settings.bg.own_photos.length >= 12} onChange={uploadPhoto} />
                </label>
                {uploading && <progress max="100" value={uploadProgress || undefined} aria-label={t('admin.businessBackground.uploadProgress')} />}
                {uploadError && <p className="admin-bg-error" role="alert">{uploadError}</p>}
                <div className="admin-bg-photo-list">
                  {settings.bg.own_photos.map((url) => (
                    <div key={url}>
                      <img src={url} alt={t('admin.businessBackground.ownPhotoAlt')} />
                      <button type="button" aria-label={t('admin.businessBackground.deletePhoto')} onClick={() => removePhoto(url)}><Trash2 size={15} /></button>
                    </div>
                  ))}
                </div>
              </div>
              <Button variant="primary" loading={saving} onClick={onSave}>{t('common.save')}</Button>
            </div>
            <div className="admin-bg-editor-preview">
              <h3>{t('admin.businessBackground.preview')}</h3>
              <BackgroundWall cafe={cafe} settings={settings} compact motion={normalizedMotion} />
            </div>
          </div>
          <style jsx global>{`
            .admin-bg-editor { position: relative; z-index: 1; background: var(--card-bg); color: var(--text); border: 1px solid var(--border); border-radius: var(--radius-card); padding: 22px; box-shadow: var(--shadow-sm); }
            .admin-bg-editor-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(260px, .85fr); gap: 22px; align-items: start; }
            .admin-bg-editor h2 { font-size: 20px; margin-bottom: 16px; }
            .admin-bg-editor-preview h3 { position: relative; z-index: 3; font-size: 16px; margin-bottom: 10px; }
            .admin-bg-fields { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 12px; margin: 12px 0; }
            .admin-bg-field { display: flex; flex-direction: column; gap: 6px; color: var(--text); font-size: 13px; font-weight: 700; }
            .admin-bg-field select, .admin-bg-field input { width: 100%; min-height: 42px; padding: 8px 10px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--card-bg); color: var(--text); }
            .admin-bg-own-photos { margin: 14px 0; display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
            .admin-bg-own-photos > div:first-child { flex: 1 1 100%; display: flex; flex-direction: column; gap: 3px; }
            .admin-bg-own-photos small { font-size: 12px; color: var(--text-muted); }
            .admin-bg-upload { display: inline-flex; align-items: center; justify-content: center; gap: 7px; min-height: 42px; padding: 8px 13px; border-radius: var(--radius-sm); background: var(--primary-light); color: var(--text); cursor: pointer; font-weight: 700; font-size: 13px; }
            .admin-bg-upload input { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); }
            .admin-bg-own-photos progress { width: 100%; height: 8px; accent-color: var(--primary); }
            .admin-bg-photo-list { display: flex; flex-wrap: wrap; gap: 8px; }
            .admin-bg-photo-list > div { position: relative; }
            .admin-bg-photo-list img { width: 64px; height: 64px; object-fit: cover; border-radius: 10px; }
            .admin-bg-photo-list button { position: absolute; top: 2px; right: 2px; display: grid; place-items: center; width: 26px; height: 26px; border: 0; border-radius: 50%; background: rgba(20, 14, 10, .8); color: white; cursor: pointer; }
            .admin-bg-error { flex-basis: 100%; color: var(--danger); font-size: 13px; }
            @media (max-width: 740px) { .admin-bg-editor-grid { grid-template-columns: 1fr; } }
          `}</style>
        </section>
      )}
    </>
  );
}

export { DEFAULT_SETTINGS as DEFAULT_BUSINESS_BACKGROUND };
