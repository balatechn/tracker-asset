'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  LayoutDashboard, Globe, Monitor, FileText, LogOut, Shield,
  ChevronLeft, ChevronRight, Bell, Settings,
} from 'lucide-react';
import { useState } from 'react';
import { clsx } from 'clsx';

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const { data: alertsData } = useQuery({
    queryKey: ['dashboard-alerts'],
    queryFn: () => api.get('/dashboard/alerts').then(r => r.data),
    refetchInterval: 120000,
  });
  const alertCount = alertsData?.alerts?.length || 0;

  const isActive = (href) =>
    href === '/dashboard'
      ? pathname === '/dashboard'
      : pathname === href || pathname.startsWith(href + '/');

  const navItems = [
    { href: '/dashboard', Icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/domains',   Icon: Globe,           label: 'Domains' },
    { href: '/software',  Icon: Monitor,         label: 'Licenses' },
    { href: '/alerts',    Icon: Bell,            label: 'Alerts', badge: alertCount },
    { href: '/audit',     Icon: FileText,        label: 'Audit Logs' },
    ...(user?.role === 'admin' ? [{ href: '/settings', Icon: Settings, label: 'Settings' }] : []),
  ];

  return (
    <aside className={clsx(
      'flex flex-col bg-slate-900 text-white transition-all duration-300 shrink-0',
      collapsed ? 'w-14' : 'w-56'
    )}>

      {/* Brand */}
      <div className={clsx(
        'flex items-center border-b border-slate-700/80 py-4',
        collapsed ? 'px-3 justify-center' : 'px-4 gap-3'
      )}>
        <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center shrink-0 shadow-sm">
          <Shield className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold leading-tight text-white">NGI Tracker</p>
            <p className="text-[11px] text-slate-400 leading-tight mt-0.5">National Group India</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2 overflow-y-auto">
        {navItems.map(({ href, Icon, label, badge }) => (
          <Link
            key={href}
            href={href}
            title={label}
            className={clsx(
              'flex items-center gap-3 py-2.5 text-sm font-medium transition-all duration-100 border-l-[3px] relative',
              collapsed ? 'px-3 justify-center' : 'px-4',
              isActive(href)
                ? 'text-white bg-white/10 border-brand-400'
                : 'text-slate-400 hover:text-white hover:bg-white/5 border-transparent'
            )}
          >
            <Icon className="w-[18px] h-[18px] shrink-0" />
            {!collapsed && <span className="flex-1 truncate">{label}</span>}
            {badge > 0 && (
              <span className={clsx(
                'bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none',
                collapsed ? 'absolute top-1 right-1 w-4 h-4' : 'w-5 h-5 shrink-0'
              )}>
                {badge > 9 ? '9+' : badge}
              </span>
            )}
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-700/80">
        {!collapsed && (
          <div className="px-4 py-3 flex items-center gap-2.5">
            <div className="w-8 h-8 bg-brand-700 rounded-full flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-white">
                {(user?.full_name || user?.username || 'U')[0].toUpperCase()}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate leading-tight">
                {user?.full_name || user?.username}
              </p>
              <span className={clsx(
                'text-[10px] px-1.5 py-0.5 rounded font-medium',
                user?.role === 'admin' ? 'bg-red-900/60 text-red-300' : 'bg-slate-700 text-slate-300'
              )}>
                {user?.role}
              </span>
            </div>
          </div>
        )}
        <div className="flex border-t border-slate-700/50">
          <button
            onClick={logout}
            title="Sign out"
            className={clsx(
              'flex items-center gap-2.5 py-3 text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex-1',
              collapsed ? 'justify-center px-3' : 'px-4'
            )}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!collapsed && 'Sign Out'}
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? 'Expand' : 'Collapse'}
            className="flex items-center justify-center px-3 py-3 border-l border-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </aside>
  );
}
