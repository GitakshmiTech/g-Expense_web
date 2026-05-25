import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { Drawer } from '../../components/common/Drawer';
import { api } from '../../services/platform.service';
import { Plus, Trash2 } from 'lucide-react';

export const PolicyBuilderDrawer = ({ open, onClose, onSubmit, isSubmitting }) => {
  const [activeTab, setActiveTab] = useState('basic');

  const { register, control, handleSubmit, watch, setValue } = useForm({
    defaultValues: {
      name: '',
      code: '',
      description: '',
      status: 'active',
      priority: 0,
      mapping: {
        departmentIds: [],
        designationIds: [],
        gradeIds: [],
        locationMapping: []
      },
      limits: { perExpense: 0, daily: 0, monthly: 0, currency: 'INR', limitType: 'warning' },
      receiptPolicy: { mandatory: false, requiredAboveAmount: 0, ocrMandatory: false },
      compliance: { gstMandatory: false, futureDateRestriction: false, violationAction: 'Warning' },
      travelPolicy: { hotelLimit: 0, foodLimit: 0, cabLimit: 0 },
      customRules: [],
      approvalFlow: []
    }
  });

  const { data: deptData = { items: [] } } = useQuery({
    queryKey: ['enterprise_departments'],
    queryFn: () => api.enterpriseList('departments'),
    retry: false
  });

  const { fields: ruleFields, append: appendRule, remove: removeRule } = useFieldArray({ control, name: 'customRules' });
  const { fields: flowFields, append: appendFlow, remove: removeFlow } = useFieldArray({ control, name: 'approvalFlow' });

  const tabs = [
    { id: 'basic', label: 'Basic Info' },
    { id: 'limits', label: 'Expense Limits' },
    { id: 'receipts', label: 'Receipts & Compliance' },
    { id: 'travel', label: 'Travel Policy' },
    { id: 'rules', label: 'Dynamic Rules' },
    { id: 'approvals', label: 'Approval Workflow' }
  ];

  return (
    <Drawer 
      open={open} 
      title="Create Enterprise Policy" 
      description="Configure dynamic expense engine rules." 
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
          <button onClick={handleSubmit(onSubmit)} disabled={isSubmitting} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {isSubmitting ? 'Saving...' : 'Save Policy'}
          </button>
        </div>
      }
    >
      <div className="flex border-b border-slate-200 dark:border-slate-800 mb-6 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`whitespace-nowrap px-4 py-2 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-6 pb-20">
        {/* TAB 1: BASIC INFO */}
        <div className={activeTab === 'basic' ? 'block' : 'hidden'}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Policy Name</label>
              <input {...register('name')} required className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700" placeholder="e.g. Sales Team Travel" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Policy Code</label>
              <input {...register('code')} required className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700" placeholder="SLS-TRV-01" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea {...register('description')} className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700" rows={2}></textarea>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Priority</label>
              <input type="number" {...register('priority')} className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select {...register('status')} className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700">
                <option value="active">Active</option>
                <option value="draft">Draft</option>
              </select>
            </div>

            <div className="col-span-2 border-t border-slate-100 dark:border-slate-800 pt-4 mt-2">
              <h3 className="font-semibold text-base mb-3">Policy Mappings</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Departments Mapping</label>
                  <div className="max-h-36 overflow-y-auto border rounded-lg p-2 space-y-1 dark:border-slate-700 bg-white dark:bg-slate-900">
                    {deptData?.items?.map((dept) => (
                      <label key={dept._id} className="flex items-center gap-2 text-sm select-none">
                        <input
                          type="checkbox"
                          value={dept._id}
                          className="rounded text-blue-600 focus:ring-blue-500"
                          checked={watch('mapping.departmentIds')?.includes(dept._id) || false}
                          onChange={(e) => {
                            const current = watch('mapping.departmentIds') || [];
                            if (e.target.checked) {
                              setValue('mapping.departmentIds', [...current, dept._id]);
                            } else {
                              setValue('mapping.departmentIds', current.filter(id => id !== dept._id));
                            }
                          }}
                        />
                        {dept.name} ({dept.code})
                      </label>
                    ))}
                    {(!deptData?.items || deptData.items.length === 0) && (
                      <p className="text-xs text-slate-500 italic p-1">No departments available</p>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Designations (comma-separated)</label>
                    <input
                      type="text"
                      className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                      placeholder="e.g. Developer, Consultant"
                      onChange={(e) => {
                        const arr = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                        setValue('mapping.designationIds', arr);
                      }}
                      defaultValue={watch('mapping.designationIds')?.join(', ') || ''}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Locations (comma-separated)</label>
                    <input
                      type="text"
                      className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                      placeholder="e.g. Mumbai, New York"
                      onChange={(e) => {
                        const arr = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                        setValue('mapping.locationMapping', arr);
                      }}
                      defaultValue={watch('mapping.locationMapping')?.join(', ') || ''}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* TAB 2: LIMITS */}
        <div className={activeTab === 'limits' ? 'block' : 'hidden'}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Per Expense Limit</label>
              <input type="number" {...register('limits.perExpense')} className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Monthly Limit</label>
              <input type="number" {...register('limits.monthly')} className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Currency</label>
              <input {...register('limits.currency')} className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Limit Action Type</label>
              <select {...register('limits.limitType')} className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700">
                <option value="warning">Warning (Soft)</option>
                <option value="hard">Hard Block</option>
              </select>
            </div>
          </div>
        </div>

        {/* TAB 3: RECEIPTS & COMPLIANCE */}
        <div className={activeTab === 'receipts' ? 'block' : 'hidden'}>
          <div className="space-y-4">
            <h3 className="font-medium text-lg">Receipt Policies</h3>
            <div className="flex items-center gap-2">
              <input type="checkbox" {...register('receiptPolicy.mandatory')} id="rcpt-mand" />
              <label htmlFor="rcpt-mand">Receipt Mandatory</label>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Required Above Amount</label>
              <input type="number" {...register('receiptPolicy.requiredAboveAmount')} className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" {...register('receiptPolicy.ocrMandatory')} id="ocr-mand" />
              <label htmlFor="ocr-mand">OCR Validation Mandatory</label>
            </div>
            <hr className="my-4 border-slate-200 dark:border-slate-800" />
            <h3 className="font-medium text-lg">Compliance Rules</h3>
            <div className="flex items-center gap-2">
              <input type="checkbox" {...register('compliance.gstMandatory')} id="gst-mand" />
              <label htmlFor="gst-mand">GST Details Mandatory</label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" {...register('compliance.futureDateRestriction')} id="future-mand" />
              <label htmlFor="future-mand">Block Future Dated Expenses</label>
            </div>
            <div className="mt-2">
              <label className="block text-sm font-medium mb-1">Violation Action</label>
              <select {...register('compliance.violationAction')} className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700">
                <option value="Warning">Warning</option>
                <option value="AutoReject">Auto Reject</option>
                <option value="RequireApproval">Require Additional Approval</option>
              </select>
            </div>
          </div>
        </div>

        {/* TAB 4: TRAVEL POLICY */}
        <div className={activeTab === 'travel' ? 'block' : 'hidden'}>
          <div className="grid grid-cols-2 gap-4">
             <div>
              <label className="block text-sm font-medium mb-1">Hotel Limit (per night)</label>
              <input type="number" {...register('travelPolicy.hotelLimit')} className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Food Limit (per day)</label>
              <input type="number" {...register('travelPolicy.foodLimit')} className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Cab/Transport Limit</label>
              <input type="number" {...register('travelPolicy.cabLimit')} className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700" />
            </div>
          </div>
        </div>

        {/* TAB 5: DYNAMIC RULES */}
        <div className={activeTab === 'rules' ? 'block' : 'hidden'}>
          <div className="mb-4 flex items-center justify-between">
             <h3 className="font-medium text-lg">Dynamic Rule Engine</h3>
             <button type="button" onClick={() => appendRule({ name: '', logicalOperator: 'AND', conditions: [{ field: 'category', operator: 'equals', value: '' }], actions: [{ actionType: 'warn', actionValue: '' }] })} className="text-blue-600 flex items-center gap-1 text-sm"><Plus className="w-4 h-4"/> Add Rule</button>
          </div>
          <div className="space-y-6">
            {ruleFields.map((field, index) => (
              <div key={field.id} className="p-4 border rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 relative">
                <button type="button" onClick={() => removeRule(index)} className="absolute top-4 right-4 text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 className="w-4 h-4" /></button>
                <input {...register(`customRules.${index}.name`)} placeholder="Rule Name" className="w-3/4 mb-3 p-2 border rounded dark:bg-slate-900 dark:border-slate-700" />
                
                <h4 className="text-xs font-bold uppercase text-slate-500 mb-2">Conditions</h4>
                <div className="flex gap-2 mb-4">
                  <select {...register(`customRules.${index}.conditions.0.field`)} className="p-2 border rounded dark:bg-slate-900">
                    <option value="category">Category</option>
                    <option value="merchant">Merchant</option>
                    <option value="amount">Amount</option>
                  </select>
                  <select {...register(`customRules.${index}.conditions.0.operator`)} className="p-2 border rounded dark:bg-slate-900">
                    <option value="equals">Equals</option>
                    <option value="not_equals">Not Equals</option>
                    <option value="greater_than">Greater Than</option>
                  </select>
                  <input {...register(`customRules.${index}.conditions.0.value`)} placeholder="Value" className="p-2 border rounded flex-1 dark:bg-slate-900" />
                </div>

                <h4 className="text-xs font-bold uppercase text-slate-500 mb-2">Then Action</h4>
                <div className="flex gap-2">
                  <select {...register(`customRules.${index}.actions.0.actionType`)} className="p-2 border rounded dark:bg-slate-900">
                    <option value="require_approval">Require Approval From</option>
                    <option value="reject">Reject Submission</option>
                    <option value="warn">Show Warning</option>
                  </select>
                  <input {...register(`customRules.${index}.actions.0.actionValue`)} placeholder="Action Value (e.g. Finance)" className="p-2 border rounded flex-1 dark:bg-slate-900" />
                </div>
              </div>
            ))}
            {ruleFields.length === 0 && <p className="text-slate-500 text-sm italic">No custom rules added. Rules allow you to create complex IF/THEN logic.</p>}
          </div>
        </div>

        {/* TAB 6: APPROVAL WORKFLOW */}
        <div className={activeTab === 'approvals' ? 'block' : 'hidden'}>
          <div className="mb-4 flex items-center justify-between">
             <h3 className="font-medium text-lg">Approval Workflow Tiers</h3>
             <button type="button" onClick={() => appendFlow({ level: flowFields.length + 1, condition: { amountGreaterThan: 0 }, approvers: ['Manager'] })} className="text-blue-600 flex items-center gap-1 text-sm"><Plus className="w-4 h-4"/> Add Level</button>
          </div>
          <div className="space-y-4">
            {flowFields.map((field, index) => (
              <div key={field.id} className="p-4 border rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex items-center gap-4">
                <div className="bg-blue-100 text-blue-700 w-8 h-8 rounded-full flex items-center justify-center font-bold">
                  {index + 1}
                </div>
                <div className="flex-1 grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-500">If Amount &gt;</label>
                    <input type="number" {...register(`approvalFlow.${index}.condition.amountGreaterThan`)} className="w-full p-2 border rounded mt-1 dark:bg-slate-900 dark:border-slate-700" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Approver Role</label>
                    <select {...register(`approvalFlow.${index}.approvers.0`)} className="w-full p-2 border rounded mt-1 dark:bg-slate-900 dark:border-slate-700">
                      <option value="Manager">Manager</option>
                      <option value="Finance">Finance</option>
                      <option value="CFO">CFO</option>
                    </select>
                  </div>
                </div>
                <button type="button" onClick={() => removeFlow(index)} className="text-red-500 hover:bg-red-50 p-2 rounded"><Trash2 className="w-5 h-5" /></button>
              </div>
            ))}
            {flowFields.length === 0 && <p className="text-slate-500 text-sm italic">Add approval levels to create escalating approval chains based on amount.</p>}
          </div>
        </div>
      </div>
    </Drawer>
  );
};
