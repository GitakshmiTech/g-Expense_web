import { zodResolver } from '@hookform/resolvers/zod';
import { Camera, ChevronLeft, ChevronRight, FileText, Save, Send, Users, X } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { expenseCategories } from '../../constants/navigation';
import { expenseFormSchema } from '../../validations/expense.schema';
import { api } from '../../services/platform.service';

const STEPS = ['Receipt Upload', 'Basic Info', 'Review & Submit'];

export const ExpenseForm = ({ onSubmit, isLoading }) => {
  const [step, setStep] = useState(0);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [ocrData, setOcrData] = useState(null);
  const [scannedFile, setScannedFile] = useState(null);
  const [isSharedExpense, setIsSharedExpense] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [participantIds, setParticipantIds] = useState([]);
  const [splitType, setSplitType] = useState('equal');
  const [splitValues, setSplitValues] = useState({});
  const [reimbursementMode, setReimbursementMode] = useState('creator_full');
  const fileRef = useRef(null);
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: api.users });

  const { register, handleSubmit, formState: { errors }, setValue, watch, getValues, trigger } = useForm({
    resolver: zodResolver(expenseFormSchema),
    shouldUnregister: false,
    defaultValues: {
      category: 'Meals',
      expenseDate: new Date().toISOString().slice(0, 10),
      currency: 'INR',
      paymentMode: 'card',
      status: 'DRAFT',
      gstNumber: '',
      taxAmount: 0,
      description: ''
    }
  });

  const watched = watch();
  const departments = useMemo(() => [...new Set(users.map((user) => user.department).filter(Boolean))], [users]);
  const selectedParticipants = useMemo(() => users.filter((user) => participantIds.includes(user._id)), [participantIds, users]);
  const splitPreview = useMemo(() => {
    const total = Number(watched.amount || 0);
    const tax = Number(watched.taxAmount || 0);
    if (!isSharedExpense || !participantIds.length || !total) return { rows: [], valid: !isSharedExpense, message: '' };
    const round = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
    if (splitType === 'equal') {
      let running = 0;
      let taxRunning = 0;
      const rows = selectedParticipants.map((employee, index) => {
        const isLast = index === selectedParticipants.length - 1;
        const amount = isLast ? round(total - running) : round(total / selectedParticipants.length);
        const taxShare = isLast ? round(tax - taxRunning) : round(tax / selectedParticipants.length);
        running = round(running + amount);
        taxRunning = round(taxRunning + taxShare);
        return { employeeId: employee._id, employeeName: employee.name, department: employee.department, allocatedAmount: amount, allocatedTaxAmount: taxShare, splitPercentage: round((amount / total) * 100) };
      });
      return { rows, valid: true, message: '' };
    }
    if (splitType === 'percentage') {
      const totalPct = round(participantIds.reduce((sum, id) => sum + Number(splitValues[id] || 0), 0));
      const rows = selectedParticipants.map((employee) => {
        const pct = Number(splitValues[employee._id] || 0);
        return { employeeId: employee._id, employeeName: employee.name, department: employee.department, allocatedAmount: round(total * pct / 100), allocatedTaxAmount: round(tax * pct / 100), splitPercentage: pct };
      });
      return { rows, valid: totalPct === 100, message: totalPct === 100 ? '' : `Percentage total is ${totalPct}%. It must equal 100%.` };
    }
    const customTotal = round(participantIds.reduce((sum, id) => sum + Number(splitValues[id] || 0), 0));
    const rows = selectedParticipants.map((employee) => {
      const amount = Number(splitValues[employee._id] || 0);
      const pct = total ? round((amount / total) * 100) : 0;
      return { employeeId: employee._id, employeeName: employee.name, department: employee.department, allocatedAmount: amount, allocatedTaxAmount: round(tax * pct / 100), splitPercentage: pct };
    });
    return { rows, valid: customTotal === total, message: customTotal === total ? '' : `Custom split total is ${watched.currency} ${customTotal}. It must equal ${watched.currency} ${total}.` };
  }, [isSharedExpense, participantIds, selectedParticipants, splitType, splitValues, watched.amount, watched.taxAmount, watched.currency]);

  const filteredEmployees = users.filter((user) => {
    const haystack = `${user.name} ${user.email} ${user.department}`.toLowerCase();
    return user.status === 'active' && (!departmentFilter || user.department === departmentFilter) && (!employeeSearch || haystack.includes(employeeSearch.toLowerCase()));
  });

  const handleReceiptUpload = async (file) => {
    if (!file) return;
    setOcrLoading(true);
    setReceiptPreview(URL.createObjectURL(file));
    try {
      const result = await api.scanReceiptOnly(file);
      const ocr = result.ocr;
      const fileData = result.file;
      
      setScannedFile(fileData);
      if (ocr) {
        setOcrData(ocr);
        if (ocr.amount) setValue('amount', ocr.amount);
        if (ocr.merchant) setValue('merchant', ocr.merchant);
        if (ocr.date) {
          try {
            setValue('expenseDate', new Date(ocr.date).toISOString().slice(0, 10));
          } catch (e) {
            console.error('Date parsing failed:', e);
          }
        }
        if (ocr.tax) setValue('taxAmount', ocr.tax);
        if (ocr.gstNumber) setValue('gstNumber', ocr.gstNumber);
      }
      
      // Auto-advance to Basic Info
      setStep(1);
    } catch (err) {
      console.error('OCR failed:', err);
    } finally {
      setOcrLoading(false);
    }
  };

  const handleSkipReceipt = () => {
    setReceiptPreview(null);
    setScannedFile(null);
    setOcrData(null);
    setStep(1);
  };

  const handleContinueToReview = async () => {
    const isValid = await trigger(['category', 'merchant', 'expenseDate', 'amount', 'currency', 'paymentMode', 'taxAmount', 'gstNumber', 'description']);
    if (isSharedExpense && (!participantIds.length || !splitPreview.valid)) return;
    if (isValid) {
      setStep(2);
    }
  };

  const onFormSubmit = async (values) => {
    const payload = {
      ...values,
      amount: Number(values.amount),
      taxAmount: values.taxAmount ? Number(values.taxAmount) : 0,
      status: values.status || 'draft'
    };
    if (isSharedExpense) {
      payload.sharedExpense = {
        enabled: true,
        participantIds,
        splitType,
        splitValues,
        reimbursementMode
      };
    }
    if (scannedFile) {
      payload.receiptFile = {
        fileName: scannedFile.fileName,
        originalName: scannedFile.originalName,
        mimeType: scannedFile.mimeType,
        path: scannedFile.path,
        size: scannedFile.size,
        ocr: ocrData
      };
    }
    onSubmit(payload);
  };

  const handleSaveDraft = async () => {
    setValue('status', 'DRAFT');
    handleSubmit(onFormSubmit)();
  };

  const handleSubmitApproval = async () => {
    setValue('status', 'SUBMITTED');
    handleSubmit(onFormSubmit)();
  };

  const progressPct = ((step + 1) / STEPS.length) * 100;
  const toggleParticipant = (employeeId) => {
    setParticipantIds((current) => current.includes(employeeId) ? current.filter((id) => id !== employeeId) : [...current, employeeId]);
  };

  return (
    <div className="panel rounded-2xl overflow-hidden animate-fade-in">
      {/* Progress Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 px-6 pt-5 pb-4 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex items-center justify-between mb-3">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 ${i <= step ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-slate-200 text-slate-500 dark:bg-slate-700'}`}>
                {i + 1}
              </div>
              <span className={`text-sm font-semibold hidden sm:block ${i === step ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`}>{label}</span>
              {i < STEPS.length - 1 && <div className={`hidden sm:block h-px w-8 ${i < step ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'}`} />}
            </div>
          ))}
        </div>
        <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800">
          <div className="h-full rounded-full bg-blue-600 transition-all duration-500 ease-out" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      <form className="p-6 space-y-6" onSubmit={(e) => e.preventDefault()}>
        {/* STEP 0: Receipt Upload */}
        <div className={step !== 0 ? 'hidden' : 'space-y-5 animate-fade-in'}>
          <div className="text-center max-w-md mx-auto mb-4">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">Start with a Receipt</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Upload your receipt. Our Gemini AI OCR will scan it and fill in the details automatically.</p>
          </div>

          <div
            className="flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 p-10 cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 transition-all duration-300 bg-slate-50/50 dark:bg-slate-900/30 hover:bg-slate-50 dark:hover:bg-slate-900/50 group"
            onClick={() => fileRef.current?.click()}
          >
            {receiptPreview ? (
              <div className="relative">
                <img src={receiptPreview} alt="Receipt preview" className="max-h-56 rounded-xl object-contain shadow-lg border border-slate-200 dark:border-slate-800" />
                <button type="button" className="absolute -top-2 -right-2 bg-rose-500 hover:bg-rose-600 text-white rounded-full p-1.5 shadow-md transition-colors" onClick={(e) => { e.stopPropagation(); setReceiptPreview(null); setScannedFile(null); setOcrData(null); }}>
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <>
                <div className="rounded-2xl bg-blue-50 dark:bg-blue-950/50 p-5 group-hover:scale-110 transition-transform duration-300">
                  <Camera className="h-10 w-10 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-slate-700 dark:text-slate-200">Click to upload receipt</p>
                  <p className="text-xs text-slate-400 mt-1">Supports PNG, JPG or PDF up to 10MB</p>
                </div>
              </>
            )}
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,application/pdf" className="hidden" onChange={(e) => handleReceiptUpload(e.target.files?.[0])} />
          </div>

          {ocrLoading && (
            <div className="flex items-center gap-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 p-4 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900/50 animate-pulse">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 dark:border-blue-400 border-t-transparent" />
              <span className="text-sm font-medium">Gemini AI OCR is reading your receipt details…</span>
            </div>
          )}

          {ocrData && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 dark:border-emerald-800/30 dark:bg-emerald-950/10 p-4">
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> OCR Extracted Data
              </p>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                {ocrData.merchant && (
                  <div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">Merchant</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{ocrData.merchant}</p>
                  </div>
                )}
                {ocrData.amount && (
                  <div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">Amount</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">₹{ocrData.amount}</p>
                  </div>
                )}
                {ocrData.date && (
                  <div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">Date</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      {(() => {
                        try {
                          return new Date(ocrData.date).toLocaleDateString();
                        } catch (e) {
                          return ocrData.date;
                        }
                      })()}
                    </p>
                  </div>
                )}
                {ocrData.tax !== undefined && (
                  <div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">Tax (GST)</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">₹{ocrData.tax}</p>
                  </div>
                )}
                {ocrData.gstNumber && (
                  <div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">GST Number</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{ocrData.gstNumber}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <button type="button" className="btn-secondary" onClick={handleSkipReceipt}>
              Skip & Enter Manually <ChevronRight className="h-4 w-4" />
            </button>
            {scannedFile && !ocrLoading && (
              <button type="button" className="btn-primary flex items-center gap-2" onClick={() => setStep(1)}>
                Continue to Basic Info <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* STEP 1: Basic Info */}
        <div className={step !== 1 ? 'hidden' : 'grid gap-4 md:grid-cols-2 animate-fade-in'}>
          {ocrData && (
            <div className="md:col-span-2 rounded-xl border border-emerald-200 bg-emerald-50/50 dark:border-emerald-800/30 dark:bg-emerald-950/10 p-4 mb-2">
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> AI Scan Pre-filled Form
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Please check all values and modify them if they differ from the actual receipt.</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Category <span className="text-rose-500">*</span></label>
            <select className="input" {...register('category')}>
              {expenseCategories.map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Merchant / Vendor</label>
            <input className="input" {...register('merchant')} placeholder="e.g. Swiggy, Uber, OYO" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Expense Date <span className="text-rose-500">*</span></label>
            <input className="input" type="date" {...register('expenseDate')} />
            {errors.expenseDate && <span className="text-xs text-rose-600">{errors.expenseDate.message}</span>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Amount <span className="text-rose-500">*</span></label>
            <div className="flex gap-2">
              <select className="input w-24" {...register('currency')}>
                <option>INR</option><option>USD</option><option>EUR</option><option>GBP</option>
              </select>
              <input className="input flex-1" type="number" step="0.01" {...register('amount', { valueAsNumber: true })} placeholder="0.00" />
            </div>
            {errors.amount && <span className="text-xs text-rose-600">{errors.amount.message}</span>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Payment Mode</label>
            <select className="input" {...register('paymentMode')}>
              <option value="card">Credit / Debit Card</option>
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="corporate_card">Corporate Card</option>
              <option value="bank">Bank Transfer</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Tax Amount (GST)</label>
            <input className="input" type="number" step="0.01" {...register('taxAmount', { valueAsNumber: true })} placeholder="0.00" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">GST Number</label>
            <input className="input" {...register('gstNumber')} placeholder="e.g. 27AADCB8881B1Z2" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Business Purpose / Description</label>
            <textarea className="input min-h-20" {...register('description')} placeholder="Describe the business purpose, attendees, project name..." />
          </div>

          <div className="md:col-span-2 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
            <label className="flex items-center gap-3 text-sm font-semibold text-slate-800 dark:text-white">
              <input type="checkbox" className="h-4 w-4" checked={isSharedExpense} onChange={(event) => setIsSharedExpense(event.target.checked)} />
              Shared Expense
            </label>
            {isSharedExpense && (
              <div className="mt-4 space-y-4">
                <div className="grid gap-3 md:grid-cols-3">
                  <input className="input" value={employeeSearch} onChange={(event) => setEmployeeSearch(event.target.value)} placeholder="Search employee" />
                  <select className="input" value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)}>
                    <option value="">All departments</option>
                    {departments.map((department) => <option key={department} value={department}>{department}</option>)}
                  </select>
                  <select className="input" value={splitType} onChange={(event) => { setSplitType(event.target.value); setSplitValues({}); }}>
                    <option value="equal">Equal split</option>
                    <option value="percentage">Percentage split</option>
                    <option value="custom">Custom amount</option>
                  </select>
                </div>
                <div className="grid max-h-44 gap-2 overflow-auto rounded-lg border border-slate-100 p-2 dark:border-slate-800 md:grid-cols-2">
                  {filteredEmployees.map((employee) => (
                    <label key={employee._id} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800">
                      <input type="checkbox" checked={participantIds.includes(employee._id)} onChange={() => toggleParticipant(employee._id)} />
                      <span><span className="block font-medium dark:text-white">{employee.name}</span><span className="text-xs text-slate-500">{employee.department || employee.email}</span></span>
                    </label>
                  ))}
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <select className="input" value={reimbursementMode} onChange={(event) => setReimbursementMode(event.target.value)}>
                    <option value="creator_full">Creator receives full reimbursement</option>
                    <option value="individual">Each employee receives own reimbursement</option>
                  </select>
                  <div className={`rounded-lg p-3 text-sm ${splitPreview.valid ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300'}`}>
                    {splitPreview.valid ? `${splitPreview.rows.length} participant allocations balanced` : splitPreview.message || 'Select participants to calculate split'}
                  </div>
                </div>
                {splitPreview.rows.length > 0 && (
                  <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-800">
                        <tr><th className="p-3">Employee</th><th className="p-3">Share</th><th className="p-3">GST</th><th className="p-3">{splitType === 'custom' ? 'Amount' : splitType === 'percentage' ? 'Percent' : 'Percent'}</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {splitPreview.rows.map((row) => (
                          <tr key={row.employeeId}>
                            <td className="p-3"><span className="font-medium dark:text-white">{row.employeeName}</span><span className="block text-xs text-slate-500">{row.department || '-'}</span></td>
                            <td className="p-3 font-semibold dark:text-white">{watched.currency} {Number(row.allocatedAmount || 0).toLocaleString('en-IN')}</td>
                            <td className="p-3">{watched.currency} {Number(row.allocatedTaxAmount || 0).toLocaleString('en-IN')}</td>
                            <td className="p-3">
                              {splitType === 'equal' ? `${row.splitPercentage}%` : (
                                <input
                                  className="input max-w-32"
                                  type="number"
                                  step="0.01"
                                  value={splitValues[row.employeeId] || ''}
                                  onChange={(event) => setSplitValues((current) => ({ ...current, [row.employeeId]: Number(event.target.value) }))}
                                  placeholder={splitType === 'percentage' ? '%' : 'Amount'}
                                />
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="md:col-span-2 flex gap-3 justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
            <button type="button" className="btn-secondary flex items-center gap-2" onClick={() => setStep(0)}>
              <ChevronLeft className="h-4 w-4" /> Back to Upload
            </button>
            <div className="flex gap-3">
              <button type="button" className="btn-secondary flex items-center gap-2 text-slate-500" onClick={handleSaveDraft} disabled={isLoading}>
                Save as Draft
              </button>
              <button type="button" className="btn-primary flex items-center gap-2" onClick={handleContinueToReview}>
                Continue to Review <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* STEP 2: Review & Submit */}
        <div className={step !== 2 ? 'hidden' : 'space-y-5 animate-fade-in'}>
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
            {[
              ['Category', watched.category],
              ['Merchant', watched.merchant || '—'],
              ['Date', watched.expenseDate],
              ['Amount', `${watched.currency} ${watched.amount || 0}`],
              ['Tax (GST)', watched.taxAmount ? `${watched.currency} ${watched.taxAmount}` : '—'],
              ['GST Number', watched.gstNumber || '—'],
              ['Payment Mode', watched.paymentMode],
              ['Description', watched.description || '—'],
              ['Receipt Status', receiptPreview ? 'Scanned & Uploaded' : 'No receipt attached'],
              ['Shared Expense', isSharedExpense ? `${splitType} split across ${participantIds.length} employees` : 'No']
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between px-5 py-3">
                <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
                <span className="text-sm font-medium text-slate-800 dark:text-slate-200 text-right max-w-xs truncate">{value}</span>
              </div>
            ))}
          </div>
          {isSharedExpense && splitPreview.rows.length > 0 && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
              <p className="mb-3 flex items-center gap-2 text-sm font-bold dark:text-white"><Users className="h-4 w-4" /> Shared Allocation</p>
              <div className="space-y-2">
                {splitPreview.rows.map((row) => (
                  <div key={row.employeeId} className="flex justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800">
                    <span className="font-medium dark:text-white">{row.employeeName}</span>
                    <span>{watched.currency} {Number(row.allocatedAmount || 0).toLocaleString('en-IN')} · {row.splitPercentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
            <button type="button" className="btn-secondary flex items-center gap-2" onClick={() => setStep(1)}>
              <ChevronLeft className="h-4 w-4" /> Back to Edit
            </button>
            <div className="flex gap-3">
              <button type="button" className="btn-secondary flex items-center gap-2" onClick={handleSaveDraft} disabled={isLoading}>
                <Save className="h-4 w-4" /> Save Draft
              </button>
              <button type="button" className="btn-primary flex items-center gap-2" onClick={handleSubmitApproval} disabled={isLoading}>
                <Send className="h-4 w-4" /> Submit for Approval
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
