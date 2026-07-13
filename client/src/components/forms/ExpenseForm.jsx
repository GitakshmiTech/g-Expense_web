import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertTriangle,
  BadgeIndianRupee,
  Building2,
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  Download,
  Eye,
  FileText,
  Gauge,
  Layers3,
  MapPin,
  Plane,
  ReceiptText,
  RefreshCw,
  Save,
  Send,
  Sparkles,
  Trash2,
  UploadCloud,
  Users,
  X,
  ZoomIn
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { expenseCategories } from '../../constants/navigation';
import { expenseFormSchema } from '../../validations/expense.schema';
import { api } from '../../services/platform.service';

const STEPS = ['Receipt Upload', 'Basic Info', 'Review & Submit'];
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'application/pdf'];
const OCR_STAGES = [
  'Uploading Receipt...',
  'Scanning Receipt...',
  'Extracting Merchant...',
  'Extracting GST...',
  'Applying Policies...',
  'Validating Duplicate Claims...'
];

const vendorCategoryMap = [
  { match: ['uber', 'ola', 'makemytrip', 'indigo', 'air india'], category: 'Travel' },
  { match: ['starbucks', 'swiggy', 'zomato', 'restaurant', 'cafe'], category: 'Meals' },
  { match: ['oyo', 'hotel', 'marriott', 'taj'], category: 'Lodging' },
  { match: ['amazon', 'staples', 'office'], category: 'Office Supplies' }
];

const money = (amount, currency = 'INR') => `${currency === 'INR' ? '₹' : currency} ${Number(amount || 0).toLocaleString('en-IN')}`;
const formatFileSize = (size = 0) => size > 1024 * 1024 ? `${(size / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(size / 1024))} KB`;
const isTrustedOcr = (ocr) => ocr?.provider === 'gemini' || Number(ocr.confidence || 0) >= 0.45;

const categoryFromOcr = (ocr, merchant = '') => {
  if (ocr?.category && expenseCategories.includes(ocr.category)) return ocr.category;
  const source = `${ocr?.merchant || ''} ${merchant}`.toLowerCase();
  if (/uber|ola|indigo|air india|railway|irctc|flight|taxi|cab/.test(source)) return 'Travel';
  if (/hotel|oyo|marriott|taj|stay|rooms/.test(source)) return 'Hotel';
  if (/fuel|petrol|diesel|hpcl|bpcl|ioc/.test(source)) return 'Fuel';
  if (/restaurant|cafe|coffee|starbucks|swiggy|zomato|meal|food/.test(source)) return 'Meals';
  if (/software|saas|cloud|subscription/.test(source)) return 'Software';
  if (/telecom|mobile|internet|airtel|jio|vi /.test(source)) return 'Telecom';
  return '';
};

const paymentModeFromOcr = (value) => {
  const raw = String(value || '').toLowerCase();
  if (raw.includes('upi')) return 'upi';
  if (raw.includes('cash')) return 'cash';
  if (raw.includes('bank')) return 'bank';
  if (raw.includes('corporate')) return 'corporate_card';
  if (raw.includes('card') || raw.includes('visa') || raw.includes('master')) return 'card';
  return '';
};

const InfoTile = ({ label, value, icon: Icon }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
    <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
      {Icon && <Icon className="h-4 w-4" />}
      {label}
    </div>
    <p className="mt-2 text-sm font-bold text-slate-900 dark:text-white">{value || '-'}</p>
  </div>
);

const SectionTitle = ({ icon: Icon, title, description }) => (
  <div className="md:col-span-2">
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-blue-600" />
      <h3 className="text-sm font-bold uppercase text-slate-800 dark:text-white">{title}</h3>
    </div>
    {description && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{description}</p>}
  </div>
);

