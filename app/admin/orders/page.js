'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isValidBusinessDay, shiftBusinessDay } from '../../../lib/businessDayDate.mjs';
import { supabase, pick } from '../../../lib/supabase';
import { useStaff } from '../../../lib/useStaff';
import { useToast } from '../../../components/ui/Toast';
import { useI18n } from '../../../lib/i18n';
import { AppShell } from '../../../components/ui/AppShell';
import { Button } from '../../../components/ui/Button';
import { EmptyState, Skeleton } from '../../../components/ui/Badge';
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, Download, Printer, Search, X } from 'lucide-react';

const TIME_ZONES = [
  'Africa/Addis_Ababa',
  'Africa/Cairo',
  'Africa/Johannesburg',
  'Africa/Nairobi',
  'Asia/Dubai',
  'Asia/Tokyo',
  'Europe/London',
  'Europe/Paris',
  'America/New_York',
  'America/Los_Angeles',
  'UTC',
];

const STATUS_KEYS = ['all', 'open', 'served', 'paid', 'cancelled'];

function formatMoney(value, currency) {
  return `${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

function formatDateTime(value, timeZone, language) {
  if (!value) return '';
  return new Intl.DateTimeFormat(language === 'am' ? 'am-ET' : 'en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone,
  }).format(new Date(value));
}

function formatDayLabel(from, to, timeZone, language) {
  if (!from || !to) return '';
  const locale = language === 'am' ? 'am-ET' : 'en-GB';
  const day = new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone,
  }).format(new Date(from));
  const start = new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
  }).format(new Date(from));
  const end = new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
  }).format(new Date(to));
  return `${day}, ${start} – ${end}`;
}

function durationBetween(start, end) {
  if (!start || !end) return null;
  const seconds = Math.max(0, Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 1000));
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes >= 60) {
    return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`;
  }
  return `${minutes}m ${String(remainingSeconds).padStart(2, '0')}s`;
}

