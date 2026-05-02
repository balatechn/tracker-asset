'use client';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { X, Globe } from 'lucide-react';

const FIELD_DEFAULTS = {
  domain_name: '', registrar: '', expiry_date: '', auto_renew: false,
  owner: 'Balasubramanian P', criticality: 'High', last_renewal_date: '',
  renewal_period: 1, annual_cost_inr: '', payment_method: '', invoice_reference: '', remarks: '',
  finance_email: '', admin_email: '', vendor_email: '',
};

export default function DomainModal({ item, onClose, onSaved }) {
  const isEdit = !!item;
  const { register, handleSubmit, reset, formState: { isSubmitting, errors } } = useForm({
    defaultValues: FIELD_DEFAULTS,
  });

  useEffect(() => {
    if (item) {
      reset({
        ...FIELD_DEFAULTS,
        ...item,
        expiry_date: item.expiry_date ? item.expiry_date.split('T')[0] : '',
        last_renewal_date: item.last_renewal_date ? item.last_renewal_date.split('T')[0] : '',
        annual_cost_inr: item.annual_cost_inr ?? '',
      });
    } else {
      reset(FIELD_DEFAULTS);
    }
  }, [item, reset]);

  const onSubmit = async (data) => {
    try {
      const payload = {
        ...data,
        expiry_date: data.expiry_date || null,
        last_renewal_date: data.last_renewal_date || null,
        annual_cost_inr: data.annual_cost_inr ? parseFloat(data.annual_cost_inr) : null,
        renewal_period: parseInt(data.renewal_period) || 1,
      };

      if (isEdit) {
        await api.put(`/domains/${item.id}`, payload);
        toast.success('Domain updated');
      } else {
        await api.post('/domains', payload);
        toast.success('Domain added');
      }
      onSaved();
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Save failed');
    }
  };

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-brand-700" />
            <h2 className="text-lg font-semibold text-gray-900">
              {isEdit ? 'Edit Domain' : 'Add Domain'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            <div className="sm:col-span-2">
              <label className="label">Domain Name *</label>
              <input
                className={`input ${errors.domain_name ? 'border-red-400' : ''}`}
                placeholder="e.g. nationalgroupindia.com"
                {...register('domain_name', { required: 'Domain name is required' })}
              />
              {errors.domain_name && <p className="text-xs text-red-500 mt-1">{errors.domain_name.message}</p>}
            </div>

            <div>
              <label className="label">Registrar</label>
              <input className="input" placeholder="e.g. GoDaddy, CloudFlare" {...register('registrar')} />
            </div>

            <div>
              <label className="label">Expiry Date</label>
              <input type="date" className="input" {...register('expiry_date')} />
            </div>

            <div>
              <label className="label">Owner (IT Person)</label>
              <input className="input" placeholder="e.g. Balasubramanian P" {...register('owner')} />
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
              <label className="label">Last Renewal Date</label>
              <input type="date" className="input" {...register('last_renewal_date')} />
            </div>

            <div>
              <label className="label">Renewal Period (Years)</label>
              <input type="number" min="1" max="10" className="input" {...register('renewal_period')} />
            </div>

            <div>
              <label className="label">Annual Cost (INR)</label>
              <input type="number" min="0" step="0.01" className="input" placeholder="e.g. 1617" {...register('annual_cost_inr')} />
            </div>

            <div>
              <label className="label">Payment Method</label>
              <input className="input" placeholder="e.g. Online, Credit Card" {...register('payment_method')} />
            </div>

            <div>
              <label className="label">Invoice Reference</label>
              <input className="input" placeholder="e.g. INV12345" {...register('invoice_reference')} />
            </div>

            <div className="sm:col-span-2">
              <label className="label">Remarks</label>
              <textarea
                rows={2}
                className="input resize-none"
                placeholder="Any notes or remarks..."
                {...register('remarks')}
              />
            </div>

            <div className="sm:col-span-2 flex items-center gap-3">
              <input type="checkbox" id="auto_renew" className="w-4 h-4 text-brand-600" {...register('auto_renew')} />
              <label htmlFor="auto_renew" className="text-sm text-gray-700 cursor-pointer">
                Auto-renew enabled
              </label>
            </div>

            <div className="sm:col-span-2">
              <p className="text-xs font-semibold text-brand-700 uppercase tracking-wide mt-1 mb-2">Contact Emails for Renewal Alerts</p>
            </div>

            <div>
              <label className="label">Finance Email</label>
              <input type="email" className="input" placeholder="finance@company.com" {...register('finance_email')} />
            </div>

            <div>
              <label className="label">Admin Email</label>
              <input type="email" className="input" placeholder="admin@company.com" {...register('admin_email')} />
            </div>

            <div>
              <label className="label">Vendor Email</label>
              <input type="email" className="input" placeholder="vendor@registrar.com" {...register('vendor_email')} />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : isEdit ? 'Update Domain' : 'Add Domain'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
