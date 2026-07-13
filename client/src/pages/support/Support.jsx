import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { CheckCircle2, ChevronDown, ChevronUp, Clock, HelpCircle, LifeBuoy, Plus, Send } from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { PageHeader } from '../../components/common/PageHeader';
import { api } from '../../services/platform.service';

const formatDate = (value) => (value ? new Date(value).toLocaleString() : '-');

const statusLabel = (status = '') => status.replaceAll('_', ' ');

export const Support = () => {
  const queryClient = useQueryClient();
  const user = useSelector((state) => state.auth.user);
  const [faqOpenIndex, setFaqOpenIndex] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('');
  const [severity, setSeverity] = useState('low');
  const [description, setDescription] = useState('');

  const canManageTickets = ['manager', 'finance', 'cfo', 'company_admin', 'super_admin'].includes(user?.role);

  const { data: options = {} } = useQuery({ queryKey: ['supportOptions'], queryFn: api.supportOptions });
  const { data: faqs = [], isLoading: faqsLoading } = useQuery({ queryKey: ['supportFaqs'], queryFn: api.supportFaqs });
  const { data: tickets = [], isLoading: ticketsLoading } = useQuery({ queryKey: ['supportTickets'], queryFn: api.supportTickets });

  const categoryOptions = options.categories || [];
  const severityOptions = options.severities || [];

  useEffect(() => {
    if (!category && categoryOptions.length) setCategory(categoryOptions[0]);
  }, [category, categoryOptions]);

  const createTicket = useMutation({
    mutationFn: (payload) => api.createSupportTicket(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supportTickets'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      setShowCreateModal(false);
      setSubject('');
      setCategory(categoryOptions[0] || '');
      setSeverity('low');
      setDescription('');
    }
  });

  const updateTicket = useMutation({
    mutationFn: ({ id, payload }) => api.updateSupportTicket(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supportTickets'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const ticketStats = useMemo(() => {
    const open = tickets.filter((ticket) => ['open', 'in_progress'].includes(ticket.status)).length;
    const resolved = tickets.filter((ticket) => ['resolved', 'closed'].includes(ticket.status)).length;
    return { open, resolved };
  }, [tickets]);

  const toggleFaq = (index) => {
    setFaqOpenIndex(faqOpenIndex === index ? null : index);
  };

  const handleCreateTicket = (e) => {
    e.preventDefault();
    createTicket.mutate({ category, subject, severity, description });
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
      case 'resolved':
      case 'closed':
        return <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-amber-500" />;
      default:
        return <Clock className="h-4 w-4 text-blue-500" />;
    }
  };

  const nextStatus = (status) => {
    if (status === 'open') return 'in_progress';
    if (status === 'in_progress') return 'resolved';
    if (status === 'resolved') return 'closed';
    return null;
  };

  const nextStatusLabel = (status) => {
    if (status === 'open') return 'Start Work';
    if (status === 'in_progress') return 'Resolve';
    if (status === 'resolved') return 'Close';
    return '';
  };

  return (
    <>
      <PageHeader
        title="Help & Support"
        description="Raise operational tickets and track live responses from manager, finance, and admin desks."
        actions={
          <button className="btn-primary flex items-center gap-2" onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4" /> Open Support Ticket
          </button>
        }
      />

      <div className="mb-5 grid gap-4 md:grid-cols-3">
        <div className="panel rounded-lg p-4">
          <p className="text-xs font-semibold uppercase text-slate-400">Visible Tickets</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{tickets.length}</p>
        </div>
        <div className="panel rounded-lg p-4">
          <p className="text-xs font-semibold uppercase text-slate-400">Open Queue</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{ticketStats.open}</p>
        </div>
        <div className="panel rounded-lg p-4">
          <p className="text-xs font-semibold uppercase text-slate-400">Resolved</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{ticketStats.resolved}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="panel rounded-lg p-5 space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
            <HelpCircle className="h-5 w-5 text-brand-600" /> FAQ Help Center
          </h3>
          <div className="space-y-3">
            {faqsLoading && <div className="text-sm text-slate-400 py-6 text-center">Loading help articles...</div>}
            {!faqsLoading && !faqs.length && <div className="text-sm text-slate-400 py-6 text-center">No help articles configured.</div>}
            {faqs.map((faq, index) => {
              const isOpen = faqOpenIndex === index;
              return (
                <div key={faq.id || faq.question} className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <button
                    onClick={() => toggleFaq(index)}
                    className="w-full flex items-center justify-between p-4 text-left font-semibold text-sm text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                  >
                    <span>{faq.question}</span>
                    {isOpen ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                  </button>
                  {isOpen && (
                    <div className="p-4 bg-slate-50/50 dark:bg-slate-900/30 border-t border-slate-150 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-450 leading-relaxed">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section className="panel rounded-lg p-5 space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
            <LifeBuoy className="h-5 w-5 text-brand-600" /> Ticket Status Tracker
          </h3>
          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
            {ticketsLoading && <div className="text-sm text-slate-400 py-6 text-center">Loading tickets...</div>}
            {!ticketsLoading && !tickets.length && <div className="text-sm text-slate-400 py-6 text-center">No support tickets yet.</div>}
            {tickets.map((ticket) => {
              const actionStatus = canManageTickets ? nextStatus(ticket.status) : null;
              return (
                <div key={ticket._id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3">
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">{ticket.ticketNo}</span>
                      <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-100 mt-0.5">{ticket.subject}</h4>
                      <p className="text-[11px] text-slate-400 mt-1">
                        {ticket.employeeId?.name || 'Employee'} - {ticket.category} - Routed to {ticket.assignedRole?.replace('_', ' ')}
                      </p>
                    </div>
                    <span className={`text-[10px] uppercase font-bold border rounded-md px-1.5 py-0.5 ${getSeverityStyle(ticket.severity)}`}>
                      {ticket.severity}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">{ticket.description}</p>

                  <div className="flex flex-wrap justify-between items-center gap-3 text-[10px] text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-2.5">
                    <span className="flex items-center gap-1">
                      {getStatusIcon(ticket.status)}
                      <span className="capitalize font-semibold text-slate-700 dark:text-slate-300">{statusLabel(ticket.status)}</span>
                    </span>
                    <span>Raised: {formatDate(ticket.createdAt)}</span>
                    {actionStatus && (
                      <button
                        className="btn-secondary px-3 py-1 text-xs"
                        disabled={updateTicket.isPending}
                        onClick={() => updateTicket.mutate({ id: ticket._id, payload: { status: actionStatus } })}
                      >
                        {nextStatusLabel(ticket.status)}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <Modal
        open={showCreateModal}
        title="Raise Support Ticket"
        description="Describe the issue you are facing. It will be routed automatically to the right desk."
        onClose={() => setShowCreateModal(false)}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
            <button
              className="btn-primary flex items-center gap-1"
              disabled={!subject || !description || !category || createTicket.isPending}
              onClick={handleCreateTicket}
            >
              <Send className="h-4 w-4" /> {createTicket.isPending ? 'Sending...' : 'Send Ticket'}
            </button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={handleCreateTicket}>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Category</label>
            <select className="input w-full" value={category} onChange={(e) => setCategory(e.target.value)}>
              {categoryOptions.map((option) => <option key={option}>{option}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Subject</label>
            <input className="input w-full" placeholder="Short issue title" value={subject} onChange={(e) => setSubject(e.target.value)} required />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Urgency</label>
            <select className="input w-full" value={severity} onChange={(e) => setSeverity(e.target.value)}>
              {severityOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Detailed Description</label>
            <textarea
              className="input w-full min-h-24"
              placeholder="Include report, expense, trip, or payment references if applicable."
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
