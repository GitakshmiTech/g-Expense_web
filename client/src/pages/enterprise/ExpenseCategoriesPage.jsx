import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  AlertTriangle,
  Building,
  CheckCircle,
  Clock,
  Coins,
  FileSpreadsheet,
  FileText,
  HelpCircle,
  Layers,
  Layout,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
  TrendingUp,
  X
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { PageHeader } from '../../components/common/PageHeader';
import { DataTable } from '../../components/tables/DataTable';
import { api } from '../../services/platform.service';
import { usePermission } from '../../hooks/usePermissions';

export const ExpenseCategoriesPage = () => {
  const queryClient = useQueryClient();
  const canCreate = usePermission('expense_categories', 'create');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [activeTab, setActiveTab] = useState('basic');

  // Advanced fields / Dynamic form fields list state
  const [dynamicFieldsList, setDynamicFieldsList] = useState([]);
  const [newFieldId, setNewFieldId] = useState('');
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState('TEXT');
  const [newFieldRequired, setNewFieldRequired] = useState(false);

  // Simulation metrics state
  const [simulationResult, setSimulationResult] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Role based limit state
  const [roleLimits, setRoleLimits] = useState({ L1_ASSOCIATE: '', L2_MANAGER: '', L3_DIRECTOR: '' });

  // List categories
  const categoriesQuery = useQuery({
    queryKey: ['enterprise', 'expense_categories'],
    queryFn: () => api.enterpriseList('expense_categories', { limit: 100 })
  });

  const categories = Array.isArray(categoriesQuery.data)
    ? categoriesQuery.data
    : categoriesQuery.data?.items || [];

  // Mutations
  const createCategoryMutation = useMutation({
    mutationFn: (payload) => api.enterpriseCreate('expense_categories', payload),
    onSuccess: () => {
      setDrawerOpen(false);
      resetState();
      queryClient.invalidateQueries({ queryKey: ['enterprise', 'expense_categories'] });
    }
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, payload }) => api.enterpriseUpdate('expense_categories', id, payload),
    onSuccess: () => {
      setDrawerOpen(false);
      resetState();
      queryClient.invalidateQueries({ queryKey: ['enterprise', 'expense_categories'] });
    }
  });

  const resetState = () => {
    setSelectedCategory(null);
    setDynamicFieldsList([]);
    setRoleLimits({ L1_ASSOCIATE: '', L2_MANAGER: '', L3_DIRECTOR: '' });
    setSimulationResult(null);
    setActiveTab('basic');
  };

  const handleEdit = (category) => {
    setSelectedCategory(category);
    setDynamicFieldsList(category.dynamicFields || []);
    setRoleLimits({
      L1_ASSOCIATE: category.limits?.roleBased?.L1_ASSOCIATE || '',
      L2_MANAGER: category.limits?.roleBased?.L2_MANAGER || '',
      L3_DIRECTOR: category.limits?.roleBased?.L3_DIRECTOR || ''
    });
    setSimulationResult(null);
    setActiveTab('basic');
    setDrawerOpen(true);
  };

  const handleCreateNew = () => {
    resetState();
    setDrawerOpen(true);
  };

  const addDynamicField = () => {
    if (!newFieldId || !newFieldLabel) return;
    const newFieldObj = {
      fieldId: newFieldId.toLowerCase().trim().replace(/\s+/g, '_'),
      label: newFieldLabel.trim(),
      type: newFieldType,
      isRequired: newFieldRequired
    };
    setDynamicFieldsList([...dynamicFieldsList, newFieldObj]);
    setNewFieldId('');
    setNewFieldLabel('');
  };

  const removeDynamicField = (index) => {
    const updated = [...dynamicFieldsList];
    updated.splice(index, 1);
    setDynamicFieldsList(updated);
  };

  // Run change impact analysis simulation
  const runChangeSimulation = async (categoryCode) => {
    setIsSimulating(true);
    try {
      const response = await fetch('/api/expense-categories/simulate-impact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify({
          categoryCode: categoryCode || 'EXP-TEST',
          limits: { roleBased: roleLimits }
        })
      });
      const data = await response.json();
      if (data.success) {
        setSimulationResult(data.simulationResult);
      }
    } catch (err) {
      console.error('Simulation failed', err);
    } finally {
      setIsSimulating(false);
    }
  };

  // Form submission
  const handleSaveCategory = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    const payload = {
      name: data.name,
      code: data.code,
      glCode: data.glCode,
      active: data.active === 'true',
      defaultLimit: {
        amount: Number(data.defaultLimitAmount || 0),
        currency: 'INR'
      },
      receiptMandatoryAbove: Number(data.receiptMandatoryAbove || 0),
      limits: {
        perExpense: Number(data.perExpenseLimit || 0),
        daily: Number(data.dailyLimit || 0),
        monthly: Number(data.monthlyLimit || 0),
        roleBased: roleLimits,
        countryBased: {}
      },
      compliance: {
        receiptMandatory: data.receiptMandatory === 'true',
        ocrMandatory: data.ocrMandatory === 'true',
        gstMandatory: data.gstMandatory === 'true',
        allowedMimetypes: ['application/pdf', 'image/png', 'image/jpeg']
      },
      accounting: {
        costCenter: data.costCenter,
        taxCode: data.taxCode,
        sapSegment: data.sapSegment,
        oracleSegmentId: data.oracleSegmentId
      },
      dynamicFields: dynamicFieldsList,
      workflow: {
        approvalChain: ['Manager'],
        autoApprovalBelow: Number(data.autoApprovalBelow || 0)
      },
      aiSettings: {
        fraudScoreThreshold: Number(data.fraudScoreThreshold || 40),
        anomalyDetectionEnabled: data.anomalyDetectionEnabled === 'true'
      }
    };

    if (selectedCategory) {
      updateCategoryMutation.mutate({ id: selectedCategory._id, payload });
    } else {
      createCategoryMutation.mutate(payload);
    }
  };

  // Compute live, actual category metrics directly from database records
  const activeCategoriesCount = categories.filter((c) => c.active).length;
  const categoriesWithLimitsCount = categories.filter((c) => (c.limits?.perExpense > 0) || (c.defaultLimit?.amount > 0)).length;
  const receiptMandatoryCount = categories.filter((c) => c.compliance?.receiptMandatory || (c.receiptMandatoryAbove > 0)).length;
  const categoriesWithFieldsCount = categories.filter((c) => c.dynamicFields?.length > 0).length;

  const columns = useMemo(() => [
    {
      header: 'Category Name',
      accessorKey: 'name',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
            <Layers className="h-4 w-4" />
          </div>
          <div>
            <span className="font-semibold text-slate-800 dark:text-white">{row.original.name}</span>
            <span className="block text-xs text-slate-400">{row.original.code}</span>
          </div>
        </div>
      )
    },
    {
      header: 'GL Code',
      accessorKey: 'glCode',
      cell: ({ row }) => (
        <code className="rounded bg-slate-100 px-2 py-1 text-xs font-mono font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {row.original.glCode || 'N/A'}
        </code>
      )
    },
    {
      header: 'Limits & Policy',
      accessorKey: 'limits',
      cell: ({ row }) => (
        <div className="text-sm">
          <div>Max Exp: <span className="font-medium text-slate-700 dark:text-slate-300">₹{row.original.limits?.perExpense || row.original.defaultLimit?.amount || 0}</span></div>
          <div className="text-xs text-slate-400">Mandatory Receipt Above: ₹{row.original.receiptMandatoryAbove || 0}</div>
        </div>
      )
    },
    {
      header: 'Dynamic Fields',
      accessorKey: 'dynamicFields',
      cell: ({ row }) => (
        <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
          {row.original.dynamicFields?.length || 0} fields
        </span>
      )
    },
    {
      header: 'Active',
      accessorKey: 'active',
      cell: ({ row }) => (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${row.original.active ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-400'}`}>
          {row.original.active ? 'Active' : 'Inactive'}
        </span>
      )
    },
    {
      header: 'Actions',
      cell: ({ row }) => (
        <button className="btn-secondary py-1 text-xs" onClick={() => handleEdit(row.original)}>
          Configure
        </button>
      )
    }
  ], []);

  return (
    <>
      <PageHeader
        title="Expense Categories"
        description="Manage expense categories, set spending limits, require receipts, and add extra fields in simple steps."
        actions={canCreate && (
          <button className="btn-primary flex items-center gap-1.5 text-xs font-semibold py-1.5 px-3 rounded-lg" onClick={handleCreateNew}>
            <Plus className="h-3.5 w-3.5" /> Create Category
          </button>
        )}
      />

      {/* Sleek, Minimal, Professional Inline Stats Widget */}
      <div className="mb-5 grid grid-cols-4 border border-slate-100 dark:border-slate-800/80 rounded-xl bg-white dark:bg-slate-900 py-3.5 px-5 shadow-sm divide-x divide-slate-100 dark:divide-slate-800/60 font-sans">
        <div className="flex flex-col justify-center pr-3">
          <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Active Categories</span>
          <span className="text-base font-semibold text-slate-700 dark:text-slate-200 mt-0.5">{activeCategoriesCount} Active</span>
        </div>
        <div className="flex flex-col justify-center px-5">
          <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Spending Limits Set</span>
          <span className="text-base font-semibold text-slate-700 dark:text-slate-200 mt-0.5">{categoriesWithLimitsCount} Categories</span>
        </div>
        <div className="flex flex-col justify-center px-5">
          <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Receipt Rules</span>
          <span className="text-base font-semibold text-slate-700 dark:text-slate-200 mt-0.5">{receiptMandatoryCount} Mandatory</span>
        </div>
        <div className="flex flex-col justify-center pl-5">
          <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Extra Fields</span>
          <span className="text-base font-semibold text-slate-700 dark:text-slate-200 mt-0.5">{categoriesWithFieldsCount} Custom</span>
        </div>
      </div>

      {/* Main Table view */}
      <DataTable data={categories} columns={columns} searchPlaceholder="Search categories by name, code or GL code..." />

      {/* Advanced Configurations Side Slider Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-sm">
          <form onSubmit={handleSaveCategory} className="flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl dark:bg-slate-900">
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-slate-200 p-5 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/20">
              <div>
                <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                  {selectedCategory ? `Configure: ${selectedCategory.name}` : 'Create Category'}
                </h2>
                <p className="text-xs text-slate-400">Set up limits, receipts rules, custom fields, and accounting mappings.</p>
              </div>
              <button type="button" className="btn-secondary p-1.5" onClick={() => setDrawerOpen(false)}>
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Custom Tab selectors */}
            <div className="flex border-b border-slate-200 bg-slate-50 px-5 py-2 text-sm dark:border-slate-800 dark:bg-slate-950/10 gap-2">
              {[
                { id: 'basic', label: 'General Info', icon: FileText },
                { id: 'limits', label: 'Spending Caps', icon: Coins },
                { id: 'compliance', label: 'Receipt Rules', icon: ShieldCheck },
                { id: 'accounting', label: 'Accounting Sync', icon: Building },
                { id: 'dynamic', label: 'Extra Fields', icon: Layout },
                { id: 'simulate', label: 'Check Changes', icon: Activity }
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-all ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-200'}`}
                  >
                    <Icon className="h-3.5 w-3.5" /> {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Tabbed Content Containers */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* TAB 1: BASIC DETAILS */}
              {activeTab === 'basic' && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300">
                    <span>Category Name *</span>
                    <input className="input" name="name" required placeholder="e.g. Flight Booking" defaultValue={selectedCategory?.name || ''} />
                  </label>
                  <label className="grid gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300">
                    <span>Category Code *</span>
                    <input className="input" name="code" required placeholder="e.g. EXP-FLIGHT" defaultValue={selectedCategory?.code || ''} />
                  </label>
                  <label className="grid gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300">
                    <span>GL Code</span>
                    <input className="input font-mono" name="glCode" placeholder="e.g. 600101" defaultValue={selectedCategory?.glCode || ''} />
                  </label>
                  <label className="grid gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300">
                    <span>Active Status</span>
                    <select className="input" name="active" defaultValue={selectedCategory?.active ? 'true' : 'false'}>
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </label>
                </div>
              )}

              {/* TAB 2: LIMITS & CONTROLS */}
              {activeTab === 'limits' && (
                <div className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <label className="grid gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300">
                      <span>Per-Expense Limit (₹)</span>
                      <input className="input" type="number" name="perExpenseLimit" placeholder="No limit" defaultValue={selectedCategory?.limits?.perExpense || ''} />
                    </label>
                    <label className="grid gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300">
                      <span>Daily Max Total (₹)</span>
                      <input className="input" type="number" name="dailyLimit" placeholder="No limit" defaultValue={selectedCategory?.limits?.daily || ''} />
                    </label>
                    <label className="grid gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300">
                      <span>Monthly Cumulative (₹)</span>
                      <input className="input" type="number" name="monthlyLimit" placeholder="No limit" defaultValue={selectedCategory?.limits?.monthly || ''} />
                    </label>
                  </div>

                  <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
                    <h3 className="mb-3 text-sm font-bold text-slate-800 dark:text-white">Role-Based Cap Thresholds</h3>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <label className="grid gap-1.5 text-xs font-semibold text-slate-500">
                        <span>L1 Associate Limit</span>
                        <input className="input" type="number" value={roleLimits.L1_ASSOCIATE} onChange={(e) => setRoleLimits({ ...roleLimits, L1_ASSOCIATE: e.target.value })} placeholder="e.g. 1500" />
                      </label>
                      <label className="grid gap-1.5 text-xs font-semibold text-slate-500">
                        <span>L2 Manager Limit</span>
                        <input className="input" type="number" value={roleLimits.L2_MGR || roleLimits.L2_MANAGER || ''} onChange={(e) => setRoleLimits({ ...roleLimits, L2_MANAGER: e.target.value })} placeholder="e.g. 5000" />
                      </label>
                      <label className="grid gap-1.5 text-xs font-semibold text-slate-500">
                        <span>L3 Director Limit</span>
                        <input className="input" type="number" value={roleLimits.L3_DIR || roleLimits.L3_DIRECTOR || ''} onChange={(e) => setRoleLimits({ ...roleLimits, L3_DIRECTOR: e.target.value })} placeholder="e.g. 10000" />
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: RECEIPT & COMPLIANCE */}
              {activeTab === 'compliance' && (
                <div className="grid gap-6 sm:grid-cols-2">
                  <label className="flex items-center gap-3 rounded-xl border border-slate-100 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
                    <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-indigo-600" name="receiptMandatory" value="true" defaultChecked={selectedCategory?.compliance?.receiptMandatory} />
                    <div>
                      <span className="block text-sm font-bold text-slate-700 dark:text-slate-200">Receipt Mandatory</span>
                      <span className="block text-xs text-slate-400">Expense submission requires receipt upload.</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 rounded-xl border border-slate-100 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
                    <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-indigo-600" name="ocrMandatory" value="true" defaultChecked={selectedCategory?.compliance?.ocrMandatory} />
                    <div>
                      <span className="block text-sm font-bold text-slate-700 dark:text-slate-200">OCR Scan Required</span>
                      <span className="block text-xs text-slate-400">Audit triggers validation on scan accuracy.</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 rounded-xl border border-slate-100 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
                    <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-indigo-600" name="gstMandatory" value="true" defaultChecked={selectedCategory?.compliance?.gstMandatory} />
                    <div>
                      <span className="block text-sm font-bold text-slate-700 dark:text-slate-200">GST Invoice Required</span>
                      <span className="block text-xs text-slate-400">Submission blocked unless Tax amount is entered.</span>
                    </div>
                  </label>

                  <label className="grid gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300">
                    <span>Mandatory Receipt Above (₹)</span>
                    <input className="input" type="number" name="receiptMandatoryAbove" placeholder="Amount threshold" defaultValue={selectedCategory?.receiptMandatoryAbove || ''} />
                  </label>
                </div>
              )}

              {/* TAB 4: ACCOUNTING & ERP INTEGRATION */}
              {activeTab === 'accounting' && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300">
                    <span>Cost Center Override</span>
                    <input className="input" name="costCenter" placeholder="e.g. CC-SALES-GLB" defaultValue={selectedCategory?.accounting?.costCenter || ''} />
                  </label>
                  <label className="grid gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300">
                    <span>Tax Account Code</span>
                    <input className="input" name="taxCode" placeholder="e.g. TAX_GST_18" defaultValue={selectedCategory?.accounting?.taxCode || ''} />
                  </label>
                  <label className="grid gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300">
                    <span>SAP Segment Code</span>
                    <input className="input font-mono" name="sapSegment" placeholder="e.g. SEG_FLIGHT_01" defaultValue={selectedCategory?.accounting?.sapSegment || ''} />
                  </label>
                  <label className="grid gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300">
                    <span>Oracle Segment ID</span>
                    <input className="input font-mono" name="oracleSegmentId" placeholder="e.g. ORCL-SUB-991" defaultValue={selectedCategory?.accounting?.oracleSegmentId || ''} />
                  </label>
                </div>
              )}

              {/* TAB 5: DYNAMIC FORM BUILDER */}
              {activeTab === 'dynamic' && (
                <div className="space-y-6">
                  <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/50 space-y-4">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                      <Plus className="h-4 w-4 text-indigo-600" /> Create Category Context Field
                    </h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input className="input text-xs" placeholder="Field ID (e.g. airline_name)" value={newFieldId} onChange={(e) => setNewFieldId(e.target.value)} />
                      <input className="input text-xs" placeholder="Field Label (e.g. Airline Name)" value={newFieldLabel} onChange={(e) => setNewFieldLabel(e.target.value)} />
                      <select className="input text-xs" value={newFieldType} onChange={(e) => setNewFieldType(e.target.value)}>
                        <option value="TEXT">Short Text</option>
                        <option value="NUMBER">Numeric Field</option>
                        <option value="DATE">Date Selector</option>
                        <option value="SELECT">Yes/No Select</option>
                      </select>
                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                        <input type="checkbox" checked={newFieldRequired} onChange={(e) => setNewFieldRequired(e.target.checked)} />
                        Mandatory field
                      </label>
                    </div>
                    <button type="button" className="btn-secondary w-full py-1.5 text-xs font-bold" onClick={addDynamicField}>
                      Add Dynamic Field
                    </button>
                  </div>

                  {/* Schema Preview */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Interactive UI Preview</h4>
                    {dynamicFieldsList.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No context fields added yet.</p>
                    ) : (
                      <div className="space-y-4 rounded-xl border border-dashed border-slate-200 p-4 dark:border-slate-700">
                        {dynamicFieldsList.map((field, idx) => (
                          <div key={idx} className="flex items-center justify-between border-b border-slate-50 pb-2 dark:border-slate-800">
                            <label className="grid gap-1 flex-1">
                              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                {field.label} {field.isRequired && <span className="text-rose-500">*</span>}
                              </span>
                              <input className="input text-xs py-1" type={field.type === 'NUMBER' ? 'number' : field.type === 'DATE' ? 'date' : 'text'} disabled placeholder={`Rendered context: ${field.type}`} />
                            </label>
                            <button type="button" className="text-rose-500 hover:text-rose-700 p-1.5" onClick={() => removeDynamicField(idx)}>
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 6: IMPACT SIMULATOR */}
              {activeTab === 'simulate' && (
                <div className="space-y-6">
                  <div className="rounded-xl border border-yellow-100 bg-yellow-50/20 p-4 dark:border-yellow-900/20">
                    <p className="text-xs text-yellow-800 dark:text-yellow-400">
                      Altering active enterprise categories may impact pending workflows. Running a dry-run check prevents transactional sync errors.
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={isSimulating}
                    onClick={() => runChangeSimulation(selectedCategory?.code || 'EXP-FLIGHT')}
                    className="btn-primary w-full py-2.5 font-bold flex items-center justify-center gap-1.5"
                  >
                    <Activity className="h-4 w-4" /> {isSimulating ? 'Running Integration Simulator...' : 'Run Downstream Change Simulator'}
                  </button>

                  {simulationResult && (
                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/30 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-slate-800 dark:text-white">Change simulation results</h4>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${simulationResult.status === 'STABLE_PROCEED_PERMITTED' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                          {simulationResult.status}
                        </span>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-3 text-center">
                        <div className="bg-white p-3 rounded-lg shadow-sm border border-slate-50 dark:bg-slate-900 dark:border-slate-800">
                          <span className="block text-xs font-semibold text-slate-400">Users Impacted</span>
                          <span className="text-lg font-bold text-slate-700 dark:text-slate-200">{simulationResult.impactMetrics.employeesAffected}</span>
                        </div>
                        <div className="bg-white p-3 rounded-lg shadow-sm border border-slate-50 dark:bg-slate-900 dark:border-slate-800">
                          <span className="block text-xs font-semibold text-slate-400">Policies Impacted</span>
                          <span className="text-lg font-bold text-slate-700 dark:text-slate-200">{simulationResult.impactMetrics.policiesLinked}</span>
                        </div>
                        <div className="bg-white p-3 rounded-lg shadow-sm border border-slate-50 dark:bg-slate-900 dark:border-slate-800">
                          <span className="block text-xs font-semibold text-slate-400">Pending Expenses</span>
                          <span className="text-lg font-bold text-slate-700 dark:text-slate-200">{simulationResult.impactMetrics.pendingWorkflowsReRouted}</span>
                        </div>
                      </div>

                      {simulationResult.impactMetrics.validationConflicts?.length > 0 && (
                        <div className="space-y-2">
                          <span className="block text-xs font-bold text-slate-400 uppercase">Conflict Analysis</span>
                          {simulationResult.impactMetrics.validationConflicts.map((conflict, idx) => (
                            <div key={idx} className="flex gap-2 rounded bg-amber-50/50 p-2 text-xs border border-amber-100 dark:bg-amber-950/20 dark:border-amber-900/30">
                              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                              <span className="text-amber-800 dark:text-amber-300">{conflict.description}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* Drawer Footer Actions */}
            <div className="flex justify-end gap-2 border-t border-slate-200 p-5 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/20">
              <button type="button" className="btn-secondary" onClick={() => setDrawerOpen(false)}>
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary flex items-center gap-1 font-semibold"
                disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}
              >
                <Save className="h-4 w-4" /> Save Configuration
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
};
