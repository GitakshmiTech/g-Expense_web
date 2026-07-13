import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { StatusBadge } from '../../components/common/StatusBadge';
import { DataTable } from '../../components/tables/DataTable';
import { Modal } from '../../components/common/Modal';
import { api } from '../../services/platform.service';
import { usePermission } from '../../hooks/usePermissions';

export const Advance = () => {
  const queryClient = useQueryClient();
  const canCreate = usePermission('advances', 'create');
  const { data = [] } = useQuery({ queryKey: ['advance-requests'], queryFn: api.advanceRequests });

  // Modal & Form States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [purpose, setPurpose] = useState('');

  const create = useMutation({
    mutationFn: api.createAdvanceRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['advance-requests'] });
      setShowCreateModal(false);
      setAmount('');
      setPurpose('');
      setCurrency('INR');
    },
    onError: (err) => alert(err.response?.data?.message || 'Failed to request advance')
  });

  const handleOpenModal = () => {
    setShowCreateModal(true);
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setAmount('');
    setPurpose('');
    setCurrency('INR');
  };

  const handleSubmit = () => {
    if (!amount || !purpose) return;
    create.mutate({
      amount: Number(amount),
      currency,
      purpose,
      status: 'SUBMITTED'
    });
  };

  return (
    <>
      <PageHeader
        title="Advances"
        description="Advance request, approval, finance release, expense adjustment, and settlement tracking."
        actions={canCreate && (
          <button className="btn-primary" onClick={handleOpenModal}>
            New Advance
          </button>
        )}
      />

      <DataTable data={data} columns={[
        { header: 'Advance No', accessorKey: 'advanceNo' },
        { header: 'Employee', cell: ({ row }) => row.original.employeeId?.name || '-' },
        { header: 'Purpose', accessorKey: 'purpose' },
        { header: 'Requested', cell: ({ row }) => `${row.original.requested?.currency || 'INR'} ${Number(row.original.requested?.amount || 0).toLocaleString('en-IN')}` },
        { header: 'Settlement', accessorKey: 'settlementType' },
        { header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> }
      ]} />

      {/* Create Advance Modal */}
      <Modal
        open={showCreateModal}
        title="Request Advance"
        description="Submit a request for an upfront advance payment for upcoming travel, events, or client expenses."
        onClose={handleCloseModal}
        footer={
          <>
            <button className="btn-secondary" onClick={handleCloseModal}>Cancel</button>
            <button 
              className="btn-primary"
              disabled={!amount || !purpose || create.isPending}
              onClick={handleSubmit}
            >
              {create.isPending ? 'Requesting...' : 'Request Advance'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Currency
              </label>
              <select 
                className="input w-full"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Amount <span className="text-rose-500">*</span>
              </label>
              <input 
                type="number"
                min="1"
                className="input w-full"
                placeholder="e.g. 15000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Purpose / Reason <span className="text-rose-500">*</span>
            </label>
            <input 
              type="text"
              className="input w-full"
              placeholder="e.g. Travel allowance for Bangalore conference"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              required
            />
          </div>
        </div>
      </Modal>
    </>
  );
};
