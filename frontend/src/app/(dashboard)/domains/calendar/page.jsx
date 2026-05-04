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
  X, AlertTriangle, Clock, CheckCircle, Calendar,
} from 'lucide-react';

// ─── Urgency helpers ─────────────────────────────────────────────────────────

function urgencyLevel(days) {
  if (days < 0) return 'expired';
  if (days <= 7) return 'critical';
  if (days <= 15) return 'warning';
  if (days <= 60) return 'upcoming';
  return 'safe';
}

function dotColor(days) {
  const l = urgencyLevel(days);
  if (l === 'expired' || l === 'critical') return 'bg-red-500';
  if (l === 'warning') return 'bg-orange-400';
  if (l === 'upcoming') return 'bg-amber-400';
  return 'bg-green-500';
}

function pillClasses(days) {
  const l = urgencyLevel(days);
  if (l === 'expired' || l === 'critical') return 'bg-red-100 border border-red-200 text-red-800';
  if (l === 'warning') return 'bg-orange-100 border border-orange-200 text-orange-800';
  if (l === 'upcoming') return 'bg-amber-50 border border-amber-200 text-amber-700';
  return 'bg-green-50 border border-green-200 text-green-700';
}

function badgeClasses(days) {
  const l = urgencyLevel(days);
  if (l === 'expired') return 'bg-red-200 text-red-900';
  if (l === 'critical') return 'bg-red-100 text-red-700';
  if (l === 'warning') return 'bg-orange-100 text-orange-700';
  if (l === 'upcoming') return 'bg-amber-50 text-amber-600';
  return 'bg-green-50 text-green-600';
}

function borderLeftColor(days) {
  const l = urgencyLevel(days);
  if (l === 'expired' || l === 'critical') return 'border-l-red-500';
  if (l === 'warning') return 'border-l-orange-400';
  if (l === 'upcoming') return 'border-l-amber-400';
  return 'border-l-green-400';
}

// ─── Day Drawer ───────────────────────────────────────────────────────────────

