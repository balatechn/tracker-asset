'use client';
import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import {
  Bell, Globe, Package, Mail, Filter, Send, ChevronDown,
  AlertTriangle, Clock, CheckCircle,
} from 'lucide-react';
import { clsx } from 'clsx';
import { format, parseISO } from 'date-fns';

function urgencyBadge(days) {
  if (days == null) return { label: '?', cls: 'bg-gray-100 text-gray-500' };
  if (days < 0) return { label: 'EXPIRED', cls: 'bg-red-200 text-red-900' };
  if (days <= 7) return { label: `${days}d — CRITICAL`, cls: 'bg-red-100 text-red-800' };
  if (days <= 15) return { label: `${days}d — HIGH`, cls: 'bg-red-50 text-red-700' };
  if (days <= 60) return { label: `${days}d — MEDIUM`, cls: 'bg-amber-50 text-amber-700' };
  return { label: `${days}d`, cls: 'bg-green-50 text-green-700' };
}

function criticalityBadge(c) {
  const cls = {
    critical: 'bg-red-100 text-red-800',
    high: 'bg-orange-100 text-orange-800',
    medium: 'bg-amber-100 text-amber-700',
    low: 'bg-blue-100 text-blue-700',
  };
  return cls[c] || 'bg-gray-100 text-gray-600';
}

const DAYS_OPTIONS = [
  { label: 'All (next 30d)', value: 30 },
  { label: 'Expiring today / overdue', value: 0 },
  { label: 'Within 7 days', value: 7 },
  { label: 'Within 15 days', value: 15 },
];

