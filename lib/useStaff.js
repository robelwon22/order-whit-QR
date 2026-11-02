'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from './supabase';

const StaffContext = createContext(null);
const staffProfileCache = new Map();

/**
 * Fetches one user's staff profile and associated cafe data, sharing concurrent loads.
 */
function fetchStaffProfile(userId) {
  if (staffProfileCache.has(userId)) return staffProfileCache.get(userId);

  const request = (async () => {
    const { data: staffRecord, error: staffError } = await supabase
      .from('staff')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (staffError) return { error: `Unable to load staff access: ${staffError.message}` };
    if (!staffRecord) return { error: 'No staff access record found.' };
    if (!staffRecord.active) {
      return { error: 'Your account is currently disabled. Please contact your manager.' };
    }

    if (staffRecord.role === 'super_admin') {
      const { data: cafeRecords, error: cafesError } = await supabase
        .from('cafes')
        .select('*')
        .order('name');

      if (cafesError) return { error: `Unable to load cafes: ${cafesError.message}` };
      const availableCafes = cafeRecords || [];
      return { staff: staffRecord, cafes: availableCafes, cafe: availableCafes[0] || null };
    }

    if (!staffRecord.cafe_id) return { staff: staffRecord, cafes: [], cafe: null };

    const { data: cafeRecord, error: cafeError } = await supabase
      .from('cafes')
      .select('*')
      .eq('id', staffRecord.cafe_id)
      .maybeSingle();

    if (cafeError) return { error: `Unable to load cafe details: ${cafeError.message}` };
    if (!cafeRecord) return { error: 'Cafe details not found.' };
    if (!cafeRecord.active) return { error: 'This cafe is currently unavailable. Contact support.' };
    return { staff: staffRecord, cafes: [cafeRecord], cafe: cafeRecord };
  })();

  staffProfileCache.set(userId, request);
  request.catch(() => staffProfileCache.delete(userId));
  return request;
}

/**
 * Loads the signed-in user's staff profile and the cafe data once for its provider.
 */
export function StaffProvider({ children }) {
  const [user, setUser] = useState(null);
  const [staff, setStaff] = useState(null);
  const [cafe, setCafe] = useState(null);
  const [cafes, setCafes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const reloadSessionRef = useRef(null);

  // Resolves the session and subscribes to sign-in changes once per route layout.
  useEffect(() => {
    let active = true;
    let requestId = 0;
    let currentUserId = null;
    let authEventTimer = null;

    /**
     * Loads staff and cafe records for the supplied session, ignoring stale requests.
     */
    async function loadSession(session, force = false) {
      const request = ++requestId;
      const nextUser = session?.user;

      if (!nextUser) {
        if (currentUserId) staffProfileCache.delete(currentUserId);
        currentUserId = null;
        if (active) {
          setUser(null);
          setStaff(null);
          setCafe(null);
          setCafes([]);
          setError('');
          setLoading(false);
          window.location.replace('/login');
        }
        return;
      }

      if (currentUserId === nextUser.id && !force) {
        if (active) setUser(nextUser);
        return;
      }

      currentUserId = nextUser.id;
      if (force) staffProfileCache.delete(nextUser.id);
      if (active) {
        setUser(nextUser);
        setStaff(null);
        setCafe(null);
        setCafes([]);
        setError('');
        setLoading(true);
      }

      try {
        const profile = await fetchStaffProfile(nextUser.id);
        if (!active || request !== requestId) return;
        if (profile.error) {
          setError(profile.error);
          return;
        }

        setStaff(profile.staff);
        setCafes(profile.cafes);
        setCafe(profile.cafe);
      } catch (loadError) {
        if (active && request === requestId) {
          setError(loadError.message || 'Failed to authenticate staff.');
        }
      } finally {
        if (active && request === requestId) setLoading(false);
      }
    }

    /**
     * Schedules auth-session handling outside Supabase's auth callback lock.
     */
    function handleAuthChange(event, session) {
      if (event !== 'SIGNED_IN' && event !== 'SIGNED_OUT' && event !== 'USER_UPDATED') return;
      if (event === 'SIGNED_IN' && session?.user?.id === currentUserId) return;

      if (authEventTimer) window.clearTimeout(authEventTimer);
      // Defers Supabase calls until after its auth event callback releases its lock.
      authEventTimer = window.setTimeout(() => {
        loadSession(session);
      }, 0);
    }

    reloadSessionRef.current = loadSession;
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthChange);

    // Initializes the provider from the existing browser session.
    supabase.auth
      .getSession()
      .then(({ data: { session }, error: sessionError }) => {
        if (!active) return;
        if (sessionError) {
          setError(`Unable to read your session: ${sessionError.message}`);
          setLoading(false);
          return;
        }
        return loadSession(session);
      })
      // Leaves an explicit error on session lookup failures.
      .catch((sessionError) => {
        if (active) {
          setError(sessionError.message || 'Failed to authenticate staff.');
          setLoading(false);
        }
      });

    // Cancels pending state updates and releases the auth subscription.
    return () => {
      active = false;
      requestId += 1;
      if (authEventTimer) window.clearTimeout(authEventTimer);
      subscription.unsubscribe();
      reloadSessionRef.current = null;
    };
  }, []);

  /**
   * Reloads the current user's staff and cafe records on explicit request.
   */
  const reload = useCallback(async () => {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      setError(`Unable to read your session: ${sessionError.message}`);
      return;
    }
    await reloadSessionRef.current?.(session, true);
  }, []);

  /**
   * Signs out the user and returns them to the login page.
   */
  const logout = useCallback(async () => {
    if (user?.id) staffProfileCache.delete(user.id);
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      setError(`Unable to sign out: ${signOutError.message}`);
      return;
    }
    window.location.replace('/login');
  }, [user]);

  const value = useMemo(
    () => ({ user, staff, cafe, cafes, setCafe, loading, error, reload, logout }),
    [user, staff, cafe, cafes, loading, error, reload, logout],
  );

  return <StaffContext.Provider value={value}>{children}</StaffContext.Provider>;
}

/**
 * Returns shared staff data and applies the current page's required-role check.
 */
export function useStaff(requiredRoles = []) {
  const context = useContext(StaffContext);
  if (!context) {
    throw new Error('useStaff must be used within a StaffProvider.');
  }

  const roles = Array.isArray(requiredRoles) ? requiredRoles : [];
  const roleError =
    context.staff && roles.length > 0 && !roles.includes(context.staff.role)
      ? 'Access denied: You do not have permission to view this page.'
      : '';

  return { ...context, error: roleError || context.error };
}
