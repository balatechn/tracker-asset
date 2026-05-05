'use client';
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval,
  startOfWeek, endOfWeek, isSameMonth, isSameDay, parseISO, differenceInDays,
} from 'date-fns';
import { clsx } from 'clsx';
import Link from 'next/link';
import {
  Globe, ChevronLeft, ChevronRight, RefreshCw, Mail, Bell,
  Pencil, X, AlertTriangle, CalendarDays, CheckCircle,
} from 'lucide-react';
import StatsCards from '@/components/Dashboard/StatsCards';
import UpcomingRenewals from '@/components/Dashboard/UpcomingRenewals';

// ── Urgency helpers ───────────────────────────────────────────────────────────

function urgencyLevel(days) {
  if (days < 0) return 'expired';
  if (days <= 7) return 'critical';
  if (days <= 15) return 'warning';
  if (days <= 60) return 'upcoming';
  return 'safe';
}

const DOT   = { expired:'bg-red-600',  critical:'bg-red-500',    warning:'bg-orange-400', upcoming:'bg-amber-400', safe:'bg-green-500' };
const BADGE = { expired:'bg-red-100 text-red-800 border-red-200', critical:'bg-red-50 text-red-700 border-red-200', warning:'bg-orange-50 text-orange-700 border-orange-200', upcoming:'bg-amber-50 text-amber-700 border-amber-200', safe:'bg-green-50 text-green-700 border-green-200' };
const BLEFT = { expired:'border-l-red-600', critical:'border-l-red-500', warning:'border-l-orange-400', upcoming:'border-l-amber-400', safe:'border-l-green-400' };
const BPROG = { expired:'bg-red-500',   critical:'bg-red-400',    warning:'bg-orange-400', upcoming:'bg-amber-400', safe:'bg-green-400' };

function daysLabel(days) {
  if (days < 0) return 'EXPIRED';
  if (days === 0) return 'Today!';
  return days + 'd left';
}

function progressPct(days) {
  if (days <= 0) return 2;
  return Math.min(100, Math.round((days / 365) * 100));
}

function greeting(name) {
  const h = new Date().getHours();
  const g = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  return g + (name ? ', ' + name : '');
}

// ── Day click modal ───────────────────────────────────────────────────────────

