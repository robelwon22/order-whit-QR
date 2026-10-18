// lib/alarm.js
// Dedicated continuous order alarm engine using Web Audio API AudioBufferSourceNode with loop = true.

export const TONE_NAMES = [
  'Classic bell',
  'Loud buzzer',
  'Chime',
  'Kitchen ding',
  'Siren',
  'Soft pulse',
];

let ctx = null;
let currentSource = null;
let currentGain = null;
let currentCompressor = null;
let previewSource = null;
let previewGain = null;
let vibrationInterval = null;

let activeSettings = {
  sound: 'Classic bell',
  customUrl: null,
  pause: 1, // seconds
  volume: 1, // 0.5 to 1.5
  muted: false,
};

let isAlarmPlaying = false;
let audioBufferCache = new Map();

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  if (!ctx || ctx.state === 'closed') {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      ctx = new AudioCtx();
    }
  }
  return ctx;
}

export function isRunning() {
  return !!ctx && ctx.state === 'running';
}

export async function unlock() {
  try {
    const c = getAudioContext();
    if (!c) return false;
    if (c.state === 'suspended') {
      await c.resume();
    }
    return c.state === 'running';
  } catch (err) {
    console.warn('alarm.unlock error:', err);
    return false;
  }
}

export async function resume() {
  try {
    if (ctx && ctx.state === 'suspended') {
      await ctx.resume();
    }
  } catch (err) {
    console.warn('alarm.resume error:', err);
  }
}

// Synthesize tone buffer with pause silence appended
function generateToneBuffer(c, toneName, pauseSec = 1) {
  const sampleRate = c.sampleRate || 44100;
  const pause = Math.max(0, Math.min(5, Number(pauseSec) ?? 1));

  let toneDuration = 0.8;
  if (toneName === 'Loud buzzer') toneDuration = 0.45;
  else if (toneName === 'Chime') toneDuration = 1.1;
  else if (toneName === 'Kitchen ding') toneDuration = 0.6;
  else if (toneName === 'Siren') toneDuration = 0.85;
  else if (toneName === 'Soft pulse') toneDuration = 0.7;

  const totalLength = Math.max(1, Math.floor(sampleRate * (toneDuration + pause)));
  const audioBuffer = c.createBuffer(1, totalLength, sampleRate);
  const data = audioBuffer.getChannelData(0);

  const toneSamples = Math.floor(sampleRate * toneDuration);

  for (let i = 0; i < toneSamples; i++) {
    const t = i / sampleRate;
    let s = 0;

    switch (toneName) {
      case 'Loud buzzer': {
        const osc1 = Math.sign(Math.sin(2 * Math.PI * 180 * t));
        const osc2 = Math.sign(Math.sin(2 * Math.PI * 240 * t));
        const env = Math.max(0, 1 - t / toneDuration);
        s = 0.5 * (osc1 + osc2) * env;
        break;
      }
      case 'Chime': {
        // 4 cascading chimes: C5, E5, G5, C6
        const n1 = Math.sin(2 * Math.PI * 523.25 * t) * (t >= 0 ? Math.exp(-4.5 * t) : 0);
        const t2 = t - 0.15;
        const n2 = Math.sin(2 * Math.PI * 659.25 * Math.max(0, t2)) * (t2 >= 0 ? Math.exp(-4.5 * t2) : 0);
        const t3 = t - 0.3;
        const n3 = Math.sin(2 * Math.PI * 783.99 * Math.max(0, t3)) * (t3 >= 0 ? Math.exp(-4.5 * t3) : 0);
        const t4 = t - 0.45;
        const n4 = Math.sin(2 * Math.PI * 1046.5 * Math.max(0, t4)) * (t4 >= 0 ? Math.exp(-4.5 * t4) : 0);
        s = (n1 + n2 + n3 + n4) * 0.45;
        break;
      }
      case 'Kitchen ding': {
        const env = Math.exp(-5.5 * t);
        s = (0.7 * Math.sin(2 * Math.PI * 2200 * t) + 0.3 * Math.sin(2 * Math.PI * 3400 * t)) * env;
        break;
      }
      case 'Siren': {
        const sweepFreq = 700 + 250 * Math.sin(2 * Math.PI * 4 * t);
        const phase = 2 * Math.PI * (700 * t - (250 / (2 * Math.PI * 4)) * Math.cos(2 * Math.PI * 4 * t));
        s = 0.7 * Math.sin(phase);
        break;
      }
      case 'Soft pulse': {
        const env = Math.sin((Math.PI * t) / toneDuration);
        s = 0.75 * Math.sin(2 * Math.PI * 440 * t) * env;
        break;
      }
      case 'Classic bell':
      default: {
        const env = Math.exp(-3.2 * t);
        s =
          (0.6 * Math.sin(2 * Math.PI * 880 * t) +
            0.3 * Math.sin(2 * Math.PI * 1760 * t) +
            0.1 * Math.sin(2 * Math.PI * 2640 * t)) *
          env;
        break;
      }
    }

    data[i] = Math.max(-1, Math.min(1, s));
  }

  // The remaining samples up to totalLength remain 0 (silence pause)
  return audioBuffer;
}

