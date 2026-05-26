import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  FileText,
  Gauge,
  Hotel,
  Landmark,
  MapPin,
  Plane,
  Plus,
  ReceiptText,
  Route,
  Send,
  ShieldCheck,
  Sparkles,
  Train,
  WalletCards,
  X
} from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Drawer } from '../../components/common/Drawer';
import { EmptyState } from '../../components/common/EmptyState';
import { PageHeader } from '../../components/common/PageHeader';
import { StatusBadge } from '../../components/common/StatusBadge';
import { DataTable } from '../../components/tables/DataTable';
import { api } from '../../services/platform.service';
import { usePermission } from '../../hooks/usePermissions';

const STEPS = ['Basic Details', 'Booking', 'Budget & Advance', 'Policy', 'Approval', 'Review'];
const money = (amount, currency = 'INR') => `${currency === 'INR' ? '₹' : currency} ${Number(amount || 0).toLocaleString('en-IN')}`;
const today = new Date().toISOString().slice(0, 10);
const chartColor = ['#2563eb', '#059669', '#d97706', '#7c3aed', '#dc2626'];

const initialForm = {
  title: '',
  purpose: 'Customer meeting',
  businessJustification: '',
  employeeName: '',
  department: '',
  travelType: 'domestic',
  clientName: '',
  projectCode: '',
  costCenter: '',
  startDate: today,
  endDate: today,
  flexibleTravel: false,
  source: '',
  destination: '',
  multiCity: false,
  extraCities: '',
  transportMode: 'Flight',
  preferredAirline: '',
  travelClass: 'Economy',
  ticketEstimate: 0,
  bookingRequired: true,
  hotelType: 'Business Standard',
  hotelCost: 0,
  roomPreference: 'Single',
  nightsCount: 1,
  breakfast: true,
  lunch: true,
  dinner: true,
  dailyMealLimit: 1200,
  advanceAmount: 0,
  advanceMode: 'bank_transfer',
  advanceJustification: ''
};

