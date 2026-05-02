'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { LayoutDashboard, Globe, Monitor, FileText, Settings, LogOut, Shield, ChevronLeft, ChevronRight, Bell } from 'lucide-react';
import { useState } from 'react';
import { clsx } from 'clsx';

const NAV_ITEMS = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/domains', icon: Globe, label: 'Domains' },
  { href: '/software', icon: Monitor, label: 'Software & Licenses' },
  { href: '/audit', icon: FileText, label: 'Audit Logs' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={clsx(
      'flex flex-col bg-slate-900 text-white transition-all duration-300 shrink-0',
      collapsed ? 'w-16' : 'w-60'
    )}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-700">
        <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center shrink-0">
          <Shield className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-sm font-bold truncate leading-tight">NGI Asset Tracker</p>
            <p className="text-xs text-slate-400 truncate">National Group India</p>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto text-slate-400 hover:text-white transition-colors shrink-0"
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 space-y-1 px-2">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-brand-700 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              )}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="border-t border-slate-700 p-3">
        {!collapsed && (
          <div className="px-2 pb-3">
            <p className="text-xs font-medium text-white truncate">{user?.full_name || user?.username}</p>
            <span className={clsx(
              'text-xs px-1.5 py-0.5 rounded font-medium',
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
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && 'Sign Out'}
        </button>
      </div>
    </aside>
  );
}
