'use client';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Search, ChevronUp, ChevronDown, Edit2, Trash2, ChevronLeft, ChevronRight, ArrowUpDown, Mail } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';
import StatusBadge from '@/components/common/StatusBadge';
import DaysBadge from '@/components/common/DaysBadge';

function SortBtn({ col, sort, order, setSort, setOrder }) {
  const active = sort === col;
  const toggle = () => {
    if (active) setOrder(order === 'ASC' ? 'DESC' : 'ASC');
    else { setSort(col); setOrder('ASC'); }
  };
  return (
    <button onClick={toggle} className="inline-flex items-center gap-0.5 hover:text-gray-700 transition-colors">
      {active
        ? (order === 'ASC' ? <ChevronUp className="w-3.5 h-3.5 text-brand-600" /> : <ChevronDown className="w-3.5 h-3.5 text-brand-600" />)
        : <ArrowUpDown className="w-3 h-3 text-gray-300" />}
    </button>
  );
}

function rowBg(days) {
  if (days === null || days === undefined) return '';
  const d = parseInt(days);
  if (d < 0) return 'bg-red-50 hover:bg-red-100';
  if (d <= 15) return 'bg-red-50 hover:bg-red-100';
  if (d <= 60) return 'bg-amber-50 hover:bg-amber-100';
  return 'hover:bg-gray-50';
}