// Load custom audio file and append silence pause
async function loadCustomAudioBuffer(c, url, pauseSec = 1) {
  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error('Fetch failed');
    const arrayBuf = await resp.arrayBuffer();
    const decoded = await c.decodeAudioData(arrayBuf);

    const pause = Math.max(0, Math.min(5, Number(pauseSec) ?? 1));
    if (pause === 0) return decoded;

    const sampleRate = decoded.sampleRate;
    const extraSamples = Math.floor(sampleRate * pause);
    const totalSamples = decoded.length + extraSamples;

    const paddedBuffer = c.createBuffer(decoded.numberOfChannels, totalSamples, sampleRate);
    for (let ch = 0; ch < decoded.numberOfChannels; ch++) {
      const srcData = decoded.getChannelData(ch);
      const destData = paddedBuffer.getChannelData(ch);
      destData.set(srcData, 0);
      // rest is zero-filled silence
    }
    return paddedBuffer;
  } catch (err) {
    console.warn('Could not load custom audio file, falling back to tone:', err);
    return null;
  }
}

async function getAlarmAudioBuffer(c, settings) {
  const cacheKey = `${settings.customUrl || settings.sound || 'Classic bell'}_pause_${settings.pause ?? 1}`;
  if (audioBufferCache.has(cacheKey)) {
    return audioBufferCache.get(cacheKey);
  }

  let buf = null;
  if (settings.customUrl) {
    buf = await loadCustomAudioBuffer(c, settings.customUrl, settings.pause);
  }
  if (!buf) {
    buf = generateToneBuffer(c, settings.sound || 'Classic bell', settings.pause);
  }

  audioBufferCache.set(cacheKey, buf);
  return buf;
}

function calculateGainValue(volume, muted) {
  if (muted) return 0;
  // Volume: 50% to 150% (0.5 to 1.5), default 1.0
  const vol = Math.max(0, Math.min(1.5, Number(volume) ?? 1.0));
  return vol;
}

function startVibration() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined' || !navigator.vibrate) return;
  try {
    navigator.vibrate([400, 200, 400, 200]);
    if (!vibrationInterval) {
      vibrationInterval = setInterval(() => {
        try {
          if (navigator.vibrate) navigator.vibrate([400, 200, 400, 200]);
        } catch {}
      }, 2000);
    }
  } catch {}
}

function stopVibration() {
  if (vibrationInterval) {
    clearInterval(vibrationInterval);
    vibrationInterval = null;
  }
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(0);
    } catch {}
  }
}