function csvCell(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

function rpcErrorText(error) {
  if (!error) return '';
  return [error.message, error.details, error.hint, error.code].filter(Boolean).join(' ');
}

function orderResponse(data) {
  const result = Array.isArray(data) ? data[0] : data;
  if (!result || typeof result !== 'object' || !Array.isArray(result.orders)
      || !result.from || !result.to || !isValidBusinessDay(result.day)) {
    throw new Error('The order report returned an invalid response.');
  }
  return result;
}

function unclosedOrdersResponse(data) {
  const result = Array.isArray(data) ? data : data?.orders;
  if (!Array.isArray(result)) {
    throw new Error('The unclosed-orders function returned an invalid response.');
  }
  return result;
}

function migrationHint(name, error) {
  const message = String(error || '').toLowerCase();
  if (!/(pgrst202|42883|could not find the function|function .* does not exist)/.test(message)) return '';
  return name === 'orders' ? 'admin.ordersPage.ordersMigrationHint' : 'admin.ordersPage.unclosedMigrationHint';
}

export default function AdminOrdersPage() {
  const { staff, cafe, cafes, setCafe, loading: authLoading, error: authError, logout } = useStaff([
    'cafe_admin',
    'super_admin',
  ]);
  const { showToast } = useToast();
  const { t, lang, isAmharic } = useI18n();
  const [activeCafe, setActiveCafe] = useState(null);
  const [selectedDay, setSelectedDay] = useState('');
  const [todayDay, setTodayDay] = useState('');
  const [dayData, setDayData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [earlierOrders, setEarlierOrders] = useState([]);
  const [earlierOrdersError, setEarlierOrdersError] = useState(false);
  const [unclosedOpen, setUnclosedOpen] = useState(false);
  const [closingId, setClosingId] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [diagnostics, setDiagnostics] = useState({});
  const [debugEnabled, setDebugEnabled] = useState(false);
  const [settingsError, setSettingsError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tableFilter, setTableFilter] = useState('');
  const [acceptedByFilter, setAcceptedByFilter] = useState('');
  const [editedOnly, setEditedOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');
  const debounceRef = useRef(null);
  const requestIdRef = useRef(0);
  const selectedDayRef = useRef('');
  const latestTodayRef = useRef('');

  useEffect(() => {
    if (cafe && (!activeCafe || activeCafe.id !== cafe.id)) setActiveCafe(cafe);
  }, [cafe, activeCafe]);

  useEffect(() => {
    const updateDebugAccess = () => {
      setDebugEnabled(
        new URLSearchParams(window.location.search).get('debug') === '1'
        && ['cafe_admin', 'super_admin'].includes(staff?.role)
      );
    };
    updateDebugAccess();
    window.addEventListener('popstate', updateDebugAccess);
    return () => window.removeEventListener('popstate', updateDebugAccess);
  }, [staff?.role]);

  useEffect(() => {
    selectedDayRef.current = selectedDay;
  }, [selectedDay]);

  const updateDateUrl = useCallback((day, replace = false) => {
    const url = new URL(window.location.href);
    url.searchParams.set('date', day);
    if (replace) window.history.replaceState(null, '', url);
    else window.history.pushState(null, '', url);
  }, []);

  const recordDiagnostic = useCallback((name, call, parameters, data, error) => {
    setDiagnostics((current) => ({
      ...current,
      [name]: { call, parameters, data, error: error ? rpcErrorText(error) : '' },
    }));
  }, []);

  const loadSettings = useCallback(async () => {
    if (!activeCafe?.id) return;
    const parameters = { table: 'cafes', select: 'settings', id: activeCafe.id };
    const { data, error: queryError } = await supabase
      .from('cafes')
      .select('settings')
      .eq('id', activeCafe.id)
      .single();
    recordDiagnostic('settings', "supabase.from('cafes').select('settings').eq('id', cafeId).single()", parameters, data, queryError);
    if (queryError) {
      console.error('Failed to load cafe business-day settings:', queryError);
      setSettingsError(rpcErrorText(queryError));
      throw queryError;
    }
    setSettingsError('');
    setActiveCafe((current) => current?.id === activeCafe.id
      ? { ...current, settings: data?.settings || {} }
      : current);
  }, [activeCafe?.id, recordDiagnostic]);

  const fetchOrders = useCallback(async (day) => {
    const parameters = { p_cafe: activeCafe.id, p_day: day };
    const { data, error: rpcError } = await supabase.rpc('admin_orders_on', parameters);
    recordDiagnostic('orders', "supabase.rpc('admin_orders_on', { p_cafe, p_day })", parameters, data, rpcError);
    if (rpcError) throw rpcError;
    try {
      return orderResponse(data);
    } catch (responseError) {
      recordDiagnostic('orders', "supabase.rpc('admin_orders_on', { p_cafe, p_day })", parameters, data, responseError);
      throw responseError;
    }
  }, [activeCafe?.id, recordDiagnostic]);

  const loadSelectedDay = useCallback(async (day, silent = false) => {
    if (!activeCafe?.id) return;
    const requestId = ++requestIdRef.current;
    if (!silent) setLoading(true);
    setError(false);

    try {
      const result = await fetchOrders(day === latestTodayRef.current ? null : day);
      if (requestId !== requestIdRef.current) return;
      setSelectedDay(result.day);
      selectedDayRef.current = result.day;
      setDayData(result);
      if (day === null || day === latestTodayRef.current) {
        setTodayDay(result.day);
        latestTodayRef.current = result.day;
      }
      updateDateUrl(result.day, true);
      setSelectedOrder((current) => current
        ? result.orders.find((order) => order.id === current.id) || null
        : null);
      return result;
    } catch (loadError) {
      console.error('Failed to load admin orders:', loadError);
      if (requestId === requestIdRef.current) {
        const message = rpcErrorText(loadError);
        setError(message.includes('future_date') ? 'future_date'
          : message.includes('date_too_old') ? 'date_too_old' : true);
      }
      return null;
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [activeCafe?.id, fetchOrders, updateDateUrl]);

  const retryOrders = useCallback(async () => {
    if (selectedDay) {
      loadSelectedDay(selectedDay);
      return;
    }
    setLoading(true);
    setError(false);
    try {
      await loadSettings();
      const today = await fetchOrders(null);
      latestTodayRef.current = today.day;
      setTodayDay(today.day);
      const requestedDay = new URLSearchParams(window.location.search).get('date');
      const day = isValidBusinessDay(requestedDay) ? requestedDay : today.day;
      if (day === today.day) {
        setSelectedDay(today.day);
        selectedDayRef.current = today.day;
        setDayData(today);
        updateDateUrl(today.day, true);
        setLoading(false);
      } else {
        await loadSelectedDay(day);
      }
    } catch (retryError) {
      console.error('Failed to retry loading the Orders page:', retryError);
      setError(true);
      setLoading(false);
    }
  }, [fetchOrders, loadSelectedDay, loadSettings, selectedDay, updateDateUrl]);

  useEffect(() => {
    if (!activeCafe?.id) return undefined;
    let cancelled = false;
    const requestedDay = new URLSearchParams(window.location.search).get('date');
    const initialDay = isValidBusinessDay(requestedDay) ? requestedDay : null;
    setDayData(null);
    setSelectedDay('');
    selectedDayRef.current = '';
    setTodayDay('');
    latestTodayRef.current = '';
    setLoading(true);
    setError(false);

    const initialize = async () => {
      try {
        await loadSettings();
        if (cancelled) return;
        const today = await fetchOrders(null);
        if (cancelled) return;
        setTodayDay(today.day);
        latestTodayRef.current = today.day;
        const targetDay = initialDay || today.day;
        setSelectedDay(targetDay);
        selectedDayRef.current = targetDay;
        if (targetDay !== today.day) {
          await loadSelectedDay(targetDay);
        } else {
          setDayData(today);
          setSelectedDay(today.day);
          selectedDayRef.current = today.day;
          updateDateUrl(today.day, true);
          setLoading(false);
        }
      } catch (initialError) {
        console.error('Failed to initialize the Orders page:', initialError);
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      }
    };

    initialize();
    return () => {
      cancelled = true;
      requestIdRef.current += 1;
    };
  }, [activeCafe?.id, fetchOrders, loadSelectedDay, loadSettings, updateDateUrl]);

  useEffect(() => {
    const handlePopState = () => {
      const day = new URLSearchParams(window.location.search).get('date');
      if (!isValidBusinessDay(day) || day === selectedDayRef.current) return;
      setSelectedDay(day);
      selectedDayRef.current = day;
      setDayData(null);
      setLoading(true);
      setSelectedOrder(null);
      loadSelectedDay(day);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [loadSelectedDay]);

  const loadUnclosedOrders = useCallback(async () => {
    if (!activeCafe?.id) return;
    setEarlierOrdersError(false);
    const parameters = { p_cafe: activeCafe.id };
    const { data, error: queryError } = await supabase.rpc('admin_unclosed_orders', parameters);
    recordDiagnostic('unclosed', "supabase.rpc('admin_unclosed_orders', { p_cafe })", parameters, data, queryError);
    if (queryError) {
      console.error('Failed to load unclosed earlier orders:', queryError);
      setEarlierOrders([]);
      setEarlierOrdersError(true);
      return;
    }
    try {
      setEarlierOrders(unclosedOrdersResponse(data));
      setEarlierOrdersError(false);
    } catch (responseError) {
      console.error('Invalid unclosed earlier orders response:', responseError);
      recordDiagnostic('unclosed', "supabase.rpc('admin_unclosed_orders', { p_cafe })", parameters, data, responseError);
      setEarlierOrders([]);
      setEarlierOrdersError(true);
    }
  }, [activeCafe?.id, recordDiagnostic]);

  useEffect(() => {
    if (activeCafe?.id) loadUnclosedOrders();
  }, [activeCafe?.id, loadUnclosedOrders]);

  useEffect(() => {
    if (!activeCafe?.id) return undefined;
    const cafeId = activeCafe.id;
    const checkServerBusinessDay = async () => {
      try {
        const previousToday = latestTodayRef.current;
        const wasViewingToday = Boolean(previousToday) && selectedDayRef.current === previousToday;
        const today = await fetchOrders(null);
        if (today.day !== previousToday) {
          latestTodayRef.current = today.day;
          setTodayDay(today.day);
        }
        if (wasViewingToday) {
          requestIdRef.current += 1;
          setDayData(today);
          setSelectedDay(today.day);
          selectedDayRef.current = today.day;
          setSelectedOrder((current) => current
            ? today.orders.find((order) => order.id === current.id) || null
            : null);
          setError(false);
          setLoading(false);
          updateDateUrl(today.day, true);
        }
        if (today.day !== previousToday && previousToday) {
          showToast(t('admin.ordersPage.newDayToast'), 'success');
        }
      } catch (rolloverError) {
        console.error('Failed to check the current business day:', rolloverError);
      }
    };
    const refreshCurrent = () => {
      const currentDay = selectedDayRef.current;
      const refreshingToday = currentDay && currentDay === latestTodayRef.current;
      const refresh = refreshingToday
        ? Promise.all([checkServerBusinessDay(), loadUnclosedOrders()])
        : Promise.all([
          currentDay ? loadSelectedDay(currentDay, true) : Promise.resolve(),
          loadUnclosedOrders(),
          checkServerBusinessDay(),
        ]);
      return refresh;
    };
    const scheduleRefetch = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(refreshCurrent, 2000);
    };
    const channel = supabase
      .channel(`admin-orders-${cafeId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders',
        filter: `cafe_id=eq.${cafeId}`,
      }, scheduleRefetch)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'order_stations',
        filter: `cafe_id=eq.${cafeId}`,
      }, scheduleRefetch)
      .subscribe();
    const settingsChannel = supabase
      .channel(`admin-orders-settings-${cafeId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'cafes',
        filter: `id=eq.${cafeId}`,
      }, () => {
        loadSettings()
          .then(() => refreshCurrent())
          .catch((settingsLoadError) => console.error('Failed to refresh cafe settings:', settingsLoadError));
      })
      .subscribe();
    const refreshInterval = setInterval(refreshCurrent, 30000);
    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      refreshCurrent();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    const boundaryTimer = selectedDay === todayDay && dayData?.to
      ? setTimeout(checkServerBusinessDay, Math.max(0, new Date(dayData.to).getTime() - Date.now() + 50))
      : null;

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      clearInterval(refreshInterval);
      if (boundaryTimer) clearTimeout(boundaryTimer);
      document.removeEventListener('visibilitychange', handleVisibility);
      supabase.removeChannel(channel);
      supabase.removeChannel(settingsChannel);
    };
  }, [activeCafe?.id, dayData?.to, fetchOrders, loadSelectedDay, loadSettings, loadUnclosedOrders, selectedDay, showToast, t, todayDay, updateDateUrl]);

  const orders = dayData?.orders || [];
  const orderedForNumbers = useMemo(
    () => [...orders].sort((left, right) => new Date(left.created_at) - new Date(right.created_at)),
    [orders]
  );
  const orderNumbers = useMemo(
    () => new Map(orderedForNumbers.map((order, index) => [order.id, index + 1])),
    [orderedForNumbers]
  );
  const itemLanguage = lang || 'en';
  const defaultLanguage = activeCafe?.settings?.default_language || activeCafe?.default_language || 'en';
  const getItemName = useCallback((name) => pick(name, itemLanguage, defaultLanguage), [itemLanguage, defaultLanguage]);
  const currency = activeCafe?.currency || 'ETB';

  const counts = useMemo(() => STATUS_KEYS.reduce((result, status) => {
    result[status] = status === 'all' ? orders.length : orders.filter((order) => order.status === status).length;
    return result;
  }, {}), [orders]);

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    const filtered = orders.filter((order) => {
      if (statusFilter !== 'all' && order.status !== statusFilter) return false;
      if (tableFilter && order.table_name !== tableFilter) return false;
      if (acceptedByFilter && (order.accepted_by_name || '') !== acceptedByFilter) return false;
      if (editedOnly && !order.edited_at && !order.edit_count) return false;
      if (query) {
        const names = (order.items || []).map((item) => getItemName(item.name)).join(' ');
        const searchable = `${order.table_name || ''} ${names}`.toLocaleLowerCase();
        if (!searchable.includes(query)) return false;
      }
      return true;
    });
    return filtered.sort((left, right) => {
      if (sort === 'oldest') return new Date(left.created_at) - new Date(right.created_at);
      if (sort === 'highest') return Number(right.total || 0) - Number(left.total || 0);
      return new Date(right.created_at) - new Date(left.created_at);
    });
  }, [orders, statusFilter, tableFilter, acceptedByFilter, editedOnly, search, sort, getItemName]);

  const tables = useMemo(
    () => [...new Set(orders.map((order) => order.table_name).filter(Boolean))].sort(),
    [orders]
  );
  const acceptedByOptions = useMemo(
    () => [...new Set(orders.map((order) => order.accepted_by_name).filter(Boolean))].sort(),
    [orders]
  );

  const summary = useMemo(() => {
    const orderCount = orders.length;
    const paidOrders = orders.filter((order) => order.status === 'paid');
    const openOrders = orders.filter((order) => order.status === 'open' || order.status === 'served');
    const billableOrders = orders.filter((order) => order.status !== 'cancelled');
    const totalValue = billableOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
    const averageMinutes = (field) => {
      const elapsed = orders
        .filter((order) => order.created_at && order[field])
        .map((order) => new Date(order[field]).getTime() - new Date(order.created_at).getTime())
        .filter((value) => Number.isFinite(value) && value >= 0);
      return elapsed.length ? elapsed.reduce((sum, value) => sum + value, 0) / elapsed.length / 60000 : null;
    };
    const fromMs = new Date(dayData?.from || 0).getTime();
    const toMs = new Date(dayData?.to || 0).getTime();
    const hourly = Array(Math.max(0, Math.ceil((toMs - fromMs) / 3600000))).fill(0);
    orders.forEach((order) => {
      const hour = Math.floor((new Date(order.created_at).getTime() - fromMs) / 3600000);
      if (hour >= 0 && hour < hourly.length) hourly[hour] += 1;
    });
    const busiestHour = hourly.reduce((best, count, index) => count > hourly[best] ? index : best, 0);
    const busiestHourLabel = hourly.length ? new Intl.DateTimeFormat(lang === 'am' ? 'am-ET' : 'en-GB', {
      hour: 'numeric',
      timeZone: activeCafe?.settings?.timezone || 'Africa/Addis_Ababa',
    }).format(new Date(fromMs + busiestHour * 3600000)) : '—';
    const items = new Map();
    billableOrders.forEach((order) => (order.items || []).forEach((item) => {
      const name = getItemName(item.name);
      const previous = items.get(name) || { name, quantity: 0, revenue: 0 };
      const quantity = Number(item.qty || 0);
      items.set(name, {
        name,
        quantity: previous.quantity + quantity,
        revenue: previous.revenue + Number(item.line_total ?? Number(item.unit_price || 0) * quantity),
      });
    }));
    return {
      orderCount,
      paidSales: paidOrders.reduce((sum, order) => sum + Number(order.total || 0), 0),
      unpaid: openOrders.reduce((sum, order) => sum + Number(order.total || 0), 0),
      cancelled: orders.filter((order) => order.status === 'cancelled').length,
      average: billableOrders.length ? totalValue / billableOrders.length : 0,
      acceptedMinutes: averageMinutes('accepted_at'),
      readyMinutes: averageMinutes('ready_at'),
      busiestHour: busiestHourLabel,
      hourly,
      itemCount: billableOrders.reduce((sum, order) => sum + Number(order.item_count || 0), 0),
      topItems: [...items.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 10),
    };
  }, [orders, dayData?.from, dayData?.to, getItemName, activeCafe?.settings?.timezone, lang]);

  const changeDay = (day) => {
    if (!isValidBusinessDay(day) || !todayDay || day > todayDay || day < shiftBusinessDay(todayDay, -365)) return;
    setSelectedDay(day);
    selectedDayRef.current = day;
    setDayData(null);
    setSelectedOrder(null);
    setLoading(true);
    setError(false);
    updateDateUrl(day);
    loadSelectedDay(day);
  };

  const handleDateChange = (event) => {
    if (isValidBusinessDay(event.target.value)) changeDay(event.target.value);
  };

  const closeEarlierOrder = async (order, status) => {
    if (!order?.id || closingId) return;
    setClosingId(order.id);
    const closedAt = new Date().toISOString();
    const updates = status === 'paid'
      ? { status: 'paid', paid_at: closedAt, closed_at: closedAt }
      : {
        status: 'cancelled',
        cancelled_by: 'staff',
        cancel_reason: 'Closed from an earlier business day',
        closed_at: closedAt,
      };
    try {
      const { data, error: updateError } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', order.id)
        .eq('cafe_id', activeCafe.id)
        .in('status', ['open', 'served'])
        .select('id')
        .maybeSingle();
      if (updateError) throw updateError;
      if (!data) throw new Error('The order could not be updated. It may already have been closed.');
      showToast(t(status === 'paid' ? 'admin.ordersPage.markedPaid' : 'admin.ordersPage.markedCancelled'), 'success');
      await loadUnclosedOrders();
      if (selectedDayRef.current) await loadSelectedDay(selectedDayRef.current, true);
    } catch (closeError) {
      console.error('Failed to close an earlier order:', closeError);
      showToast(t('admin.ordersPage.networkError'), 'error');
    } finally {
      setClosingId(null);
    }
  };

  const exportCsv = () => {
    if (!dayData) return;
    const headers = [
      'Order #', 'Table', 'Status', 'Placed at', 'Items', 'Total', 'Accepted by', 'Accepted at',
      'Ready at', 'Served at', 'Paid at', 'Order note', 'Edited at', 'Edited by', 'Edit count',
      'Cancelled by', 'Cancel reason',
    ];
    const rows = orderedForNumbers.map((order) => [
      orderNumbers.get(order.id),
      order.table_name,
      order.status,
      formatDateTime(order.created_at, timezone, lang),
      (order.items || []).map((item) => `${getItemName(item.name)} x${item.qty} (${item.note || ''})`).join('; '),
      order.total,
      order.accepted_by_name,
      formatDateTime(order.accepted_at, timezone, lang),
      formatDateTime(order.ready_at, timezone, lang),
      formatDateTime(order.served_at, timezone, lang),
      formatDateTime(order.paid_at, timezone, lang),
      order.note,
      formatDateTime(order.edited_at, timezone, lang),
      order.edited_by,
      order.edit_count,
      order.cancelled_by,
      order.cancel_reason,
    ]);
    const content = [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF', content], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `orders-${dayData.day}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const printReport = () => {
    if (!dayData) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast(t('admin.ordersPage.printBlocked'), 'error');
      return;
    }
    printWindow.opener = null;
    const reportRows = orderedForNumbers.map((order) => `
      <tr><td>#${orderNumbers.get(order.id)}</td><td>${escapeHtml(order.table_name)}</td>
      <td>${escapeHtml(order.status)}</td><td>${escapeHtml(formatDateTime(order.created_at, activeCafe?.settings?.timezone || 'Africa/Addis_Ababa', lang))}</td>
      <td>${escapeHtml((order.items || []).map((item) => `${getItemName(item.name)} × ${item.qty}`).join(', '))}</td>
      <td>${escapeHtml(formatMoney(order.total, currency))}</td></tr>`).join('');
    printWindow.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(t('admin.ordersPage.dailyReport'))} ${escapeHtml(dayData.day)}</title>
      <style>body{font:14px Arial,sans-serif;padding:24px;color:#222}h1{margin-bottom:4px}p{color:#555}.stats{display:flex;gap:24px;margin:20px 0}table{width:100%;border-collapse:collapse}th,td{padding:8px;border:1px solid #ccc;text-align:left;vertical-align:top}th{background:#f4eee6}@media print{body{padding:0}}</style>
      </head><body><h1>${escapeHtml(t('admin.ordersPage.dailyReport'))}</h1>
      <p>${escapeHtml(activeCafe?.name || '')} · ${escapeHtml(formatDayLabel(dayData.from, dayData.to, activeCafe?.settings?.timezone || 'Africa/Addis_Ababa', lang))}</p>
      <div class="stats"><span>${escapeHtml(t('admin.ordersPage.orders'))}: ${orders.length}</span>
      <span>${escapeHtml(t('admin.ordersPage.paidSales'))}: ${escapeHtml(formatMoney(summary.paidSales, currency))}</span>
      <span>${escapeHtml(t('admin.ordersPage.cancelled'))}: ${summary.cancelled}</span></div>
      <table><thead><tr><th>#</th><th>${escapeHtml(t('admin.ordersPage.table'))}</th><th>${escapeHtml(t('common.status'))}</th><th>${escapeHtml(t('admin.ordersPage.placed'))}</th><th>${escapeHtml(t('admin.ordersPage.items'))}</th><th>${escapeHtml(t('admin.ordersPage.total'))}</th></tr></thead>
      <tbody>${reportRows}</tbody></table><script>window.onload=()=>window.print();</script></body></html>`);
    printWindow.document.close();
  };

  const timezone = activeCafe?.settings?.timezone || 'Africa/Addis_Ababa';
  const dayLabel = dayData
    ? formatDayLabel(dayData.from, dayData.to, timezone, lang)
    : '';

  if (authLoading) {
    return <div style={{ padding: 24 }}><Skeleton height={180} /></div>;
  }

  return (
    <AppShell
      cafe={activeCafe}
      cafes={cafes}
      onSelectCafe={(selectedCafe) => {
        setActiveCafe(selectedCafe);
        if (setCafe) setCafe(selectedCafe);
      }}
      user={staff}
      onLogout={logout}
      title={t('admin.ordersPage.title')}
    >
      <main className="admin-orders-page" lang={isAmharic ? 'am' : 'en'}>
        {authError ? (
          <div className="orders-error" role="alert">{authError}</div>
        ) : (
          <>
            {debugEnabled && (
              <details className="orders-diagnostics">
                <summary>{t('admin.ordersPage.diagnosticsTitle')}</summary>
                {settingsError && <p className="diagnostic-error">{t('admin.ordersPage.settingsLoadError')}: {settingsError}</p>}
                {['orders', 'unclosed', 'settings'].map((name) => {
                  const entry = diagnostics[name];
                  return (
                    <section key={name}>
                      <h2>{t(`admin.ordersPage.diagnosticNames.${name}`)}</h2>
                      {entry ? (
                        <>
                          <p><strong>{t('admin.ordersPage.diagnosticCall')}:</strong> <code>{entry.call}</code></p>
                          <p><strong>{t('admin.ordersPage.diagnosticParameters')}:</strong></p>
                          <pre>{JSON.stringify(entry.parameters, null, 2)}</pre>
                          <p><strong>{t('admin.ordersPage.diagnosticResponse')}:</strong></p>
                          <pre>{JSON.stringify(entry.data, null, 2)}</pre>
                          <p><strong>{t('admin.ordersPage.diagnosticError')}:</strong></p>
                          <pre className={entry.error ? 'diagnostic-error' : ''}>{entry.error || t('admin.ordersPage.noDiagnosticError')}</pre>
                          {migrationHint(name, entry.error) && (
                            <p className="diagnostic-error">{t(migrationHint(name, entry.error))}</p>
                          )}
                        </>
                      ) : <p>{t('admin.ordersPage.diagnosticsWaiting')}</p>}
                    </section>
                  );
                })}
              </details>
            )}
            <header className="orders-header">
              <div>
                <h1>{t('admin.ordersPage.title')}</h1>
                <p className="orders-day-label">
                  {dayLabel}
                  {selectedDay && selectedDay === todayDay && <span className="live-indicator"><i />{t('admin.ordersPage.live')}</span>}
                </p>
              </div>
              <div className="orders-actions">
                <Button variant="secondary" onClick={exportCsv} disabled={!dayData} icon={<Download size={16} />}>
                  {t('admin.ordersPage.exportCsv')}
                </Button>
                <Button variant="secondary" onClick={printReport} disabled={!dayData} icon={<Printer size={16} />}>
                  {t('admin.ordersPage.printReport')}
                </Button>
              </div>
            </header>

            <section className="day-controls" aria-label={t('admin.ordersPage.dayControls')}>
              <Button variant="secondary" onClick={() => changeDay(shiftBusinessDay(selectedDay, -1))} disabled={!selectedDay || selectedDay <= shiftBusinessDay(todayDay, -365)} icon={<ChevronLeft size={17} />}>
                {t('admin.ordersPage.previousDay')}
              </Button>
              <Button variant="secondary" onClick={() => changeDay(shiftBusinessDay(selectedDay, 1))} disabled={!selectedDay || selectedDay >= todayDay} icon={<ChevronRight size={17} />}>
                {t('admin.ordersPage.nextDay')}
              </Button>
              <label className="date-picker">
                <CalendarDays size={17} />
                <input
                  type="date"
                  aria-label={t('admin.ordersPage.chooseDate')}
                  value={selectedDay}
                  min={todayDay ? shiftBusinessDay(todayDay, -365) : undefined}
                  max={todayDay || undefined}
                  disabled={!todayDay}
                  onChange={handleDateChange}
                />
              </label>
              <Button variant="outline" onClick={() => changeDay(todayDay)} disabled={!todayDay || selectedDay === todayDay}>
                {t('admin.ordersPage.backToToday')}
              </Button>
            </section>

            {earlierOrdersError && (
              <div className="orders-error" role="alert">
                {migrationHint('unclosed', diagnostics.unclosed?.error)
                  ? <span>{t('admin.ordersPage.unclosedSetupError')}</span>
                  : <span>{t('admin.ordersPage.networkError')}</span>}
                {migrationHint('unclosed', diagnostics.unclosed?.error) && <span>{t(migrationHint('unclosed', diagnostics.unclosed?.error))}</span>}
                <Button variant="secondary" onClick={loadUnclosedOrders}>{t('common.retry')}</Button>
              </div>
            )}
            {earlierOrders.length > 0 && (
              <>
                <section className="unclosed-banner">
                  <strong>{t('admin.ordersPage.unclosedBanner', { count: earlierOrders.length })}</strong>
                  <Button variant="secondary" onClick={() => setUnclosedOpen(true)}>
                    {t('admin.ordersPage.reviewUnclosed')}
                  </Button>
                </section>
                {unclosedOpen && (
                  <div className="orders-overlay" role="presentation" onMouseDown={(event) => {
                    if (event.target === event.currentTarget) setUnclosedOpen(false);
                  }}>
                    <section className="orders-drawer unclosed-drawer" role="dialog" aria-modal="true" aria-labelledby="unclosed-title">
                      <div className="drawer-header">
                        <div><h2 id="unclosed-title">{t('admin.ordersPage.unclosedTitle')}</h2><p>{t('admin.ordersPage.unclosedDescription')}</p></div>
                        <button className="drawer-close" aria-label={t('common.close')} onClick={() => setUnclosedOpen(false)}><X /></button>
                      </div>
                      <div className="unclosed-list">
                        {earlierOrders.map((order) => (
                          <article key={order.id} className="unclosed-order">
                            <div>
                              <strong>{order.table_name || t('admin.ordersPage.table')}</strong>
                              <span>{t('admin.ordersPage.placed')}: {formatDateTime(order.created_at, timezone, lang)} · {t(`admin.ordersPage.status.${order.status}`)}</span>
                            </div>
                            <div className="unclosed-actions">
                              <Button variant="primary" disabled={closingId === order.id} loading={closingId === order.id} onClick={() => closeEarlierOrder(order, 'paid')}>
                                {t('admin.ordersPage.markPaid')}
                              </Button>
                              <Button variant="danger" disabled={closingId === order.id} onClick={() => closeEarlierOrder(order, 'cancelled')}>
                                {t('admin.ordersPage.markCancelled')}
                              </Button>
                            </div>
                          </article>
                        ))}
                      </div>
                    </section>
                  </div>
                )}
              </>
            )}

            {loading ? (
              <section className="summary-grid">
                {Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} height={88} />)}
              </section>
            ) : error ? (
              <div className="orders-error" role="alert">
                <span>{error === 'future_date' ? t('admin.ordersPage.futureDateError')
                  : error === 'date_too_old' ? t('admin.ordersPage.oldDateError')
                    : migrationHint('orders', diagnostics.orders?.error)
                      ? t('admin.ordersPage.ordersSetupError')
                      : t('admin.ordersPage.networkError')}</span>
                {migrationHint('orders', diagnostics.orders?.error) && <span>{t(migrationHint('orders', diagnostics.orders?.error))}</span>}
                <Button variant="secondary" onClick={retryOrders}>{t('common.retry')}</Button>
              </div>
            ) : dayData ? (
              <>
                <section className="summary-grid">
                  {[
                    [t('admin.ordersPage.orders'), summary.orderCount],
                    [t('admin.ordersPage.paidSales'), formatMoney(summary.paidSales, currency)],
                    [t('admin.ordersPage.unpaidValue'), formatMoney(summary.unpaid, currency)],
                    [t('admin.ordersPage.cancelled'), summary.cancelled],
                    [t('admin.ordersPage.averageOrder'), formatMoney(summary.average, currency)],
                    [t('admin.ordersPage.averageAccepted'), summary.acceptedMinutes === null ? '—' : `${summary.acceptedMinutes.toFixed(1)}m`],
                    [t('admin.ordersPage.averageReady'), summary.readyMinutes === null ? '—' : `${summary.readyMinutes.toFixed(1)}m`],
                    [t('admin.ordersPage.itemsSold'), summary.itemCount],
                    [t('admin.ordersPage.busiestHour'), summary.busiestHour],
                  ].map(([label, value]) => (
                    <article className="summary-card" key={label}><span>{label}</span><strong>{value}</strong></article>
                  ))}
                </section>

                <section className="report-grid">
                  <article className="report-card">
                    <h2>{t('admin.ordersPage.ordersPerHour')}</h2>
                    <div className="hour-chart">
                      {summary.hourly.map((count, index) => {
                        const hourStart = new Date(new Date(dayData.from).getTime() + index * 3600000);
                        const label = new Intl.DateTimeFormat(lang === 'am' ? 'am-ET' : 'en-GB', {
                          hour: 'numeric',
                          timeZone: timezone,
                        }).format(hourStart);
                        const max = Math.max(1, ...summary.hourly);
                        return (
                          <div className="hour-column" key={index} title={`${label}: ${count}`}>
                            <span>{count || ''}</span><i style={{ height: `${Math.max(4, count / max * 100)}%` }} />
                            {index % 3 === 0 && <small>{label}</small>}
                          </div>
                        );
                      })}
                    </div>
                  </article>
                  <article className="report-card top-items">
                    <h2>{t('admin.ordersPage.topItems')}</h2>
                    {summary.topItems.length ? summary.topItems.map((item) => (
                      <div className="top-item" key={item.name}>
                        <span>{item.name}</span><strong>{item.quantity}</strong><b>{formatMoney(item.revenue, currency)}</b>
                      </div>
                    )) : <p>{t('admin.ordersPage.noItems')}</p>}
                  </article>
                </section>

                <section className="orders-filter-panel">
                  <div className="status-tabs" role="tablist" aria-label={t('admin.ordersPage.statusLabel')}>
                    {STATUS_KEYS.map((status) => (
                      <button
                        key={status}
                        type="button"
                        role="tab"
                        aria-selected={statusFilter === status}
                        className={statusFilter === status ? 'active' : ''}
                        onClick={() => setStatusFilter(status)}
                      >
                        {t(`admin.ordersPage.statusTabs.${status}`)} <span>{counts[status]}</span>
                      </button>
                    ))}
                  </div>
                  <div className="filter-controls">
                    <label className="search-box"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('admin.ordersPage.searchPlaceholder')} /></label>
                    <select aria-label={t('admin.ordersPage.table')} value={tableFilter} onChange={(event) => setTableFilter(event.target.value)}>
                      <option value="">{t('admin.ordersPage.allTables')}</option>
                      {tables.map((table) => <option key={table} value={table}>{table}</option>)}
                    </select>
                    <select aria-label={t('admin.ordersPage.acceptedBy')} value={acceptedByFilter} onChange={(event) => setAcceptedByFilter(event.target.value)}>
                      <option value="">{t('admin.ordersPage.allBartenders')}</option>
                      {acceptedByOptions.map((name) => <option key={name} value={name}>{name}</option>)}
                    </select>
                    <label className="edited-filter"><input type="checkbox" checked={editedOnly} onChange={(event) => setEditedOnly(event.target.checked)} />{t('admin.ordersPage.editedOnly')}</label>
                    <select aria-label={t('admin.ordersPage.sort')} value={sort} onChange={(event) => setSort(event.target.value)}>
                      <option value="newest">{t('admin.ordersPage.newest')}</option>
                      <option value="oldest">{t('admin.ordersPage.oldest')}</option>
                      <option value="highest">{t('admin.ordersPage.highestTotal')}</option>
                    </select>
                  </div>
                </section>

                {orders.length === 0 ? (
                  <div className="empty-orders"><EmptyState type="coffee" title={t('admin.ordersPage.noOrdersDay')} /></div>
                ) : filteredOrders.length === 0 ? (
                  <div className="empty-orders"><EmptyState type="coffee" title={t('admin.ordersPage.noMatches')} /></div>
                ) : (
                  <section className="orders-list" aria-label={t('admin.ordersPage.orders')}>
                    {filteredOrders.map((order) => (
                      <button type="button" className="order-row" key={order.id} onClick={() => setSelectedOrder(order)}>
                        <span className="order-number">#{orderNumbers.get(order.id)}</span>
                        <span className="order-main">
                          <strong>{order.table_name || t('admin.ordersPage.table')}</strong>
                          <small><Clock3 size={13} />{formatDateTime(order.created_at, timezone, lang)} · {order.item_count} {t('admin.ordersPage.items').toLocaleLowerCase()}</small>
                        </span>
                        <span className="order-accepted">{order.accepted_by_name || '—'}</span>
                        <span className={`status-badge status-${order.status}`}>{t(`admin.ordersPage.status.${order.status}`)}</span>
                        {order.edited_at || order.edit_count > 0 ? <span className="edited-badge">{t('admin.ordersPage.edited')}</span> : null}
                        {order.status === 'cancelled' && <span className="cancelled-by">{order.cancelled_by === 'customer' ? t('admin.ordersPage.cancelledCustomer') : t('admin.ordersPage.cancelledStaff')}</span>}
                        <strong className="order-total">{formatMoney(order.total, currency)}</strong>
                      </button>
                    ))}
                  </section>
                )}
              </>
            ) : null}
          </>
        )}

        {selectedOrder && (
          <div className="orders-overlay" role="presentation" onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedOrder(null);
          }}>
            <section className="orders-drawer" role="dialog" aria-modal="true" aria-labelledby="order-detail-title">
              <div className="drawer-header">
                <div>
                  <h2 id="order-detail-title">{selectedOrder.table_name || t('admin.ordersPage.table')} · #{orderNumbers.get(selectedOrder.id)}</h2>
                  <p><span className={`status-badge status-${selectedOrder.status}`}>{t(`admin.ordersPage.status.${selectedOrder.status}`)}</span> <strong>{formatMoney(selectedOrder.total, currency)}</strong></p>
                </div>
                <button className="drawer-close" aria-label={t('common.close')} onClick={() => setSelectedOrder(null)}><X /></button>
              </div>
              <div className="drawer-content">
                <section>
                  <h3>{t('admin.ordersPage.items')}</h3>
                  <div className="items-table">
                    <div className="items-table-head"><span>{t('admin.ordersPage.item')}</span><span>{t('admin.ordersPage.quantity')}</span><span>{t('admin.ordersPage.unitPrice')}</span><span>{t('admin.ordersPage.lineTotal')}</span></div>
                    {(selectedOrder.items || []).map((item, index) => (
                      <div className="items-table-row" key={`${item.name}-${index}`}>
                        <div><strong>{getItemName(item.name)}</strong>{item.note && <small>{item.note}</small>}{item.station && <small>{t('admin.ordersPage.station')}: {item.station}</small>}</div>
                        <span>{item.qty}</span><span>{formatMoney(item.unit_price, currency)}</span><span>{formatMoney(item.line_total, currency)}</span>
                      </div>
                    ))}
                  </div>
                  <p className="order-note"><strong>{t('admin.ordersPage.orderNote')}:</strong> {selectedOrder.note || '—'}</p>
                </section>

                <section>
                  <h3>{t('admin.ordersPage.timeline')}</h3>
                  <ol className="order-timeline">
                    {[
                      ['placed', selectedOrder.created_at, null],
                      ['accepted', selectedOrder.accepted_at, selectedOrder.accepted_by_name],
                      ['ready', selectedOrder.ready_at, null],
                      ['served', selectedOrder.served_at, null],
                      ['paid', selectedOrder.paid_at, null],
                    ].map(([key, at, by], index, steps) => {
                      const previousStep = steps.slice(0, index).reverse().find(([, timestamp]) => timestamp);
                      const previousAt = previousStep ? previousStep[1] : null;
                      return (
                        <li className={at ? 'complete' : 'pending'} key={key}>
                          <span className="timeline-dot" />
                          <div><strong>{t(`admin.ordersPage.timelineSteps.${key}`)}</strong>
                            {at ? <small>{formatDateTime(at, timezone, lang)}{by ? ` · ${by}` : ''}{previousAt ? ` · ${t('admin.ordersPage.after')} ${durationBetween(previousAt, at)}` : ''}</small> : <small>{t('admin.ordersPage.pending')}</small>}
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                  {(selectedOrder.paid_at || selectedOrder.closed_at) && <p className="total-duration"><strong>{t('admin.ordersPage.totalTime')}:</strong> {durationBetween(selectedOrder.created_at, selectedOrder.paid_at || selectedOrder.closed_at)}</p>}
                </section>

                {(selectedOrder.edited_at || selectedOrder.edit_count || selectedOrder.cancelled_by) && (
                  <section className="audit-details">
                    {(selectedOrder.edited_at || selectedOrder.edit_count) && <p>{t('admin.ordersPage.editedDetails', {
                      count: selectedOrder.edit_count || 1,
                      editor: selectedOrder.edited_by || t('admin.ordersPage.unknown'),
                      time: formatDateTime(selectedOrder.edited_at, timezone, lang) || '—',
                    })}</p>}
                    {selectedOrder.cancelled_by && <p>{t('admin.ordersPage.cancelledDetails', {
                      actor: selectedOrder.cancelled_by === 'customer' ? t('admin.ordersPage.customer') : t('admin.ordersPage.staff'),
                      reason: selectedOrder.cancel_reason || t('admin.ordersPage.noReason'),
                    })}</p>}
                  </section>
                )}
              </div>
            </section>
          </div>
        )}
      </main>

      <style jsx>{`
        .admin-orders-page { max-width: 1440px; margin: 0 auto; padding: 24px; display: flex; flex-direction: column; gap: 18px; min-width: 0; }
        .orders-diagnostics { padding: 14px; background: var(--color-foam); border: 1px solid var(--color-line); border-radius: var(--radius-card); overflow: hidden; }
        .orders-diagnostics summary { cursor: pointer; font-weight: 700; }
        .orders-diagnostics section { margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--color-line); }
        .orders-diagnostics h2 { margin: 0 0 8px; font-size: 15px; }
        .orders-diagnostics p { overflow-wrap: anywhere; }
            .orders-diagnostics pre { max-height: 240px; overflow: auto; padding: 10px; background: var(--color-cream); border-radius: var(--radius); white-space: pre-wrap; overflow-wrap: anywhere; font-size: 12px; }
        .diagnostic-error { color: var(--color-terracotta); }
        .orders-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
        .orders-header h1 { margin: 0; font-size: 30px; }
        .orders-day-label { margin-top: 6px; color: var(--color-muted); display: flex; align-items: center; flex-wrap: wrap; gap: 14px; }
        .orders-actions,.day-controls,.filter-controls,.unclosed-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
        .live-indicator { color: var(--color-sage); display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 700; }
        .live-indicator i { width: 9px; height: 9px; border-radius: 50%; background: var(--color-sage); box-shadow: 0 0 0 4px var(--color-sage-light); }
        .date-picker { display: inline-flex; align-items: center; gap: 8px; padding: 0 8px; border: 1px solid var(--color-line); border-radius: var(--radius); background: var(--color-foam); min-height: 46px; }
        .date-picker input { width: auto; min-width: 150px; min-height: 42px; border: 0; padding: 4px; background: transparent; }
        .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(145px, 1fr)); gap: 10px; }
        .summary-card,.report-card,.orders-filter-panel,.order-row { background: var(--color-foam); border: 1px solid var(--color-line); border-radius: var(--radius-card); box-shadow: var(--shadow-sm); }
        .summary-card { padding: 14px; min-height: 88px; display: flex; flex-direction: column; justify-content: space-between; gap: 8px; }
        .summary-card span { color: var(--color-muted); font-size: 12px; }
        .summary-card strong { font-size: 18px; overflow-wrap: anywhere; }
        .report-grid { display: grid; grid-template-columns: minmax(0, 1.6fr) minmax(260px, 1fr); gap: 12px; }
        .report-card { padding: 16px; min-width: 0; }
        .report-card h2 { margin: 0 0 16px; font-size: 17px; }
        .hour-chart { height: 150px; display: grid; grid-template-columns: repeat(24, minmax(0, 1fr)); align-items: end; gap: 3px; border-bottom: 1px solid var(--color-line); }
        .hour-column { height: 100%; min-width: 0; display: flex; flex-direction: column; justify-content: end; align-items: center; position: relative; }
        .hour-column span { font-size: 9px; color: var(--color-muted); min-height: 12px; }
        .hour-column i { display: block; width: 70%; min-height: 3px; background: var(--color-caramel); border-radius: 4px 4px 0 0; }
        .hour-column small { position: absolute; bottom: -20px; color: var(--color-muted); font-size: 9px; white-space: nowrap; }
        .top-items { padding-bottom: 22px; }
        .top-item { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; gap: 10px; align-items: center; padding: 7px 0; border-bottom: 1px solid var(--color-line); font-size: 12px; }
        .top-item span { overflow: hidden; text-overflow: ellipsis; }
        .top-item b { text-align: right; }
        .orders-filter-panel { padding: 12px; display: flex; flex-direction: column; gap: 12px; }
        .status-tabs { display: flex; flex-wrap: wrap; gap: 7px; }
        .status-tabs button { min-height: 44px; padding: 7px 12px; border: 1px solid var(--color-line); border-radius: 999px; background: transparent; color: var(--text); font-weight: 650; }
        .status-tabs button.active { color: white; border-color: var(--color-roast); background: var(--color-roast); }
        .status-tabs button span { opacity: .8; margin-left: 4px; }
        .filter-controls select { width: auto; max-width: 200px; min-width: 140px; min-height: 44px; padding: 8px 10px; font-size: 13px; }
        .search-box { flex: 1 1 220px; position: relative; display: flex; align-items: center; }
        .search-box svg { position: absolute; left: 11px; color: var(--color-muted); }
        .search-box input { min-height: 44px; padding: 8px 12px 8px 36px; }
        .edited-filter { display: inline-flex; align-items: center; gap: 8px; min-height: 44px; white-space: nowrap; font-size: 13px; }
        .edited-filter input { width: 18px; min-height: 18px; accent-color: var(--color-roast); }
        .orders-list { display: flex; flex-direction: column; gap: 9px; }
        .order-row { width: 100%; min-height: 70px; text-align: left; display: grid; grid-template-columns: 48px minmax(130px,1fr) minmax(90px,auto) auto auto auto auto; align-items: center; gap: 12px; padding: 12px; cursor: pointer; }
        .order-row:hover { border-color: var(--color-caramel); }
        .order-number { color: var(--color-caramel); font-weight: 800; font-size: 16px; }
        .order-main { min-width: 0; display: flex; flex-direction: column; gap: 4px; }
        .order-main strong { overflow-wrap: anywhere; }
        .order-main small { display: flex; align-items: center; gap: 4px; color: var(--color-muted); font-size: 11px; }
        .order-accepted { font-size: 12px; color: var(--color-muted); }
        .status-badge,.edited-badge { border-radius: 999px; padding: 5px 9px; white-space: nowrap; font-size: 11px; font-weight: 750; }
        .status-open { color: #8a5c15; background: #fff2d6; }
        .status-served { color: #533bb0; background: #eee9ff; }
        .status-paid { color: #20744c; background: #e6f5ec; }
        .status-cancelled { color: #a1392c; background: #fbe9e5; }
        .edited-badge { color: #8a5c15; background: #fff2d6; }
        .cancelled-by { color: var(--color-terracotta); font-size: 11px; }
        .order-total { white-space: nowrap; font-size: 13px; }
        .empty-orders { padding: 24px; background: var(--color-foam); border: 1px solid var(--color-line); border-radius: var(--radius-card); }
        .orders-error { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px; background: var(--color-terracotta-light); color: var(--color-terracotta); border-radius: var(--radius); flex-wrap: wrap; }
        .unclosed-banner { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 16px; background: #fff5d8; border: 1px solid #edd28b; border-radius: var(--radius); color: #60470d; flex-wrap: wrap; }
        .orders-overlay { position: fixed; inset: 0; z-index: 1000; display: flex; justify-content: flex-end; background: rgba(25,16,10,.55); }
        .orders-drawer { width: min(660px, 100%); height: 100%; overflow: auto; background: var(--color-foam); box-shadow: var(--shadow-lg); }
        .unclosed-drawer { width: min(700px, 100%); }
        .drawer-header { position: sticky; top: 0; z-index: 1; display: flex; justify-content: space-between; gap: 14px; padding: 18px; background: var(--color-foam); border-bottom: 1px solid var(--color-line); }
        .drawer-header h2 { margin: 0; font-size: 20px; overflow-wrap: anywhere; }
        .drawer-header p { display: flex; align-items: center; gap: 10px; margin-top: 8px; }
        .drawer-close { width: 44px; height: 44px; flex: 0 0 44px; border-radius: var(--radius); display: grid; place-items: center; background: var(--primary-light); }
        .drawer-content { display: flex; flex-direction: column; gap: 24px; padding: 18px; }
        .drawer-content h3 { margin: 0 0 12px; font-size: 17px; }
        .items-table { width: 100%; }
        .items-table-head,.items-table-row { display: grid; grid-template-columns: minmax(100px,2fr) repeat(3,minmax(60px,1fr)); gap: 8px; padding: 10px 6px; border-bottom: 1px solid var(--color-line); font-size: 12px; }
        .items-table-head { color: var(--color-muted); font-weight: 700; }
        .items-table-row > div { display: flex; flex-direction: column; gap: 3px; min-width: 0; overflow-wrap: anywhere; }
        .items-table-row small { color: var(--color-muted); }
        .order-note { margin-top: 12px; font-size: 13px; overflow-wrap: anywhere; }
        .order-timeline { list-style: none; display: flex; flex-direction: column; gap: 0; }
        .order-timeline li { display: flex; gap: 12px; min-height: 54px; position: relative; }
        .order-timeline li:not(:last-child):before { content: ''; position: absolute; left: 6px; top: 14px; bottom: -1px; width: 2px; background: var(--color-line); }
        .timeline-dot { z-index: 0; margin-top: 4px; width: 14px; height: 14px; border: 2px solid var(--color-line); background: var(--color-foam); border-radius: 50%; flex: 0 0 14px; }
        .complete .timeline-dot { border-color: var(--color-sage); background: var(--color-sage); }
        .order-timeline li div { display: flex; flex-direction: column; gap: 3px; }
        .order-timeline small { color: var(--color-muted); }
        .pending { opacity: .65; }
        .total-duration { padding-top: 10px; }
        .audit-details { padding: 14px; background: var(--color-amber-light); border-radius: var(--radius); overflow-wrap: anywhere; }
        .audit-details p + p { margin-top: 8px; }
        .unclosed-list { padding: 14px; display: flex; flex-direction: column; gap: 10px; }
        .unclosed-order { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 14px; border: 1px solid var(--color-line); border-radius: var(--radius); flex-wrap: wrap; }
        .unclosed-order > div:first-child { display: flex; flex-direction: column; gap: 4px; }
        .unclosed-order span { color: var(--color-muted); font-size: 12px; }
        @media (max-width: 760px) {
          .admin-orders-page { padding: 16px 12px; }
          .orders-header h1 { font-size: 26px; }
          .orders-actions { width: 100%; }
          .orders-actions :global(button) { flex: 1 1 150px; }
          .day-controls :global(button) { flex: 1 1 130px; }
          .report-grid { grid-template-columns: 1fr; }
          .order-row { grid-template-columns: 42px minmax(0,1fr) auto; gap: 8px; }
          .order-accepted { grid-column: 2; }
          .order-row .status-badge { grid-column: 3; grid-row: 1; }
          .edited-badge,.cancelled-by { grid-column: 2; justify-self: start; }
          .order-total { grid-column: 3; grid-row: 2; }
          .filter-controls select { flex: 1 1 140px; max-width: none; }
          .search-box { flex-basis: 100%; }
          .orders-drawer { width: 100%; height: 100dvh; }
          .items-table-head,.items-table-row { grid-template-columns: minmax(90px,1.6fr) repeat(3,minmax(48px,1fr)); gap: 4px; font-size: 11px; }
        }
      `}</style>
    </AppShell>
  );
}