export default function AlertsPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  const [typeFilter, setTypeFilter] = useState('all');
  const [critFilter, setCritFilter] = useState('all');
  const [daysFilter, setDaysFilter] = useState(30);
  const [testMsg, setTestMsg] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['alerts-page'],
    queryFn: () => api.get('/dashboard/alerts').then(r => r.data),
    refetchInterval: 60_000,
  });

  const testMutation = useMutation({
    mutationFn: () => api.post('/settings/test-email'),
    onSuccess: d => setTestMsg(d.data.message || 'Alert email sent!'),
    onError: e => setTestMsg('Error: ' + (e.response?.data?.error || e.message)),
  });

  const allAlerts = data?.alerts || [];

  const filtered = allAlerts.filter(a => {
    const days = typeof a.days_remaining === 'object' ? Number(a.days_remaining) : a.days_remaining;
    if (typeFilter !== 'all' && a.type !== typeFilter) return false;
    if (critFilter !== 'all' && a.criticality !== critFilter) return false;
    if (daysFilter < 30 && days > daysFilter) return false;
    return true;
  });

  const summary = {
    total: allAlerts.length,
    critical: allAlerts.filter(a => {
      const d = Number(a.days_remaining); return d <= 7;
    }).length,
    withContacts: allAlerts.filter(a => a.finance_email || a.admin_email || a.vendor_email).length,
    domains: allAlerts.filter(a => a.type === 'domain').length,
    software: allAlerts.filter(a => a.type === 'software').length,
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Bell className="w-5 h-5 text-red-500" /> Expiry Alerts
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">Assets expiring within the next 30 days</p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => testMutation.mutate()}
              disabled={testMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-700 text-white text-xs font-medium hover:bg-brand-800 transition-colors disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              {testMutation.isPending ? 'Sending…' : 'Send Test Alert Email'}
            </button>
          </div>
        )}
      </div>

      {testMsg && (
        <div className={clsx('p-3 rounded-lg text-xs font-medium', testMsg.startsWith('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700')}>
          {testMsg}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total Alerts', value: summary.total, icon: Bell, cls: 'text-brand-600' },
          { label: 'Critical (≤7d)', value: summary.critical, icon: AlertTriangle, cls: 'text-red-600' },
          { label: 'With Contacts', value: summary.withContacts, icon: Mail, cls: 'text-blue-600' },
          { label: 'Domains', value: summary.domains, icon: Globe, cls: 'text-indigo-600' },
          { label: 'Software', value: summary.software, icon: Package, cls: 'text-purple-600' },
        ].map(({ label, value, icon: Icon, cls }) => (
          <div key={label} className="card p-3 flex items-center gap-3">
            <Icon className={clsx('w-8 h-8 p-1.5 rounded-lg bg-gray-50', cls)} />
            <div>
              <p className="text-lg font-bold text-gray-900">{isLoading ? '—' : value}</p>
              <p className="text-[10px] text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card p-3 flex flex-wrap items-center gap-3">
        <Filter className="w-3.5 h-3.5 text-gray-400" />
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-gray-500">Type:</label>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
            className="text-xs border border-gray-200 rounded px-2 py-1 bg-white">
            <option value="all">All</option>
            <option value="domain">Domains</option>
            <option value="software">Software</option>
          </select>
        </div>
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-gray-500">Criticality:</label>
          <select value={critFilter} onChange={e => setCritFilter(e.target.value)}
            className="text-xs border border-gray-200 rounded px-2 py-1 bg-white">
            <option value="all">All</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-gray-500">Due in:</label>
          <select value={daysFilter} onChange={e => setDaysFilter(Number(e.target.value))}
            className="text-xs border border-gray-200 rounded px-2 py-1 bg-white">
            {DAYS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <span className="ml-auto text-xs text-gray-400">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="table-th">Asset</th>
                <th className="table-th">Type</th>
                <th className="table-th">Criticality</th>
                <th className="table-th">Expiry Date</th>
                <th className="table-th">Days Left</th>
                <th className="table-th">Alert Contacts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={j} className="table-td">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-400 font-medium">No alerts match current filters</p>
                  </td>
                </tr>
              ) : filtered.map((a, i) => {
                const days = typeof a.days_remaining === 'object' ? Number(a.days_remaining) : a.days_remaining;
                const urgency = urgencyBadge(days);
                const hasContacts = a.finance_email || a.admin_email || a.vendor_email;
                return (
                  <tr key={i} className={clsx('hover:bg-gray-50 transition-colors', days <= 7 && 'bg-red-50/40')}>
                    <td className="table-td">
                      <div className="flex items-center gap-2">
                        {a.type === 'domain'
                          ? <Globe className="w-3.5 h-3.5 text-brand-400 shrink-0" />
                          : <Package className="w-3.5 h-3.5 text-purple-400 shrink-0" />}
                        <div>
                          <p className="font-semibold text-gray-900">{a.name}</p>
                          {a.vendor && <p className="text-[10px] text-gray-400">{a.vendor}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="table-td">
                      <span className={clsx('px-2 py-0.5 rounded-full text-[10px] font-medium',
                        a.type === 'domain' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700')}>
                        {a.type}
                      </span>
                    </td>
                    <td className="table-td">
                      {a.criticality ? (
                        <span className={clsx('px-2 py-0.5 rounded-full text-[10px] font-medium capitalize', criticalityBadge(a.criticality))}>
                          {a.criticality}
                        </span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="table-td">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-gray-400" />
                        {a.expiry_date ? format(parseISO(a.expiry_date), 'dd MMM yyyy') : '—'}
                      </div>
                    </td>
                    <td className="table-td">
                      <span className={clsx('px-2 py-0.5 rounded-full text-[10px] font-bold', urgency.cls)}>
                        {urgency.label}
                      </span>
                    </td>
                    <td className="table-td">
                      {hasContacts ? (
                        <div className="flex flex-wrap gap-1">
                          {a.finance_email && (
                            <a href={`mailto:${a.finance_email}`}
                              className="flex items-center gap-0.5 bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-full text-[9px] font-medium hover:bg-blue-100 transition-colors"
                              title={a.finance_email}>
                              <Mail className="w-2.5 h-2.5" /> F
                            </a>
                          )}
                          {a.admin_email && (
                            <a href={`mailto:${a.admin_email}`}
                              className="flex items-center gap-0.5 bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded-full text-[9px] font-medium hover:bg-purple-100 transition-colors"
                              title={a.admin_email}>
                              <Mail className="w-2.5 h-2.5" /> A
                            </a>
                          )}
                          {a.vendor_email && (
                            <a href={`mailto:${a.vendor_email}`}
                              className="flex items-center gap-0.5 bg-green-50 text-green-700 px-1.5 py-0.5 rounded-full text-[9px] font-medium hover:bg-green-100 transition-colors"
                              title={a.vendor_email}>
                              <Mail className="w-2.5 h-2.5" /> V
                            </a>
                          )}
                        </div>
                      ) : (
                        <span className="text-[10px] text-gray-300 italic">none set</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
