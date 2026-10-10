import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckSquare,
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
  Trash2,
  Edit2,
  ExternalLink,
  CheckCircle2,
  Circle,
  Clock3,
  AlertCircle
} from 'lucide-react';
import TaskModal from '../components/TaskModal';
import EmptyState from '../components/EmptyState';
import { ActionListSkeleton } from '../components/LoadingSkeleton';
import { useToast } from '../context/ToastContext';
import { getPriorityStyle, getStatusStyle } from '../utils/formatters';
import api from '../services/api';

const ActionCenterPage = () => {
  const { addToast } = useToast();

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [search, setSearch] = useState('');

  const [counts, setCounts] = useState({
    total: 0,
    pending_count: 0,
    in_progress_count: 0,
    completed_count: 0,
  });

  // Task Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        sort_by: sortBy,
      };
      if (statusFilter !== 'all') params.status_filter = statusFilter;
      if (priorityFilter !== 'all') params.priority_filter = priorityFilter;
      if (search.trim()) params.search = search.trim();

      const resp = await api.get('/actions', { params });
      setTasks(resp.data.tasks);
      setCounts({
        total: resp.data.total,
        pending_count: resp.data.pending_count,
        in_progress_count: resp.data.in_progress_count,
        completed_count: resp.data.completed_count,
      });
    } catch (err) {
      addToast('Failed to load action items.', 'error');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter, sortBy, search, addToast]);

  useEffect(() => {
    fetchTasks();

    const handleSynced = () => fetchTasks();
    window.addEventListener('inbox-synced', handleSynced);
    return () => window.removeEventListener('inbox-synced', handleSynced);
  }, [fetchTasks]);

  const handleSaveTask = async (taskData) => {
    if (taskData.id) {
      // Update
      await api.patch(`/actions/${taskData.id}`, taskData);
      addToast('Action item updated!', 'success');
    } else {
      // Create
      await api.post('/actions', taskData);
      addToast('New action item created!', 'success');
    }
    window.dispatchEvent(new CustomEvent('inbox-synced'));
    fetchTasks();
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await api.patch(`/actions/${taskId}`, { status: newStatus });
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
      );
      addToast(`Status updated to ${newStatus.replace('_', ' ')}`, 'info');
      window.dispatchEvent(new CustomEvent('inbox-synced'));
      fetchTasks();
    } catch (err) {
      addToast('Failed to update task status.', 'error');
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (window.confirm('Delete this action item?')) {
      try {
        await api.delete(`/actions/${taskId}`);
        addToast('Action item removed.', 'info');
        window.dispatchEvent(new CustomEvent('inbox-synced'));
        fetchTasks();
      } catch (err) {
        addToast('Failed to delete action item.', 'error');
      }
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in max-w-6xl mx-auto pb-12">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search action items or related emails..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40 shadow-soft"
          />
        </div>

        {/* New Action Button */}
        <button
          onClick={() => {
            setEditingTask(null);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold shadow-sm transition-all hover:shadow-primary-500/25 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Action Item</span>
        </button>
      </div>

      {/* Filter and Sort Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-soft">
        {/* Status Filters */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'all', label: 'All', count: counts.total },
            { id: 'pending', label: 'Pending', count: counts.pending_count },
            { id: 'in_progress', label: 'In Progress', count: counts.in_progress_count },
            { id: 'completed', label: 'Completed', count: counts.completed_count },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 border ${
                statusFilter === tab.id
                  ? 'bg-primary-600 border-primary-600 text-white shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${statusFilter === tab.id ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-700'}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Priority Filter & Sort Selector */}
        <div className="flex items-center gap-3">
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="all">All Priorities</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="created_at">Sort by Created</option>
            <option value="due_date">Sort by Due Date</option>
            <option value="priority">Sort by Priority</option>
          </select>
        </div>
      </div>

      {/* Task List */}
      {loading ? (
        <ActionListSkeleton />
      ) : tasks.length > 0 ? (
        <div className="space-y-3">
          {tasks.map((task) => {
            const priorityStyle = getPriorityStyle(task.priority);
            const statusStyle = getStatusStyle(task.status);
            const isDone = task.status === 'completed';

            return (
              <div
                key={task.id}
                className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  isDone
                    ? 'bg-slate-50/50 dark:bg-slate-900/30 border-slate-200/60 dark:border-slate-800/60 opacity-80'
                    : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-soft hover:shadow-soft-lg'
                }`}
              >
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  {/* Status Toggle Icon */}
                  <button
                    onClick={() =>
                      handleStatusChange(
                        task.id,
                        task.status === 'completed'
                          ? 'pending'
                          : task.status === 'pending'
                          ? 'in_progress'
                          : 'completed'
                      )
                    }
                    className="mt-0.5 shrink-0 text-slate-400 hover:text-primary-600 transition-colors"
                    title={`Click to cycle status (Current: ${task.status})`}
                  >
                    {task.status === 'completed' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    ) : task.status === 'in_progress' ? (
                      <Clock3 className="w-5 h-5 text-blue-500 animate-pulse" />
                    ) : (
                      <Circle className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                    )}
                  </button>

                  {/* Task Details */}
                  <div className="space-y-1 flex-1 min-w-0">
                    <h4
                      className={`text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-tight ${
                        isDone ? 'line-through text-slate-400 dark:text-slate-500' : ''
                      }`}
                    >
                      {task.title}
                    </h4>

                    {task.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                        {task.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
                      {/* Due Date Indicator */}
                      <span className="flex items-center gap-1 font-medium text-slate-600 dark:text-slate-400">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {task.due_date ? `Due: ${task.due_date}` : 'No deadline detected'}
                      </span>

                      {/* Linked Email Reference */}
                      {task.email_id && (
                        <Link
                          to={`/emails/${task.email_id}`}
                          className="inline-flex items-center gap-1 text-primary-600 dark:text-primary-400 hover:underline font-medium truncate max-w-xs"
                        >
                          <ExternalLink className="w-3 h-3 shrink-0" />
                          <span className="truncate">{task.email_subject || 'Source Email'}</span>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Badges & Controls */}
                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                  {/* Status Badge */}
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
                  >
                    {statusStyle.label}
                  </span>

                  {/* Priority Badge */}
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${priorityStyle.bg} ${priorityStyle.text} ${priorityStyle.border}`}
                  >
                    {priorityStyle.label}
                  </span>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingTask(task);
                        setIsModalOpen(true);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                      title="Edit Action"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                      title="Delete Action"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-center shadow-soft">
          <EmptyState
            icon={CheckSquare}
            title={search ? 'No matching action items' : 'No action items yet'}
            description={
              search
                ? `No action items matching "${search}".`
                : 'Action items automatically populate when AI summarizes your emails, or you can create one manually.'
            }
            actionLabel="Create Action Item"
            onAction={() => {
              setEditingTask(null);
              setIsModalOpen(true);
            }}
          />
        </div>
      )}

      {/* Task Edit/Create Modal */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTask}
        task={editingTask}
      />
    </div>
  );
};

export default ActionCenterPage;
