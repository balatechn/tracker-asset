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
import { Globe, ChevronLeft, ChevronRight, Table2, CalendarDays, Mail } from 'lucide-react';

function dayColor(days) {
  if (days < 0) return 'bg-red-600';
  if (days <= 7) return 'bg-red-500';
  if (days <= 15) return 'bg-red-400';
  if (days <= 60) return 'bg-amber-400';
  return 'bg-green-500';
}

function dayTextColor(days) {
  if (days <= 15) return 'text-red-700';
  if (days <= 60) return 'text-amber-700';
  return 'text-green-700';
}

function dayBg(days) {
  if (days <= 7) return 'bg-red-50 border-red-200';
  if (days <= 15) return 'bg-red-50 border-red-100';
  if (days <= 60) return 'bg-amber-50 border-amber-100';
  return 'bg-green-50 border-green-100';
}

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const { data, isLoading } = useQuery({
    queryKey: ['domains-calendar'],
    queryFn: () => api.get('/domains', { params: { limit: 200, sort: 'expiry_date', order: 'ASC' } }).then(r => r.data),
  });

  const domains = data?.data || [];
  const today = new Date();

  // Build a map: dateStr -> [domains]
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

  // Calendar grid: weeks of the current month
  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  // Expiring this month
  const expiringThisMonth = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return domains.filter(d => {
      if (!d.expiry_date) return false;
      const exp = parseISO(d.expiry_date);
      return exp >= start && exp <= end;
    });
  }, [domains, currentMonth]);

  const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <nav className="text-xs text-gray-400 mb-1 flex items-center gap-1">
            <Link href="/dashboard" className="hover:text-brand-600">Dashboard</Link>
            <span>/</span>
            <Link href="/domains" className="hover:text-brand-600">Domains</Link>
            <span>/</span>
            <span className="text-gray-700 font-medium">Calendar View</span>
          </nav>
          <h1 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Globe className="w-5 h-5 text-brand-600" /> Domain Expiry Calendar
          </h1>
        </div>
      </div>

      {/* View Tabs */}
      <div className="card p-2 flex items-center gap-1 bg-gray-100 rounded-lg w-fit">
        <Link href="/domains" className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-gray-600 hover:bg-white transition-colors">
          <Table2 className="w-3.5 h-3.5" /> Table View
        </Link>
        <span className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-white shadow-sm text-brand-700">
          <CalendarDays className="w-3.5 h-3.5" /> Calendar View
        </span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Calendar */}
        <div className="xl:col-span-2 card overflow-hidden">
          {/* Month nav */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <button onClick={() => setCurrentMonth(m => subMonths(m, 1))}
              className="p-1.5 rounded hover:bg-gray-100 transition-colors">
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </button>
            <h2 className="text-base font-bold text-gray-900">{format(currentMonth, 'MMMM yyyy')}</h2>
            <button onClick={() => setCurrentMonth(m => addMonths(m, 1))}
              className="p-1.5 rounded hover:bg-gray-100 transition-colors">
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>
          </div>

          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 border-b border-gray-100">
            {WEEKDAYS.map(d => (
              <div key={d} className="py-2 text-center text-xs font-semibold text-gray-500 border-r last:border-r-0 border-gray-100">
                {d}
              </div>
            ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-7 flex-1">
            {isLoading
              ? Array.from({ length: 35 }).map((_, i) => (
                  <div key={i} className="h-20 border-b border-r border-gray-100 p-1">
                    <div className="h-3 w-5 bg-gray-200 rounded animate-pulse" />
                  </div>
                ))
              : calendarDays.map((day, i) => {
                  const key = format(day, 'yyyy-MM-dd');
                  const domsOnDay = expiryMap[key] || [];
                  const isToday = isSameDay(day, today);
                  const isCurrentMonth = isSameMonth(day, currentMonth);

                  return (
                    <div
                      key={i}
                      className={clsx(
                        'min-h-[80px] border-b border-r border-gray-100 p-1 last-col:border-r-0 transition-colors',
                        !isCurrentMonth ? 'bg-gray-50' : 'bg-white hover:bg-blue-50/30',
                        isToday && 'bg-brand-50 border-brand-200'
                      )}
                    >
                      <div className={clsx(
                        'text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full mb-0.5',
                        isToday ? 'bg-brand-700 text-white' : isCurrentMonth ? 'text-gray-800' : 'text-gray-300'
                      )}>
                        {format(day, 'd')}
                      </div>
                      <div className="space-y-0.5">
                        {domsOnDay.slice(0, 3).map(d => {
                          const days = differenceInDays(parseISO(d.expiry_date), today);
                          const hasContacts = d.finance_email || d.admin_email || d.vendor_email;
                          return (
                            <div
                              key={d.id}
                              className={clsx('rounded text-[9px] font-medium px-1 py-0.5 flex items-center gap-0.5 leading-tight', dayBg(days))}
                              title={`${d.domain_name} — expires in ${days}d${hasContacts ? ' | Has alert contacts' : ''}`}
                            >
                              <span className={clsx('truncate', dayTextColor(days))}>{d.domain_name}</span>
                              {hasContacts && <Mail className="w-2 h-2 text-blue-400 shrink-0" />}
                            </div>
                          );
                        })}
                        {domsOnDay.length > 3 && (
                          <div className="text-[9px] text-gray-400 pl-1">+{domsOnDay.length - 3} more</div>
                        )}
                      </div>
                    </div>
                  );
                })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 px-4 py-2 border-t border-gray-100 bg-gray-50 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-300 inline-block" /> &lt; 15d</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-300 inline-block" /> 15–60d</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-300 inline-block" /> &gt; 60d</span>
            <span className="flex items-center gap-1"><Mail className="w-3 h-3 text-blue-400" /> Has contacts</span>
          </div>
        </div>

        {/* Right panel: expiring this month */}
        <div className="space-y-4">
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-800">
                Expiring in {format(currentMonth, 'MMMM yyyy')}
                <span className="ml-2 bg-red-100 text-red-700 text-xs font-bold px-1.5 py-0.5 rounded-full">
                  {expiringThisMonth.length}
                </span>
              </h3>
            </div>
            <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
              {expiringThisMonth.length === 0 ? (
                <div className="py-8 text-center text-gray-400 text-sm">
                  <div className="text-2xl mb-2">✅</div>
                  No domains expiring this month
                </div>
              ) : expiringThisMonth.map(d => {
                const days = differenceInDays(parseISO(d.expiry_date), today);
                const hasContacts = d.finance_email || d.admin_email || d.vendor_email;
                return (
                  <div key={d.id} className={clsx('px-4 py-3 hover:bg-gray-50 transition-colors', days <= 15 && 'bg-red-50/30')}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <Globe className="w-3 h-3 text-gray-400 shrink-0" />
                          <p className="text-xs font-semibold text-brand-700 truncate">{d.domain_name}</p>
                          {hasContacts && <Mail className="w-2.5 h-2.5 text-blue-400 shrink-0" title="Has alert contacts" />}
                        </div>
                        <p className="text-[10px] text-gray-500 mt-0.5">
                          {format(parseISO(d.expiry_date), 'dd MMM yyyy')} · {d.registrar || '—'}
                        </p>
                        {hasContacts && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {d.finance_email && (
                              <a href={`mailto:${d.finance_email}`} className="text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full hover:bg-blue-100">
                                F: {d.finance_email.split('@')[0]}
                              </a>
                            )}
                            {d.admin_email && (
                              <a href={`mailto:${d.admin_email}`} className="text-[9px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded-full hover:bg-purple-100">
                                A: {d.admin_email.split('@')[0]}
                              </a>
                            )}
                            {d.vendor_email && (
                              <a href={`mailto:${d.vendor_email}`} className="text-[9px] bg-green-50 text-green-600 px-1.5 py-0.5 rounded-full hover:bg-green-100">
                                V: {d.vendor_email.split('@')[0]}
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                      <span className={clsx(
                        'shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold',
                        days < 0 ? 'bg-red-200 text-red-800' :
                        days <= 7 ? 'bg-red-100 text-red-700' :
                        days <= 15 ? 'bg-red-50 text-red-600' :
                        days <= 60 ? 'bg-amber-50 text-amber-600' :
                        'bg-green-50 text-green-600'
                      )}>
                        {days < 0 ? 'EXPIRED' : `${days}d`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick nav months */}
          <div className="card p-3">
            <h3 className="text-xs font-semibold text-gray-700 mb-2">Quick Navigate</h3>
            <div className="grid grid-cols-3 gap-1.5">
              {Array.from({ length: 6 }, (_, i) => {
                const m = addMonths(new Date(), i - 1);
                const count = domains.filter(d => d.expiry_date && format(parseISO(d.expiry_date), 'MMM yyyy') === format(m, 'MMM yyyy')).length;
                const isActive = isSameMonth(m, currentMonth);
                return (
                  <button
                    key={i}
                    onClick={() => setCurrentMonth(m)}
                    className={clsx(
                      'flex flex-col items-center p-2 rounded-lg text-xs transition-colors border',
                      isActive ? 'bg-brand-50 border-brand-300 text-brand-700' : 'border-gray-100 hover:bg-gray-50 text-gray-600'
                    )}
                  >
                    <span className="font-semibold">{format(m, 'MMM')}</span>
                    <span className={clsx('text-[10px] font-bold', count > 0 ? 'text-red-500' : 'text-gray-300')}>{count}</span>
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
