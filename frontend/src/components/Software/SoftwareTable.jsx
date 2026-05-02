'use client';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Search, Edit2, Trash2, ChevronLeft, ChevronRight, ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react';
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

export default function SoftwareTable({
  data, pagination, isLoading,
  search, setSearch, criticality, setCriticality,
  sort, order, setSort, setOrder,
  page, setPage, onEdit, canEdit,
}) {
  const qc = useQueryClient();

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete "${name}"?`)) return;
    try {
      await api.delete(`/software/${id}`);
      toast.success('License deleted');
      qc.invalidateQueries({ queryKey: ['software'] });
      qc.invalidateQueries({ queryKey: ['dashboard-summary'] });
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Delete failed');
    }
  };

  const cols = [
    { label: 'Sr', key: 'sr_no', sortable: true },
    { label: 'Product Name', key: 'product_name', sortable: true },
    { label: 'Vendor', key: 'vendor', sortable: false },
    { label: 'License Type', key: 'license_type', sortable: false },
    { label: 'Count', key: 'license_count', sortable: false },
    { label: 'Expiry Date', key: 'expiry_date', sortable: true },
    { label: 'Days Left', key: 'days_to_expiry', sortable: false },
    { label: 'Criticality', key: 'criticality', sortable: true },
    { label: 'Cost (INR)', key: 'annual_cost_inr', sortable: true },
    { label: 'Assigned To', key: 'assigned_to', sortable: false },
    { label: 'Owner', key: 'owner', sortable: false },
    { label: 'Remarks', key: 'remarks', sortable: false },
    ...(canEdit ? [{ label: 'Actions', key: 'actions', sortable: false }] : []),
  ];

  return (
    <div className="card overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 p-4 border-b border-gray-100">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search product, vendor..."
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
              Array.from({ length: 5 }).map((_, i) => (
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
                  No software licenses found
                </td>
              </tr>
            ) : (
              data.map(row => (
                <tr key={row.id} className={clsx('transition-colors', rowBg(row.days_to_expiry))}>
                  <td className="table-td text-gray-400 text-xs">{row.sr_no}</td>
                  <td className="table-td">
                    <span className="font-medium text-gray-900">{row.product_name}</span>
                  </td>
                  <td className="table-td text-gray-500 text-xs">{row.vendor || '—'}</td>
                  <td className="table-td text-gray-500 text-xs">{row.license_type || '—'}</td>
                  <td className="table-td text-center text-sm">{row.license_count || 1}</td>
                  <td className="table-td text-sm">
                    {row.expiry_date ? format(parseISO(row.expiry_date), 'dd-MMM-yyyy') : '—'}
                  </td>
                  <td className="table-td">
                    <DaysBadge days={row.days_to_expiry} />
                  </td>
                  <td className="table-td">
                    <StatusBadge criticality={row.criticality} />
                  </td>
                  <td className="table-td text-right">
                    {row.annual_cost_inr
                      ? <span className="font-medium">₹{Number(row.annual_cost_inr).toLocaleString('en-IN')}</span>
                      : '—'}
                  </td>
                  <td className="table-td text-xs text-gray-500">{row.assigned_to || '—'}</td>
                  <td className="table-td text-xs text-gray-500">{row.owner || '—'}</td>
                  <td className="table-td">
                    <span className="text-xs text-gray-500 max-w-[140px] truncate block" title={row.remarks}>
                      {row.remarks || '—'}
                    </span>
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
                          onClick={() => handleDelete(row.id, row.product_name)}
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
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-40">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setPage(p => Math.min(pagination.pages, p + 1))} disabled={page === pagination.pages} className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-40">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