export async function start(settings = {}) {
  try {
    activeSettings = { ...activeSettings, ...settings };
    const c = getAudioContext();
    if (!c) return;

    if (c.state === 'suspended') {
      await c.resume().catch(() => {});
    }

    if (isAlarmPlaying && currentSource) {
      // Already playing, update gain
      configure(activeSettings);
      return;
    }

    // Stop any existing loop node
    if (currentSource) {
      try {
        currentSource.stop();
        currentSource.disconnect();
      } catch {}
      currentSource = null;
    }

    const buf = await getAlarmAudioBuffer(c, activeSettings);
    if (!buf) return;

    // Output routing: Source -> GainNode -> DynamicsCompressor (limiter) -> Destination
    if (!currentCompressor) {
      currentCompressor = c.createDynamicsCompressor();
      currentCompressor.threshold.setValueAtTime(-10, c.currentTime);
      currentCompressor.knee.setValueAtTime(30, c.currentTime);
      currentCompressor.ratio.setValueAtTime(12, c.currentTime);
      currentCompressor.attack.setValueAtTime(0.003, c.currentTime);
      currentCompressor.release.setValueAtTime(0.25, c.currentTime);
      currentCompressor.connect(c.destination);
    }

    if (!currentGain) {
      currentGain = c.createGain();
      currentGain.connect(currentCompressor);
    }

    const targetGain = calculateGainValue(activeSettings.volume, activeSettings.muted);
    currentGain.gain.setValueAtTime(targetGain, c.currentTime);

    const source = c.createBufferSource();
    source.buffer = buf;
    source.loop = true;
    source.connect(currentGain);

    source.start(0);
    currentSource = source;
    isAlarmPlaying = true;

    startVibration();
  } catch (err) {
    console.warn('alarm.start error:', err);
  }
}

export function stop() {
  try {
    isAlarmPlaying = false;
    stopVibration();

    if (currentSource) {
      try {
        currentSource.stop();
        currentSource.disconnect();
      } catch {}
      currentSource = null;
    }
  } catch (err) {
    console.warn('alarm.stop error:', err);
  }
}

export async function configure(newSettings = {}) {
  try {
    const prevSound = activeSettings.sound;
    const prevUrl = activeSettings.customUrl;
    const prevPause = activeSettings.pause;

    activeSettings = { ...activeSettings, ...newSettings };

    const c = getAudioContext();
    if (currentGain && c) {
      const targetGain = calculateGainValue(activeSettings.volume, activeSettings.muted);
      currentGain.gain.setValueAtTime(targetGain, c.currentTime);
    }

    // If sound, customUrl, or pause changed while alarm is actively sounding, seamlessly update loop
    const soundChanged =
      prevSound !== activeSettings.sound ||
      prevUrl !== activeSettings.customUrl ||
      prevPause !== activeSettings.pause;

    if (isAlarmPlaying && soundChanged) {
      await start(activeSettings);
    }
  } catch (err) {
    console.warn('alarm.configure error:', err);
  }
}

export async function preview(soundNameOrSettings) {
  try {
    stopPreview();

    const c = getAudioContext();
    if (!c) return;
    if (c.state === 'suspended') {
      await c.resume().catch(() => {});
    }

    let soundName = 'Classic bell';
    let customUrl = null;
    let volume = 1.0;

    if (typeof soundNameOrSettings === 'string') {
      soundName = soundNameOrSettings;
    } else if (typeof soundNameOrSettings === 'object' && soundNameOrSettings) {
      soundName = soundNameOrSettings.sound || 'Classic bell';
      customUrl = soundNameOrSettings.customUrl || null;
      volume = soundNameOrSettings.volume ?? 1.0;
    }

    let buf = null;
    if (customUrl) {
      buf = await loadCustomAudioBuffer(c, customUrl, 0);
    }
    if (!buf) {
      buf = generateToneBuffer(c, soundName, 0);
    }

    if (!buf) return;

    const pGain = c.createGain();
    pGain.gain.setValueAtTime(Math.min(1.5, Math.max(0.1, Number(volume) || 1.0)), c.currentTime);
    pGain.connect(c.destination);

    const source = c.createBufferSource();
    source.buffer = buf;
    source.loop = false;
    source.connect(pGain);

    source.onended = () => {
      if (previewSource === source) {
        previewSource = null;
      }
    };

    source.start(0);
    previewSource = source;
  } catch (err) {
    console.warn('alarm.preview error:', err);
  }
}

export function stopPreview() {
  if (previewSource) {
    try {
      previewSource.stop();
      previewSource.disconnect();
    } catch {}
    previewSource = null;
  }
}
