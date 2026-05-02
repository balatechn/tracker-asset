'use client';
import { useAuth } from '@/context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Bell, Search } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { clsx } from 'clsx';

export default function Header() {
  const { user } = useAuth();
  const router = useRouter();
  const [search, setSearch] = useState('');

  const { data: alertsData } = useQuery({
    queryKey: ['dashboard-alerts'],
    queryFn: () => api.get('/dashboard/alerts').then(r => r.data),
    refetchInterval: 120000,
  });

  const alertCount = alertsData?.alerts?.length || 0;

  const handleSearch = (e) => {
    if (e.key === 'Enter' && search.trim()) {
      router.push(`/domains?search=${encodeURIComponent(search.trim())}`);
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4 sticky top-0 z-10 shrink-0">
      {/* Search */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Quick search domains... (Enter)"
          className="input pl-9 py-1.5 text-sm"
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={handleSearch}
        />
      </div>

      <div className="flex items-center gap-3 ml-auto">
        {/* Date */}
        <span className="text-xs text-gray-400 hidden sm:block">
          {format(new Date(), 'dd-MMM-yyyy')}
        </span>

        {/* Alerts Bell */}
        <div className="relative">
          <button
            onClick={() => router.push('/dashboard')}
            className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title={`${alertCount} alerts`}
          >
            <Bell className="w-5 h-5" />
            {alertCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium leading-none">
                {alertCount > 9 ? '9+' : alertCount}
              </span>
            )}
          </button>
        </div>

        {/* User Avatar */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center">
            <span className="text-xs font-semibold text-brand-700">
              {(user?.full_name || user?.username || 'U')[0].toUpperCase()}
            </span>
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-gray-700 leading-tight">
              {user?.full_name || user?.username}
            </p>
            <p className="text-xs text-gray-400 leading-tight capitalize">{user?.role}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
