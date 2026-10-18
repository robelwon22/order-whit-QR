'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import { useStaff } from '../../../lib/useStaff';
import { useToast } from '../../../components/ui/Toast';
import { useI18n } from '../../../lib/i18n';
import { AppShell } from '../../../components/ui/AppShell';
import { Button } from '../../../components/ui/Button';
import * as alarm from '../../../lib/alarm';
import {
  Volume2,
  VolumeX,
  Play,
  Square,
  Upload,
  Trash2,
  Save,
  Check,
  AlertCircle,
  Music,
  Clock,
  Sparkles,
  Settings as SettingsIcon,
} from 'lucide-react';

export default function AdminSettingsPage() {
  const { staff, cafe, setCafe, loading: authLoading, logout } = useStaff([
    'cafe_admin',
    'super_admin',
  ]);
  const { showToast } = useToast();
  const { t, isAmharic } = useI18n();

  const [saving, setSaving] = useState(false);
  const [playingPreview, setPlayingPreview] = useState(null); // tone name or 'custom'

  // Settings State
  const alertConfig = cafe?.settings?.alert || {};
  const [selectedSound, setSelectedSound] = useState('Classic bell');
  const [customUrl, setCustomUrl] = useState(null);
  const [pauseSeconds, setPauseSeconds] = useState(1);
  const [alertVolume, setAlertVolume] = useState(1.0);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const fileInputRef = useRef(null);

  // Initialize from cafe settings
  useEffect(() => {
    if (cafe?.settings?.alert) {
      const a = cafe.settings.alert;
      if (a.sound) setSelectedSound(a.sound);
      if (a.customUrl) setCustomUrl(a.customUrl);
      if (a.pause !== undefined) setPauseSeconds(Number(a.pause));
      if (a.volume !== undefined) setAlertVolume(Number(a.volume));
    }
  }, [cafe?.settings?.alert]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      alarm.stopPreview();
    };
  }, []);

  const handlePreviewTone = async (name) => {
    if (playingPreview === name) {
      alarm.stopPreview();
      setPlayingPreview(null);
    } else {
      setPlayingPreview(name);
      await alarm.preview({ sound: name, volume: alertVolume });
      // Reset preview state after brief delay
      setTimeout(() => setPlayingPreview(null), 2500);
    }
  };

  const handlePreviewCustom = async () => {
    if (!customUrl) return;
    if (playingPreview === 'custom') {
      alarm.stopPreview();
      setPlayingPreview(null);
    } else {
      setPlayingPreview('custom');
      await alarm.preview({ customUrl, volume: alertVolume });
      setTimeout(() => setPlayingPreview(null), 3500);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !cafe?.id) return;

    setUploadError('');

    // Validate size (max 1 MB)
    if (file.size > 1024 * 1024) {
      setUploadError(isAmharic ? 'የድምፅ ፋይሉ ከ1 ሜጋባይት መብለጥ የለበትም።' : 'Audio file must be under 1 MB.');
      return;
    }

    // Validate type
    const validExtensions = ['mp3', 'wav', 'ogg'];
    const ext = file.name.split('.').pop().toLowerCase();
    if (!validExtensions.includes(ext)) {
      setUploadError(isAmharic ? 'እባክዎ MP3, WAV ወይም OGG ፋይል ይምረጡ።' : 'Please upload an MP3, WAV, or OGG file.');
      return;
    }

    setUploading(true);
    try {
      const filePath = `${cafe.id}/alert-${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from('cafe-assets')
        .upload(filePath, file, { cacheControl: '3600', upsert: true });

      if (uploadErr) throw uploadErr;

      const { data: publicData } = supabase.storage.from('cafe-assets').getPublicUrl(filePath);
      const url = publicData?.publicUrl;

      setCustomUrl(url);
      showToast(isAmharic ? 'የድምፅ ፋይል ተጭኗል' : 'Custom sound uploaded successfully', 'success');
    } catch (err) {
      console.error('Audio upload error:', err);
      setUploadError(err.message || 'Failed to upload audio file.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveCustom = () => {
    setCustomUrl(null);
    alarm.stopPreview();
    setPlayingPreview(null);
  };

  const handleSaveSettings = async () => {
    if (!cafe?.id) return;

    setSaving(true);
    try {
      const existingSettings = cafe.settings || {};
      const newAlertSettings = {
        ...existingSettings.alert,
        sound: selectedSound,
        customUrl: customUrl || null,
        pause: Number(pauseSeconds),
        volume: Number(alertVolume),
      };

      const updatedSettings = {
        ...existingSettings,
        alert: newAlertSettings,
      };

      const { error } = await supabase
        .from('cafes')
        .update({ settings: updatedSettings })
        .eq('id', cafe.id);

      if (error) throw error;

      if (setCafe) {
        setCafe({ ...cafe, settings: updatedSettings });
      }

      showToast(isAmharic ? 'ቅንብሮች ተቀምጠዋል' : 'Order alert sound settings saved successfully!', 'success');
    } catch (err) {
      console.error('Error saving alert settings:', err);
      showToast(err.message || 'Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell cafe={cafe} user={staff} onLogout={logout} title={isAmharic ? 'ቅንብሮች' : 'Settings'}>
      <div style={{ maxWidth: 840, margin: '0 auto', padding: '24px 16px' }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 28,
              color: 'var(--color-espresso)',
              marginBottom: 6,
            }}
          >
            {isAmharic ? 'የካፌ ቅንብሮች' : 'Cafe Settings'}
          </h1>
          <p style={{ color: 'var(--color-muted)', fontSize: 14 }}>
            {isAmharic
              ? 'የትዕዛዝ ማሳወቂያ ድምፆችን እና የባርቴንደር ስርዓት ቅንብሮችን ያስተካክሉ።'
              : 'Customize the bartender incoming order alarm sound, repetition interval, and volume.'}
          </p>
        </div>

        {/* ─── SECTION: ORDER ALERT SOUND ─────────────────────────────────── */}
        <div
          className="card"
          style={{
            backgroundColor: 'var(--color-foam)',
            border: '1px solid var(--color-line)',
            borderRadius: 'var(--radius-card)',
            padding: 28,
            boxShadow: 'var(--shadow-sm)',
            marginBottom: 24,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: 'rgba(111, 78, 55, 0.1)',
                color: 'var(--color-roast)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Volume2 size={24} />
            </div>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-espresso)' }}>
                {isAmharic ? 'የትዕዛዝ ማሳወቂያ ድምፅ' : 'Order Alert Sound'}
              </h2>
              <p style={{ fontSize: 13, color: 'var(--color-muted)' }}>
                {isAmharic
                  ? 'አዲስ ትዕዛዝ ሲመጣ ባርቴንደሩ እስኪቀበለው ድረስ ይህ ድምፅ ደጋግሞ ይሰማል።'
                  : 'Plays continuously on the bartender station until a new order is accepted.'}
              </p>
            </div>
          </div>

          {/* 1. Built-in Tones */}
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
              {isAmharic ? 'አብሮ የተሰራ ድምፅ ምረጥ' : 'Built-in Alert Tones'}
            </label>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: 12,
              }}
            >
              {alarm.TONE_NAMES.map((name) => {
                const isSelected = selectedSound === name && !customUrl;
                const isPlaying = playingPreview === name;

                return (
                  <div
                    key={name}
                    onClick={() => {
                      setSelectedSound(name);
                      if (customUrl) setCustomUrl(null);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      borderRadius: 'var(--radius)',
                      border: isSelected ? '2px solid var(--color-roast)' : '1px solid var(--color-line)',
                      backgroundColor: isSelected ? 'rgba(111, 78, 55, 0.06)' : 'transparent',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="radio"
                        name="alertTone"
                        checked={isSelected}
                        onChange={() => {
                          setSelectedSound(name);
                          if (customUrl) setCustomUrl(null);
                        }}
                        style={{ accentColor: 'var(--color-roast)' }}
                      />
                      <span style={{ fontSize: 14, fontWeight: isSelected ? 700 : 500, color: 'var(--color-espresso)' }}>
                        {name}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePreviewTone(name);
                      }}
                      style={{
                        background: isPlaying ? 'var(--color-roast)' : 'rgba(0,0,0,0.06)',
                        color: isPlaying ? '#FFF' : 'var(--color-espresso)',
                        border: 'none',
                        borderRadius: 6,
                        padding: '4px 8px',
                        fontSize: 12,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        fontWeight: 600,
                      }}
                    >
                      {isPlaying ? <Square size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
                      <span>{isPlaying ? 'Stop' : 'Play'}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Custom Sound Upload */}
          <div
            style={{
              padding: 16,
              borderRadius: 'var(--radius)',
              border: '1px dashed var(--color-line)',
              backgroundColor: 'rgba(0,0,0,0.02)',
              marginBottom: 24,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div>
                <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-espresso)' }}>
                  {isAmharic ? 'የራስዎን የድምፅ ፋይል ይጫኑ' : 'Custom Sound File (Optional)'}
                </h4>
                <p style={{ fontSize: 12, color: 'var(--color-muted)' }}>
                  {isAmharic ? 'MP3, WAV, ወይም OGG (ከ1 ሜጋባይት በታች)' : 'Upload MP3, WAV, or OGG up to 1 MB.'}
                </p>
              </div>

              {customUrl ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    type="button"
                    onClick={handlePreviewCustom}
                    style={{
                      background: playingPreview === 'custom' ? 'var(--color-roast)' : 'rgba(111,78,55,0.12)',
                      color: playingPreview === 'custom' ? '#FFF' : 'var(--color-roast)',
                      border: 'none',
                      borderRadius: 8,
                      padding: '6px 12px',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    {playingPreview === 'custom' ? <Square size={13} fill="currentColor" /> : <Play size={13} fill="currentColor" />}
                    <span>{playingPreview === 'custom' ? 'Stop' : 'Preview'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleRemoveCustom}
                    style={{
                      background: 'rgba(229, 62, 62, 0.1)',
                      color: '#E53E3E',
                      border: 'none',
                      borderRadius: 8,
                      padding: '6px 12px',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <Trash2 size={13} />
                    <span>{isAmharic ? 'አስወግድ' : 'Remove custom sound'}</span>
                  </button>
                </div>
              ) : (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/mp3,audio/wav,audio/ogg,audio/mpeg"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={uploading}
                    onClick={() => fileInputRef.current?.click()}
                    iconLeft={<Upload size={14} />}
                  >
                    {isAmharic ? 'ፋይል ጫን' : 'Upload Sound'}
                  </Button>
                </div>
              )}
            </div>

            {customUrl && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginTop: 10,
                  fontSize: 12,
                  color: 'var(--color-sage)',
                  fontWeight: 600,
                }}
              >
                <Check size={14} />
                <span>{isAmharic ? 'የራስ ድምፅ ነቅቷል (አብሮ ከተሰሩት ይልቅ ይህ ይሰማል)' : 'Custom sound is active (overrides built-in tone).'}</span>
              </div>
            )}

            {uploadError && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginTop: 10,
                  fontSize: 12,
                  color: '#E53E3E',
                  fontWeight: 600,
                }}
              >
                <AlertCircle size={14} />
                <span>{uploadError}</span>
              </div>
            )}
          </div>

          {/* 3. Pause Slider & Loudness */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: 24,
              paddingTop: 16,
              borderTop: '1px solid var(--color-line)',
            }}
          >
            {/* Pause between repetitions */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-espresso)' }}>
                  {isAmharic ? 'በድምፆች መካከል ያለው እረፍት' : 'Pause Between Repetitions'}
                </label>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-roast)' }}>
                  {pauseSeconds.toFixed(1)}s
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="5"
                step="0.5"
                value={pauseSeconds}
                onChange={(e) => setPauseSeconds(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--color-roast)' }}
              />
              <p style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 4 }}>
                {isAmharic
                  ? 'ድምፁ ደግሞ ከመጮሁ በፊት የሚቆየው የሰከንድ ብዛት (0 - 5 ሰከንድ)'
                  : 'Silence duration inside the loop before repeating (0 to 5 seconds).'}
              </p>
            </div>

            {/* Default Loudness level */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-espresso)' }}>
                  {isAmharic ? 'የድምፅ መጠን (Loudness)' : 'Base Loudness Level'}
                </label>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-roast)' }}>
                  {Math.round(alertVolume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.5"
                max="1.5"
                step="0.05"
                value={alertVolume}
                onChange={(e) => setAlertVolume(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--color-roast)' }}
              />
              <p style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 4 }}>
                {isAmharic
                  ? 'የድምፅ ጥራት ሳይዛባ እስከ 150% ድረስ ይጨምራል።'
                  : '50% to 150% with an audio compressor limiter to prevent distortion.'}
              </p>
            </div>
          </div>

          {/* Action button */}
          <div style={{ marginTop: 28, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="primary"
              size="md"
              loading={saving}
              onClick={handleSaveSettings}
              iconLeft={<Save size={16} />}
            >
              {isAmharic ? 'ቅንብሮችን መዝግብ' : 'Save Settings'}
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
