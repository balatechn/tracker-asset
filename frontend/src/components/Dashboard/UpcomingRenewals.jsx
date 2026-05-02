'use client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Calendar } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { clsx } from 'clsx';

function barColor(days) {
  if (days <= 15) return '#ef4444';
  if (days <= 30) return '#f59e0b';
  if (days <= 60) return '#eab308';
  return '#22c55e';
}

export default function UpcomingRenewals({ upcoming, isLoading }) {
  if (isLoading) {
    return (
      <div className="card p-6">
        <div className="h-4 bg-gray-200 rounded animate-pulse w-40 mb-4" />
        <div className="h-48 bg-gray-100 rounded animate-pulse" />
      </div>
    );
  }

  if (!upcoming?.length) {
    return (
      <div className="card p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-brand-600" />
          Upcoming Renewals (90 Days)
        </h2>
        <div className="flex flex-col items-center justify-center py-8 text-gray-400">
          <p className="text-sm">No upcoming renewals in next 90 days</p>
        </div>
      </div>
    );
  }

  const chartData = upcoming.slice(0, 10).map(item => ({
    name: item.name.length > 18 ? item.name.slice(0, 18) + '…' : item.name,
    fullName: item.name,
    days: Math.max(0, parseInt(item.days_remaining)),
    expiry: item.expiry_date,
    type: item.type,
  }));

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload?.[0]) {
      const d = payload[0].payload;
      return (
        <div className="bg-white shadow-lg rounded-lg p-3 border border-gray-200 text-xs">
          <p className="font-semibold text-gray-800 mb-1">{d.fullName}</p>
          <p className="text-gray-500">Expires: {d.expiry ? format(parseISO(d.expiry), 'dd MMM yyyy') : '—'}</p>
          <p className={clsx('font-bold mt-1', d.days <= 15 ? 'text-red-600' : d.days <= 30 ? 'text-amber-600' : 'text-green-600')}>
            {d.days} days remaining
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="card p-6">
      <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Calendar className="w-5 h-5 text-brand-600" />
        Upcoming Renewals
        <span className="ml-1 bg-brand-100 text-brand-700 text-xs px-2 py-0.5 rounded-full">
          Next 90 days
        </span>
      </h2>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 24, top: 0, bottom: 0 }}>
          <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => `${v}d`} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={130} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="days" radius={[0, 4, 4, 0]}>
            {chartData.map((entry, i) => (
              <Cell key={i} fill={barColor(entry.days)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="flex items-center gap-4 mt-3 justify-center">
        {[
          { color: 'bg-red-500', label: '< 15 days' },
          { color: 'bg-amber-500', label: '15–30 days' },
          { color: 'bg-yellow-400', label: '30–60 days' },
          { color: 'bg-green-500', label: '> 60 days' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className={clsx('w-3 h-3 rounded-sm', color)} />
            <span className="text-xs text-gray-500">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
