import { useState, useEffect } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, Plus, Send, LifeBuoy, FileText, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { Modal } from '../../components/common/Modal';

const FAQS = [
  {
    q: 'How do I submit a new business expense?',
    a: 'Navigate to "Expenses" in the sidebar and click "New Expense". You can upload your bill or receipt to let the Gemini AI OCR automatically scan and fill in the details. Check all values, select whether it is a shared expense, and click "Submit".'
  },
  {
    q: 'Why is my expense marked as "Sent Back"?',
    a: 'An expense is marked as "Sent Back" if a hard policy violation is detected (e.g. daily limit exceeded, missing required receipt, or duplicates). Review your manager\'s notes in the details drawer, edit the details, and re-submit.'
  },
  {
    q: 'How long does reimbursement processing take?',
    a: 'Once an expense report is manager-approved and finance-verified, settlements are queued. Typically, payments are disbursed to your registered bank account within 3 to 5 business days.'
  },
  {
    q: 'What is a Shared Expense and how does it work?',
    a: 'If you paid for a meal or travel expense that included other employees, check "Shared Expense" in the creation form. You can search and add participants, choose to split it equally or by custom percentages/amounts, and specify if you receive the full reimbursement or if everyone receives their own share.'
  },
  {
    q: 'How do I link an expense to a Business Trip?',
    a: 'Navigate to "Trips", open your active trip, and link the draft expenses to it. Once linked, the travel request budget consumption indicator will update to display the estimated vs. actual travel spending.'
  }
];

const INITIAL_TICKETS = [
  {
    id: 'TKT-38291',
    subject: 'Gemini OCR failed to extract GST rate from Uber invoice',
    category: 'OCR Scanning',
    severity: 'medium',
    status: 'resolved',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toLocaleString(),
    description: 'Uploaded Uber taxi PDF bill but tax amount was filled as 0 instead of 5%. Please review OCR logs.'
  },
  {
    id: 'TKT-39401',
    subject: 'Reimbursement status showing Failed on Axis Bank transfer',
    category: 'Payments',
    severity: 'high',
    status: 'in_progress',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toLocaleString(),
    description: 'Report RPT-FY26-029 is approved but reimbursement bank transfer shows failed payment reference. Need help updating IFSC.'
  }
];

export const Support = () => {
  const [faqOpenIndex, setFaqOpenIndex] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [tickets, setTickets] = useState(() => {
    const saved = localStorage.getItem('gt_support_tickets');
    return saved ? JSON.parse(saved) : INITIAL_TICKETS;
  });

  // Wizard Form state
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('Expense Submission');
  const [severity, setSeverity] = useState('low');
  const [description, setDescription] = useState('');

  useEffect(() => {
    localStorage.setItem('gt_support_tickets', JSON.stringify(tickets));
  }, [tickets]);

  const toggleFaq = (index) => {
    setFaqOpenIndex(faqOpenIndex === index ? null : index);
  };

  const handleCreateTicket = (e) => {
    e.preventDefault();
    const newTicket = {
      id: `TKT-${Math.floor(10000 + Math.random() * 90000)}`,
      subject,
      category,
      severity,
      description,
      status: 'open',
      createdAt: new Date().toLocaleString()
    };
    setTickets([newTicket, ...tickets]);
    setShowCreateModal(false);
    setSubject('');
    setCategory('Expense Submission');
    setSeverity('low');
    setDescription('');
  };

  const getSeverityStyle = (sev) => {
    switch (sev) {
      case 'high': return 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 border-rose-100 dark:border-rose-900';
      case 'medium': return 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border-amber-100 dark:border-amber-900';
      default: return 'bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-350 border-slate-100 dark:border-slate-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'resolved': return <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
      case 'in_progress': return <Clock className="h-4 w-4 text-amber-500 animate-spin" />;
      default: return <Clock className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <>
      <PageHeader
        title="Help & Support"
        description="Search through frequently asked questions or raise an issue directly with the IT and finance desks."
        actions={
          <button className="btn-primary flex items-center gap-2" onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4" /> Open Support Ticket
          </button>
        }
      />

      <div className="grid gap-6 md:grid-cols-2 mt-2">
        {/* FAQs Panel */}
        <section className="panel rounded-2xl p-5 space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
            <HelpCircle className="h-5 w-5 text-brand-600" /> FAQ Help Center
          </h3>
          <div className="space-y-3">
            {FAQS.map((faq, index) => {
              const isOpen = faqOpenIndex === index;
              return (
                <div key={index} className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <button
                    onClick={() => toggleFaq(index)}
                    className="w-full flex items-center justify-between p-4 text-left font-semibold text-sm text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                  >
                    <span>{faq.q}</span>
                    {isOpen ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                  </button>
                  {isOpen && (
                    <div className="p-4 bg-slate-50/50 dark:bg-slate-900/30 border-t border-slate-150 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-450 leading-relaxed">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Tickets Tracking Panel */}
        <section className="panel rounded-2xl p-5 space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
            <LifeBuoy className="h-5 w-5 text-brand-600" /> Ticket Status Tracker
          </h3>
          <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
            {tickets.map((ticket) => (
              <div key={ticket.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">{ticket.id}</span>
                    <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-100 mt-0.5">{ticket.subject}</h4>
                  </div>
                  <div className="flex gap-2">
                    <span className={`text-[10px] uppercase font-bold border rounded-md px-1.5 py-0.5 ${getSeverityStyle(ticket.severity)}`}>
                      {ticket.severity}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                  {ticket.description}
                </p>

                <div className="flex justify-between items-center text-[10px] text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-2.5">
                  <span className="flex items-center gap-1">
                    {getStatusIcon(ticket.status)}
                    <span className="capitalize font-semibold text-slate-700 dark:text-slate-300">{ticket.status.replace('_', ' ')}</span>
                  </span>
                  <span>Raised: {ticket.createdAt}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Support Ticket Modal */}
      <Modal
        open={showCreateModal}
        title="Raise Support Ticket"
        description="Describe the issue you are facing. Our operations team will reach out directly."
        onClose={() => setShowCreateModal(false)}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
            <button
              className="btn-primary flex items-center gap-1"
              disabled={!subject || !description}
              onClick={handleCreateTicket}
            >
              <Send className="h-4 w-4" /> Send Ticket
            </button>
          </>
        }
      >
        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Category</label>
            <select
              className="input w-full"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option>Expense Submission</option>
              <option>OCR Scanning</option>
              <option>Payments</option>
              <option>Trips & Travel</option>
              <option>Policy/Violations</option>
              <option>Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Subject</label>
            <input
              className="input w-full"
              placeholder="e.g. Failure loading Axis bank verification"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Urgency</label>
            <select
              className="input w-full"
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
            >
              <option value="low">Low - General query</option>
              <option value="medium">Medium - Functional bug</option>
              <option value="high">High - Blocked transaction</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Detailed Description</label>
            <textarea
              className="input w-full min-h-24"
              placeholder="Include transaction references or error messages if applicable..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>
        </form>
      </Modal>
    </>
  );
};
