'use client';
import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Settings, Mail, Server, Send, CheckCircle, XCircle, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { clsx } from 'clsx';

export default function SettingsPage() {
  const { user } = useAuth();
  const [testMsg, setTestMsg] = useState(null);
  const [showUser, setShowUser] = useState(false);

  // Admin-only guard
  if (user && user.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <XCircle className="w-10 h-10 text-red-400" />
        <p className="text-gray-600 font-medium">Access denied — admin only</p>
      </div>
    );
  }

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['email-config'],
    queryFn: () => api.get('/settings/email-config').then(r => r.data),
    retry: 1,
  });

  const testMutation = useMutation({
    mutationFn: () => api.post('/settings/test-email'),
    onSuccess: d => setTestMsg({ ok: true, text: d.data.message || 'Test alert email triggered!' }),
    onError: e => setTestMsg({ ok: false, text: 'Error: ' + (e.response?.data?.error || e.message) }),
  });

  const cfg = data || {};

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-base font-bold text-gray-900 flex items-center gap-2">
          <Settings className="w-5 h-5 text-brand-600" /> System Settings
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">Application configuration — read-only. Edit via environment variables.</p>
      </div>

      {/* Email Configuration */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-brand-600" />
            <h2 className="text-sm font-semibold text-gray-800">Email Alert Configuration</h2>
          </div>
          <div className="flex items-center gap-2">
            {isLoading ? (
              <span className="text-xs text-gray-400">Loading…</span>
            ) : cfg.configured ? (
              <span className="flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded-full">
                <CheckCircle className="w-3 h-3" /> Configured
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 px-2 py-1 rounded-full">
                <XCircle className="w-3 h-3" /> Not Configured
              </span>
            )}
            <button onClick={() => refetch()} className="p-1.5 rounded hover:bg-gray-100 transition-colors" title="Refresh">
              <RefreshCw className="w-3.5 h-3.5 text-gray-400" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ConfigRow icon={Server} label="SMTP Host" value={cfg.host} />
              <ConfigRow icon={Server} label="SMTP Port" value={cfg.port} />
              <ConfigRow
                icon={Mail}
                label="SMTP Login"
                value={showUser ? cfg.user : cfg.user ? cfg.user.replace(/(?<=.{3}).(?=.*@)/g, '*') : null}
                action={
                  <button onClick={() => setShowUser(v => !v)} className="ml-1 text-gray-400 hover:text-gray-600">
                    {showUser ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                }
              />
              <ConfigRow icon={Mail} label="From Address" value={cfg.from} />
              <div className="sm:col-span-2">
                <ConfigRow icon={Mail} label="Alert Recipients (ALERT_EMAILS)" value={cfg.alertEmails} />
              </div>
              <ConfigRow icon={Server} label="Password" value={cfg.passwordSet ? '••••••••••••' : 'NOT SET'} danger={!cfg.passwordSet} />
            </div>
          )}

          <div className="border-t border-gray-100 pt-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <button
              onClick={() => { setTestMsg(null); testMutation.mutate(); }}
              disabled={testMutation.isPending || !cfg.configured}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-700 text-white text-xs font-medium hover:bg-brand-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-3.5 h-3.5" />
              {testMutation.isPending ? 'Sending…' : 'Send Test Alert Email'}
            </button>
            {!cfg.configured && !isLoading && (
              <span className="text-xs text-red-500">Configure email environment variables first.</span>
            )}
          </div>

          {testMsg && (
            <div className={clsx('p-3 rounded-lg text-xs font-medium flex items-start gap-2',
              testMsg.ok ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100')}>
              {testMsg.ok ? <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" /> : <XCircle className="w-4 h-4 shrink-0 mt-0.5" />}
              {testMsg.text}
            </div>
          )}
        </div>
      </div>

      {/* Alert Schedule Info */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-3">
          <RefreshCw className="w-4 h-4 text-brand-600" />
          <h2 className="text-sm font-semibold text-gray-800">Alert Schedule</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          {[
            { label: 'Schedule', value: 'Daily at 8:00 AM (server time)', icon: '🕗' },
            { label: 'Alert Window', value: 'Assets expiring within 30 days', icon: '📅' },
            { label: 'Per-domain Contacts', value: 'Finance + Admin + Vendor emails', icon: '📬' },
          ].map(({ label, value, icon }) => (
            <div key={label} className="bg-gray-50 rounded-lg p-3">
              <p className="text-lg mb-1">{icon}</p>
              <p className="font-semibold text-gray-700">{label}</p>
              <p className="text-gray-500 mt-0.5">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* System Info */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Settings className="w-4 h-4 text-brand-600" />
          <h2 className="text-sm font-semibold text-gray-800">System Information</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          {[
            { label: 'App', value: 'NGI Asset Tracker' },
            { label: 'Frontend', value: 'Next.js 14' },
            { label: 'Backend', value: 'Express.js' },
            { label: 'Database', value: 'PostgreSQL 15' },
          ].map(({ label, value }) => (
            <div key={label} className="bg-gray-50 rounded p-3">
              <p className="text-gray-500">{label}</p>
              <p className="font-semibold text-gray-800 mt-0.5">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ConfigRow({ icon: Icon, label, value, action, danger }) {
  return (
    <div className="flex flex-col gap-0.5">
      <label className="text-[10px] text-gray-500 uppercase tracking-wide font-semibold">{label}</label>
      <div className={clsx(
        'flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-mono',
        danger ? 'bg-red-50 border-red-200 text-red-700' : 'bg-gray-50 border-gray-200 text-gray-800'
      )}>
        <Icon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
        <span className="truncate flex-1">{value || <span className="text-gray-300 italic">not set</span>}</span>
        {action}
      </div>
    </div>
  );
}
