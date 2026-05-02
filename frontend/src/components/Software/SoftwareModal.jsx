'use client';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { X, Monitor } from 'lucide-react';

const DEFAULTS = {
  product_name: '', vendor: '', license_type: '', license_count: 1,
  expiry_date: '', auto_renew: false, criticality: 'High',
  annual_cost_inr: '', payment_method: '', invoice_reference: '',
  assigned_to: '', owner: 'Balasubramanian P', remarks: '',
};

export default function SoftwareModal({ item, onClose, onSaved }) {
  const isEdit = !!item;
  const { register, handleSubmit, reset, formState: { isSubmitting, errors } } = useForm({ defaultValues: DEFAULTS });

  useEffect(() => {
    if (item) {
      reset({
        ...DEFAULTS, ...item,
        expiry_date: item.expiry_date ? item.expiry_date.split('T')[0] : '',
        annual_cost_inr: item.annual_cost_inr ?? '',
      });
    } else {
      reset(DEFAULTS);
    }
  }, [item, reset]);

  const onSubmit = async (data) => {
    try {
      const payload = {
        ...data,
        expiry_date: data.expiry_date || null,
        annual_cost_inr: data.annual_cost_inr ? parseFloat(data.annual_cost_inr) : null,
        license_count: parseInt(data.license_count) || 1,
      };

      if (isEdit) {
        await api.put(`/software/${item.id}`, payload);
        toast.success('License updated');
      } else {
        await api.post('/software', payload);
        toast.success('License added');
      }
      onSaved();
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Save failed');
    }
  };

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <Monitor className="w-5 h-5 text-purple-600" />
            <h2 className="text-lg font-semibold">{isEdit ? 'Edit License' : 'Add Software License'}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Product Name *</label>
              <input
                className={`input ${errors.product_name ? 'border-red-400' : ''}`}
                placeholder="e.g. Microsoft 365 Mail"
                {...register('product_name', { required: 'Product name is required' })}
              />
              {errors.product_name && <p className="text-xs text-red-500 mt-1">{errors.product_name.message}</p>}
            </div>

            <div>
              <label className="label">Vendor</label>
              <input className="input" placeholder="e.g. PaceInfo, Tacitine" {...register('vendor')} />
            </div>

            <div>
              <label className="label">License Type</label>
              <input className="input" placeholder="e.g. Annual, Perpetual" {...register('license_type')} />
            </div>

            <div>
              <label className="label">License Count</label>
              <input type="number" min="1" className="input" {...register('license_count')} />
            </div>

            <div>
              <label className="label">Expiry Date</label>
              <input type="date" className="input" {...register('expiry_date')} />
            </div>

            <div>
              <label className="label">Criticality</label>
              <select className="select" {...register('criticality')}>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            <div>
              <label className="label">Annual Cost (INR)</label>
              <input type="number" min="0" step="0.01" className="input" placeholder="e.g. 5000" {...register('annual_cost_inr')} />
            </div>

            <div>
              <label className="label">Payment Method</label>
              <input className="input" placeholder="e.g. Online" {...register('payment_method')} />
            </div>

            <div>
              <label className="label">Invoice Reference</label>
              <input className="input" placeholder="e.g. INV-2024-001" {...register('invoice_reference')} />
            </div>

            <div>
              <label className="label">Assigned To</label>
              <input className="input" placeholder="Department or user" {...register('assigned_to')} />
            </div>

            <div>
              <label className="label">Owner (IT Person)</label>
              <input className="input" {...register('owner')} />
            </div>

            <div className="sm:col-span-2">
              <label className="label">Remarks</label>
              <textarea rows={2} className="input resize-none" {...register('remarks')} />
            </div>

            <div className="sm:col-span-2 flex items-center gap-3">
              <input type="checkbox" id="sw_auto_renew" className="w-4 h-4 text-brand-600" {...register('auto_renew')} />
              <label htmlFor="sw_auto_renew" className="text-sm text-gray-700 cursor-pointer">Auto-renew enabled</label>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : isEdit ? 'Update License' : 'Add License'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
