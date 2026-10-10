import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Mail,
  CheckSquare,
  Flame,
  Clock,
  RefreshCw,
  Sparkles,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Inbox,
  CheckCircle2,
  Calendar,
  Zap
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell
} from 'recharts';
import StatCard from '../components/StatCard';
import EmailCard from '../components/EmailCard';
import EmptyState from '../components/EmptyState';
import { StatCardSkeleton, EmailCardSkeleton } from '../components/LoadingSkeleton';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatDate, formatTimeAgo, getPriorityStyle } from '../utils/formatters';
import api from '../services/api';

const DashboardPage = () => {
  const { user, refreshUser } = useAuth();
  const { addToast } = useToast();

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const resp = await api.get('/dashboard/stats');
      setStats(resp.data);
    } catch (err) {
      addToast('Failed to load dashboard metrics.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();

    const handleSynced = () => fetchStats();
    window.addEventListener('inbox-synced', handleSynced);
    return () => window.removeEventListener('inbox-synced', handleSynced);
  }, []);

  const handleSync = async () => {
    try {
      setSyncing(true);
      const resp = await api.post('/gmail/sync');
      addToast(resp.data.message || 'Synchronization complete!', 'success');
      await refreshUser();
      await fetchStats();
    } catch (err) {
      addToast(err.response?.data?.detail || 'Sync failed.', 'error');
    } finally {
      setSyncing(false);
    }
  };

  const handleToggleTaskStatus = async (taskId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
      await api.patch(`/actions/${taskId}`, { status: newStatus });
      addToast(`Task marked as ${newStatus}!`, 'success');
      await fetchStats();
      window.dispatchEvent(new CustomEvent('inbox-synced'));
    } catch (e) {
      addToast('Failed to update task status.', 'error');
    }
  };

  // Time-aware greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const priorityChartData = [
    { name: 'High', count: stats?.priority_distribution?.high || 0, color: '#f43f5e' },
    { name: 'Medium', count: stats?.priority_distribution?.medium || 0, color: '#f59e0b' },
    { name: 'Low', count: stats?.priority_distribution?.low || 0, color: '#10b981' },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <EmailCardSkeleton />
            <EmailCardSkeleton />
          </div>
          <div className="space-y-4">
            <StatCardSkeleton />
          </div>
        </div>
      </div>
    );
  }

  const hasEmails = stats && stats.total_emails_processed > 0;

  return (
    <div className="space-y-8 animate-in fade-in">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-primary-600 via-brand-600 to-indigo-700 text-white shadow-soft-lg relative overflow-hidden">
        {/* Glow decoration */}
        <div className="absolute right-0 top-0 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-2 relative z-10">
          <div className="flex items-center gap-2 text-xs font-semibold text-primary-200">
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>AI Executive Briefing</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {getGreeting()}, {stats?.user_name || user?.name || 'there'}!
          </h2>
          <p className="text-xs sm:text-sm text-primary-100 max-w-xl leading-relaxed">
            {hasEmails
              ? `You have ${stats?.unread_emails_count} unread emails and ${stats?.high_priority_count} high-priority items requiring your attention today.`
              : 'Your inbox is connected. Sync your email or load demo messages to see automated AI summaries.'}
          </p>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white text-primary-700 hover:bg-primary-50 text-xs sm:text-sm font-bold shadow-md transition-all transform hover:-translate-y-0.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-primary-600 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Syncing Messages...' : 'Sync Inbox'}</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          title="Emails Processed"
          value={stats?.total_emails_processed || 0}
          icon={Mail}
          color="indigo"
          change="Real-time AI ingested"
          changeType="positive"
        />
        <StatCard
          title="Unread Messages"
          value={stats?.unread_emails_count || 0}
          icon={Inbox}
          color="rose"
          change={stats?.unread_emails_count === 0 ? 'Inbox Zero' : 'Requires review'}
          changeType={stats?.unread_emails_count === 0 ? 'positive' : 'neutral'}
        />
        <StatCard
          title="High Priority"
          value={stats?.high_priority_count || 0}
          icon={Flame}
          color="amber"
          change="Urgent & time-sensitive"
          changeType="neutral"
        />
        <StatCard
          title="Pending Actions"
          value={stats?.pending_tasks_count || 0}
          icon={CheckSquare}
          color="blue"
          change="Extracted deliverables"
          changeType="positive"
        />
      </div>

      {/* Main Content Grid: Recent Emails + Priority Chart / Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 Cols): Recent Summarized Emails */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Recent Email Summaries
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Latest AI-analyzed communications
              </p>
            </div>
            <Link
              to="/inbox"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-primary-600 hover:text-primary-700 dark:text-primary-400"
            >
              <span>View All Inbox</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {stats?.recent_emails && stats.recent_emails.length > 0 ? (
            <div className="space-y-3">
              {stats.recent_emails.map((email) => (
                <EmailCard key={email.id} email={email} />
              ))}
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-center">
              <EmptyState
                icon={Mail}
                title="No emails analyzed yet"
                description="Click 'Sync Inbox' to synchronize your Gmail account or load our prebuilt demo emails."
                actionLabel="Sync Inbox Now"
                onAction={handleSync}
              />
            </div>
          )}
        </div>

        {/* Right Column (1 Col): Priority Distribution Chart & Pending Tasks */}
        <div className="space-y-6">
          {/* Priority Distribution Chart */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-soft space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Priority Distribution
              </h4>
              <span className="text-[11px] font-semibold text-slate-400">
                Active Queue
              </span>
            </div>

            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={priorityChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderRadius: '0.75rem',
                      border: 'none',
                      color: '#ffffff',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {priorityChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pending Action Items Quick List */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-soft space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Action Items
                </h4>
                <span className="text-[11px] text-slate-400">
                  {stats?.pending_tasks_count || 0} tasks pending
                </span>
              </div>
              <Link
                to="/actions"
                className="text-xs font-bold text-primary-600 hover:text-primary-700 dark:text-primary-400"
              >
                View All
              </Link>
            </div>

            {stats?.pending_tasks && stats.pending_tasks.length > 0 ? (
              <div className="space-y-2.5">
                {stats.pending_tasks.slice(0, 4).map((task) => (
                  <div
                    key={task.id}
                    className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-start justify-between gap-3 group hover:border-primary-200 transition-colors"
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <button
                        onClick={() => handleToggleTaskStatus(task.id, task.status)}
                        className="mt-0.5 w-4 h-4 rounded border border-slate-300 dark:border-slate-600 flex items-center justify-center hover:border-primary-500 hover:bg-primary-50 transition-colors shrink-0"
                      >
                        {task.status === 'completed' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                      </button>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">
                          {task.title}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">
                          {task.due_date ? `Due: ${task.due_date}` : 'No deadline detected'}
                        </p>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 border ${getPriorityStyle(task.priority).bg} ${getPriorityStyle(task.priority).text} ${getPriorityStyle(task.priority).border}`}>
                      {task.priority}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 text-center py-4">
                No pending tasks at the moment!
              </p>
            )}
          </div>

          {/* Activity Feed */}
          {stats?.recent_activities && stats.recent_activities.length > 0 && (
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-soft space-y-4">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Recent Activity
              </h4>
              <div className="space-y-3">
                {stats.recent_activities.map((act) => (
                  <div key={act.id} className="flex items-start gap-3 text-xs">
                    <div className="w-2 h-2 rounded-full bg-primary-500 mt-1.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {act.title}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {act.description}
                      </p>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      {formatTimeAgo(act.timestamp)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
