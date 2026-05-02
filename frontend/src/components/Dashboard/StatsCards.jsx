'use client';
import { Globe, AlertTriangle, Shield, RefreshCw } from 'lucide-react';
import { clsx } from 'clsx';

const StatCard = ({ title, value, subtitle, icon: Icon, color, loading }) => (
  <div className={clsx('card p-5 border-l-4', color)}>
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        {loading ? (
          <div className="h-8 w-16 bg-gray-200 rounded animate-pulse mt-1" />
        ) : (
          <p className="text-3xl font-bold text-gray-900 mt-1">{value ?? '—'}</p>
        )}
        {subtitle && (
          <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
        )}
      </div>
      <div className={clsx('p-3 rounded-xl', color.replace('border-', 'bg-').replace('-600', '-100').replace('-500', '-100'))}>
        <Icon className={clsx('w-6 h-6', color.replace('border-', 'text-'))} />
      </div>
    </div>
  </div>
);

export default function StatsCards({ data, isLoading }) {
  const d = data?.domains;
  const s = data?.software;

  const cards = [
    {
      title: 'Total Domains',
      value: d?.total,
      subtitle: `${s?.total ?? 0} software licenses`,
      icon: Globe,
      color: 'border-brand-600',
    },
    {
      title: 'Expiring in 30 Days',
      value: parseInt(d?.expiring_30 || 0) + parseInt(s?.expiring_30 || 0),
      subtitle: `${d?.expiring_15 ?? 0} critical (<15 days)`,
      icon: AlertTriangle,
      color: parseInt(d?.expiring_15 || 0) + parseInt(s?.expiring_30 || 0) > 0 ? 'border-red-500' : 'border-amber-500',
    },
    {
      title: 'High Critical Assets',
      value: parseInt(d?.high_critical || 0) + parseInt(s?.high_critical || 0),
      subtitle: `${d?.high_critical ?? 0} domains · ${s?.high_critical ?? 0} software`,
      icon: Shield,
      color: 'border-purple-600',
    },
    {
      title: 'Renewed This Month',
      value: d?.renewed_month,
      subtitle: `Total cost: ₹${Number(parseFloat(d?.total_cost || 0) + parseFloat(s?.total_cost || 0)).toLocaleString('en-IN')}`,
      icon: RefreshCw,
      color: 'border-green-600',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map((card) => (
        <StatCard key={card.title} {...card} loading={isLoading} />
      ))}
    </div>
  );
}
