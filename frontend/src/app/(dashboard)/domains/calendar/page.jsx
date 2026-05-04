'use client';
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval,
  startOfWeek, endOfWeek, isSameMonth, isSameDay, parseISO, differenceInDays,
} from 'date-fns';
import { clsx } from 'clsx';
import Link from 'next/link';
import {
  Globe, ChevronLeft, ChevronRight, Table2, CalendarDays, Mail,
  X, AlertTriangle, Clock, CheckCircle, Plus, Download, ShieldAlert,
  ChevronDown, ExternalLink, Pencil,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function urgencyLevel(days) {
  if (days < 0) return 'expired';
  if (days <= 7) return 'critical';
  if (days <= 15) return 'warning';
  if (days <= 60) return 'upcoming';
  return 'safe';
}

const URGENCY_DOT = {
  expired: 'bg-red-600',
  critical: 'bg-red-500',
  warning: 'bg-orange-400',
  upcoming: 'bg-amber-400',
  safe: 'bg-green-500',
};

const URGENCY_BADGE = {
  expired: 'bg-red-100 text-red-800 border border-red-200',
  critical: 'bg-red-50 text-red-700 border border-red-200',
  warning: 'bg-orange-50 text-orange-700 border border-orange-200',
  upcoming: 'bg-amber-50 text-amber-700 border border-amber-200',
  safe: 'bg-green-50 text-green-700 border border-green-200',
};

const URGENCY_BORDER = {
  expired: 'border-l-red-600',
  critical: 'border-l-red-500',
  warning: 'border-l-orange-400',
  upcoming: 'border-l-amber-400',
  safe: 'border-l-green-400',
};

const URGENCY_PROGRESS = {
  expired: 'bg-red-500',
  critical: 'bg-red-400',
  warning: 'bg-orange-400',
  upcoming: 'bg-amber-400',
  safe: 'bg-green-400',
};

function daysLabel(days) {
  if (days < 0) return 'EXPIRED';
  if (days === 0) return 'TODAY';
  if (days === 1) return '1 day';
  return `${days} days`;
}

function progressWidth(days) {
  if (days <= 0) return 0;
  return Math.min(100, Math.round((days / 365) * 100));
}

// ─── Day Drawer ───────────────────────────────────────────────────────────────

function DayDrawer({ day, domains, today, onClose }) {
  if (!day) return null;
  const key = format(day, 'yyyy-MM-dd');
  const domsOnDay = domains.filter(d => d.expiry_date && d.expiry_date.startsWith(key));

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400 mb-0.5">Expiry Date</p>
            <h3 className="text-xl font-bold text-gray-900">{format(day, 'EEEE, dd MMMM yyyy')}</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {domsOnDay.length} domain{domsOnDay.length !== 1 ? 's' : ''} expiring
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {domsOnDay.map(d => {
            const days = differenceInDays(parseISO(d.expiry_date), today);
            const level = urgencyLevel(days);
            const hasContacts = d.finance_email || d.admin_email || d.vendor_email;
            return (
              <div key={d.id}
                className={clsx('rounded-xl border border-gray-100 shadow-sm overflow-hidden border-l-4', URGENCY_BORDER[level])}>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <Globe className="w-4 h-4 text-gray-400 shrink-0" />
                        <span className="text-sm font-bold text-gray-900 truncate">{d.domain_name}</span>
                      </div>
                      <p className="text-xs text-gray-500">{d.registrar || 'No registrar'} · {format(parseISO(d.expiry_date), 'dd MMM yyyy')}</p>
                    </div>
                    <span className={clsx('shrink-0 text-xs font-bold px-2.5 py-1 rounded-full', URGENCY_BADGE[level])}>
                      {level === 'expired' ? 'EXPIRED' : level.toUpperCase()}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="mb-3">
                    <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                      <span>Time remaining</span>
                      <span className="font-semibold">{daysLabel(days)}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={clsx('h-full rounded-full transition-all', URGENCY_PROGRESS[level])}
                        style={{ width: `${progressWidth(days)}%` }}
                      />
                    </div>
                  </div>

                  {/* Contacts */}
                  {hasContacts && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {d.finance_email && (
                        <a href={`mailto:${d.finance_email}`}
                          className="text-[10px] bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full hover:bg-blue-100 font-medium transition-colors flex items-center gap-1">
                          <Mail className="w-2.5 h-2.5" /> F: {d.finance_email.split('@')[0]}
                        </a>
                      )}
                      {d.admin_email && (
                        <a href={`mailto:${d.admin_email}`}
                          className="text-[10px] bg-purple-50 text-purple-700 border border-purple-100 px-2 py-0.5 rounded-full hover:bg-purple-100 font-medium transition-colors flex items-center gap-1">
                          <Mail className="w-2.5 h-2.5" /> A: {d.admin_email.split('@')[0]}
                        </a>
                      )}
                      {d.vendor_email && (
                        <a href={`mailto:${d.vendor_email}`}
                          className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full hover:bg-emerald-100 font-medium transition-colors flex items-center gap-1">
                          <Mail className="w-2.5 h-2.5" /> V: {d.vendor_email.split('@')[0]}
                        </a>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Link
                      href={`/domains?search=${encodeURIComponent(d.domain_name)}`}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg transition-colors"
                    >
                      <Pencil className="w-3 h-3" /> Renew / Edit
                    </Link>
                    <Link
                      href={`/domains?search=${encodeURIComponent(d.domain_name)}`}
                      className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" /> View
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Summary Card ─────────────────────────────────────────────────────────────

function SummaryCard({ icon: Icon, label, count, sub, colorClass, bgClass, borderClass, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'flex-1 min-w-[120px] text-left p-4 rounded-xl border-2 transition-all duration-150 shadow-sm hover:shadow-md group',
        active ? `${borderClass} ${bgClass}` : 'border-gray-100 bg-white hover:border-gray-200',
      )}
    >
      <div className="flex items-start justify-between">
        <div className={clsx('p-2 rounded-lg mb-2 transition-colors', active ? bgClass : 'bg-gray-50 group-hover:bg-gray-100')}>
          <Icon className={clsx('w-4 h-4', colorClass)} />
        </div>
        {active && <div className={clsx('w-2 h-2 rounded-full mt-1', colorClass.replace('text-', 'bg-'))} />}
      </div>
      <div className={clsx('text-2xl font-extrabold mb-0.5 tracking-tight', active ? colorClass : 'text-gray-900')}>{count}</div>
      <div className={clsx('text-xs font-semibold', active ? colorClass : 'text-gray-500')}>{label}</div>
      {sub && <div className="text-[10px] text-gray-400 mt-0.5">{sub}</div>}
    </button>
  );
}

// ─── Right-panel domain card ──────────────────────────────────────────────────

function DomainCard({ d, today, onDayClick }) {
  const days = differenceInDays(parseISO(d.expiry_date), today);
  const level = urgencyLevel(days);
  const hasContacts = d.finance_email || d.admin_email || d.vendor_email;

  return (
    <div className={clsx('rounded-xl border border-gray-100 shadow-sm overflow-hidden border-l-4 bg-white hover:shadow-md transition-all', URGENCY_BORDER[level])}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span className="text-sm font-bold text-gray-900 truncate">{d.domain_name}</span>
              {hasContacts && <Mail className="w-3 h-3 text-blue-400 shrink-0" />}
            </div>
            <p className="text-[11px] text-gray-500 mt-0.5">
              {format(parseISO(d.expiry_date), 'dd MMM yyyy')} · {d.registrar || '—'}
            </p>
          </div>
          <span className={clsx('shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap', URGENCY_BADGE[level])}>
            {level === 'expired' ? 'EXPIRED' : level.toUpperCase()}
          </span>
        </div>

        {/* Progress bar */}
        <div className="mb-2.5">
          <div className="flex justify-between text-[10px] text-gray-400 mb-1">
            <span>Renewal cycle</span>
            <span className="font-semibold text-gray-600">{daysLabel(days)}</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={clsx('h-full rounded-full', URGENCY_PROGRESS[level])}
              style={{ width: `${progressWidth(days)}%` }}
            />
          </div>
        </div>

        {/* Contact badges */}
        {hasContacts && (
          <div className="flex flex-wrap gap-1 mb-3">
            {d.finance_email && (
              <a href={`mailto:${d.finance_email}`}
                className="text-[10px] bg-blue-50 text-blue-700 border border-blue-100 px-1.5 py-0.5 rounded-full hover:bg-blue-100 font-medium transition-colors">
                F: {d.finance_email.split('@')[0]}
              </a>
            )}
            {d.admin_email && (
              <a href={`mailto:${d.admin_email}`}
                className="text-[10px] bg-purple-50 text-purple-700 border border-purple-100 px-1.5 py-0.5 rounded-full hover:bg-purple-100 font-medium transition-colors">
                A: {d.admin_email.split('@')[0]}
              </a>
            )}
            {d.vendor_email && (
              <a href={`mailto:${d.vendor_email}`}
                className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-1.5 py-0.5 rounded-full hover:bg-emerald-100 font-medium transition-colors">
                V: {d.vendor_email.split('@')[0]}
              </a>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Link
            href={`/domains?search=${encodeURIComponent(d.domain_name)}`}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-[11px] font-semibold rounded-lg transition-colors"
          >
            <Pencil className="w-3 h-3" /> Renew / Edit
          </Link>
          <button
            onClick={() => onDayClick(parseISO(d.expiry_date))}
            className="flex items-center justify-center gap-1 px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-[11px] font-semibold rounded-lg transition-colors"
            title="View on calendar"
          >
            <CalendarDays className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const MONTHS = Array.from({ length: 13 }, (_, i) => addMonths(new Date(), i - 3));
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');

  const { data, isLoading } = useQuery({
    queryKey: ['domains-calendar'],
    queryFn: () => api.get('/domains', { params: { limit: 500, sort: 'expiry_date', order: 'ASC' } }).then(r => r.data),
  });

  const domains = data?.data || [];
  const today = new Date();

  // Global counts (all domains, not just current month)
  const globalCounts = useMemo(() => {
    const counts = { total: domains.length, critical: 0, warning: 0, upcoming: 0, safe: 0, expired: 0 };
    domains.forEach(d => {
      if (!d.expiry_date) return;
      const days = differenceInDays(parseISO(d.expiry_date), today);
      const level = urgencyLevel(days);
      counts[level] = (counts[level] || 0) + 1;
    });
    return counts;
  }, [domains]);

  const expiryMap = useMemo(() => {
    const map = {};
    domains.forEach(d => {
      if (!d.expiry_date) return;
      const key = d.expiry_date.split('T')[0];
      if (!map[key]) map[key] = [];
      map[key].push(d);
    });
    return map;
  }, [domains]);

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const expiringThisMonth = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return domains.filter(d => {
      if (!d.expiry_date) return false;
      const exp = parseISO(d.expiry_date);
      return exp >= start && exp <= end;
    });
  }, [domains, currentMonth]);

  const filteredPanel = useMemo(() => {
    if (activeFilter === 'all') return expiringThisMonth;
    if (activeFilter === 'critical') {
      return expiringThisMonth.filter(d => {
        const days = differenceInDays(parseISO(d.expiry_date), today);
        const l = urgencyLevel(days);
        return l === 'expired' || l === 'critical' || l === 'warning';
      });
    }
    if (activeFilter === 'upcoming') {
      return expiringThisMonth.filter(d => urgencyLevel(differenceInDays(parseISO(d.expiry_date), today)) === 'upcoming');
    }
    if (activeFilter === 'safe') {
      return expiringThisMonth.filter(d => urgencyLevel(differenceInDays(parseISO(d.expiry_date), today)) === 'safe');
    }
    return expiringThisMonth;
  }, [expiringThisMonth, activeFilter]);

  const criticalGlobal = (globalCounts.expired || 0) + (globalCounts.critical || 0) + (globalCounts.warning || 0);

  return (
    <div className="space-y-4">
      {/* Day drawer */}
      {selectedDay && (
        <DayDrawer day={selectedDay} domains={domains} today={today} onClose={() => setSelectedDay(null)} />
      )}

      {/* ── Page header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <nav className="text-xs text-gray-400 mb-1 flex items-center gap-1">
            <Link href="/dashboard" className="hover:text-brand-600">Dashboard</Link>
            <span>/</span>
            <Link href="/domains" className="hover:text-brand-600">Domains</Link>
            <span>/</span>
            <span className="text-gray-700 font-medium">Calendar View</span>
          </nav>
          <h1 className="text-xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-brand-600" />
            NGI Domain Hub
          </h1>
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="card p-1 flex items-center gap-0.5 bg-gray-100 rounded-lg">
            <Link href="/domains" className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-gray-600 hover:bg-white transition-colors">
              <Table2 className="w-3.5 h-3.5" /> Table
            </Link>
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-white shadow-sm text-brand-700">
              <CalendarDays className="w-3.5 h-3.5" /> Calendar
            </span>
          </div>
          <Link href="/domains?new=1"
            className="flex items-center gap-1.5 px-3 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm">
            <Plus className="w-3.5 h-3.5" /> Add Domain
          </Link>
          <Link href="/domains"
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-lg transition-colors shadow-sm">
            <Download className="w-3.5 h-3.5" /> Export
          </Link>
        </div>
      </div>

      {/* ── Summary cards ── */}
      {isLoading ? (
        <div className="flex gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex-1 h-24 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="flex gap-3 flex-wrap">
          <SummaryCard
            icon={Globe}
            label="Total Domains"
            count={globalCounts.total}
            sub="all registered"
            colorClass="text-brand-600"
            bgClass="bg-brand-50"
            borderClass="border-brand-400"
            active={activeFilter === 'all'}
            onClick={() => setActiveFilter('all')}
          />
          <SummaryCard
            icon={ShieldAlert}
            label="Critical / Warning"
            count={criticalGlobal}
            sub="< 60 days left"
            colorClass="text-red-600"
            bgClass="bg-red-50"
            borderClass="border-red-400"
            active={activeFilter === 'critical'}
            onClick={() => setActiveFilter(activeFilter === 'critical' ? 'all' : 'critical')}
          />
          <SummaryCard
            icon={Clock}
            label="Upcoming"
            count={globalCounts.upcoming || 0}
            sub="15 – 60 days"
            colorClass="text-amber-600"
            bgClass="bg-amber-50"
            borderClass="border-amber-400"
            active={activeFilter === 'upcoming'}
            onClick={() => setActiveFilter(activeFilter === 'upcoming' ? 'all' : 'upcoming')}
          />
          <SummaryCard
            icon={CheckCircle}
            label="Safe"
            count={globalCounts.safe || 0}
            sub="> 60 days"
            colorClass="text-green-600"
            bgClass="bg-green-50"
            borderClass="border-green-400"
            active={activeFilter === 'safe'}
            onClick={() => setActiveFilter(activeFilter === 'safe' ? 'all' : 'safe')}
          />
        </div>
      )}

      {/* ── Calendar + Panel ── */}
      <div className="grid grid-cols-1 xl:grid-cols-10 gap-4">

        {/* Calendar — 70% */}
        <div className="xl:col-span-7 card overflow-hidden">

          {/* Month nav + month selector */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-white">
            <button
              onClick={() => setCurrentMonth(m => subMonths(m, 1))}
              className="p-2 rounded-lg hover:bg-gray-100 active:scale-95 transition-all"
            >
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </button>

            <div className="flex items-center gap-3">
              <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">
                {format(currentMonth, 'MMMM yyyy')}
              </h2>
              {/* Month jump dropdown */}
              <div className="relative">
                <select
                  value={format(currentMonth, 'yyyy-MM')}
                  onChange={e => {
                    const [y, m] = e.target.value.split('-').map(Number);
                    setCurrentMonth(new Date(y, m - 1, 1));
                  }}
                  className="appearance-none bg-gray-50 border border-gray-200 text-xs font-semibold text-gray-600 rounded-lg pl-3 pr-7 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-400 cursor-pointer"
                >
                  {MONTHS.map(m => (
                    <option key={format(m, 'yyyy-MM')} value={format(m, 'yyyy-MM')}>
                      {format(m, 'MMM yyyy')}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3 h-3 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              {!isSameMonth(currentMonth, today) && (
                <button
                  onClick={() => setCurrentMonth(new Date())}
                  className="text-xs font-bold text-brand-600 hover:text-brand-800 bg-brand-50 hover:bg-brand-100 px-2.5 py-1 rounded-full transition-colors border border-brand-200"
                >
                  Today
                </button>
              )}
            </div>

            <button
              onClick={() => setCurrentMonth(m => addMonths(m, 1))}
              className="p-2 rounded-lg hover:bg-gray-100 active:scale-95 transition-all"
            >
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50">
            {WEEKDAYS.map((d, i) => (
              <div key={d} className={clsx(
                'py-2.5 text-center text-xs font-bold border-r last:border-r-0 border-gray-100 tracking-wide uppercase',
                i >= 5 ? 'text-gray-300' : 'text-gray-400'
              )}>
                {d}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7">
            {isLoading
              ? Array.from({ length: 35 }).map((_, i) => (
                  <div key={i} className="min-h-[110px] border-b border-r border-gray-100 p-2">
                    <div className="h-5 w-6 bg-gray-100 rounded animate-pulse mb-2" />
                    <div className="h-3 w-12 bg-gray-100 rounded animate-pulse" />
                  </div>
                ))
              : calendarDays.map((day, i) => {
                  const key = format(day, 'yyyy-MM-dd');
                  const domsOnDay = expiryMap[key] || [];
                  const isToday = isSameDay(day, today);
                  const isCurrentMonth = isSameMonth(day, currentMonth);
                  const hasDoms = domsOnDay.length > 0 && isCurrentMonth;
                  const dayOfWeek = day.getDay();
                  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                  const worstDays = hasDoms
                    ? Math.min(...domsOnDay.map(d => differenceInDays(parseISO(d.expiry_date), today)))
                    : null;

                  return (
                    <div
                      key={i}
                      onClick={() => hasDoms && setSelectedDay(day)}
                      className={clsx(
                        'min-h-[110px] border-b border-r border-gray-100 p-2 relative flex flex-col transition-all duration-100',
                        !isCurrentMonth && 'bg-gray-50/50',
                        isCurrentMonth && !isToday && !isWeekend && 'bg-white',
                        isCurrentMonth && isWeekend && !isToday && 'bg-slate-50/60',
                        isToday && 'bg-blue-50/60 ring-1 ring-inset ring-blue-300',
                        hasDoms && 'cursor-pointer hover:bg-blue-50/80 hover:shadow-inner',
                      )}
                    >
                      {/* Date number */}
                      <div className={clsx(
                        'w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold mb-1.5 select-none',
                        isToday ? 'bg-brand-700 text-white shadow-sm' :
                        !isCurrentMonth ? 'text-gray-300' :
                        isWeekend ? 'text-gray-400' : 'text-gray-800'
                      )}>
                        {format(day, 'd')}
                      </div>

                      {hasDoms && (
                        <>
                          {/* Count badge */}
                          <div className={clsx(
                            'text-[10px] font-bold px-1.5 py-0.5 rounded-md w-fit mb-1.5',
                            worstDays !== null && worstDays <= 15 ? 'bg-red-100 text-red-700' :
                            worstDays !== null && worstDays <= 60 ? 'bg-amber-100 text-amber-700' :
                            'bg-green-100 text-green-700'
                          )}>
                            {domsOnDay.length} domain{domsOnDay.length > 1 ? 's' : ''}
                          </div>

                          {/* Urgency dots */}
                          <div className="flex flex-wrap gap-1">
                            {domsOnDay.slice(0, 6).map((d, di) => {
                              const days = differenceInDays(parseISO(d.expiry_date), today);
                              const level = urgencyLevel(days);
                              return (
                                <span
                                  key={di}
                                  className={clsx('w-2 h-2 rounded-full ring-1 ring-white shadow-sm', URGENCY_DOT[level])}
                                  title={d.domain_name}
                                />
                              );
                            })}
                            {domsOnDay.length > 6 && (
                              <span className="text-[9px] text-gray-400">+{domsOnDay.length - 6}</span>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-5 px-5 py-2.5 border-t border-gray-100 bg-gray-50 text-xs text-gray-500">
            <span className="flex items-center gap-1.5 font-medium"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> Critical &lt;15d</span>
            <span className="flex items-center gap-1.5 font-medium"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> Upcoming 15–60d</span>
            <span className="flex items-center gap-1.5 font-medium"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" /> Safe &gt;60d</span>
            <span className="ml-auto text-gray-300 text-[10px] italic">Click a date to see domain details</span>
          </div>
        </div>

        {/* Right panel — 30% */}
        <div className="xl:col-span-3 flex flex-col gap-3 min-h-0">

          {/* Panel header */}
          <div className="card px-4 py-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-800">
                {format(currentMonth, 'MMMM yyyy')}
              </h3>
              <p className="text-[11px] text-gray-400">
                {filteredPanel.length} domain{filteredPanel.length !== 1 ? 's' : ''}
                {activeFilter !== 'all' ? ` · ${activeFilter} filter` : ''}
              </p>
            </div>
            {activeFilter !== 'all' && (
              <button
                onClick={() => setActiveFilter('all')}
                className="text-[10px] font-semibold text-gray-400 hover:text-red-500 flex items-center gap-1"
              >
                <X className="w-3 h-3" /> Clear
              </button>
            )}
          </div>

          {/* Domain cards */}
          <div className="flex flex-col gap-3 overflow-y-auto max-h-[calc(100vh-360px)] pr-0.5">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="card p-4 animate-pulse">
                  <div className="h-4 bg-gray-100 rounded w-2/3 mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-1/2 mb-3" />
                  <div className="h-2 bg-gray-100 rounded w-full" />
                </div>
              ))
            ) : filteredPanel.length === 0 ? (
              <div className="card py-12 text-center text-gray-400 text-sm">
                <div className="text-3xl mb-3">✅</div>
                <p className="font-semibold">No domains</p>
                <p className="text-xs mt-1">for {format(currentMonth, 'MMMM yyyy')}</p>
              </div>
            ) : filteredPanel.map(d => (
              <DomainCard
                key={d.id}
                d={d}
                today={today}
                onDayClick={day => {
                  setCurrentMonth(startOfMonth(day));
                  setSelectedDay(day);
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
