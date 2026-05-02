'use client';
import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import SoftwareTable from '@/components/Software/SoftwareTable';
import SoftwareModal from '@/components/Software/SoftwareModal';
import { Plus, Download, Monitor } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';

export default function SoftwarePage() {
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
    queryKey: ['software', page, search, criticality, sort, order],
    queryFn: () => api.get('/software', { params: { page, limit: 50, search, criticality, sort, order } }).then(r => r.data),
    keepPreviousData: true,
  });

  const handleExport = async () => {
    try {
      const res = await api.get('/software/export/excel', { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `software-${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Export failed');
    }
  };

  const openCreate = () => { setEditItem(null); setShowModal(true); };
  const openEdit = useCallback((item) => { setEditItem(item); setShowModal(true); }, []);

  const handleSave = () => {
    setShowModal(false);
    qc.invalidateQueries({ queryKey: ['software'] });
    qc.invalidateQueries({ queryKey: ['dashboard-summary'] });
    qc.invalidateQueries({ queryKey: ['dashboard-alerts'] });
  };

  const canEdit = user?.role !== 'viewer';

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Monitor className="w-5 h-5 text-purple-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Software & Licenses</h1>
            <p className="text-sm text-gray-500">
              {data?.pagination?.total ?? '—'} licenses tracked
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={handleExport} className="btn-secondary text-xs">
            <Download className="w-4 h-4" /> Export Excel
          </button>
          {canEdit && (
            <button onClick={openCreate} className="btn-primary text-xs">
              <Plus className="w-4 h-4" /> Add License
            </button>
          )}
        </div>
      </div>

      <SoftwareTable
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

      {showModal && (
        <SoftwareModal
          item={editItem}
          onClose={() => setShowModal(false)}
          onSaved={handleSave}
        />
      )}
    </div>
  );
}
