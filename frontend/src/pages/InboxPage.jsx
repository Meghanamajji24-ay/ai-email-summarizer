import React, { useState, useEffect, useCallback } from 'react';
import {
  Inbox,
  Search,
  RefreshCw,
  Filter,
  Flame,
  CheckSquare,
  Mail,
  MailOpen,
  ChevronLeft,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import EmailCard from '../components/EmailCard';
import EmptyState from '../components/EmptyState';
import { EmailCardSkeleton } from '../components/LoadingSkeleton';
import { useToast } from '../context/ToastContext';
import api from '../services/api';

const InboxPage = () => {
  const { addToast } = useToast();

  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState('');
  const [filterBy, setFilterBy] = useState('all'); // all, unread, high_priority, needs_action
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pagination, setPagination] = useState({
    total: 0,
    total_pages: 1,
    unread_count: 0,
    high_priority_count: 0,
  });

  const fetchEmails = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page,
        page_size: pageSize,
        filter_by: filterBy,
      };
      if (search.trim()) {
        params.search = search.trim();
      }

      const resp = await api.get('/emails', { params });
      setEmails(resp.data.emails);
      setPagination({
        total: resp.data.total,
        total_pages: resp.data.total_pages,
        unread_count: resp.data.unread_count,
        high_priority_count: resp.data.high_priority_count,
      });
    } catch (err) {
      addToast('Failed to load emails.', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filterBy, search, addToast]);

  useEffect(() => {
    fetchEmails();

    const handleSynced = () => fetchEmails();
    window.addEventListener('inbox-synced', handleSynced);
    return () => window.removeEventListener('inbox-synced', handleSynced);
  }, [fetchEmails]);

  const handleSync = async () => {
    try {
      setSyncing(true);
      const resp = await api.post('/gmail/sync');
      addToast(resp.data.message || 'Inbox synchronized successfully!', 'success');
      window.dispatchEvent(new CustomEvent('inbox-synced'));
      await fetchEmails();
    } catch (err) {
      addToast(err.response?.data?.detail || 'Sync failed.', 'error');
    } finally {
      setSyncing(false);
    }
  };

  const handleToggleRead = async (emailId, isRead) => {
    try {
      await api.patch(`/emails/${emailId}/read-status?is_read=${isRead}`);
      setEmails((prev) =>
        prev.map((em) => (em.id === emailId ? { ...em, is_read: isRead } : em))
      );
      window.dispatchEvent(new CustomEvent('inbox-synced'));
    } catch (err) {
      addToast('Failed to update read status.', 'error');
    }
  };

  const filterTabs = [
    { id: 'all', label: 'All Messages', count: pagination.total },
    { id: 'unread', label: 'Unread', count: pagination.unread_count },
    { id: 'high_priority', label: 'High Priority', count: pagination.high_priority_count },
    { id: 'needs_action', label: 'Needs Action' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Top Controls: Search Bar & Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by sender, subject, or keywords..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40 shadow-soft"
          />
        </div>

        {/* Sync / Refresh Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold shadow-sm transition-all hover:shadow-primary-500/25 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Syncing...' : 'Sync Gmail'}</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {filterTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setFilterBy(tab.id);
              setPage(1);
            }}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-2 border ${
              filterBy === tab.id
                ? 'bg-primary-600 border-primary-600 text-white shadow-sm shadow-primary-500/25'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  filterBy === tab.id
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Email List Container */}
      {loading ? (
        <div className="space-y-3">
          <EmailCardSkeleton />
          <EmailCardSkeleton />
          <EmailCardSkeleton />
          <EmailCardSkeleton />
        </div>
      ) : emails.length > 0 ? (
        <div className="space-y-3">
          {emails.map((email) => (
            <EmailCard key={email.id} email={email} onToggleRead={handleToggleRead} />
          ))}

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-soft mt-6">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Showing page <span className="font-bold text-slate-900 dark:text-white">{page}</span> of{' '}
              <span className="font-bold text-slate-900 dark:text-white">{pagination.total_pages}</span> ({pagination.total} total emails)
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="px-3 py-1 text-xs font-bold rounded-lg bg-primary-50 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300">
                {page}
              </span>

              <button
                onClick={() => setPage((p) => Math.min(pagination.total_pages, p + 1))}
                disabled={page >= pagination.total_pages}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-center shadow-soft">
          <EmptyState
            icon={Inbox}
            title={search ? 'No matching emails found' : 'Your inbox is empty'}
            description={
              search
                ? `No emails found matching "${search}". Try clearing your search or filter.`
                : 'Click "Sync Gmail" to retrieve your latest emails or populate demo workplace messages.'
            }
            actionLabel="Sync Gmail Now"
            onAction={handleSync}
            secondaryLabel={search ? 'Clear Search' : null}
            onSecondaryAction={() => setSearch('')}
          />
        </div>
      )}
    </div>
  );
};

export default InboxPage;
