// lib/useOrderAlarm.js
'use client';

import { useEffect, useRef } from 'react';
import * as alarm from './alarm';

export function useOrderAlarm(newCount, settings, started) {
  const prevCountRef = useRef(newCount);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  // Sync settings whenever they change without restarting or stopping the alarm
  useEffect(() => {
    alarm.configure(settings);
  }, [settings]);

  // Main alarm control effect: loops continuously while started && newCount > 0
  useEffect(() => {
    if (!started) {
      alarm.stop();
      return;
    }

    if (newCount > 0) {
      alarm.start(settingsRef.current);
    } else {
      alarm.stop();
    }

    prevCountRef.current = newCount;
  }, [newCount, started]);

  // Tab visibility and online reconnect resume handlers
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && started && newCount > 0) {
        alarm.resume();
        alarm.start(settingsRef.current);
      }
    };

    const handleOnline = () => {
      if (started && newCount > 0) {
        alarm.resume();
        alarm.start(settingsRef.current);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
    };
  }, [started, newCount]);

  // Cleanup when component unmounts
  useEffect(() => {
    return () => {
      alarm.stop();
    };
  }, []);
}