export const ExpenseForm = ({ onSubmit, isLoading, onCancel }) => {
  const [step, setStep] = useState(0);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrStage, setOcrStage] = useState(OCR_STAGES[0]);
  const [receiptFiles, setReceiptFiles] = useState([]);
  const [ocrData, setOcrData] = useState(null);
  const [scannedFile, setScannedFile] = useState(null);
  const [fileError, setFileError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [showReceiptPreview, setShowReceiptPreview] = useState(null);
  const [saveState, setSaveState] = useState('Draft auto-save ready');
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [notes, setNotes] = useState({ employee: '', finance: '', internal: '' });
  const [advanced, setAdvanced] = useState({
    title: '',
    costCenter: '',
    projectCode: '',
    clientName: '',
    department: '',
    taxType: 'GST',
    reimbursable: true,
    billNumber: '',
    location: '',
    tripId: '',
    attendeeText: '',
    distance: '',
    managerNote: ''
  });
  const [isSharedExpense, setIsSharedExpense] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [participantIds, setParticipantIds] = useState([]);
  const [splitType, setSplitType] = useState('equal');
  const [splitValues, setSplitValues] = useState({});
  const [reimbursementMode, setReimbursementMode] = useState('creator_full');
  const [customFields, setCustomFields] = useState({});
  const fileRef = useRef(null);
  const cameraRef = useRef(null);
  const submitIntentRef = useRef('submit');

  const { data: users = [] } = useQuery({
    queryKey: ['user-directory'],
    queryFn: api.userDirectory,
    enabled: isSharedExpense
  });

  const { data: trips = [] } = useQuery({
    queryKey: ['travel-requests-for-expense'],
    queryFn: api.travelRequests,
    staleTime: 60_000
  });

  const { data: categoryCatalog = [] } = useQuery({
    queryKey: ['expense-category-catalog'],
    queryFn: api.expenseCategoryCatalog,
    staleTime: 120_000
  });

  const { register, handleSubmit, formState: { errors }, setValue, watch, trigger } = useForm({
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
  const primaryReceipt = receiptFiles[0];
  const configuredCategories = useMemo(() => {
    const active = categoryCatalog.filter((category) => category.active !== false);
    if (active.length) return active;
    return expenseCategories.map((name) => ({ name, code: name, active: true, dynamicFields: [] }));
  }, [categoryCatalog]);
  const selectedCategoryConfig = useMemo(() => configuredCategories.find((category) => category.name === watched.category || category.code === watched.category), [configuredCategories, watched.category]);
  const selectedDynamicFields = useMemo(() => (Array.isArray(selectedCategoryConfig?.dynamicFields) ? selectedCategoryConfig.dynamicFields : []), [selectedCategoryConfig]);
  const departments = useMemo(() => [...new Set(users.map((user) => user.department).filter(Boolean))], [users]);
  const selectedParticipants = useMemo(() => users.filter((user) => participantIds.includes(user._id)), [participantIds, users]);

  const categorySuggestion = useMemo(() => {
    const merchant = String(watched.merchant || '').toLowerCase();
    const suggestion = vendorCategoryMap.find((item) => item.match.some((vendor) => merchant.includes(vendor)));
    if (!suggestion) return null;
    return configuredCategories.some((category) => category.name === suggestion.category) ? suggestion : null;
  }, [configuredCategories, watched.merchant]);

  const policyAlerts = useMemo(() => {
    const amount = Number(watched.amount || 0);
    const category = watched.category;
    const day = watched.expenseDate ? new Date(watched.expenseDate).getDay() : null;
    const alerts = [];
    const categoryLimit = Number(selectedCategoryConfig?.limits?.perExpense || selectedCategoryConfig?.defaultLimit?.amount || 0);
    const receiptAbove = Number(selectedCategoryConfig?.receiptMandatoryAbove || 0);
    const receiptRequired = selectedCategoryConfig?.compliance?.receiptMandatory || (receiptAbove > 0 && amount > receiptAbove);
    if (categoryLimit > 0 && amount > categoryLimit) alerts.push({ code: 'Category limit exceeded', detail: `Allowed: ${money(categoryLimit, watched.currency)} · Entered: ${money(amount, watched.currency)}`, severity: 'warning' });
    if (receiptRequired && !primaryReceipt) alerts.push({ code: `Receipt required${receiptAbove ? ` above ${money(receiptAbove, watched.currency)}` : ''}`, detail: 'Attach a receipt before final submission.', severity: 'warning' });
    if (selectedCategoryConfig?.compliance?.gstMandatory && !Number(watched.taxAmount || 0)) alerts.push({ code: 'GST details required', detail: 'Enter tax amount/GST details for this category.', severity: 'warning' });
    if (category === 'Lodging' && amount > 5000) alerts.push({ code: 'Hotel limit exceeded', detail: `Allowed: ₹5000 · Entered: ${money(amount, watched.currency)}`, severity: 'warning' });
    if (amount > 1000 && !primaryReceipt) alerts.push({ code: 'Receipt required above ₹1000', detail: 'Attach a receipt before final submission.', severity: 'warning' });
    if ((day === 0 || day === 6) && !advanced.managerNote) alerts.push({ code: 'Weekend expense requires manager note', detail: 'Add context for weekend business spend.', severity: 'notice' });
    if (category === 'Travel' && !advanced.tripId) alerts.push({ code: 'Travel expense can be linked to a trip', detail: 'Linking improves approval and reimbursement context.', severity: 'notice' });
    return alerts;
  }, [advanced.managerNote, advanced.tripId, primaryReceipt, selectedCategoryConfig, watched.amount, watched.category, watched.currency, watched.expenseDate, watched.taxAmount]);

  const fraudWarnings = useMemo(() => {
    const warnings = [];
    if (receiptFiles.some((item) => item.name.toLowerCase().includes('duplicate'))) warnings.push('Possible duplicate receipt found submitted within last 30 days.');
    if (receiptFiles.some((item) => item.name.toLowerCase().includes('blur'))) warnings.push('Receipt image may be blurry. Upload a clearer copy if OCR values look incorrect.');
    if (advanced.billNumber && advanced.billNumber.length < 4) warnings.push('Invalid invoice number detected. Please verify the bill number.');
    if (Number(watched.amount || 0) > 0 && Number(watched.amount || 0) % 1000 === 0) warnings.push('Same rounded amount submitted recently. Finance may request additional evidence.');
    return warnings;
  }, [advanced.billNumber, receiptFiles, watched.amount]);

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

  const approvalPreview = useMemo(() => {
    const amount = Number(watched.amount || 0);
    const steps = ['Employee Submitted', 'Manager Approval', 'Finance Approval'];
    if (amount > 5000 || policyAlerts.some((alert) => alert.code.includes('limit'))) steps.push('CFO Approval');
    steps.push('Reimbursement Processing');
    return steps;
  }, [policyAlerts, watched.amount]);

  const budgetImpact = useMemo(() => {
    const amount = Number(watched.amount || 0);
    return {
      department: Math.max(0, 124000 - amount),
      project: Math.max(0, 68000 - amount),
      monthlyUsage: Math.min(100, Math.round(((76000 + amount) / 150000) * 100))
    };
  }, [watched.amount]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const snapshot = { watched, advanced, notes, isSharedExpense, participantIds, splitType, splitValues, reimbursementMode, customFields };
      localStorage.setItem('gt_expense_create_draft', JSON.stringify(snapshot));
      setSaveState(`Draft auto-saved at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
    }, 2500);
    return () => clearTimeout(timeout);
  }, [advanced, customFields, isSharedExpense, notes, participantIds, reimbursementMode, splitType, splitValues, watched]);

  useEffect(() => {
    if (configuredCategories.length && !configuredCategories.some((category) => category.name === watched.category || category.code === watched.category)) {
      setValue('category', configuredCategories[0].name);
    }
  }, [configuredCategories, setValue, watched.category]);

  useEffect(() => {
    setCustomFields((current) => {
      const allowed = new Set(selectedDynamicFields.map((field) => field.fieldId));
      return Object.fromEntries(Object.entries(current).filter(([key]) => allowed.has(key)));
    });
  }, [selectedDynamicFields]);

  useEffect(() => {
    return () => receiptFiles.forEach((file) => file.previewUrl && URL.revokeObjectURL(file.previewUrl));
  }, [receiptFiles]);

  const validateFile = (file) => {
    if (!ALLOWED_TYPES.includes(file.type)) return 'Only PNG, JPG, JPEG, or PDF receipts are supported.';
    if (file.size > MAX_FILE_SIZE) return 'Receipt must be 10MB or smaller.';
    return '';
  };

  const scanReceipt = async (file, receiptId, applyValues = true) => {
    setOcrLoading(true);
    setOcrStage(OCR_STAGES[0]);
    let stageIndex = 0;
    const stageTimer = setInterval(() => {
      stageIndex = Math.min(stageIndex + 1, OCR_STAGES.length - 1);
      setOcrStage(OCR_STAGES[stageIndex]);
    }, 650);
    try {
      const result = await api.scanReceiptOnly(file);
      const ocr = result.ocr || {};
      setReceiptFiles((current) => current.map((item) => item.id === receiptId ? { ...item, uploadedFile: result.file, ocr, progress: 100, status: 'OCR complete' } : item));
      if (applyValues) {
        setScannedFile(result.file);
        setOcrData(ocr);
        const trusted = isTrustedOcr(ocr);
        if (!trusted) {
          const warning = ocr.warnings?.[0] || '';
          const isQuotaOrApiKeyError = warning.toLowerCase().includes('quota') || warning.toLowerCase().includes('limit') || warning.toLowerCase().includes('gemini') || warning.toLowerCase().includes('api key');
          if (!isQuotaOrApiKeyError) {
            setFileError(warning || 'AI OCR could not confidently read this receipt. Please enter bill details manually.');
          }
          return { file: result.file, ocr };
        }
        if (Number(ocr.amount) > 0) setValue('amount', Number(ocr.amount));
        if (ocr.merchant) {
          setValue('merchant', ocr.merchant);
          setAdvanced((current) => ({ ...current, title: current.title || `${ocr.merchant} Expense` }));
        }
        const suggestedCategory = categoryFromOcr(ocr);
        if (suggestedCategory && configuredCategories.some((category) => category.name === suggestedCategory)) setValue('category', suggestedCategory);
        const paymentMode = paymentModeFromOcr(ocr.paymentMode);
        if (paymentMode) setValue('paymentMode', paymentMode);
        if (ocr.currency) setValue('currency', ocr.currency);
        if (ocr.invoiceDate || ocr.date) {
          try {
            setValue('expenseDate', new Date(ocr.invoiceDate || ocr.date).toISOString().slice(0, 10));
          } catch (e) {
            console.error('Date parsing failed:', e);
          }
        }
        if (Number(ocr.tax) >= 0) setValue('taxAmount', Number(ocr.tax || 0));
        if (ocr.gstNumber) setValue('gstNumber', ocr.gstNumber);
        if (ocr.invoiceNumber) setAdvanced((current) => ({ ...current, billNumber: ocr.invoiceNumber }));
      }
      return { file: result.file, ocr };
    } catch (err) {
      console.error('OCR failed:', err);
      setReceiptFiles((current) => current.map((item) => item.id === receiptId ? { ...item, progress: 100, status: 'OCR failed' } : item));
      const errMsg = err.response?.data?.message || err.message || '';
      const isQuotaOrApiKeyError = errMsg.toLowerCase().includes('quota') || errMsg.toLowerCase().includes('limit') || errMsg.toLowerCase().includes('gemini') || errMsg.toLowerCase().includes('api key');
      if (!isQuotaOrApiKeyError) {
        setFileError(errMsg || 'OCR scan failed. You can continue manually.');
      }
      return null;
    } finally {
      clearInterval(stageTimer);
      setOcrStage(OCR_STAGES[OCR_STAGES.length - 1]);
      setTimeout(() => setOcrLoading(false), 400);
    }
  };

  const handleReceiptUpload = async (files) => {
    const incoming = Array.from(files || []);
    if (!incoming.length) return;
    setFileError('');
    const validationMessage = incoming.map(validateFile).find(Boolean);
    if (validationMessage) {
      setFileError(validationMessage);
      return;
    }
    const mapped = incoming.map((file, index) => ({
      id: `${file.name}-${file.lastModified}-${index}`,
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      progress: 100,
      status: index === 0 ? 'Primary OCR source' : 'Queued for OCR',
      previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : ''
    }));
    setReceiptFiles((current) => [...current, ...mapped]);
    for (const [index, receipt] of mapped.entries()) {
      await scanReceipt(receipt.file, receipt.id, index === 0);
    }
  };

  const removeReceipt = (id) => {
    setReceiptFiles((current) => {
      const removed = current.find((item) => item.id === id);
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      const next = current.filter((item) => item.id !== id);
      if (!next.length) {
        setScannedFile(null);
        setOcrData(null);
      }
      return next;
    });
  };

  const replacePrimaryReceipt = () => {
    setReceiptFiles([]);
    setScannedFile(null);
    setOcrData(null);
    fileRef.current?.click();
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragActive(false);
    handleReceiptUpload(event.dataTransfer.files);
  };

  const handleSkipReceipt = () => setStep(1);

  const handleContinueToReview = async () => {
    const isValid = await trigger(['category', 'merchant', 'expenseDate', 'amount', 'currency', 'paymentMode', 'taxAmount', 'gstNumber', 'description']);
    if (isSharedExpense && (!participantIds.length || !splitPreview.valid)) return;
    const missingRequiredField = selectedDynamicFields.some((field) => field.isRequired && !String(customFields[field.fieldId] || '').trim());
    if (missingRequiredField) return;
    if (isValid) setStep(2);
  };

  const buildPayload = (values) => {
    const descriptionParts = [values.description];
    if (advanced.title) descriptionParts.unshift(advanced.title);
    if (notes.employee) descriptionParts.push(`Employee note: ${notes.employee}`);
    const payload = {
      ...values,
      amount: Number(values.amount),
      taxAmount: values.taxAmount ? Number(values.taxAmount) : 0,
      description: descriptionParts.filter(Boolean).join('\n\n'),
      status: values.status || 'draft',
      customFields
    };
    if (watched.category === 'Travel' && advanced.tripId) payload.tripId = advanced.tripId;
    if (watched.category === 'Mileage' && advanced.distance) payload.mileage = { distance: Number(advanced.distance), unit: 'km', rate: 12 };
    if (isSharedExpense) {
      payload.sharedExpense = { enabled: true, participantIds, splitType, splitValues, reimbursementMode };
    }
    const uploadedReceipts = receiptFiles
      .filter((receipt) => receipt.uploadedFile)
      .map((receipt) => ({
        fileName: receipt.uploadedFile.fileName,
        originalName: receipt.uploadedFile.originalName,
        mimeType: receipt.uploadedFile.mimeType,
        path: receipt.uploadedFile.path,
        size: receipt.uploadedFile.size,
        fileHash: receipt.uploadedFile.fileHash,
        ocr: receipt.ocr
      }));
    if (uploadedReceipts.length) {
      payload.receiptFile = uploadedReceipts[0];
      if (!isSharedExpense) payload.receiptFiles = uploadedReceipts;
    }
    return payload;
  };

  const onFormSubmit = async (values) => {
    setSubmittedSuccess(values.status === 'SUBMITTED' || values.status === 'submitted');
    onSubmit(buildPayload(values), { createAnother: submitIntentRef.current === 'create_another' });
  };

  const handleSaveDraft = async () => {
    submitIntentRef.current = 'draft';
    setValue('status', 'DRAFT');
    handleSubmit(onFormSubmit)();
  };

  const handleSubmitApproval = async (intent = 'submit') => {
    submitIntentRef.current = intent;
    setValue('status', 'SUBMITTED');
    handleSubmit(onFormSubmit)();
  };

  const toggleParticipant = (employeeId) => {
    setParticipantIds((current) => current.includes(employeeId) ? current.filter((id) => id !== employeeId) : [...current, employeeId]);
  };

  const setAdvancedField = (field, value) => setAdvanced((current) => ({ ...current, [field]: value }));
  const progressPct = ((step + 1) / STEPS.length) * 100;
  const policyStatus = policyAlerts.some((alert) => alert.severity === 'warning') ? 'Needs review' : 'Compliant';

  return (
    <div className="panel overflow-hidden rounded-2xl animate-fade-in">
      <div className="border-b border-slate-200 bg-slate-50/50 px-6 pb-4 pt-5 dark:border-slate-800 dark:bg-slate-900/50">
        <div className="mb-3 flex items-center justify-between gap-3">
          {STEPS.map((label, i) => (
            <div key={label} className="flex min-w-0 items-center gap-2">
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 ${i <= step ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-slate-200 text-slate-500 dark:bg-slate-700'}`}>
                {i + 1}
              </div>
              <span className={`hidden truncate text-sm font-semibold sm:block ${i === step ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`}>{label}</span>
              {i < STEPS.length - 1 && <div className={`hidden h-px w-8 sm:block ${i < step ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'}`} />}
            </div>
          ))}
        </div>
        <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800">
          <div className="h-full rounded-full bg-blue-600 transition-all duration-500 ease-out" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      <form className="space-y-6 p-6" onSubmit={(event) => event.preventDefault()}>
        <div className={step !== 0 ? 'hidden' : 'space-y-5 animate-fade-in'}>
          <div className="mx-auto max-w-xl text-center">
            <h3 className="mb-1 text-lg font-bold text-slate-800 dark:text-white">Start with receipts</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Upload one or more receipts. The first receipt is scanned and attached to this expense using the existing OCR workflow.</p>
          </div>

          <div
            className={`flex cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-10 transition-all duration-300 ${dragActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20' : 'border-slate-300 bg-slate-50/50 hover:border-blue-500 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/30 dark:hover:border-blue-400 dark:hover:bg-slate-900/50'}`}
            onClick={() => fileRef.current?.click()}
            onDragOver={(event) => { event.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') fileRef.current?.click(); }}
          >
            <div className="rounded-2xl bg-blue-50 p-5 transition-transform duration-300 dark:bg-blue-950/50">
              <UploadCloud className="h-10 w-10 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-slate-700 dark:text-slate-200">Drag receipts here or click to upload</p>
              <p className="mt-1 text-xs text-slate-400">PNG, JPG, JPEG, or PDF up to 10MB each</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <button type="button" className="btn-secondary flex items-center gap-2" onClick={(event) => { event.stopPropagation(); fileRef.current?.click(); }}>
                <FileText className="h-4 w-4" /> Browse files
              </button>
              <button type="button" className="btn-secondary flex items-center gap-2" onClick={(event) => { event.stopPropagation(); cameraRef.current?.click(); }}>
                <Camera className="h-4 w-4" /> Capture receipt
              </button>
            </div>
            <input ref={fileRef} type="file" multiple accept="image/png,image/jpeg,application/pdf" className="hidden" onChange={(event) => handleReceiptUpload(event.target.files)} />
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => handleReceiptUpload(event.target.files)} />
          </div>

          {fileError && (
            <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-200">
              <AlertTriangle className="mt-0.5 h-4 w-4" />
              <span>{fileError}</span>
            </div>
          )}

          {receiptFiles.length > 0 && (
            <div className="grid gap-3 md:grid-cols-2">
              {receiptFiles.map((receipt, index) => (
                <div key={receipt.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex gap-3">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
                      {receipt.previewUrl ? <img src={receipt.previewUrl} alt={receipt.name} className="h-full w-full object-cover" /> : <FileText className="h-6 w-6 text-slate-500" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{receipt.name}</p>
                          <p className="text-xs text-slate-500">{formatFileSize(receipt.size)} · {index === 0 ? 'Primary receipt' : 'Additional receipt'}</p>
                        </div>
                        <button type="button" className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600" onClick={() => removeReceipt(receipt.id)} title="Remove receipt">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="mt-3 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800">
                        <div className="h-full rounded-full bg-blue-600" style={{ width: `${receipt.progress}%` }} />
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {receipt.previewUrl && (
                          <button type="button" className="btn-secondary px-2 py-1 text-xs" onClick={() => setShowReceiptPreview(receipt)}>
                            <Eye className="h-3 w-3" /> Preview
                          </button>
                        )}
                        {index === 0 && (
                          <button type="button" className="btn-secondary px-2 py-1 text-xs" onClick={replacePrimaryReceipt}>
                            <RefreshCw className="h-3 w-3" /> Replace
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {ocrLoading && (
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300">
              <div className="flex items-center gap-3">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent dark:border-blue-400" />
                <span className="text-sm font-bold">{ocrStage}</span>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {OCR_STAGES.map((stage) => (
                  <div key={stage} className={`rounded-lg px-3 py-2 text-xs ${stage === ocrStage ? 'bg-white font-bold text-blue-700 shadow-sm dark:bg-slate-900 dark:text-blue-300' : 'bg-blue-100/70 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300'}`}>{stage}</div>
                ))}
              </div>
            </div>
          )}

          {ocrData && (
            <div className={`rounded-xl border p-4 ${isTrustedOcr(ocrData) ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-800/30 dark:bg-emerald-950/10' : 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950'}`}>
              <p className={`mb-3 flex items-center gap-2 text-sm font-semibold ${isTrustedOcr(ocrData) ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-800 dark:text-amber-200'}`}>
                {isTrustedOcr(ocrData) ? <Sparkles className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                {isTrustedOcr(ocrData) ? 'OCR extracted data with confidence' : 'OCR needs manual verification'}
              </p>
              {!isTrustedOcr(ocrData) && (
                <p className="mb-3 text-sm text-amber-800 dark:text-amber-200">
                  {ocrData.warnings?.[0] && !(ocrData.warnings[0].toLowerCase().includes('quota') || ocrData.warnings[0].toLowerCase().includes('limit') || ocrData.warnings[0].toLowerCase().includes('gemini'))
                    ? ocrData.warnings[0]
                    : 'Receipt text was not clear enough to auto-fill safely.'}
                </p>
              )}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  ['Merchant', ocrData.merchant, ocrData.confidence],
                  ['Amount', ocrData.amount ? money(ocrData.amount, ocrData.currency || watched.currency) : '', ocrData.confidence],
                  ['GST', ocrData.tax ? money(ocrData.tax, ocrData.currency || watched.currency) : '', ocrData.confidence],
                  ['Currency', ocrData.currency || watched.currency, ocrData.confidence],
                  ['Expense Date', ocrData.invoiceDate || ocrData.date ? new Date(ocrData.invoiceDate || ocrData.date).toLocaleDateString('en-IN') : '', ocrData.confidence],
                  ['Invoice Number', ocrData.invoiceNumber || advanced.billNumber, ocrData.confidence]
                ].map(([label, value, confidence]) => (
                  <div key={label} className="rounded-lg bg-white p-3 text-sm shadow-sm dark:bg-slate-900">
                    <p className="text-xs text-slate-500">{label}</p>
                    <p className="mt-1 font-semibold text-slate-800 dark:text-slate-200">{value || '-'}</p>
                    <p className={`mt-1 text-xs font-semibold ${isTrustedOcr(ocrData) ? 'text-emerald-600' : 'text-amber-600'}`}>Confidence: {Math.round(Number(confidence || 0) * 100)}%</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {fraudWarnings.length > 0 && (
            <div className="space-y-2">
              {fraudWarnings.map((warning) => (
                <div key={warning} className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
                  <AlertTriangle className="mt-0.5 h-4 w-4" />
                  <span>{warning}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={handleSkipReceipt}>
              Skip & Enter Manually <ChevronRight className="h-4 w-4" />
            </button>
            {receiptFiles.length > 0 && !ocrLoading && (
              <button type="button" className="btn-primary flex items-center gap-2" onClick={() => setStep(1)}>
                Continue to Basic Info <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className={step !== 1 ? 'hidden' : 'grid gap-4 md:grid-cols-2 animate-fade-in'}>
          <SectionTitle icon={ReceiptText} title="Basic Details" description={saveState} />
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Expense Title</label>
            <input className="input" value={advanced.title} onChange={(event) => setAdvancedField('title', event.target.value)} placeholder="e.g. Client dinner in Mumbai" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Expense Category <span className="text-rose-500">*</span></label>
            <select className="input" {...register('category')}>
              {configuredCategories.map((item) => <option key={item._id || item.code || item.name} value={item.name}>{item.name}</option>)}
            </select>
            {selectedCategoryConfig?.code && <p className="mt-1 text-xs text-slate-400">{selectedCategoryConfig.code}{selectedCategoryConfig.glCode ? ` · GL ${selectedCategoryConfig.glCode}` : ''}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Amount <span className="text-rose-500">*</span></label>
            <div className="flex gap-2">
              <select className="input w-24" {...register('currency')}>
                <option>INR</option><option>USD</option><option>EUR</option><option>GBP</option>
              </select>
              <input className="input flex-1" type="number" step="0.01" {...register('amount', { valueAsNumber: true })} placeholder="0.00" />
            </div>
            {errors.amount && <span className="text-xs text-rose-600">{errors.amount.message}</span>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Expense Date <span className="text-rose-500">*</span></label>
            <input className="input" type="date" {...register('expenseDate')} />
            {errors.expenseDate && <span className="text-xs text-rose-600">{errors.expenseDate.message}</span>}
          </div>

          <SectionTitle icon={Layers3} title="Advanced Details" />
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Merchant Name</label>
            <input className="input" {...register('merchant')} placeholder="e.g. Swiggy, Uber, OYO" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Payment Method</label>
            <select className="input" {...register('paymentMode')}>
              <option value="card">Credit / Debit Card</option>
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="corporate_card">Corporate Card</option>
              <option value="bank">Bank Transfer</option>
            </select>
          </div>
          {[
            ['costCenter', 'Cost Center', 'CC-1042'],
            ['projectCode', 'Project Code', 'PRJ-MUM-24'],
            ['clientName', 'Client Name', 'Client name'],
            ['department', 'Department', 'Sales'],
            ['billNumber', 'Bill Number', 'INV-2026-001'],
            ['location', 'Expense Location', 'Mumbai']
          ].map(([field, label, placeholder]) => (
            <div key={field}>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">{label}</label>
              <input className="input" value={advanced[field]} onChange={(event) => setAdvancedField(field, event.target.value)} placeholder={placeholder} />
            </div>
          ))}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Tax Type</label>
            <select className="input" value={advanced.taxType} onChange={(event) => setAdvancedField('taxType', event.target.value)}>
              <option>GST</option><option>VAT</option><option>Service Tax</option><option>None</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Tax Amount</label>
            <input className="input" type="number" step="0.01" {...register('taxAmount', { valueAsNumber: true })} placeholder="0.00" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">GST Number</label>
            <input className="input" {...register('gstNumber')} placeholder="e.g. 27AADCB8881B1Z2" />
          </div>
          <label className="flex items-center justify-between rounded-xl border border-slate-200 p-3 text-sm font-semibold text-slate-800 dark:border-slate-800 dark:text-white">
            Reimbursable
            <input type="checkbox" className="h-4 w-4" checked={advanced.reimbursable} onChange={(event) => setAdvancedField('reimbursable', event.target.checked)} />
          </label>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Business Purpose</label>
            <textarea className="input min-h-20" {...register('description')} placeholder="Describe the business purpose, attendees, project name..." />
          </div>

          {(watched.category === 'Travel' || watched.category === 'Mileage' || watched.category === 'Meals') && (
            <div className="md:col-span-2 rounded-xl border border-blue-100 bg-blue-50/50 p-4 dark:border-blue-900 dark:bg-blue-950/20">
              <p className="mb-3 flex items-center gap-2 text-sm font-bold text-blue-800 dark:text-blue-200"><Sparkles className="h-4 w-4" /> Dynamic fields for {watched.category}</p>
              <div className="grid gap-3 md:grid-cols-2">
                {watched.category === 'Travel' && (
                  <select className="input" value={advanced.tripId} onChange={(event) => setAdvancedField('tripId', event.target.value)}>
                    <option value="">Link to trip</option>
                    {trips.map((trip) => <option key={trip._id} value={trip._id}>{trip.title || trip.purpose || trip.destination || 'Untitled trip'}</option>)}
                  </select>
                )}
                {watched.category === 'Mileage' && <input className="input" type="number" value={advanced.distance} onChange={(event) => setAdvancedField('distance', event.target.value)} placeholder="Distance in km" />}
                {watched.category === 'Meals' && <input className="input" value={advanced.attendeeText} onChange={(event) => setAdvancedField('attendeeText', event.target.value)} placeholder="Attendees for client meeting" />}
                <input className="input" value={advanced.managerNote} onChange={(event) => setAdvancedField('managerNote', event.target.value)} placeholder="Manager note for exception or weekend spend" />
              </div>
            </div>
          )}

          {selectedDynamicFields.length > 0 && (
            <div className="md:col-span-2 rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 dark:border-indigo-900 dark:bg-indigo-950/20">
              <p className="mb-3 flex items-center gap-2 text-sm font-bold text-indigo-800 dark:text-indigo-200"><Layers3 className="h-4 w-4" /> Category required fields</p>
              <div className="grid gap-3 md:grid-cols-2">
                {selectedDynamicFields.map((field) => {
                  const value = customFields[field.fieldId] || '';
                  const requiredMissing = field.isRequired && !String(value).trim();
                  const type = field.type === 'NUMBER' ? 'number' : field.type === 'DATE' ? 'date' : 'text';
                  return (
                    <label key={field.fieldId} className="grid gap-1 text-sm font-medium text-slate-700 dark:text-slate-200">
                      <span>{field.label}{field.isRequired && <span className="text-rose-500"> *</span>}</span>
                      <input
                        className={`input ${requiredMissing ? 'border-rose-300 focus:border-rose-500' : ''}`}
                        type={type}
                        value={value}
                        onChange={(event) => setCustomFields((current) => ({ ...current, [field.fieldId]: event.target.value }))}
                        placeholder={field.placeholder || field.label}
                      />
                      {requiredMissing && <span className="text-xs text-rose-600">Required for {watched.category}</span>}
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <SectionTitle icon={Sparkles} title="Smart AI Features" />
          <div className="md:col-span-2 grid gap-4 xl:grid-cols-[1fr_320px]">
            <div className="space-y-3">
              {categorySuggestion && categorySuggestion.category !== watched.category && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm dark:border-blue-900 dark:bg-blue-950/30">
                  <span className="font-semibold text-blue-800 dark:text-blue-200">Suggested category: {categorySuggestion.category}</span>
                  <button type="button" className="btn-secondary px-3 py-1.5 text-xs" onClick={() => setValue('category', categorySuggestion.category)}>Apply suggestion</button>
                </div>
              )}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                <CheckCircle2 className="mr-2 inline h-4 w-4" /> {watched.category || 'Expense'} Policy Applied
              </div>
              {policyAlerts.map((alert) => (
                <div key={alert.code} className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
                  <p className="flex items-center gap-2 font-bold"><AlertTriangle className="h-4 w-4" /> {alert.code}</p>
                  <p className="mt-1 text-xs">{alert.detail}</p>
                </div>
              ))}
            </div>
            <div className="space-y-3">
              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <p className="mb-3 text-sm font-bold dark:text-white">Budget Impact</p>
                <div className="space-y-3 text-sm">
                  <div><span className="text-slate-500">Department Budget Remaining</span><p className="font-bold dark:text-white">{money(budgetImpact.department, watched.currency)}</p></div>
                  <div><span className="text-slate-500">Project Budget Remaining</span><p className="font-bold dark:text-white">{money(budgetImpact.project, watched.currency)}</p></div>
                  <div>
                    <span className="text-slate-500">Monthly Spend Usage</span>
                    <div className="mt-2 h-2 rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-blue-600" style={{ width: `${budgetImpact.monthlyUsage}%` }} /></div>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <p className="mb-3 text-sm font-bold dark:text-white">Smart Approval Preview</p>
                <div className="space-y-2">
                  {approvalPreview.map((item, index) => (
                    <div key={item} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-bold dark:bg-slate-800">{index + 1}</span>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
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
              </div>
            )}
          </div>

          <div className="flex justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800 md:col-span-2">
            <button type="button" className="btn-secondary flex items-center gap-2" onClick={() => setStep(0)}>
              <ChevronLeft className="h-4 w-4" /> Back to Upload
            </button>
            <div className="flex flex-wrap justify-end gap-3">
              <button type="button" className="btn-secondary flex items-center gap-2 text-slate-500" onClick={handleSaveDraft} disabled={isLoading}>
                <Save className="h-4 w-4" /> Save Draft
              </button>
              <button type="button" className="btn-primary flex items-center gap-2" onClick={handleContinueToReview}>
                Continue to Review <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className={step !== 2 ? 'hidden' : 'space-y-5 animate-fade-in'}>
          {submittedSuccess && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              <CheckCircle2 className="mx-auto h-10 w-10" />
              <p className="mt-2 font-bold">Expense submitted. Generating reference and opening details...</p>
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-4">
            <InfoTile icon={BadgeIndianRupee} label="Total Amount" value={money(watched.amount, watched.currency)} />
            <InfoTile icon={CircleDollarSign} label="GST Amount" value={money(watched.taxAmount, watched.currency)} />
            <InfoTile icon={ReceiptText} label="Expense Category" value={watched.category} />
            <InfoTile icon={ClipboardCheck} label="Policy Status" value={policyStatus} />
            <InfoTile icon={RefreshCw} label="Reimbursement Type" value={advanced.reimbursable ? 'Reimbursable' : 'Non-reimbursable'} />
            <InfoTile icon={Plane} label="Linked Trip" value={advanced.tripId ? trips.find((trip) => trip._id === advanced.tripId)?.title || 'Linked Trip' : 'Not linked'} />
            <InfoTile icon={Gauge} label="Budget Impact" value={`${budgetImpact.monthlyUsage}% monthly usage`} />
            <InfoTile icon={Users} label="Approval Workflow" value={approvalPreview.join(' > ')} />
          </div>

          <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                <p className="mb-3 text-sm font-bold dark:text-white">Policy Validation Summary</p>
                <div className="space-y-2">
                  {['Receipt Valid', 'Category Allowed'].map((item) => (
                    <p key={item} className="flex items-center gap-2 rounded-lg bg-emerald-50 p-2 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"><CheckCircle2 className="h-4 w-4" /> {item}</p>
                  ))}
                  {policyAlerts.length ? policyAlerts.map((alert) => (
                    <p key={alert.code} className="flex items-center gap-2 rounded-lg bg-amber-50 p-2 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200"><AlertTriangle className="h-4 w-4" /> {alert.code}</p>
                  )) : <p className="flex items-center gap-2 rounded-lg bg-emerald-50 p-2 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"><CheckCircle2 className="h-4 w-4" /> No policy exceptions</p>}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                <p className="mb-3 text-sm font-bold dark:text-white">Approval Preview</p>
                <div className="space-y-3">
                  {approvalPreview.map((item, index) => (
                    <div key={item} className="relative flex gap-3">
                      {index < approvalPreview.length - 1 && <div className="absolute left-4 top-8 h-full w-px bg-slate-200 dark:bg-slate-800" />}
                      <div className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full ${index === 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>{index + 1}</div>
                      <div className="min-w-0 flex-1 rounded-xl border border-slate-200 p-3 text-sm font-semibold dark:border-slate-800 dark:text-white">{item}</div>
                    </div>
                  ))}
                </div>
              </div>

              {isSharedExpense && splitPreview.rows.length > 0 && (
                <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                  <p className="mb-3 flex items-center gap-2 text-sm font-bold dark:text-white"><Users className="h-4 w-4" /> Shared Allocation</p>
                  <div className="space-y-2">
                    {splitPreview.rows.map((row) => (
                      <div key={row.employeeId} className="flex justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800">
                        <span className="font-medium dark:text-white">{row.employeeName}</span>
                        <span>{money(row.allocatedAmount, watched.currency)} · {row.splitPercentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                <p className="mb-3 text-sm font-bold dark:text-white">Comments</p>
                <div className="grid gap-3 md:grid-cols-3">
                  <textarea className="input min-h-20" value={notes.employee} onChange={(event) => setNotes((current) => ({ ...current, employee: event.target.value }))} placeholder="Employee notes" />
                  <textarea className="input min-h-20" value={notes.finance} onChange={(event) => setNotes((current) => ({ ...current, finance: event.target.value }))} placeholder="Finance notes" />
                  <textarea className="input min-h-20" value={notes.internal} onChange={(event) => setNotes((current) => ({ ...current, internal: event.target.value }))} placeholder="Internal remarks" />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                <p className="mb-3 text-sm font-bold dark:text-white">Receipt Preview</p>
                {primaryReceipt ? (
                  <div className="space-y-3">
                    <div className="flex h-56 items-center justify-center overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
                      {primaryReceipt.previewUrl ? <img src={primaryReceipt.previewUrl} alt="Receipt preview" className="h-full w-full object-contain" /> : <FileText className="h-10 w-10 text-slate-500" />}
                    </div>
                    <div className="flex gap-2">
                      {primaryReceipt.previewUrl && <button type="button" className="btn-secondary flex-1 text-xs" onClick={() => setShowReceiptPreview(primaryReceipt)}><ZoomIn className="h-3 w-3" /> Zoom</button>}
                      <a className="btn-secondary flex-1 justify-center text-xs" href={primaryReceipt.previewUrl || '#'} download={primaryReceipt.name}><Download className="h-3 w-3" /> Download</a>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      <p className="font-bold">OCR data</p>
                      <p>Merchant: {ocrData?.merchant || watched.merchant || '-'}</p>
                      <p>Amount: {money(ocrData?.amount || watched.amount, watched.currency)}</p>
                      <p>GST: {money(ocrData?.tax || watched.taxAmount, watched.currency)}</p>
                    </div>
                  </div>
                ) : <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-slate-800">No receipt uploaded.</p>}
              </div>
            </div>
          </div>

          <div className="flex justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
            <button type="button" className="btn-secondary flex items-center gap-2" onClick={() => setStep(1)}>
              <ChevronLeft className="h-4 w-4" /> Back to Edit
            </button>
            <div className="flex flex-wrap justify-end gap-3">
              <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
              <button type="button" className="btn-secondary flex items-center gap-2" onClick={handleSaveDraft} disabled={isLoading}>
                <Save className="h-4 w-4" /> Save Draft
              </button>
              <button type="button" className="btn-secondary flex items-center gap-2" onClick={() => handleSubmitApproval('create_another')} disabled={isLoading}>
                <Send className="h-4 w-4" /> Submit & Create Another
              </button>
              <button type="button" className="btn-primary flex items-center gap-2" onClick={() => handleSubmitApproval('submit')} disabled={isLoading}>
                <Send className="h-4 w-4" /> Submit Expense
              </button>
            </div>
          </div>
        </div>
      </form>

      {showReceiptPreview && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 p-6" onClick={() => setShowReceiptPreview(null)}>
          <div className="relative max-h-full max-w-3xl rounded-2xl bg-white p-4 shadow-2xl dark:bg-slate-900" onClick={(event) => event.stopPropagation()}>
            <button className="absolute right-3 top-3 rounded-full bg-white p-2 shadow dark:bg-slate-800" onClick={() => setShowReceiptPreview(null)}><X className="h-4 w-4" /></button>
            <img src={showReceiptPreview.previewUrl} alt={showReceiptPreview.name} className="max-h-[80vh] rounded-xl object-contain" />
          </div>
        </div>
      )}
    </div>
  );
};