function DayModal({ day, domains, today, onClose }) {
  if (!day) return null;
  const key = format(day, 'yyyy-MM-dd');
  const list = domains.filter(d => d.expiry_date && d.expiry_date.startsWith(key));
  if (!list.length) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-blue-50 to-white border-b border-gray-100">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400">Expiry Date</p>
            <h3 className="text-base font-bold text-gray-900">{format(day, 'EEEE, dd MMMM yyyy')}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{list.length} domain{list.length > 1 ? 's' : ''} expiring</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
          {list.map(d => {
            const days = differenceInDays(parseISO(d.expiry_date), today);
            const level = urgencyLevel(days);
            return (
              <div key={d.id} className={clsx('rounded-xl border border-gray-100 border-l-4 overflow-hidden', BLEFT[level])}>
                <div className="p-3">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Globe className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="text-sm font-bold text-gray-900 truncate">{d.domain_name}</span>
                    </div>
                    <span className={clsx('shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border', BADGE[level])}>
                      {daysLabel(days)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">{d.registrar || 'No registrar'}</p>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-3">
                    <div className={clsx('h-full rounded-full', BPROG[level])} style={{ width: progressPct(days) + '%' }} />
                  </div>
                  <Link
                    href={'/domains?search=' + encodeURIComponent(d.domain_name)}
                    onClick={onClose}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg transition-colors"
                  >
                    <Pencil className="w-3 h-3" /> Renew / Edit
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Mini Calendar ─────────────────────────────────────────────────────────────

const WD = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

function MiniCalendar({ domains, today }) {
  const [month, setMonth] = useState(new Date());
  const [selDay, setSelDay] = useState(null);

  const expiryMap = useMemo(() => {
    const m = {};
    domains.forEach(d => {
      if (!d.expiry_date) return;
      const k = d.expiry_date.split('T')[0];
      if (!m[k]) m[k] = [];
      m[k].push(d);
    });
    return m;
  }, [domains]);

  const gridDays = useMemo(() => eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
  }), [month]);

  return (
    <>
      {selDay && <DayModal day={selDay} domains={domains} today={today} onClose={() => setSelDay(null)} />}

      {/* Month nav */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setMonth(m => subMonths(m, 1))} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
          <ChevronLeft className="w-4 h-4 text-gray-600" />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-gray-900">{format(month, 'MMMM yyyy')}</span>
          {!isSameMonth(month, today) && (
            <button onClick={() => setMonth(new Date())} className="text-[11px] font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full border border-brand-200 hover:bg-brand-100 transition-colors">
              Today
            </button>
          )}
        </div>
        <button onClick={() => setMonth(m => addMonths(m, 1))} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
          <ChevronRight className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {WD.map((d, i) => (
          <div key={d} className={clsx('text-center text-[11px] font-bold py-1 uppercase tracking-wide', i >= 5 ? 'text-gray-300' : 'text-gray-400')}>
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-px">
        {gridDays.map((day, i) => {
          const key = format(day, 'yyyy-MM-dd');
          const doms = expiryMap[key] || [];
          const isCur = isSameMonth(day, month);
          const isTod = isSameDay(day, today);
          const hasDoms = doms.length > 0 && isCur;
          const dw = day.getDay();
          const isWknd = dw === 0 || dw === 6;
          return (
            <div
              key={i}
              onClick={() => hasDoms && setSelDay(day)}
              className={clsx(
                'flex flex-col items-center py-1.5 rounded-lg min-h-[54px] transition-all duration-100 select-none',
                !isCur && 'opacity-25',
                isTod && 'bg-brand-50 ring-1 ring-brand-300',
                isWknd && isCur && !isTod && 'bg-slate-50/50',
                hasDoms && 'cursor-pointer hover:bg-blue-50 hover:ring-1 hover:ring-blue-200',
              )}
            >
              <span className={clsx(
                'w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold',
                isTod ? 'bg-brand-700 text-white shadow-sm' : isWknd ? 'text-gray-400' : 'text-gray-800'
              )}>
                {format(day, 'd')}
              </span>
              {hasDoms && (
                <div className="flex gap-0.5 flex-wrap justify-center mt-1">
                  {doms.slice(0, 3).map((d, di) => {
                    const dl = differenceInDays(parseISO(d.expiry_date), today);
                    return <span key={di} className={clsx('w-1.5 h-1.5 rounded-full', DOT[urgencyLevel(dl)])} />;
                  })}
                  {doms.length > 3 && <span className="text-[8px] text-gray-400 leading-none self-center">+{doms.length - 3}</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-gray-100 text-[11px] text-gray-500">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> &lt;15d critical</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> 15–60d upcoming</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> &gt;60d safe</span>
        <span className="ml-auto text-gray-300 italic">Click date for details</span>
      </div>
    </>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuth();

  const { data: summaryData, isLoading: sumLoading, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => api.get('/dashboard/summary').then(r => r.data),
    refetchInterval: 60000,
  });

  const { data: domainsData, isLoading: domLoading } = useQuery({
    queryKey: ['domains-dashboard'],
    queryFn: () => api.get('/domains', { params: { limit: 300, sort: 'expiry_date', order: 'ASC' } }).then(r => r.data),
    refetchInterval: 120000,
  });

  const domains = domainsData?.data || [];
  const today = useMemo(() => new Date(), []);

  const urgentDomains = useMemo(() =>
    domains
      .filter(d => d.expiry_date && differenceInDays(parseISO(d.expiry_date), today) <= 60)
      .sort((a, b) => differenceInDays(parseISO(a.expiry_date), today) - differenceInDays(parseISO(b.expiry_date), today)),
    [domains, today]
  );

  const firstName = (user?.full_name || user?.username || '').split(' ')[0];

  return (
    <div className="space-y-4">

      {/* ── Page Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">
            {greeting(firstName)}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {format(today, 'EEEE, dd MMMM yyyy')} · NGI IT Asset Tracker
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          {dataUpdatedAt > 0 && (
            <span className="text-xs text-gray-400 hidden sm:block">
              Updated {format(dataUpdatedAt, 'HH:mm:ss')}
            </span>
          )}
          <button onClick={() => refetch()} className="btn-secondary py-1.5 text-xs gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      {/* ── Stats Cards ── */}
      <StatsCards data={summaryData} isLoading={sumLoading} />

      {/* ── Main Grid: Calendar (60%) + Action Panel (40%) ── */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">

        {/* Calendar widget */}
        <div className="xl:col-span-3 card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-brand-600" />
              Domain Expiry Calendar
            </h2>
            <Link href="/domains/calendar" className="text-xs text-brand-600 hover:underline font-medium">
              Full calendar view →
            </Link>
          </div>
          {domLoading ? (
            <div className="grid grid-cols-7 gap-px">
              {Array.from({ length: 35 }).map((_, i) => (
                <div key={i} className="min-h-[54px] bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <MiniCalendar domains={domains} today={today} />
          )}
        </div>

        {/* Needs Attention panel */}
        <div className="xl:col-span-2 card p-5 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              Needs Attention
              {!domLoading && urgentDomains.length > 0 && (
                <span className="bg-red-100 text-red-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {urgentDomains.length}
                </span>
              )}
            </h2>
            <Link href="/domains" className="text-xs text-brand-600 hover:underline font-medium">
              All domains →
            </Link>
          </div>

          <div className="overflow-y-auto flex-1 space-y-2.5 max-h-[420px]">
            {domLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-28 bg-gray-100 rounded-xl animate-pulse" />
              ))
            ) : urgentDomains.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <p className="text-sm font-semibold text-gray-700">All domains healthy</p>
                <p className="text-xs text-gray-400 mt-1">No renewals due within 60 days</p>
              </div>
            ) : (
              <>
                {urgentDomains.slice(0, 6).map(d => {
                  const days = differenceInDays(parseISO(d.expiry_date), today);
                  const level = urgencyLevel(days);
                  const hasC = d.finance_email || d.admin_email || d.vendor_email;
                  return (
                    <div key={d.id} className={clsx('rounded-xl border border-gray-100 border-l-4 bg-white hover:shadow-md transition-all', BLEFT[level])}>
                      <div className="p-3.5">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <Globe className="w-3 h-3 text-gray-400 shrink-0" />
                              <span className="text-xs font-bold text-gray-900 truncate">{d.domain_name}</span>
                              {hasC && <Mail className="w-2.5 h-2.5 text-blue-400 shrink-0" />}
                            </div>
                            <p className="text-[10px] text-gray-400 mt-0.5">
                              {format(parseISO(d.expiry_date), 'dd MMM yyyy')} · {d.registrar || '—'}
                            </p>
                          </div>
                          <span className={clsx('shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full border whitespace-nowrap', BADGE[level])}>
                            {days < 0 ? 'EXPIRED' : level.toUpperCase()}
                          </span>
                        </div>

                        <div className="mb-2.5">
                          <div className="flex justify-between text-[10px] text-gray-400 mb-0.5">
                            <span>Time remaining</span>
                            <span className="font-semibold text-gray-600">{daysLabel(days)}</span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className={clsx('h-full rounded-full transition-all', BPROG[level])} style={{ width: progressPct(days) + '%' }} />
                          </div>
                        </div>

                        {hasC && (
                          <div className="flex flex-wrap gap-1 mb-2.5">
                            {d.finance_email && (
                              <a href={'mailto:' + d.finance_email} className="text-[9px] bg-blue-50 text-blue-700 border border-blue-100 px-1.5 py-0.5 rounded-full hover:bg-blue-100 font-medium transition-colors">
                                F: {d.finance_email.split('@')[0]}
                              </a>
                            )}
                            {d.admin_email && (
                              <a href={'mailto:' + d.admin_email} className="text-[9px] bg-purple-50 text-purple-700 border border-purple-100 px-1.5 py-0.5 rounded-full hover:bg-purple-100 font-medium transition-colors">
                                A: {d.admin_email.split('@')[0]}
                              </a>
                            )}
                            {d.vendor_email && (
                              <a href={'mailto:' + d.vendor_email} className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-1.5 py-0.5 rounded-full hover:bg-emerald-100 font-medium transition-colors">
                                V: {d.vendor_email.split('@')[0]}
                              </a>
                            )}
                          </div>
                        )}

                        <Link
                          href={'/domains?search=' + encodeURIComponent(d.domain_name)}
                          className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-[11px] font-semibold rounded-lg transition-colors"
                        >
                          <Pencil className="w-3 h-3" /> Renew / Edit
                        </Link>
                      </div>
                    </div>
                  );
                })}

                {urgentDomains.length > 6 && (
                  <Link href="/domains" className="block text-center text-xs text-brand-600 hover:underline font-semibold py-1">
                    +{urgentDomains.length - 6} more need attention →
                  </Link>
                )}

                <div className="rounded-xl bg-blue-50 border border-blue-100 p-3 flex items-start gap-2.5">
                  <Bell className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-blue-800">Auto Email Alert Active</p>
                    <p className="text-[11px] text-blue-600 mt-0.5">Daily at 8:00 AM · Sends to Finance, Admin and Vendor contacts</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Upcoming Renewals Chart ── */}
      <UpcomingRenewals upcoming={summaryData?.upcoming || []} isLoading={sumLoading} />

    </div>
  );
}
