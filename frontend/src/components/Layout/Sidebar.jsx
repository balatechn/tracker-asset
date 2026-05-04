'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  LayoutDashboard, Globe, Monitor, FileText, LogOut, Shield,
  ChevronLeft, ChevronRight, ChevronDown, Bell, Settings, Users,
  List, CalendarDays,
} from 'lucide-react';
import { useState } from 'react';
import { clsx } from 'clsx';

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [domainsOpen, setDomainsOpen] = useState(true);

  const { data: alertsData } = useQuery({
    queryKey: ['dashboard-alerts'],
    queryFn: () => api.get('/dashboard/alerts').then(r => r.data),
    refetchInterval: 120000,
  });
  const alertCount = alertsData?.alerts?.length || 0;

  const isActive = (href) => pathname === href || pathname.startsWith(href + '/');

  const navLinkCls = (href) => clsx(
    'flex items-center gap-2.5 px-2 py-1.5 rounded-md text-xs font-medium transition-colors',
    isActive(href)
      ? 'bg-brand-700 text-white'
      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
  );

  return (
    <aside className={clsx(
      'flex flex-col bg-slate-900 text-white transition-all duration-300 shrink-0',
      collapsed ? 'w-14' : 'w-52'
    )}>
      {/* Logo */}
      <div className="flex items-center gap-2 px-2.5 py-2.5 border-b border-slate-700">
        <div className="w-7 h-7 bg-brand-600 rounded-md flex items-center justify-center shrink-0">
          <Shield className="w-3.5 h-3.5 text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold truncate leading-tight">NGI Asset Tracker</p>
            <p className="text-[10px] text-slate-400 truncate">National Group India</p>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={clsx('text-slate-400 hover:text-white transition-colors shrink-0', !collapsed && 'ml-auto')}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2 space-y-0.5 px-1.5 overflow-y-auto">
        {/* Dashboard */}
        <Link href="/dashboard" title="Dashboard" className={navLinkCls('/dashboard')}>
          <LayoutDashboard className="w-4 h-4 shrink-0" />
          {!collapsed && <span className="truncate">Dashboard</span>}
        </Link>

        {/* Domains — collapsible group */}
        <div>
          {collapsed ? (
            <Link href="/domains/calendar" title="Domains" className={clsx(
              'flex items-center gap-2.5 px-2 py-1.5 rounded-md text-xs font-medium transition-colors w-full',
              isActive('/domains') ? 'bg-brand-700 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            )}>
              <Globe className="w-4 h-4 shrink-0" />
            </Link>
          ) : (
            <button
              onClick={() => setDomainsOpen(o => !o)}
              title="Domains"
              className={clsx(
                'flex items-center gap-2.5 px-2 py-1.5 rounded-md text-xs font-medium transition-colors w-full',
                isActive('/domains') ? 'bg-brand-700 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              )}
            >
              <Globe className="w-4 h-4 shrink-0" />
              <span className="truncate flex-1 text-left">Domains</span>
              <ChevronDown className={clsx('w-3 h-3 transition-transform', domainsOpen && 'rotate-180')} />
            </button>
          )}
          {!collapsed && domainsOpen && (
            <div className="ml-5 mt-0.5 space-y-0.5 border-l border-slate-700 pl-2">
              <Link href="/domains" title="All Domains" className={clsx(
                'flex items-center gap-2 px-2 py-1 rounded text-[11px] font-medium transition-colors',
                pathname === '/domains' ? 'text-brand-300' : 'text-slate-400 hover:text-white'
              )}>
                <List className="w-3 h-3 shrink-0" /> All Domains
              </Link>
              <Link href="/domains/calendar" title="Calendar View" className={clsx(
                'flex items-center gap-2 px-2 py-1 rounded text-[11px] font-medium transition-colors',
                pathname === '/domains/calendar' ? 'text-brand-300' : 'text-slate-400 hover:text-white'
              )}>
                <CalendarDays className="w-3 h-3 shrink-0" /> Calendar View
              </Link>
            </div>
          )}
        </div>

        {/* Licenses */}
        <Link href="/software" title="Licenses" className={navLinkCls('/software')}>
          <Monitor className="w-4 h-4 shrink-0" />
          {!collapsed && <span className="truncate">Licenses</span>}
        </Link>

        {/* Alerts */}
        <Link href="/alerts" title="Alerts" className={clsx(navLinkCls('/alerts'), 'relative')}>
          <Bell className="w-4 h-4 shrink-0" />
          {!collapsed && <span className="truncate flex-1">Alerts</span>}
          {alertCount > 0 && (
            <span className={clsx(
              'bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center',
              collapsed ? 'absolute -top-0.5 -right-0.5 w-4 h-4' : 'w-4 h-4 shrink-0'
            )}>
              {alertCount > 9 ? '9+' : alertCount}
            </span>
          )}
        </Link>

        {/* Audit Logs */}
        <Link href="/audit" title="Audit Logs" className={navLinkCls('/audit')}>
          <FileText className="w-4 h-4 shrink-0" />
          {!collapsed && <span className="truncate">Audit Logs</span>}
        </Link>

        {/* Settings (admin only) */}
        {user?.role === 'admin' && (
          <Link href="/settings" title="Settings" className={navLinkCls('/settings')}>
            <Settings className="w-4 h-4 shrink-0" />
            {!collapsed && <span className="truncate">Settings</span>}
          </Link>
        )}
      </nav>

      {/* User */}
      <div className="border-t border-slate-700 p-2">
        {!collapsed && (
          <div className="px-1.5 pb-2">
            <p className="text-xs font-medium text-white truncate">{user?.full_name || user?.username}</p>
            <span className={clsx(
              'text-[10px] px-1 py-0.5 rounded font-medium',
              user?.role === 'admin' ? 'bg-red-900 text-red-200' :
              user?.role === 'it_manager' ? 'bg-brand-900 text-brand-200' :
              'bg-slate-700 text-slate-300'
            )}>
              {user?.role}
            </span>
          </div>
        )}
        <button
          onClick={logout}
          title="Sign out"
          className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5 shrink-0" />
          {!collapsed && 'Sign Out'}
        </button>
      </div>
    </aside>
  );
}
