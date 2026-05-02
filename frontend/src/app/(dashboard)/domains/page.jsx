'use client';
import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import DomainTable from '@/components/Domain/DomainTable';
import DomainModal from '@/components/Domain/DomainModal';
import { Plus, Download, Upload, Globe } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';

export default function DomainsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [criticality, setCriticality] = useState('');
  const [sort, setSort] = useState('sr_no');
  const [order, setOrder] = useState('ASC');
  const [editItem, setEditItem] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['domains', page, search, criticality, sort, order],
    queryFn: () => api.get('/domains', { params: { page, limit: 50, search, criticality, sort, order } }).then(r => r.data),
    keepPreviousData: true,
  });

  const handleExport = async () => {
    try {
      const res = await api.get('/domains/export/excel', { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `domains-${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Export failed');
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await api.post('/domains/import', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success(`Imported ${res.data.inserted} domain(s)`);
      qc.invalidateQueries({ queryKey: ['domains'] });
      qc.invalidateQueries({ queryKey: ['dashboard-summary'] });
    } catch {
      toast.error('Import failed');
    }
    e.target.value = '';
  };

  const openCreate = () => { setEditItem(null); setShowModal(true); };
  const openEdit = useCallback((item) => { setEditItem(item); setShowModal(true); }, []);

  const handleSave = () => {
    setShowModal(false);
    qc.invalidateQueries({ queryKey: ['domains'] });
    qc.invalidateQueries({ queryKey: ['dashboard-summary'] });
    qc.invalidateQueries({ queryKey: ['dashboard-alerts'] });
  };

  const canEdit = user?.role !== 'viewer';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-brand-100 rounded-lg">
            <Globe className="w-5 h-5 text-brand-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Domain Tracker</h1>
            <p className="text-sm text-gray-500">
              {data?.pagination?.total ?? '—'} domains tracked
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={handleExport} className="btn-secondary text-xs">
            <Download className="w-4 h-4" /> Export Excel
          </button>

          {canEdit && (
            <>
              <label className="btn-secondary text-xs cursor-pointer">
                <Upload className="w-4 h-4" /> Import Excel
                <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
              </label>
              <button onClick={openCreate} className="btn-primary text-xs">
                <Plus className="w-4 h-4" /> Add Domain
              </button>
            </>
          )}
        </div>
      </div>

      {/* Table */}
      <DomainTable
        data={data?.data || []}
        pagination={data?.pagination}
        isLoading={isLoading}
        search={search}
        setSearch={setSearch}
        criticality={criticality}
        setCriticality={setCriticality}
        sort={sort}
        order={order}
        setSort={setSort}
        setOrder={setOrder}
        page={page}
        setPage={setPage}
        onEdit={openEdit}
        canEdit={canEdit}
      />

      {/* Modal */}
      {showModal && (
        <DomainModal
          item={editItem}
          onClose={() => setShowModal(false)}
          onSaved={handleSave}
        />
      )}
    </div>
  );
}
