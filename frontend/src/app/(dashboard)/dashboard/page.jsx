'use client';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import StatsCards from '@/components/Dashboard/StatsCards';
import AlertsPanel from '@/components/Dashboard/AlertsPanel';
import UpcomingRenewals from '@/components/Dashboard/UpcomingRenewals';
import { RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

export default function DashboardPage() {
  const { data, isLoading, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => api.get('/dashboard/summary').then(r => r.data),
    refetchInterval: 60000, // auto refresh every minute
  });

  const { data: alertsData } = useQuery({
    queryKey: ['dashboard-alerts'],
    queryFn: () => api.get('/dashboard/alerts').then(r => r.data),
  });

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            National Group India — IT Asset & Domain Tracker
          </p>
        </div>
        <div className="flex items-center gap-3">
          {dataUpdatedAt > 0 && (
            <span className="text-xs text-gray-400">
              Updated {format(dataUpdatedAt, 'HH:mm:ss')}
            </span>
          )}
          <button
            onClick={() => refetch()}
            className="btn-secondary"
            title="Refresh dashboard"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <StatsCards data={data} isLoading={isLoading} />

      {/* Alerts + Upcoming Renewals */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <AlertsPanel alerts={alertsData?.alerts || []} />
        <UpcomingRenewals upcoming={data?.upcoming || []} isLoading={isLoading} />
      </div>
    </div>
  );
}