function DayDrawer({ day, domains, today, onClose }) {
  if (!day) return null;
  const key = format(day, 'yyyy-MM-dd');
  const domsOnDay = domains.filter(d => d.expiry_date && d.expiry_date.startsWith(key));

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-brand-50 to-white">
          <div>
            <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest mb-0.5">Expiry Date</div>
            <h3 className="text-lg font-bold text-gray-900 leading-tight">{format(day, 'EEEE, dd MMMM yyyy')}</h3>
            <div className="text-xs text-gray-500 mt-0.5">
              {domsOnDay.length} domain{domsOnDay.length !== 1 ? 's' : ''} expiring on this date
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition-colors ml-2">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
          {domsOnDay.map(d => {
            const days = differenceInDays(parseISO(d.expiry_date), today);
            const hasContacts = d.finance_email || d.admin_email || d.vendor_email;
            return (
              <div key={d.id} className={clsx('px-5 py-4 border-l-4 hover:bg-gray-50 transition-colors', borderLeftColor(days))}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Globe className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="text-sm font-bold text-brand-700 truncate">{d.domain_name}</span>
                      {hasContacts && <Mail className="w-3 h-3 text-blue-400 shrink-0" />}
                    </div>
                    <p className="text-xs text-gray-500 mb-2">{d.registrar || 'No registrar'}</p>
                    {hasContacts && (
                      <div className="flex flex-wrap gap-1.5">
                        {d.finance_email && (
                          <a href={`mailto:${d.finance_email}`}
                            className="text-[10px] bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full hover:bg-blue-100 font-medium transition-colors">
                            F: {d.finance_email.split('@')[0]}
                          </a>
                        )}
                        {d.admin_email && (
                          <a href={`mailto:${d.admin_email}`}
                            className="text-[10px] bg-purple-50 text-purple-700 border border-purple-100 px-2 py-0.5 rounded-full hover:bg-purple-100 font-medium transition-colors">
                            A: {d.admin_email.split('@')[0]}
                          </a>
                        )}
                        {d.vendor_email && (
                          <a href={`mailto:${d.vendor_email}`}
                            className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full hover:bg-emerald-100 font-medium transition-colors">
                            V: {d.vendor_email.split('@')[0]}
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                  <span className={clsx('shrink-0 px-2.5 py-1 rounded-full text-xs font-bold', badgeClasses(days))}>
                    {days < 0 ? 'EXPIRED' : `${days}d`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['domains-calendar'],
    queryFn: () => api.get('/domains', { params: { limit: 200, sort: 'expiry_date', order: 'ASC' } }).then(r => r.data),
  });

  const domains = data?.data || [];
  const today = new Date();

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

  const urgencyCounts = useMemo(() => {
    return expiringThisMonth.reduce((acc, d) => {
      const days = differenceInDays(parseISO(d.expiry_date), today);
      const level = urgencyLevel(days);
      acc[level] = (acc[level] || 0) + 1;
      return acc;
    }, {});
  }, [expiringThisMonth]);

  const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const criticalCount = (urgencyCounts.expired || 0) + (urgencyCounts.critical || 0);

  return (
    <div className="space-y-3">
      {selectedDay && (
        <DayDrawer day={selectedDay} domains={domains} today={today} onClose={() => setSelectedDay(null)} />
      )}

      <div>
        <nav className="text-xs text-gray-400 mb-1 flex items-center gap-1">
          <Link href="/dashboard" className="hover:text-brand-600">Dashboard</Link>
          <span>/</span>
          <Link href="/domains" className="hover:text-brand-600">Domains</Link>
          <span>/</span>
          <span className="text-gray-700 font-medium">Calendar View</span>
        </nav>
        <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Globe className="w-5 h-5 text-brand-600" /> Domain Expiry Calendar
        </h1>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="card p-1.5 flex items-center gap-1 bg-gray-100 rounded-lg w-fit">
          <Link href="/domains" className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-gray-600 hover:bg-white transition-colors">
            <Table2 className="w-3.5 h-3.5" /> Table View
          </Link>
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-white shadow-sm text-brand-700">
            <CalendarDays className="w-3.5 h-3.5" /> Calendar View
          </span>
        </div>

        {!isLoading && expiringThisMonth.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {criticalCount > 0 && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-200 rounded-full text-xs font-semibold text-red-700">
                <AlertTriangle className="w-3.5 h-3.5" /> {criticalCount} critical
              </span>
            )}
            {urgencyCounts.warning > 0 && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-full text-xs font-semibold text-orange-700">
                <Clock className="w-3.5 h-3.5" /> {urgencyCounts.warning} warning
              </span>
            )}
            {urgencyCounts.upcoming > 0 && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full text-xs font-semibold text-amber-700">
                <Calendar className="w-3.5 h-3.5" /> {urgencyCounts.upcoming} upcoming
              </span>
            )}
            {urgencyCounts.safe > 0 && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full text-xs font-semibold text-green-700">
                <CheckCircle className="w-3.5 h-3.5" /> {urgencyCounts.safe} safe
              </span>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <button
              onClick={() => setCurrentMonth(m => subMonths(m, 1))}
              className="p-1.5 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </button>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-bold text-gray-900 tracking-tight">
                {format(currentMonth, 'MMMM yyyy')}
              </h2>
              {!isSameMonth(currentMonth, today) && (
                <button
                  onClick={() => setCurrentMonth(new Date())}
                  className="text-xs font-semibold text-brand-600 hover:text-brand-800 bg-brand-50 hover:bg-brand-100 px-2.5 py-1 rounded-full transition-colors border border-brand-200"
                >
                  Today
                </button>
              )}
            </div>
            <button
              onClick={() => setCurrentMonth(m => addMonths(m, 1))}
              className="p-1.5 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>
          </div>

          <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50">
            {WEEKDAYS.map((d, i) => (
              <div key={d} className={clsx(
                'py-2.5 text-center text-xs font-bold border-r last:border-r-0 border-gray-100 tracking-wide',
                i >= 5 ? 'text-gray-300' : 'text-gray-500'
              )}>
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 flex-1">
            {isLoading
              ? Array.from({ length: 35 }).map((_, i) => (
                  <div key={i} className="min-h-[100px] border-b border-r border-gray-100 p-1.5">
                    <div className="h-4 w-5 bg-gray-200 rounded animate-pulse" />
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
                        'min-h-[100px] border-b border-r border-gray-100 p-1.5 relative transition-all duration-150',
                        !isCurrentMonth && 'bg-gray-50/60',
                        isCurrentMonth && !isToday && !isWeekend && 'bg-white',
                        isCurrentMonth && isWeekend && !isToday && 'bg-slate-50/40',
                        isToday && 'ring-1 ring-inset ring-brand-300 bg-brand-50/50',
                        hasDoms && 'cursor-pointer hover:bg-blue-50/70 hover:shadow-inner',
                      )}
                    >
                      <div className={clsx(
                        'text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full mb-1 select-none',
                        isToday ? 'bg-brand-700 text-white' :
                        !isCurrentMonth ? 'text-gray-300' :
                        isWeekend ? 'text-gray-400' : 'text-gray-800'
                      )}>
                        {format(day, 'd')}
                      </div>

                      {hasDoms && worstDays !== null && (
                        <span className={clsx('absolute top-1.5 right-1.5 w-2 h-2 rounded-full ring-1 ring-white shadow-sm', dotColor(worstDays))} />
                      )}

                      <div className="space-y-0.5">
                        {domsOnDay.slice(0, 2).map(d => {
                          const days = differenceInDays(parseISO(d.expiry_date), today);
                          const hasContacts = d.finance_email || d.admin_email || d.vendor_email;
                          return (
                            <div
                              key={d.id}
                              className={clsx('rounded-md text-[10px] font-semibold px-1.5 py-0.5 flex items-center gap-0.5 leading-tight', pillClasses(days))}
                              title={`${d.domain_name} — ${days < 0 ? 'EXPIRED' : `${days}d`}${hasContacts ? ' · Has contacts' : ''}`}
                            >
                              <span className="truncate">{d.domain_name}</span>
                              {hasContacts && <Mail className="w-2 h-2 text-blue-400 shrink-0 ml-auto" />}
                            </div>
                          );
                        })}
                        {domsOnDay.length > 2 && (
                          <div className="text-[10px] text-brand-600 font-semibold pl-1 hover:underline">
                            +{domsOnDay.length - 2} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
          </div>

          <div className="flex flex-wrap items-center gap-4 px-4 py-2.5 border-t border-gray-100 bg-gray-50 text-xs text-gray-500">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Critical (&lt;15d)</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Upcoming (15–60d)</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Safe (&gt;60d)</span>
            <span className="flex items-center gap-1.5"><Mail className="w-3 h-3 text-blue-400" /> Has contacts</span>
            <span className="ml-auto text-gray-300 italic text-[10px]">Click a date to see details</span>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800">
                Expiring in {format(currentMonth, 'MMMM yyyy')}
              </h3>
              <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">
                {expiringThisMonth.length}
              </span>
            </div>
            <div className="divide-y divide-gray-100 max-h-[420px] overflow-y-auto">
              {expiringThisMonth.length === 0 ? (
                <div className="py-10 text-center text-gray-400 text-sm">
                  <div className="text-3xl mb-2">✅</div>
                  No domains expiring this month
                </div>
              ) : expiringThisMonth.map(d => {
                const days = differenceInDays(parseISO(d.expiry_date), today);
                const hasContacts = d.finance_email || d.admin_email || d.vendor_email;
                return (
                  <div
                    key={d.id}
                    className={clsx('px-4 py-3 hover:bg-gray-50 transition-colors border-l-4', borderLeftColor(days))}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1 mb-0.5">
                          <Globe className="w-3 h-3 text-gray-400 shrink-0" />
                          <p className="text-sm font-bold text-brand-700 truncate">{d.domain_name}</p>
                          {hasContacts && <Mail className="w-2.5 h-2.5 text-blue-400 shrink-0" title="Has alert contacts" />}
                        </div>
                        <p className="text-[11px] text-gray-500">
                          {format(parseISO(d.expiry_date), 'dd MMM yyyy')} · {d.registrar || '—'}
                        </p>
                        {hasContacts && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
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
                      </div>
                      <span className={clsx('shrink-0 px-2 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap', badgeClasses(days))}>
                        {days < 0 ? 'EXPIRED' : `${days}d`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card p-3">
            <h3 className="text-xs font-semibold text-gray-700 mb-2.5">Quick Navigate</h3>
            <div className="grid grid-cols-3 gap-1.5">
              {Array.from({ length: 6 }, (_, i) => {
                const m = addMonths(new Date(), i - 1);
                const domsInMonth = domains.filter(d =>
                  d.expiry_date && format(parseISO(d.expiry_date), 'MMM yyyy') === format(m, 'MMM yyyy')
                );
                const count = domsInMonth.length;
                const worstDays = count > 0
                  ? Math.min(...domsInMonth.map(d => differenceInDays(parseISO(d.expiry_date), today)))
                  : null;
                const isActive = isSameMonth(m, currentMonth);
                return (
                  <button
                    key={i}
                    onClick={() => setCurrentMonth(m)}
                    className={clsx(
                      'flex flex-col items-center gap-0.5 p-2.5 rounded-lg text-xs transition-all duration-150 border',
                      isActive
                        ? 'bg-brand-50 border-brand-300 text-brand-700 shadow-sm'
                        : 'border-gray-100 hover:bg-gray-50 hover:border-gray-200 text-gray-600'
                    )}
                  >
                    <span className={clsx('font-bold text-sm', isActive && 'text-brand-700')}>{format(m, 'MMM')}</span>
                    {count > 0 && worstDays !== null ? (
                      <span className={clsx('w-2 h-2 rounded-full', dotColor(worstDays))} title={`${count} domain${count > 1 ? 's' : ''}`} />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-gray-200" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
