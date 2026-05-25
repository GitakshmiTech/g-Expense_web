import { flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';
import { Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

export const DataTable = ({ data = [], columns = [], searchPlaceholder = 'Search records', pageSize = 10, onRowClick }) => {
  const [globalFilter, setGlobalFilter] = useState('');
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize,
  });

  useEffect(() => {
    setPagination({ pageIndex: 0, pageSize });
  }, [pageSize]);

  const table = useReactTable({
    data,
    columns: useMemo(() => columns, [columns]),
    state: { globalFilter, pagination },
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel()
  });

  return (
    <div className="panel overflow-hidden">
      <div className="flex items-center gap-2 border-b border-slate-200 p-4 dark:border-slate-800">
        <Search className="h-4 w-4 text-slate-400" />
        <input className="w-full bg-transparent text-sm outline-none dark:text-white" value={globalFilter} onChange={(event) => setGlobalFilter(event.target.value)} placeholder={searchPlaceholder} />
      </div>
      <div className="overflow-x-auto max-h-[calc(100vh-280px)] overflow-y-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
          <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-950">
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>
                {group.headers.map((header) => (
                  <th key={header.id} className="whitespace-nowrap px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-300" onClick={header.column.getToggleSortingHandler()}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className={`transition hover:bg-slate-50 dark:hover:bg-slate-800/60 ${onRowClick ? 'cursor-pointer' : ''}`} onClick={() => onRowClick && onRowClick(row.original)}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="whitespace-nowrap px-5 py-4 text-sm text-slate-700 dark:text-slate-200">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 text-sm text-slate-500 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <span>{table.getFilteredRowModel().rows.length} records</span>
        <div className="flex items-center gap-2">
          <button className="btn-secondary py-1" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Previous</button>
          <span>Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}</span>
          <button className="btn-secondary py-1" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Next</button>
        </div>
      </div>
    </div>
  );
};
