'use client';
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { format, addMonths, startOfMonth, endOfMonth, differenceInDays, parseISO, addDays } from 'date-fns';
import { clsx } from 'clsx';
import Link from 'next/link';
import {
  Globe, ChevronLeft, ChevronRight, AlignLeft, Table2, CalendarDays,
  Mail, Filter, RefreshCw, Info,
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from 'recharts';

const ZOOM_MONTHS = { '1M': 1, '3M': 3, '6M': 6, '1Y': 12 };

function barColor(days) {
  if (days === null || days === undefined) return '#94a3b8';
  if (days < 0) return '#dc2626';
  if (days <= 15) return '#ef4444';
  if (days <= 60) return '#f59e0b';
  return '#22c55e';
}

function barLabel(days) {
  if (days === null || days === undefined) return '';
  if (days < 0) return 'EXPIRED';
  if (days <= 15) return `${days}d`;
  if (days <= 60) return `${days}d`;
  return `${days}d`;
}

export default function TimelinePage() {
  const [zoom, setZoom] = useState('3M');
  const [startOffset, setStartOffset] = useState(0); // months offset from today
  const [showFilters, setShowFilters] = useState(false);
  const [filterCriticality, setFilterCriticality] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['domains-timeline'],
    queryFn: () => api.get('/domains', { params: { limit: 200, sort: 'expiry_date', order: 'ASC' } }).then(r => r.data),
  });

  const domains = data?.data || [];

  // Timeline bounds
  const viewStart = useMemo(() => addMonths(startOfMonth(new Date()), startOffset), [startOffset]);
  const months = ZOOM_MONTHS[zoom];
  const viewEnd = useMemo(() => endOfMonth(addMonths(viewStart, months - 1)), [viewStart, months]);
  const totalDays = differenceInDays(viewEnd, viewStart) + 1;

  // Stats
  const today = new Date();
  const stats = useMemo(() => {
    const lt15 = domains.filter(d => d.expiry_date && differenceInDays(parseISO(d.expiry_date), today) < 15 && differenceInDays(parseISO(d.expiry_date), today) >= 0).length;
    const lt60 = domains.filter(d => d.expiry_date && differenceInDays(parseISO(d.expiry_date), today) >= 15 && differenceInDays(parseISO(d.expiry_date), today) < 60).length;
    const gt60 = domains.filter(d => d.expiry_date && differenceInDays(parseISO(d.expiry_date), today) >= 60).length;
    const totalCost = domains.reduce((s, d) => s + parseFloat(d.annual_cost_inr || 0), 0);
    const autoRenewOff = domains.filter(d => !d.auto_renew).length;
    return { lt15, lt60, gt60, totalCost, autoRenewOff };
  }, [domains]);

  // Registrar breakdown
  const registrarData = useMemo(() => {
    const map = {};
    domains.forEach(d => {
      const r = d.registrar || 'Unknown';
      map[r] = (map[r] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [domains]);

  // Renewal cost by month (next 3 months)
  const renewalCostData = useMemo(() => {
    const result = [];
    for (let i = 0; i < 3; i++) {
      const m = addMonths(today, i);
      const label = format(m, 'MMM yyyy');
      const cost = domains
        .filter(d => d.expiry_date && format(parseISO(d.expiry_date), 'MMM yyyy') === label)
        .reduce((s, d) => s + parseFloat(d.annual_cost_inr || 0), 0);
      result.push({ label, cost });
    }
    return result;
  }, [domains]);

  // Month header columns
  const monthCols = useMemo(() => {
    const cols = [];
    for (let i = 0; i < months; i++) {
      const m = addMonths(viewStart, i);
      cols.push({ label: format(m, 'MMM yyyy'), days: differenceInDays(endOfMonth(m), startOfMonth(m)) + 1 });
    }
    return cols;
  }, [viewStart, months]);

  // Filtered domains
  const filtered = useMemo(() => {
    let list = domains;
    if (filterCriticality) list = list.filter(d => d.criticality === filterCriticality);
    return list;
  }, [domains, filterCriticality]);

  // Compute bar position/width for a domain
  function getBar(domain) {
    if (!domain.expiry_date) return null;
    const expiry = parseISO(domain.expiry_date);
    const lastRenewal = domain.last_renewal_date ? parseISO(domain.last_renewal_date) : addDays(expiry, -(365 * (domain.renewal_period || 1)));
    const barStart = lastRenewal < viewStart ? viewStart : lastRenewal;
    const barEnd = expiry > viewEnd ? viewEnd : expiry;
    if (barStart > viewEnd || barEnd < viewStart) return null;
    const leftPct = (differenceInDays(barStart, viewStart) / totalDays) * 100;
    const widthPct = ((differenceInDays(barEnd, barStart) + 1) / totalDays) * 100;
    const days = Math.round(differenceInDays(expiry, today));
    return { leftPct: Math.max(0, leftPct), widthPct: Math.max(0.5, widthPct), days, expiry };
  }

  const todayPct = (differenceInDays(today, viewStart) / totalDays) * 100;
  const showToday = todayPct >= 0 && todayPct <= 100;

  const COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

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
            <span className="text-gray-700 font-medium">Timeline View</span>
          </nav>
          <h1 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Globe className="w-5 h-5 text-brand-600" /> Domain Tracker
          </h1>
        </div>
        <button onClick={() => refetch()} className="btn-secondary text-xs">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-5 gap-2">
        {[
          { label: 'Expiring in < 15 Days', value: stats.lt15, icon: '⏰', color: 'text-red-600', bg: 'bg-red-50 border-red-100' },
          { label: 'Expiring in 15-60 Days', value: stats.lt60, icon: '📅', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100' },
          { label: 'Expiring in > 60 Days', value: stats.gt60, icon: '✅', color: 'text-green-600', bg: 'bg-green-50 border-green-100' },
          { label: 'Total Renewal Cost', value: `₹${stats.totalCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: '₹', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-100', small: true },
          { label: 'Auto Renew OFF', value: stats.autoRenewOff, icon: '🔄', color: 'text-purple-600', bg: 'bg-purple-50 border-purple-100' },
        ].map(s => (
          <div key={s.label} className={clsx('card p-3 border', s.bg)}>
            <div className="flex items-start gap-2">
              <span className="text-lg">{s.icon}</span>
              <div>
                <p className="text-[10px] text-gray-500">{s.label}</p>
                <p className={clsx('font-bold mt-0.5', s.small ? 'text-sm' : 'text-2xl', s.color)}>{s.value}</p>
              </div>
            </div>
            <p className="text-[10px] text-brand-600 mt-1 cursor-pointer hover:underline">View domains →</p>
          </div>
        ))}
      </div>

      {/* View Tabs + Controls */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between p-2 border-b border-gray-100 flex-wrap gap-2">
          {/* View switcher */}
          <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg">
            <Link href="/domains" className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-gray-600 hover:bg-white transition-colors">
              <Table2 className="w-3.5 h-3.5" /> Table View
            </Link>
            <span className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-white shadow-sm text-brand-700">
              <AlignLeft className="w-3.5 h-3.5" /> Timeline View
            </span>
            <Link href="/domains/calendar" className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-gray-600 hover:bg-white transition-colors">
              <CalendarDays className="w-3.5 h-3.5" /> Calendar View
            </Link>
          </div>

          <div className="flex items-center gap-2">
            {/* Zoom */}
            <div className="flex items-center gap-0.5 text-xs">
              <span className="text-gray-400 mr-1">Zoom</span>
              {Object.keys(ZOOM_MONTHS).map(z => (
                <button
                  key={z}
                  onClick={() => setZoom(z)}
                  className={clsx('px-2 py-1 rounded font-medium transition-colors',
                    zoom === z ? 'bg-brand-700 text-white' : 'text-gray-500 hover:bg-gray-100'
                  )}
                >{z}</button>
              ))}
            </div>

            {/* Month nav */}
            <div className="flex items-center gap-1 text-xs border border-gray-200 rounded-lg px-1">
              <button onClick={() => setStartOffset(o => o - 1)} className="p-1 hover:text-brand-600">
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="font-medium text-gray-700 px-1">
                {format(viewStart, 'MMM yyyy')} – {format(viewEnd, 'MMM yyyy')}
              </span>
              <button onClick={() => setStartOffset(o => o + 1)} className="p-1 hover:text-brand-600">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Filters */}
            <button
              onClick={() => setShowFilters(f => !f)}
              className={clsx('flex items-center gap-1 text-xs px-2 py-1.5 rounded-md border transition-colors',
                showFilters ? 'bg-brand-50 border-brand-300 text-brand-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
              )}
            >
              <Filter className="w-3 h-3" /> Filters
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="flex items-center gap-3 px-3 py-2 border-b border-gray-100 bg-gray-50 text-xs">
            <span className="text-gray-500">Criticality:</span>
            {['', 'High', 'Medium', 'Low'].map(c => (
              <button key={c} onClick={() => setFilterCriticality(c)}
                className={clsx('px-2 py-0.5 rounded-full font-medium transition-colors',
                  filterCriticality === c ? 'bg-brand-700 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-brand-300'
                )}>
                {c || 'All'}
              </button>
            ))}
          </div>
        )}

        {/* Gantt chart + Right panel */}
        <div className="flex">
          {/* Gantt section */}
          <div className="flex-1 min-w-0 overflow-x-auto">
            {/* Month headers */}
            <div className="flex border-b border-gray-200">
              <div className="w-52 shrink-0 px-3 py-2 text-xs font-semibold text-gray-500 bg-gray-50 border-r border-gray-200">
                DOMAIN / OWNER
              </div>
              <div className="flex-1 flex">
                {monthCols.map((col, i) => (
                  <div
                    key={i}
                    className="border-r border-gray-100 px-2 py-2 text-center text-xs font-semibold text-gray-600 bg-gray-50"
                    style={{ flex: col.days }}
                  >
                    {col.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Domain rows */}
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex border-b border-gray-100">
                  <div className="w-52 shrink-0 px-3 py-3 border-r border-gray-100">
                    <div className="h-3 bg-gray-200 rounded animate-pulse w-32" />
                    <div className="h-2 bg-gray-100 rounded animate-pulse w-20 mt-1" />
                  </div>
                  <div className="flex-1 relative py-3 px-2">
                    <div className="h-6 bg-gray-200 rounded-full animate-pulse" style={{ marginLeft: `${Math.random() * 30}%`, width: `${20 + Math.random() * 40}%` }} />
                  </div>
                </div>
              ))
            ) : filtered.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-sm">No domains found</div>
            ) : filtered.map(domain => {
              const bar = getBar(domain);
              const days = domain.expiry_date ? Math.round(differenceInDays(parseISO(domain.expiry_date), today)) : null;
              const hasContacts = domain.finance_email || domain.admin_email || domain.vendor_email;

              return (
                <div key={domain.id} className="flex border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  {/* Domain info */}
                  <div className="w-52 shrink-0 px-3 py-2 border-r border-gray-100">
                    <div className="flex items-center gap-1">
                      <span className={clsx('w-2 h-2 rounded-full shrink-0',
                        days === null ? 'bg-gray-300' :
                        days < 0 ? 'bg-red-600' :
                        days <= 15 ? 'bg-red-500' :
                        days <= 60 ? 'bg-amber-400' : 'bg-green-500'
                      )} />
                      <Link href="/domains" className="text-xs font-medium text-brand-700 hover:underline truncate max-w-[140px]">
                        {domain.domain_name}
                      </Link>
                      {hasContacts && (
                        <span title={`Finance: ${domain.finance_email || '—'} | Admin: ${domain.admin_email || '—'} | Vendor: ${domain.vendor_email || '—'}`}>
                          <Mail className="w-2.5 h-2.5 text-blue-400 shrink-0" />
                        </span>
                      )}
                      {/* Auto-renew toggle indicator */}
                      <span className={clsx('w-6 h-3.5 rounded-full inline-flex items-center shrink-0 transition-colors',
                        domain.auto_renew ? 'bg-green-500 justify-end' : 'bg-gray-300 justify-start'
                      )}>
                        <span className="w-2.5 h-2.5 bg-white rounded-full mx-0.5 shadow-sm" />
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400 pl-3 truncate">{domain.owner || '—'}</p>
                  </div>

                  {/* Timeline bar */}
                  <div className="flex-1 relative py-2 min-h-[44px]" style={{ minWidth: 0 }}>
                    {/* Today marker */}
                    {showToday && (
                      <div className="absolute top-0 bottom-0 w-px bg-red-400 z-10 opacity-80"
                        style={{ left: `${todayPct}%` }}
                        title="Today"
                      />
                    )}
                    {bar && (
                      <div
                        className="absolute top-2 bottom-2 rounded-full flex items-center px-2 text-[10px] font-bold text-white shadow-sm overflow-hidden"
                        style={{
                          left: `${bar.leftPct}%`,
                          width: `${bar.widthPct}%`,
                          backgroundColor: barColor(bar.days),
                        }}
                        title={`${domain.domain_name} — expires ${format(bar.expiry, 'dd MMM yyyy')} (${bar.days}d)`}
                      >
                        <span className="truncate">{barLabel(bar.days)}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right panel */}
          <div className="w-64 shrink-0 border-l border-gray-200 bg-gray-50 p-3 space-y-4">
            {/* Insights */}
            <div>
              <h3 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-brand-500" /> Insights
              </h3>
              <div className="space-y-2">
                {stats.lt15 > 0 && (
                  <div className="bg-red-50 border border-red-100 rounded-lg p-2.5">
                    <div className="flex items-start gap-1.5">
                      <span className="text-red-500 mt-0.5">⚠️</span>
                      <div>
                        <p className="text-xs font-semibold text-red-700">{stats.lt15} Domain{stats.lt15 > 1 ? 's' : ''}</p>
                        <p className="text-[10px] text-red-600">expiring in the next 15 days</p>
                        <Link href="/domains" className="text-[10px] font-medium text-red-700 hover:underline">View Domains →</Link>
                      </div>
                    </div>
                  </div>
                )}
                {stats.lt60 > 0 && (
                  <div className="bg-amber-50 border border-amber-100 rounded-lg p-2.5">
                    <div className="flex items-start gap-1.5">
                      <span className="text-amber-500 mt-0.5">📅</span>
                      <div>
                        <p className="text-xs font-semibold text-amber-700">{stats.lt60} Domain{stats.lt60 > 1 ? 's' : ''}</p>
                        <p className="text-[10px] text-amber-600">expiring in next 15-60 days</p>
                        <Link href="/domains" className="text-[10px] font-medium text-amber-700 hover:underline">View Domains →</Link>
                      </div>
                    </div>
                  </div>
                )}
                <div className="bg-green-50 border border-green-100 rounded-lg p-2.5">
                  <div className="flex items-start gap-1.5">
                    <span className="text-green-500 mt-0.5">✅</span>
                    <div>
                      <p className="text-xs font-semibold text-green-700">All good!</p>
                      <p className="text-[10px] text-green-600">{stats.gt60} domain{stats.gt60 > 1 ? 's' : ''} are safe</p>
                      <Link href="/domains" className="text-[10px] font-medium text-green-700 hover:underline">View All →</Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Renewal Cost Next 3 Months */}
            <div>
              <h3 className="text-xs font-semibold text-gray-700 mb-2">Renewal Cost (Next 3 Months)</h3>
              <div className="space-y-1.5">
                {renewalCostData.map(m => (
                  <div key={m.label} className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-500 w-14 shrink-0">{m.label}</span>
                    <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full bg-brand-500 rounded-full"
                        style={{ width: renewalCostData[0].cost ? `${(m.cost / Math.max(...renewalCostData.map(x => x.cost))) * 100}%` : '0%' }}
                      />
                    </div>
                    <span className="text-[10px] font-medium text-gray-700 w-16 text-right">
                      {m.cost > 0 ? `₹${m.cost.toLocaleString('en-IN')}` : '₹0'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Registrars */}
            <div>
              <h3 className="text-xs font-semibold text-gray-700 mb-2">Top Registrars</h3>
              <div style={{ height: 130 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={registrarData.slice(0, 5)} cx="40%" cy="50%" innerRadius={30} outerRadius={50} dataKey="value">
                      {registrarData.slice(0, 5).map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v, n) => [v, n]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-0.5 mt-1">
                {registrarData.slice(0, 4).map((r, i) => (
                  <div key={r.name} className="flex items-center gap-1.5 text-[10px]">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-gray-600 truncate flex-1">{r.name}</span>
                    <span className="font-medium text-gray-700">{r.value} ({Math.round(r.value / domains.length * 100)}%)</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-gray-100 bg-gray-50 text-xs text-gray-500">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-400 inline-block" /> &lt; 15 Days</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-400 inline-block" /> 15 – 60 Days</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-400 inline-block" /> &gt; 60 Days</span>
          <span className="flex items-center gap-1"><Mail className="w-3 h-3 text-blue-400" /> Has alert contacts</span>
        </div>
      </div>

      {/* Recent Alerts */}
      {(data?.data || []).some(d => {
        const days = d.expiry_date ? differenceInDays(parseISO(d.expiry_date), today) : null;
        return days !== null && days <= 30 && days >= 0;
      }) && (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800">Recent Alerts</h3>
            <Link href="/alerts" className="text-xs text-brand-600 hover:underline">View All Alerts →</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {['DOMAIN', 'ALERT', 'DAYS LEFT', 'EXPIRY DATE', 'CONTACTS', ''].map(h => (
                    <th key={h} className="table-th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(data?.data || [])
                  .filter(d => {
                    const days = d.expiry_date ? differenceInDays(parseISO(d.expiry_date), today) : null;
                    return days !== null && days <= 30 && days >= 0;
                  })
                  .slice(0, 5)
                  .map(domain => {
                    const days = differenceInDays(parseISO(domain.expiry_date), today);
                    return (
                      <tr key={domain.id} className="hover:bg-gray-50">
                        <td className="table-td font-medium text-brand-700">{domain.domain_name}</td>
                        <td className="table-td text-xs text-gray-600">Domain will expire in {days} days</td>
                        <td className="table-td">
                          <span className={clsx('px-2 py-0.5 rounded-full text-xs font-bold',
                            days <= 7 ? 'bg-red-100 text-red-700' : days <= 15 ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                          )}>{days}d</span>
                        </td>
                        <td className="table-td text-xs text-gray-500">{format(parseISO(domain.expiry_date), 'dd-MMM-yyyy')}</td>
                        <td className="table-td">
                          <div className="flex flex-col gap-0.5">
                            {domain.finance_email && <span className="text-[10px] text-blue-600">F: {domain.finance_email}</span>}
                            {domain.admin_email && <span className="text-[10px] text-purple-600">A: {domain.admin_email}</span>}
                            {domain.vendor_email && <span className="text-[10px] text-green-600">V: {domain.vendor_email}</span>}
                            {!domain.finance_email && !domain.admin_email && !domain.vendor_email && <span className="text-[10px] text-gray-300">—</span>}
                          </div>
                        </td>
                        <td className="table-td">
                          <Link href="/domains" className="text-xs text-brand-600 hover:underline">View</Link>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
