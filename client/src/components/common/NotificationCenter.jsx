import { AnimatePresence, motion } from 'framer-motion';
import { Bell, CheckCheck, CircleDollarSign, ClipboardCheck, MessageSquareText, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { http } from '../../api/http';
import { useSocket } from '../../contexts/SocketContext';
import { useToast } from '../../contexts/ToastContext';
import { useOutsideClick } from '../../hooks/useOutsideClick';

const iconMap = {
  approval: ClipboardCheck,
  expense: CircleDollarSign,
  comment: MessageSquareText,
  general: Bell
};

const timeAgo = (value) => {
  const diff = Math.max(Date.now() - new Date(value).getTime(), 0);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

const formatMoney = (amount, currency = 'INR') => {
  if (!amount) return '';
  return `${currency === 'INR' ? '₹' : currency} ${Number(amount).toLocaleString('en-IN')}`;
};

const notificationText = (notification = {}) => {
  const data = notification.data || {};
  const details = [
    data.category,
    data.merchant ? `at ${data.merchant}` : '',
    formatMoney(data.amount, data.currency),
    data.status ? String(data.status).replaceAll('_', ' ') : ''
  ].filter(Boolean);
  const title = notification.title || 'Notification';
  const message = notification.message || data.message || '';
  return details.length ? `${title}: ${details.join(' · ')}` : (message ? `${title}: ${message}` : title);
};

export const NotificationCenter = () => {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);
  const socket = useSocket();
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useOutsideClick(ref, () => setOpen(false));

  const visibleItems = useMemo(() => items.slice(0, 8), [items]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const { data } = await http.get('/notifications');
      const nextItems = Array.isArray(data) ? data : data.items || [];
      setItems(nextItems);
      setUnreadCount(Array.isArray(data) ? nextItems.filter((item) => !item.readAt && item.status !== 'read').length : data.unreadCount || 0);
      queryClient.setQueryData(['notifications'], data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  useEffect(() => {
    if (!socket) return undefined;
    const handleNotification = (notification) => {
      setItems((prev) => [notification, ...prev.filter((item) => item._id !== notification._id)].slice(0, 50));
      setUnreadCount((count) => count + 1);
      const isOwnAction = [
        'Expense submitted',
        'Expense report submitted',
        'Travel Request Submitted',
        'Shared Expense Submitted'
      ].includes(notification.title);
      
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      
      if (!isOwnAction) {
        toast.info(notificationText(notification));
      }
    };
    socket.on('notification:new', handleNotification);
    return () => socket.off('notification:new', handleNotification);
  }, [socket, toast]);

  const markRead = async (notification) => {
    if (!notification?.readAt) {
      await http.patch(`/notifications/${notification._id}/read`);
      setItems((prev) => prev.map((item) => (item._id === notification._id ? { ...item, readAt: new Date().toISOString() } : item)));
      setUnreadCount((count) => Math.max(count - 1, 0));
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  };

  const openNotification = async (notification) => {
    await markRead(notification);
    setOpen(false);
    const target = notification.actionUrl || (notification.data?.expenseId ? `/expenses/${notification.data.expenseId}` : null);
    if (target) navigate(target);
  };

  const markAllRead = async () => {
    await http.patch('/notifications/read-all');
    setItems((prev) => prev.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() })));
    setUnreadCount(0);
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  };

  const removeNotification = async (event, notification) => {
    event.stopPropagation();
    await http.delete(`/notifications/${notification._id}`);
    setItems((prev) => prev.filter((item) => item._id !== notification._id));
    if (!notification.readAt) setUnreadCount((count) => Math.max(count - 1, 0));
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  };

  return (
    <div ref={ref} className="relative">
      <button
        className="btn-secondary relative px-2"
        onClick={() => {
          setOpen((value) => !value);
          if (!open) loadNotifications();
        }}
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-white dark:ring-slate-900">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            className="absolute right-0 top-12 z-50 w-[360px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
              <div>
                <p className="text-sm font-bold text-slate-950 dark:text-white">Notifications</p>
                <p className="text-xs text-slate-500">{unreadCount ? `${unreadCount} unread updates` : 'All caught up'}</p>
              </div>
              <button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={markAllRead} title="Mark all as read">
                <CheckCheck className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[420px] overflow-y-auto p-2">
              {loading && <div className="px-3 py-8 text-center text-sm text-slate-500">Loading notifications...</div>}
              {!loading && visibleItems.length === 0 && (
                <div className="px-3 py-10 text-center">
                  <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800">
                    <Bell className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">No notifications yet</p>
                </div>
              )}
              {!loading && visibleItems.map((notification) => {
                const Icon = iconMap[notification.category] || Bell;
                return (
                  <button
                    key={notification._id}
                    className={`group mb-1 flex w-full gap-3 rounded-lg p-3 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800 ${notification.readAt ? 'opacity-75' : 'bg-brand-50/60 dark:bg-brand-950/20'}`}
                    onClick={() => openNotification(notification)}
                  >
                    <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${notification.priority === 'high' ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/50' : 'bg-slate-100 text-brand-600 dark:bg-slate-800'}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-2">
                        <span className="line-clamp-1 text-sm font-bold text-slate-900 dark:text-white">{notification.title || 'Notification'}</span>
                        {!notification.readAt && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-600" />}
                      </span>
                      <span className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600 dark:text-slate-300">{notification.message || notification.data?.message || 'A workflow update is available.'}</span>
                      <span className="mt-2 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">{timeAgo(notification.createdAt)}</span>
                    </span>
                    <span
                      role="button"
                      tabIndex={0}
                      className="rounded-md p-1 text-slate-400 opacity-0 transition hover:bg-slate-200 hover:text-slate-700 group-hover:opacity-100 dark:hover:bg-slate-700 dark:hover:text-slate-100"
                      onClick={(event) => removeNotification(event, notification)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') removeNotification(event, notification);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </span>
                  </button>
                );
              })}
            </div>

            <button className="flex w-full items-center justify-center gap-2 border-t border-slate-100 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800" onClick={() => setOpen(false)}>
              <X className="h-3.5 w-3.5" /> Close
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