export default function DomainTable({
  data, pagination, isLoading,
  search, setSearch, criticality, setCriticality,
  sort, order, setSort, setOrder,
  page, setPage, onEdit, canEdit,
}) {
  const qc = useQueryClient();

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete domain "${name}"? This action cannot be undone.`)) return;
    try {
      await api.delete(`/domains/${id}`);
      toast.success('Domain deleted');
      qc.invalidateQueries({ queryKey: ['domains'] });
      qc.invalidateQueries({ queryKey: ['dashboard-summary'] });
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Delete failed');
    }
  };

  const handleToggleAutoRenew = async (row) => {
    try {
      await api.put(`/domains/${row.id}`, { auto_renew: !row.auto_renew });
      toast.success('Auto-renew updated');
      qc.invalidateQueries({ queryKey: ['domains'] });
    } catch {
      toast.error('Update failed');
    }
  };

  const cols = [
    { label: 'Sr', key: 'sr_no', sortable: true },
    { label: 'Domain Name', key: 'domain_name', sortable: true },
    { label: 'Registrar', key: 'registrar', sortable: false },
    { label: 'Expiry Date', key: 'expiry_date', sortable: true },
    { label: 'Days Left', key: 'days_to_expiry', sortable: false },
    { label: 'Auto Renew', key: 'auto_renew', sortable: false },
    { label: 'Owner', key: 'owner', sortable: false },
    { label: 'Criticality', key: 'criticality', sortable: true },
    { label: 'Last Renewal', key: 'last_renewal_date', sortable: false },
    { label: 'Period (Yrs)', key: 'renewal_period', sortable: false },
    { label: 'Cost (INR)', key: 'annual_cost_inr', sortable: true },
    { label: 'Payment', key: 'payment_method', sortable: false },
    { label: 'Invoice Ref', key: 'invoice_reference', sortable: false },
    { label: 'Remarks', key: 'remarks', sortable: false },
    { label: 'Contacts', key: 'contacts', sortable: false },
    ...(canEdit ? [{ label: 'Actions', key: 'actions', sortable: false }] : []),
  ];

  return (
    <div className="card overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2 p-3 border-b border-gray-100">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search domains, registrar, owner..."
            className="input pl-9 text-sm"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select
          className="select max-w-[160px] text-sm"
          value={criticality}
          onChange={e => { setCriticality(e.target.value); setPage(1); }}
        >
          <option value="">All Criticality</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-200 inline-block" /> &lt;15d</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-200 inline-block" /> 15–60d</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-white border inline-block" /> &gt;60d</span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full sticky-table">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {cols.map(col => (
                <th key={col.key} className="table-th">
                  <div className="flex items-center gap-1">
                    {col.label}
                    {col.sortable && (
                      <SortBtn col={col.key} sort={sort} order={order} setSort={setSort} setOrder={setOrder} />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  {cols.map(c => (
                    <td key={c.key} className="table-td">
                      <div className="h-4 bg-gray-200 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={cols.length} className="table-td text-center text-gray-400 py-12">
                  No domains found
                </td>
              </tr>
            ) : (
              data.map(row => (
                <tr
                  key={row.id}
                  className={clsx('transition-colors', rowBg(row.days_to_expiry))}
                >
                  <td className="table-td text-gray-400 text-xs">{row.sr_no}</td>
                  <td className="table-td">
                    <span className="font-medium text-brand-700">{row.domain_name}</span>
                  </td>
                  <td className="table-td text-gray-500">{row.registrar || '—'}</td>
                  <td className="table-td text-sm">
                    {row.expiry_date ? format(parseISO(row.expiry_date), 'dd-MMM-yyyy') : '—'}
                  </td>
                  <td className="table-td">
                    <DaysBadge days={row.days_to_expiry} />
                  </td>
                  <td className="table-td">
                    {canEdit ? (
                      <button
                        onClick={() => handleToggleAutoRenew(row)}
                        className={clsx(
                          'relative inline-flex h-5 w-9 rounded-full transition-colors focus:outline-none',
                          row.auto_renew ? 'bg-green-500' : 'bg-gray-300'
                        )}
                        title="Toggle auto-renew"
                      >
                        <span className={clsx(
                          'inline-block w-4 h-4 bg-white rounded-full shadow transition-transform mt-0.5',
                          row.auto_renew ? 'translate-x-4' : 'translate-x-0.5'
                        )} />
                      </button>
                    ) : (
                      <span className={row.auto_renew ? 'text-green-600 text-xs font-medium' : 'text-gray-400 text-xs'}>
                        {row.auto_renew ? 'Yes' : 'No'}
                      </span>
                    )}
                  </td>
                  <td className="table-td text-xs text-gray-600">{row.owner || '—'}</td>
                  <td className="table-td">
                    <StatusBadge criticality={row.criticality} />
                  </td>
                  <td className="table-td text-xs text-gray-500">
                    {row.last_renewal_date ? format(parseISO(row.last_renewal_date), 'dd-MMM-yyyy') : '—'}
                  </td>
                  <td className="table-td text-center">{row.renewal_period || '—'}</td>
                  <td className="table-td text-right">
                    {row.annual_cost_inr
                      ? <span className="font-medium">₹{Number(row.annual_cost_inr).toLocaleString('en-IN')}</span>
                      : '—'}
                  </td>
                  <td className="table-td text-xs text-gray-500">{row.payment_method || '—'}</td>
                  <td className="table-td text-xs text-gray-500">{row.invoice_reference || '—'}</td>
                  <td className="table-td">
                    <span className="text-xs text-gray-500 max-w-[160px] truncate block" title={row.remarks}>
                      {row.remarks || '—'}
                    </span>
                  </td>
                  <td className="table-td">
                    <div className="flex flex-col gap-0.5 min-w-[130px]">
                      {row.finance_email && (
                        <a href={`mailto:${row.finance_email}`} className="flex items-center gap-1 text-[10px] text-blue-700 hover:text-blue-900 hover:underline" title={`Finance: ${row.finance_email}`}>
                          <Mail className="w-2.5 h-2.5 shrink-0 text-blue-400" />
                          <span className="truncate max-w-[110px]">F: {row.finance_email}</span>
                        </a>
                      )}
                      {row.admin_email && (
                        <a href={`mailto:${row.admin_email}`} className="flex items-center gap-1 text-[10px] text-purple-700 hover:text-purple-900 hover:underline" title={`Admin: ${row.admin_email}`}>
                          <Mail className="w-2.5 h-2.5 shrink-0 text-purple-400" />
                          <span className="truncate max-w-[110px]">A: {row.admin_email}</span>
                        </a>
                      )}
                      {row.vendor_email && (
                        <a href={`mailto:${row.vendor_email}`} className="flex items-center gap-1 text-[10px] text-green-700 hover:text-green-900 hover:underline" title={`Vendor: ${row.vendor_email}`}>
                          <Mail className="w-2.5 h-2.5 shrink-0 text-green-400" />
                          <span className="truncate max-w-[110px]">V: {row.vendor_email}</span>
                        </a>
                      )}
                      {!row.finance_email && !row.admin_email && !row.vendor_email && (
                        <span className="text-[10px] text-gray-300">—</span>
                      )}
                    </div>
                  </td>
                  {canEdit && (
                    <td className="table-td">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onEdit(row)}
                          className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(row.id, row.domain_name)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
          <p className="text-xs text-gray-500">
            Showing {((page - 1) * pagination.limit) + 1}–{Math.min(page * pagination.limit, pagination.total)} of {pagination.total}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
              const p = Math.max(1, Math.min(page - 2, pagination.pages - 4)) + i;
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={clsx(
                    'w-7 h-7 rounded text-xs font-medium transition-colors',
                    p === page ? 'bg-brand-700 text-white' : 'hover:bg-gray-200 text-gray-600'
                  )}
                >
                  {p}
                </button>
              );
            })}
            <button
              onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
              disabled={page === pagination.pages}
              className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