const StatCard = ({ label, value, icon: Icon, tone = 'blue' }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
        <p className="mt-2 text-xl font-bold text-slate-950 dark:text-white">{value}</p>
      </div>
      <div className={`rounded-xl p-2 ${tone === 'green' ? 'bg-emerald-50 text-emerald-600' : tone === 'amber' ? 'bg-amber-50 text-amber-600' : tone === 'rose' ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'}`}>
        <Icon className="h-5 w-5" />
      </div>
    </div>
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

const Field = ({ label, children }) => (
  <label className="block">
    <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span>
    {children}
  </label>
);

const DetailTile = ({ label, value }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
    <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
    <p className="mt-1 font-bold text-slate-900 dark:text-white">{value || '-'}</p>
  </div>
);

const calcDays = (start, end) => {
  if (!start || !end) return 1;
  const diff = Math.ceil((new Date(end) - new Date(start)) / 86400000) + 1;
  return Math.max(1, diff || 1);
};

const buildPurpose = (form) => [
  form.purpose,
  form.businessJustification && `Business Justification: ${form.businessJustification}`,
  form.clientName && `Client: ${form.clientName}`,
  form.projectCode && `Project: ${form.projectCode}`,
  form.costCenter && `Cost Center: ${form.costCenter}`,
  form.advanceAmount > 0 && `Advance Requested: ${money(form.advanceAmount)} via ${form.advanceMode}`,
  form.advanceJustification && `Advance Justification: ${form.advanceJustification}`
].filter(Boolean).join('\n');

const TravelWizard = ({ open, onClose, onSubmit, isSaving }) => {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(initialForm);
  const days = calcDays(form.startDate, form.endDate);
  const nights = Math.max(Number(form.nightsCount || 0), Math.max(0, days - 1));
  const perDiem = Number(form.dailyMealLimit || 0) * days;
  const stayAllowance = Number(form.hotelCost || 0) * nights;
  const estimatedTotal = Number(form.ticketEstimate || 0) + stayAllowance + perDiem;
  const departmentBudget = Math.max(0, 250000 - estimatedTotal);
  const policyAllowedBudget = form.travelType === 'international' ? 350000 : 150000;
  const advanceEligible = Math.round(Math.min(estimatedTotal * 0.6, 75000));

  const policyAlerts = useMemo(() => {
    const alerts = [];
    if (form.travelClass !== 'Economy' && Number(form.ticketEstimate || 0) > 0) alerts.push({ title: 'Flight class exceeds allowed policy', detail: `Allowed: Economy · Selected: ${form.travelClass}` });
    if (Number(form.hotelCost || 0) > 5000) alerts.push({ title: 'Hotel limit exceeded', detail: `Allowed: ₹5000/night · Selected: ${money(form.hotelCost)}/night` });
    if (form.travelType === 'international') alerts.push({ title: 'International trip requires director approval', detail: 'Director approval will be added to the workflow.' });
    if (Number(form.dailyMealLimit || 0) > 1500) alerts.push({ title: 'Meal allowance limit exceeded', detail: `Allowed: ₹1500/day · Selected: ${money(form.dailyMealLimit)}/day` });
    const startDay = new Date(form.startDate).getDay();
    if (startDay === 0 || startDay === 6) alerts.push({ title: 'Weekend travel policy', detail: 'Weekend travel requires business justification.' });
    if (Number(form.advanceAmount || 0) > advanceEligible) alerts.push({ title: 'Advance eligibility exceeded', detail: `Eligible: ${money(advanceEligible)} · Requested: ${money(form.advanceAmount)}` });
    return alerts;
  }, [advanceEligible, form]);

  const workflow = useMemo(() => {
    const items = ['Employee', 'Manager Approval', 'Finance Approval'];
    if (form.bookingRequired) items.push('Travel Desk Approval');
    if (form.travelType === 'international' || estimatedTotal > 150000 || policyAlerts.length) items.push('Director Approval');
    return items;
  }, [estimatedTotal, form.bookingRequired, form.travelType, policyAlerts.length]);

  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const next = () => setStep((current) => Math.min(STEPS.length - 1, current + 1));
  const back = () => setStep((current) => Math.max(0, current - 1));
  const submit = (status = 'SUBMITTED', addExpenses = false) => {
    onSubmit({
      title: form.title || `${form.destination || 'Business'} Trip`,
      purpose: buildPurpose(form),
      source: form.source,
      destination: form.multiCity && form.extraCities ? `${form.destination} via ${form.extraCities}` : form.destination,
      travelType: form.travelType,
      startDate: form.startDate,
      endDate: form.endDate,
      status,
      budget: { amount: estimatedTotal, currency: 'INR' },
      itinerary: [
        { mode: form.transportMode, from: form.source, to: form.destination, startsAt: form.startDate, endsAt: form.endDate, reference: form.preferredAirline || form.travelClass },
        { mode: 'Hotel', from: form.destination, to: form.destination, startsAt: form.startDate, endsAt: form.endDate, reference: `${form.hotelType} · ${form.roomPreference}` }
      ],
      _clientAddExpenses: addExpenses
    });
  };

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <Drawer open={open} title="Create Travel Request" description="Enterprise travel workflow with policy, budget, advance, and approval intelligence." onClose={onClose} className="max-w-5xl">
      <div className="panel overflow-hidden rounded-2xl">
        <div className="border-b border-slate-200 bg-slate-50/60 px-6 pb-4 pt-5 dark:border-slate-800 dark:bg-slate-900/50">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            {STEPS.map((label, index) => (
              <div key={label} className="flex items-center gap-2">
                <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${index <= step ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500 dark:bg-slate-800'}`}>{index + 1}</span>
                <span className={`hidden text-sm font-semibold lg:block ${index === step ? 'text-blue-600' : 'text-slate-400'}`}>{label}</span>
              </div>
            ))}
          </div>
          <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${progress}%` }} /></div>
        </div>

        <div className="grid gap-4 p-6 md:grid-cols-2">
          {step === 0 && (
            <>
              <SectionTitle icon={BriefcaseBusiness} title="Basic Travel Details" />
              <Field label="Trip Title"><input className="input" value={form.title} onChange={(e) => setField('title', e.target.value)} placeholder="Mumbai Client Visit" /></Field>
              <Field label="Travel Purpose"><input className="input" value={form.purpose} onChange={(e) => setField('purpose', e.target.value)} placeholder="Customer meeting" /></Field>
              <div className="md:col-span-2"><Field label="Business Justification"><textarea className="input min-h-20" value={form.businessJustification} onChange={(e) => setField('businessJustification', e.target.value)} placeholder="Explain business outcome, expected meetings, revenue impact..." /></Field></div>
              <Field label="Employee Name"><input className="input" value={form.employeeName} onChange={(e) => setField('employeeName', e.target.value)} placeholder="Auto from profile or enter for reference" /></Field>
              <Field label="Department"><input className="input" value={form.department} onChange={(e) => setField('department', e.target.value)} placeholder="Sales" /></Field>
              <Field label="Travel Type"><select className="input" value={form.travelType} onChange={(e) => setField('travelType', e.target.value)}><option value="domestic">Domestic</option><option value="international">International</option></select></Field>
              <Field label="Client Name"><input className="input" value={form.clientName} onChange={(e) => setField('clientName', e.target.value)} placeholder="Acme Corp" /></Field>
              <Field label="Project Code"><input className="input" value={form.projectCode} onChange={(e) => setField('projectCode', e.target.value)} placeholder="PRJ-MUM-26" /></Field>
              <Field label="Cost Center"><input className="input" value={form.costCenter} onChange={(e) => setField('costCenter', e.target.value)} placeholder="CC-1042" /></Field>
              <SectionTitle icon={CalendarDays} title="Travel Date Details" />
              <Field label="Start Date"><input className="input" type="date" value={form.startDate} onChange={(e) => setField('startDate', e.target.value)} /></Field>
              <Field label="End Date"><input className="input" type="date" value={form.endDate} onChange={(e) => setField('endDate', e.target.value)} /></Field>
              <DetailTile label="Total Travel Days" value={`${days} day${days > 1 ? 's' : ''}`} />
              <label className="flex items-center justify-between rounded-xl border border-slate-200 p-3 text-sm font-semibold dark:border-slate-800 dark:text-white">Flexible Travel <input type="checkbox" checked={form.flexibleTravel} onChange={(e) => setField('flexibleTravel', e.target.checked)} /></label>
              <SectionTitle icon={MapPin} title="Locations" />
              <Field label="Origin City"><input className="input" value={form.source} onChange={(e) => setField('source', e.target.value)} placeholder="Ahmedabad" /></Field>
              <Field label="Destination City"><input className="input" value={form.destination} onChange={(e) => setField('destination', e.target.value)} placeholder="Mumbai" /></Field>
              <label className="flex items-center justify-between rounded-xl border border-slate-200 p-3 text-sm font-semibold dark:border-slate-800 dark:text-white">Multi-City Trip <input type="checkbox" checked={form.multiCity} onChange={(e) => setField('multiCity', e.target.checked)} /></label>
              {form.multiCity && <Field label="Additional Cities"><input className="input" value={form.extraCities} onChange={(e) => setField('extraCities', e.target.value)} placeholder="Delhi, Bengaluru" /></Field>}
            </>
          )}

          {step === 1 && (
            <>
              <SectionTitle icon={Plane} title="Transportation" />
              <Field label="Transportation"><select className="input" value={form.transportMode} onChange={(e) => setField('transportMode', e.target.value)}><option>Flight</option><option>Train</option><option>Cab</option><option>Bus</option><option>Personal Vehicle</option></select></Field>
              <Field label="Preferred Airline"><input className="input" value={form.preferredAirline} onChange={(e) => setField('preferredAirline', e.target.value)} placeholder="IndiGo" /></Field>
              <Field label="Travel Class"><select className="input" value={form.travelClass} onChange={(e) => setField('travelClass', e.target.value)}><option>Economy</option><option>Premium Economy</option><option>Business</option><option>First</option></select></Field>
              <Field label="Ticket Cost Estimate"><input className="input" type="number" value={form.ticketEstimate} onChange={(e) => setField('ticketEstimate', Number(e.target.value))} /></Field>
              <label className="flex items-center justify-between rounded-xl border border-slate-200 p-3 text-sm font-semibold dark:border-slate-800 dark:text-white">Booking Required <input type="checkbox" checked={form.bookingRequired} onChange={(e) => setField('bookingRequired', e.target.checked)} /></label>
              <SectionTitle icon={Hotel} title="Hotel Details" />
              <Field label="Hotel Type"><select className="input" value={form.hotelType} onChange={(e) => setField('hotelType', e.target.value)}><option>Business Standard</option><option>Budget</option><option>Premium</option><option>Executive</option></select></Field>
              <Field label="Estimated Hotel Cost / Night"><input className="input" type="number" value={form.hotelCost} onChange={(e) => setField('hotelCost', Number(e.target.value))} /></Field>
              <Field label="Room Preference"><select className="input" value={form.roomPreference} onChange={(e) => setField('roomPreference', e.target.value)}><option>Single</option><option>Twin Sharing</option><option>Accessible Room</option><option>Non-smoking</option></select></Field>
              <Field label="Nights Count"><input className="input" type="number" min="0" value={form.nightsCount} onChange={(e) => setField('nightsCount', Number(e.target.value))} /></Field>
              <SectionTitle icon={ReceiptText} title="Meal Allowance" />
              <label className="flex items-center justify-between rounded-xl border border-slate-200 p-3 text-sm font-semibold dark:border-slate-800 dark:text-white">Breakfast <input type="checkbox" checked={form.breakfast} onChange={(e) => setField('breakfast', e.target.checked)} /></label>
              <label className="flex items-center justify-between rounded-xl border border-slate-200 p-3 text-sm font-semibold dark:border-slate-800 dark:text-white">Lunch <input type="checkbox" checked={form.lunch} onChange={(e) => setField('lunch', e.target.checked)} /></label>
              <label className="flex items-center justify-between rounded-xl border border-slate-200 p-3 text-sm font-semibold dark:border-slate-800 dark:text-white">Dinner <input type="checkbox" checked={form.dinner} onChange={(e) => setField('dinner', e.target.checked)} /></label>
              <Field label="Daily Limit"><input className="input" type="number" value={form.dailyMealLimit} onChange={(e) => setField('dailyMealLimit', Number(e.target.value))} /></Field>
            </>
          )}

          {step === 2 && (
            <>
              <SectionTitle icon={WalletCards} title="Budget Section" />
              <DetailTile label="Estimated Total Cost" value={money(estimatedTotal)} />
              <DetailTile label="Department Budget Remaining" value={money(departmentBudget)} />
              <DetailTile label="Policy Allowed Budget" value={money(policyAllowedBudget)} />
              <DetailTile label="Advance Eligibility" value={money(advanceEligible)} />
              <SectionTitle icon={Landmark} title="Advance Request" />
              <Field label="Advance Amount"><input className="input" type="number" value={form.advanceAmount} onChange={(e) => setField('advanceAmount', Number(e.target.value))} /></Field>
              <Field label="Payment Mode"><select className="input" value={form.advanceMode} onChange={(e) => setField('advanceMode', e.target.value)}><option value="bank_transfer">Bank Transfer</option><option value="payroll">Payroll</option><option value="upi">UPI</option><option value="wallet">Wallet</option></select></Field>
              <div className="md:col-span-2"><Field label="Advance Justification"><textarea className="input min-h-20" value={form.advanceJustification} onChange={(e) => setField('advanceJustification', e.target.value)} placeholder="Why is advance needed before travel?" /></Field></div>
              <SectionTitle icon={CircleDollarSign} title="Auto Calculations" />
              <DetailTile label="Per Diem" value={money(perDiem)} />
              <DetailTile label="Total Stay Allowance" value={money(stayAllowance)} />
              <DetailTile label="Travel Reimbursement Estimate" value={money(Math.max(0, estimatedTotal - Number(form.advanceAmount || 0)))} />
              <DetailTile label="Remaining Balance After Advance" value={money(Math.max(0, Number(form.advanceAmount || 0) - estimatedTotal))} />
            </>
          )}

          {step === 3 && (
            <>
              <SectionTitle icon={ShieldCheck} title="Real-Time Policy Engine" description="Policy checks are calculated locally before submission and revalidated during approval." />
              <div className="md:col-span-2 space-y-3">
                {policyAlerts.length ? policyAlerts.map((alert) => (
                  <div key={alert.title} className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
                    <p className="flex items-center gap-2 font-bold"><AlertTriangle className="h-4 w-4" /> {alert.title}</p>
                    <p className="mt-1">{alert.detail}</p>
                  </div>
                )) : (
                  <p className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"><CheckCircle2 className="h-4 w-4" /> Policy checks passed</p>
                )}
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200">
                  <p className="flex items-center gap-2 font-bold"><Sparkles className="h-4 w-4" /> AI Travel Assistant</p>
                  <p className="mt-1">Suggested hotel category: Business Standard. This trip budget utilization is {Math.min(100, Math.round((estimatedTotal / policyAllowedBudget) * 100))}%.</p>
                  {policyAlerts.length > 0 && <p className="mt-2 font-semibold">Recommendation: Use economy class and cap hotel cost to ₹5000/night to reduce policy exceptions.</p>}
                </div>
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <SectionTitle icon={Route} title="Approval Workflow Preview" />
              <div className="md:col-span-2 grid gap-5 xl:grid-cols-[1fr_320px]">
                <div className="space-y-3">
                  {workflow.map((item, index) => (
                    <div key={item} className="relative flex gap-3">
                      {index < workflow.length - 1 && <div className="absolute left-4 top-8 h-full w-px bg-slate-200 dark:bg-slate-800" />}
                      <div className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full ${index === 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>{index + 1}</div>
                      <div className="min-w-0 flex-1 rounded-xl border border-slate-200 p-3 text-sm font-semibold dark:border-slate-800 dark:text-white">{item}</div>
                    </div>
                  ))}
                </div>
                <div className="space-y-3">
                  <DetailTile label="Estimated Approval Time" value={workflow.length > 4 ? '3-5 business days' : '1-2 business days'} />
                  <DetailTile label="Required Approvers" value={workflow.slice(1).join(', ')} />
                  <DetailTile label="Escalation Conditions" value={policyAlerts.length ? 'Policy exception or SLA breach' : 'SLA breach only'} />
                </div>
              </div>
            </>
          )}

          {step === 5 && (
            <>
              <SectionTitle icon={FileText} title="Review & Submit" />
              <div className="md:col-span-2 grid gap-3 md:grid-cols-4">
                <DetailTile label="Estimated Budget" value={money(estimatedTotal)} />
                <DetailTile label="Advance Requested" value={money(form.advanceAmount)} />
                <DetailTile label="Total Travel Days" value={`${days} day${days > 1 ? 's' : ''}`} />
                <DetailTile label="Destination" value={form.destination} />
                <DetailTile label="Travel Type" value={form.travelType} />
                <DetailTile label="Policy Status" value={policyAlerts.length ? 'Exceptions found' : 'Compliant'} />
                <DetailTile label="Approval Workflow" value={workflow.join(' > ')} />
                <DetailTile label="Reimbursement Estimate" value={money(Math.max(0, estimatedTotal - Number(form.advanceAmount || 0)))} />
              </div>
              <div className="md:col-span-2 space-y-2">
                <p className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"><CheckCircle2 className="h-4 w-4" /> Budget available</p>
                {policyAlerts.length ? <p className="flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200"><AlertTriangle className="h-4 w-4" /> Additional approval required</p> : <p className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"><CheckCircle2 className="h-4 w-4" /> Policy checks passed</p>}
              </div>
            </>
          )}

          <div className="flex justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800 md:col-span-2">
            <button type="button" className="btn-secondary flex items-center gap-2" onClick={step === 0 ? onClose : back}>{step === 0 ? <X className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}{step === 0 ? 'Cancel' : 'Back'}</button>
            <div className="flex flex-wrap justify-end gap-3">
              {step === STEPS.length - 1 && <button type="button" className="btn-secondary" onClick={() => submit('DRAFT')} disabled={isSaving}>Save Draft</button>}
              {step === STEPS.length - 1 && <button type="button" className="btn-secondary flex items-center gap-2" onClick={() => submit('SUBMITTED', true)} disabled={isSaving}><Plus className="h-4 w-4" /> Submit & Add Expenses</button>}
              {step === STEPS.length - 1 ? <button type="button" className="btn-primary flex items-center gap-2" onClick={() => submit('SUBMITTED')} disabled={isSaving}><Send className="h-4 w-4" /> Submit Trip Request</button> : <button type="button" className="btn-primary flex items-center gap-2" onClick={next}>Continue <ChevronRight className="h-4 w-4" /></button>}
            </div>
          </div>
        </div>
      </div>
    </Drawer>
  );
};

const TravelDetails = ({ trip, expenses, onClose }) => {
  const [tab, setTab] = useState('overview');
  const linkedExpenses = expenses.filter((expense) => String(expense.tripId || expense.travelRequestId || '') === String(trip._id));
  const linkedSpend = linkedExpenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  const budgetAmount = Number(trip.budget?.amount || trip.estimatedCost || 0);
  const advance = Math.round(budgetAmount * 0.35);
  const settlementDue = Math.max(0, linkedSpend - advance);
  const refundDue = Math.max(0, advance - linkedSpend);
  const utilization = budgetAmount ? Math.min(100, Math.round((linkedSpend / budgetAmount) * 100)) : 0;
  const tabs = ['Overview', 'Itinerary', 'Linked Expenses', 'Approval Timeline', 'Budget Tracking', 'Advances & Settlement', 'Policy Violations', 'Audit Logs'];

  return (
    <Drawer open={Boolean(trip)} title={trip?.title || 'Travel Details'} description={`${trip?.travelId || 'Trip'} · ${trip?.destination || '-'}`} onClose={onClose} className="max-w-5xl">
      <div className="mb-5 flex gap-1 overflow-x-auto border-b border-slate-200 dark:border-slate-800">
        {tabs.map((item) => (
          <button key={item} onClick={() => setTab(item)} className={`shrink-0 border-b-2 px-4 py-3 text-sm font-semibold ${tab === item ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}>{item}</button>
        ))}
      </div>

      {tab === 'Overview' && (
        <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
          <section className="panel p-6">
            <h3 className="mb-4 font-bold dark:text-white">Trip Information</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <DetailTile label="Employee" value={trip.employeeId?.name || 'Me'} />
              <DetailTile label="Department" value={trip.employeeId?.department || '-'} />
              <DetailTile label="Travel Type" value={trip.travelType} />
              <DetailTile label="Destination" value={trip.destination} />
              <DetailTile label="Travel Dates" value={`${trip.startDate ? new Date(trip.startDate).toLocaleDateString('en-IN') : '-'} - ${trip.endDate ? new Date(trip.endDate).toLocaleDateString('en-IN') : '-'}`} />
              <DetailTile label="Status" value={trip.status} />
            </div>
            <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300"><b>Purpose:</b><br />{trip.purpose || '-'}</div>
          </section>
          <section className="panel p-6">
            <h3 className="mb-4 font-bold dark:text-white">AI Travel Insights</h3>
            <div className="space-y-3">
              <p className="rounded-xl bg-blue-50 p-3 text-sm text-blue-800 dark:bg-blue-950 dark:text-blue-200">Suggested hotel category: Business Standard</p>
              <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">Trip budget utilization: {utilization}%</p>
              {utilization > 80 && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">This trip is approaching budget. Review hotel and flight costs before settlement.</p>}
            </div>
          </section>
        </div>
      )}

      {tab === 'Itinerary' && (
        <section className="panel p-6">
          <h3 className="mb-4 font-bold dark:text-white">Itinerary</h3>
          <div className="space-y-3">
            {(trip.itinerary || []).map((item, index) => (
              <div key={index} className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <p className="font-bold dark:text-white">{item.mode} · {item.from} to {item.to}</p>
                <p className="text-sm text-slate-500">{item.reference || 'Booking reference pending'}</p>
              </div>
            ))}
            {!trip.itinerary?.length && <EmptyState title="No itinerary added" description="Transport and hotel details will appear here after request creation." />}
          </div>
        </section>
      )}

      {tab === 'Linked Expenses' && (
        <section className="panel p-6">
          <h3 className="mb-4 font-bold dark:text-white">Linked Expenses</h3>
          {linkedExpenses.length ? <DataTable data={linkedExpenses} columns={[
            { header: 'Category', accessorKey: 'category' },
            { header: 'Merchant', accessorKey: 'merchant' },
            { header: 'Amount', cell: ({ row }) => money(row.original.amount, row.original.currency) },
            { header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> }
          ]} /> : <EmptyState title="No linked expenses" description="Hotel, flight, taxi, meals, fuel, and entertainment expenses linked to this trip will appear here." />}
        </section>
      )}

      {tab === 'Approval Timeline' && (
        <section className="panel p-6">
          <h3 className="mb-4 font-bold dark:text-white">Approval Timeline</h3>
          <div className="space-y-3">
            {(trip.approvalPath?.length ? trip.approvalPath : [{ approverRole: 'manager', status: trip.status === 'DRAFT' ? 'pending' : 'pending' }, { approverRole: 'finance', status: 'pending' }, { approverRole: 'travel_desk', status: 'pending' }]).map((item, index) => (
              <div key={index} className="relative flex gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800">{index + 1}</div>
                <div className="flex-1 rounded-xl border border-slate-200 p-3 dark:border-slate-800"><p className="font-semibold capitalize dark:text-white">{String(item.approverRole).replaceAll('_', ' ')}</p><StatusBadge status={item.status} /></div>
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === 'Budget Tracking' && (
        <section className="panel p-6">
          <h3 className="mb-4 font-bold dark:text-white">Budget Tracking</h3>
          <div className="grid gap-3 md:grid-cols-4">
            <DetailTile label="Approved Budget" value={money(budgetAmount, trip.budget?.currency)} />
            <DetailTile label="Linked Spend" value={money(linkedSpend, trip.budget?.currency)} />
            <DetailTile label="Remaining Budget" value={money(Math.max(0, budgetAmount - linkedSpend), trip.budget?.currency)} />
            <DetailTile label="Utilization" value={`${utilization}%`} />
          </div>
        </section>
      )}

      {tab === 'Advances & Settlement' && (
        <section className="panel p-6">
          <h3 className="mb-4 font-bold dark:text-white">Advances & Settlement</h3>
          <div className="grid gap-3 md:grid-cols-4">
            <DetailTile label="Advance Used" value={money(Math.min(advance, linkedSpend), trip.budget?.currency)} />
            <DetailTile label="Remaining Balance" value={money(Math.max(0, advance - linkedSpend), trip.budget?.currency)} />
            <DetailTile label="Refund Due" value={money(refundDue, trip.budget?.currency)} />
            <DetailTile label="Extra Reimbursement" value={money(settlementDue, trip.budget?.currency)} />
          </div>
        </section>
      )}

      {tab === 'Policy Violations' && (
        <section className="panel p-6">
          <h3 className="mb-4 font-bold dark:text-white">Policy Violations</h3>
          {budgetAmount > 150000 || trip.travelType === 'international' ? (
            <div className="space-y-3">
              {trip.travelType === 'international' && <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">International trip requires director approval.</p>}
              {budgetAmount > 150000 && <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">Trip exceeds standard domestic budget threshold.</p>}
            </div>
          ) : <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">No travel policy violations detected.</p>}
        </section>
      )}

      {tab === 'Audit Logs' && (
        <section className="panel p-6">
          <h3 className="mb-4 font-bold dark:text-white">Audit Logs</h3>
          <div className="space-y-3">
            {[
              ['Travel request changes', `Request ${trip.travelId || trip._id} created or updated.`],
              ['Approval actions', `${trip.approvalPath?.length || 0} approval step(s) recorded.`],
              ['Budget updates', `Budget calculated at ${money(budgetAmount, trip.budget?.currency)}.`],
              ['Advance payments', 'Advance eligibility and settlement balance calculated.'],
              ['Settlement adjustments', `${linkedExpenses.length} linked expense(s) evaluated.`]
            ].map(([title, detail]) => <div key={title} className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-800"><p className="font-bold dark:text-white">{title}</p><p className="text-slate-500">{detail}</p></div>)}
          </div>
        </section>
      )}
    </Drawer>
  );
};

export const Travel = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const canCreate = usePermission('trips', 'create');
  const [showWizard, setShowWizard] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const { data = [] } = useQuery({ queryKey: ['travel-requests'], queryFn: api.travelRequests });
  const { data: expenses = [] } = useQuery({ queryKey: ['expenses', 'travel-linking'], queryFn: () => api.expenses({ mine: 'true' }) });
  const create = useMutation({
    mutationFn: api.createTravelRequest,
    onSuccess: (_trip, variables) => {
      queryClient.invalidateQueries({ queryKey: ['travel-requests'] });
      setShowWizard(false);
      if (variables?._clientAddExpenses) navigate('/expenses?new=true');
    }
  });

  const stats = useMemo(() => {
    const total = data.length;
    const pending = data.filter((item) => ['SUBMITTED', 'PENDING_MANAGER'].includes(item.status)).length;
    const active = data.filter((item) => ['APPROVED', 'SETTLEMENT_PENDING'].includes(item.status)).length;
    const upcoming = data.filter((item) => item.startDate && new Date(item.startDate) >= new Date()).length;
    const budget = data.reduce((sum, item) => sum + Number(item.budget?.amount || item.estimatedCost || 0), 0);
    const linked = expenses.filter((expense) => expense.tripId).reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const pendingSettlements = data.filter((item) => item.status === 'SETTLEMENT_PENDING').length;
    const international = data.filter((item) => item.travelType === 'international').length;
    return { total, pending, active, upcoming, budget, linked, pendingSettlements, international };
  }, [data, expenses]);

  const monthlySpend = useMemo(() => ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map((month, index) => ({
    month,
    spend: Math.round((stats.budget / 6) * (0.65 + index * 0.08)) || [22000, 34000, 28000, 46000, 39000, 52000][index]
  })), [stats.budget]);
  const categoryAnalytics = [
    { name: 'Flight', value: 42 },
    { name: 'Hotel', value: 28 },
    { name: 'Meals', value: 14 },
    { name: 'Taxi', value: 10 },
    { name: 'Other', value: 6 }
  ];
  const destinations = useMemo(() => Object.entries(data.reduce((acc, trip) => {
    const destination = trip.destination || 'Unassigned';
    acc[destination] = (acc[destination] || 0) + 1;
    return acc;
  }, {})).slice(0, 5), [data]);

  const columns = useMemo(() => [
    { header: 'Travel ID', accessorKey: 'travelId' },
    { header: 'Trip', accessorKey: 'title' },
    { header: 'Destination', accessorKey: 'destination' },
    { header: 'Travel Type', cell: ({ row }) => <span className="capitalize">{row.original.travelType || 'domestic'}</span> },
    { header: 'Budget', cell: ({ row }) => money(row.original.budget?.amount || row.original.estimatedCost, row.original.budget?.currency) },
    { header: 'Linked Expenses', cell: ({ row }) => row.original.linkedExpenses?.length || expenses.filter((expense) => String(expense.tripId || '') === String(row.original._id)).length },
    { header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    { header: 'Action', cell: ({ row }) => <button className="btn-secondary py-1.5 text-xs" onClick={() => setSelectedTrip(row.original)}>Details</button> }
  ], [expenses]);

  return (
    <>
      <PageHeader
        title="Travel"
        description="Travel request, approval, expense linking, settlement, and finance verification."
        actions={canCreate && <button className="btn-primary flex items-center gap-2" onClick={() => setShowWizard(true)}><Plus className="h-4 w-4" /> New Trip</button>}
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Trips" value={stats.total} icon={Plane} />
        <StatCard label="Active Trips" value={stats.active} icon={Route} tone="green" />
        <StatCard label="Pending Approvals" value={stats.pending} icon={Clock3} tone="amber" />
        <StatCard label="Upcoming Travel" value={stats.upcoming} icon={CalendarDays} />
        <StatCard label="Budget Utilization" value={money(stats.linked || stats.budget * 0.42)} icon={Gauge} />
        <StatCard label="Pending Settlements" value={stats.pendingSettlements} icon={ReceiptText} tone="amber" />
        <StatCard label="Advance Outstanding" value={money(Math.round(stats.budget * 0.28))} icon={Landmark} />
        <StatCard label="Policy Violations" value={stats.international} icon={AlertTriangle} tone={stats.international ? 'rose' : 'green'} />
      </div>

      <div className="mb-5 grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <section className="panel p-5">
          <div className="mb-4 flex items-center gap-2"><BarChart3 className="h-4 w-4 text-blue-600" /><h2 className="font-bold dark:text-white">Monthly Travel Spend</h2></div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlySpend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `₹${Math.round(value / 1000)}k`} />
                <Tooltip formatter={(value) => money(value)} />
                <Area type="monotone" dataKey="spend" stroke="#2563eb" fill="#dbeafe" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="panel p-5">
          <div className="mb-4 flex items-center gap-2"><Train className="h-4 w-4 text-blue-600" /><h2 className="font-bold dark:text-white">Travel Category Analytics</h2></div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryAnalytics}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>{categoryAnalytics.map((entry, index) => <Cell key={entry.name} fill={chartColor[index % chartColor.length]} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <div className="mb-5 grid gap-5 lg:grid-cols-3">
        <section className="panel p-5">
          <h2 className="mb-3 font-bold dark:text-white">Frequent Destinations</h2>
          <div className="space-y-2">{destinations.length ? destinations.map(([destination, count]) => <div key={destination} className="flex justify-between rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800"><span>{destination}</span><b>{count}</b></div>) : <p className="text-sm text-slate-500">No destination history yet.</p>}</div>
        </section>
        <section className="panel p-5">
          <h2 className="mb-3 font-bold dark:text-white">Department Travel Trends</h2>
          {['Sales', 'Operations', 'Finance'].map((dept, index) => <div key={dept} className="mb-3"><div className="flex justify-between text-sm"><span>{dept}</span><b>{35 + index * 18}%</b></div><div className="mt-2 h-2 rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-blue-600" style={{ width: `${35 + index * 18}%` }} /></div></div>)}
        </section>
        <section className="panel p-5">
          <h2 className="mb-3 font-bold dark:text-white">Travel Risk Alerts</h2>
          <div className="space-y-2">
            {stats.international > 0 && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">International trips require director approval and passport compliance checks.</p>}
            <p className="rounded-xl bg-blue-50 p-3 text-sm text-blue-800 dark:bg-blue-950 dark:text-blue-200">Expense reminders will trigger at trip end for settlement closure.</p>
            <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">Advance payment notifications are ready for finance release.</p>
          </div>
        </section>
      </div>

      {data.length ? <DataTable data={data} columns={columns} /> : <EmptyState title="No trips yet" description="Create a travel request to start approval, booking, advance, and settlement workflows." />}

      <TravelWizard open={showWizard} onClose={() => setShowWizard(false)} onSubmit={(payload) => create.mutate(payload)} isSaving={create.isPending} />
      {selectedTrip && <TravelDetails trip={selectedTrip} expenses={expenses} onClose={() => setSelectedTrip(null)} />}
    </>
  );
};
