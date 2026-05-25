import { Download } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';

export const Reports = () => {
  const download = (format) => {
    window.open(`/api/reports/export/${format}`, '_blank');
  };
  return (
    <>
      <PageHeader title="Reports" description="Export finance-ready operational reports in PDF, Excel, and CSV." />
      <div className="grid gap-4 md:grid-cols-3">
        {['pdf', 'xlsx', 'csv'].map((format) => (
          <button key={format} className="panel flex items-center justify-between rounded-lg p-5 text-left" onClick={() => download(format)}>
            <span><span className="block text-lg font-bold uppercase dark:text-white">{format}</span><span className="text-sm text-slate-500">Expense register export</span></span>
            <Download className="h-5 w-5 text-brand-600" />
          </button>
        ))}
      </div>
    </>
  );
};
