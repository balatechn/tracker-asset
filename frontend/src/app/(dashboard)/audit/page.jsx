'use client';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { FileText } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { clsx } from 'clsx';

const actionColor = (action) => ({
  CREATE: 'bg-green-100 text-green-700',
  UPDATE: 'bg-blue-100 text-blue-700',
  DELETE: 'bg-red-100 text-red-700',
}[action] || 'bg-gray-100 text-gray-600');

export default function AuditPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => api.get('/audit?limit=100').then(r => r.data),
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gray-100 rounded-lg">
          <FileText className="w-5 h-5 text-gray-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-sm text-gray-500">Track all changes made by users</p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Timestamp', 'User', 'Action', 'Table', 'Details'].map(h => (
                  <th key={h} className="table-th">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="table-td"><div className="h-4 bg-gray-200 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : !data?.data?.length ? (
                <tr>
                  <td colSpan={5} className="table-td text-center text-gray-400 py-12">No audit logs yet</td>
                </tr>
              ) : (
                data.data.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="table-td text-xs text-gray-500">
                      {log.created_at ? format(parseISO(log.created_at), 'dd-MMM-yyyy HH:mm') : '—'}
                    </td>
                    <td className="table-td text-sm font-medium">{log.username || '—'}</td>
                    <td className="table-td">
                      <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium', actionColor(log.action))}>
                        {log.action}
                      </span>
                    </td>
                    <td className="table-td text-xs text-gray-500 capitalize">
                      {log.table_name?.replace('_', ' ') || '—'}
                    </td>
                    <td className="table-td text-xs text-gray-400 max-w-xs truncate">
                      {log.new_values ? JSON.stringify(log.new_values).slice(0, 80) + '...' : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
