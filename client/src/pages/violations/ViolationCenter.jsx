import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { EmptyState } from '../../components/common/EmptyState';
import { FilterBar } from '../../components/common/FilterBar';
import { PageHeader } from '../../components/common/PageHeader';
import { StatCard } from '../../components/common/StatCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { DataTable } from '../../components/tables/DataTable';
import { api } from '../../services/platform.service';

export const ViolationCenter = () => {
  const [pageSize, setPageSize] = useState(10);
  const { data = [] } = useQuery({ queryKey: ['violations'], queryFn: api.workflowViolations });
  const policyFlags = data.reduce((sum, item) => sum + (item.policyViolations?.length || 0), 0);
  const fraudFlags = data.reduce((sum, item) => sum + (item.fraudFlags?.length || 0), 0);

  return (
    <>
      <PageHeader title="Violation Center" description="Policy warnings, hard blocks, duplicate receipts, fraud signals, and escalation workload." />
      <div className="mb-5 grid gap-4 md:grid-cols-3">
        <StatCard label="Flagged Expenses" value={data.length} icon={AlertTriangle} tone="rose" />
        <StatCard label="Policy Violations" value={policyFlags} icon={ShieldCheck} tone="amber" />
        <StatCard label="Fraud Signals" value={fraudFlags} icon={AlertTriangle} tone="rose" />
      </div>
      <FilterBar
        statuses={['submitted', 'manager_review', 'finance_review', 'sent_back', 'rejected']}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
      />
      {data.length ? (
        <DataTable
          data={data}
          pageSize={pageSize}
          columns={[
            { header: 'Employee', cell: ({ row }) => row.original.employeeId?.name || '-' },
            { header: 'Category', accessorKey: 'category' },
            { header: 'Merchant', accessorKey: 'merchant' },
            { header: 'Amount', cell: ({ row }) => `${row.original.amount} ${row.original.currency}` },
            { header: 'Flags', cell: ({ row }) => [...(row.original.policyViolations || []), ...(row.original.fraudFlags || [])].map((flag) => flag.code).join(', ') || '-' },
            { header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> }
          ]}
        />
      ) : (
        <EmptyState title="No violations detected" description="Policy and receipt controls are currently clean." />
      )}
    </>
  );
};
