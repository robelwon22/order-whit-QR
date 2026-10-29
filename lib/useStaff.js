'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';

export function useStaff(requiredRoles = []) {
  const requiredRolesList = Array.isArray(requiredRoles) ? requiredRoles : [];
  const [user, setUser] = useState(null);
  const [staff, setStaff] = useState(null);
  const [cafe, setCafe] = useState(null);
  const [cafes, setCafes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const currentRequiredRoles = Array.isArray(requiredRoles) ? requiredRoles : [];
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        window.location.href = '/login';
        return;
      }
      setUser(session.user);

      // 1. Fetch staff profile
      const { data: s, error: staffError } = await supabase
        .from('staff')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (staffError || !s) {
        setError('No staff access record found.');
        setLoading(false);
        return;
      }

      if (!s.active) {
        setError('Your account is currently disabled. Please contact your manager.');
        setLoading(false);
        return;
      }

      // Check required roles
      if (currentRequiredRoles.length > 0 && !currentRequiredRoles.includes(s.role)) {
        setError('Access denied: You do not have permission to view this page.');
        setLoading(false);
        return;
      }

      setStaff(s);

      // 2. Fetch cafe(s)
      if (s.role === 'super_admin') {
        const { data: allCafes } = await supabase
          .from('cafes')
          .select('*')
          .order('name');
        setCafes(allCafes || []);
        if (allCafes && allCafes.length > 0) {
          setCafe(allCafes[0]);
        }
      } else if (s.cafe_id) {
        const { data: c, error: cafeError } = await supabase
          .from('cafes')
          .select('*')
          .eq('id', s.cafe_id)
          .maybeSingle();

        if (cafeError || !c) {
          setError('Cafe details not found.');
          setLoading(false);
          return;
        }

        if (!c.active) {
          setError('This cafe is currently unavailable. Contact support.');
          setLoading(false);
          return;
        }

        setCafe(c);
        setCafes([c]);
      }
    } catch (e) {
      setError(e.message || 'Failed to authenticate staff.');
    } finally {
      setLoading(false);
    }
  }, [requiredRoles]);

  useEffect(() => {
    load();
  }, [load]);

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return {
    user,
    staff,
    cafe,
    cafes,
    setCafe,
    loading,
    error,
    reload: load,
    logout,
  };
}
