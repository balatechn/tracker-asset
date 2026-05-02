'use client';
import { AlertTriangle, Globe, Monitor } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { clsx } from 'clsx';
import Link from 'next/link';

function urgencyClass(days) {
  if (days <= 7) return 'bg-red-50 border-red-200';
  if (days <= 15) return 'bg-red-50 border-red-100';
  if (days <= 30) return 'bg-amber-50 border-amber-100';
  return 'bg-gray-50 border-gray-100';
}

function dotClass(days) {
  if (days <= 15) return 'bg-red-500';
  if (days <= 30) return 'bg-amber-500';
  return 'bg-green-500';
}

function daysLabel(days) {
  if (days < 0) return { text: 'EXPIRED', cls: 'text-red-700 font-bold' };
  if (days === 0) return { text: 'Today!', cls: 'text-red-700 font-bold' };
  if (days === 1) return { text: '1 day', cls: 'text-red-600 font-semibold' };
  return { text: `${days} days`, cls: days <= 15 ? 'text-red-600 font-semibold' : 'text-amber-600 font-semibold' };
}

export default function AlertsPanel({ alerts }) {
  if (!alerts.length) {
    return (
      <div className="card p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          Expiry Alerts (30 Days)
        </h2>
        <div className="flex flex-col items-center justify-center py-8 text-gray-400">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
            <span className="text-2xl">✅</span>
          </div>
          <p className="text-sm font-medium text-gray-600">All assets are up to date</p>
          <p className="text-xs mt-1">No renewals due in the next 30 days</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          Expiry Alerts
          <span className="ml-1 bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">
            {alerts.length}
          </span>
        </h2>
        <Link href="/domains" className="text-xs text-brand-600 hover:underline">View all →</Link>
      </div>

      <div className="space-y-2 max-h-80 overflow-y-auto">
        {alerts.map((alert, i) => {
          const days = parseInt(alert.days_remaining);
          const label = daysLabel(days);
          return (
            <div
              key={i}
              className={clsx('flex items-center gap-3 p-3 rounded-lg border', urgencyClass(days))}
            >
              <div className={clsx('w-2 h-2 rounded-full shrink-0', dotClass(days))} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  {alert.type === 'domain'
                    ? <Globe className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    : <Monitor className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
                  <p className="text-sm font-medium text-gray-800 truncate">{alert.name}</p>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Expires {alert.expiry_date ? format(parseISO(alert.expiry_date), 'dd MMM yyyy') : '—'}
                  {alert.vendor ? ` · ${alert.vendor}` : ''}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <span className={clsx('text-xs', label.cls)}>{label.text}</span>
                <p className="text-xs text-gray-400">{alert.criticality}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
