import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import TaskModal from '../components/TaskModal';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';

const routeMeta = {
  '/dashboard': { title: 'Dashboard', subtitle: 'Overview of incoming messages and AI-extracted tasks' },
  '/inbox': { title: 'Unified Inbox', subtitle: 'AI-analyzed emails and executive summaries' },
  '/actions': { title: 'Action Center', subtitle: 'Manage deadlines, commitments, and extracted tasks' },
  '/settings': { title: 'Settings', subtitle: 'Account preferences, Gmail integration, and AI parameters' },
};

const AppLayout = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingTasksCount, setPendingTasksCount] = useState(0);

  const { isAuthenticated, loading } = useAuth();
  const { addToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, loading, navigate]);

  const fetchBadgeCounts = async () => {
    if (!isAuthenticated) return;
    try {
      const [emailsRes, tasksRes] = await Promise.all([
        api.get('/emails?page=1&page_size=1'),
        api.get('/actions?status_filter=pending')
      ]);
      setUnreadCount(emailsRes.data.unread_count || 0);
      setPendingTasksCount(tasksRes.data.pending_count || 0);
    } catch (e) {
      // Ignore count fetch errors
    }
  };

  useEffect(() => {
    fetchBadgeCounts();

    const handleSynced = () => {
      fetchBadgeCounts();
    };

    window.addEventListener('inbox-synced', handleSynced);
    return () => window.removeEventListener('inbox-synced', handleSynced);
  }, [isAuthenticated]);

  const handleCreateTask = async (taskData) => {
    await api.post('/actions', taskData);
    addToast('Action item created successfully!', 'success');
    fetchBadgeCounts();
    window.dispatchEvent(new CustomEvent('inbox-synced'));
  };

  const currentMeta = routeMeta[location.pathname] || {
    title: location.pathname.startsWith('/emails/') ? 'Email Insights' : 'AI Email Summarizer',
    subtitle: 'Deep-dive AI analysis and suggested reply generator'
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fdfcfb] dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-500">Loading your inbox...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[#fdfcfb] dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex shrink-0">
        <Sidebar
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
          unreadCount={unreadCount}
          pendingTasksCount={pendingTasksCount}
        />
      </div>

      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 transform transition-transform duration-300 md:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar
          isCollapsed={false}
          setIsCollapsed={() => setMobileOpen(false)}
          unreadCount={unreadCount}
          pendingTasksCount={pendingTasksCount}
        />
      </div>

      {/* Main Page Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          title={currentMeta.title}
          subtitle={currentMeta.subtitle}
          onOpenNewTask={() => setIsTaskModalOpen(true)}
          onMobileMenuToggle={() => setMobileOpen(true)}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Global Task Creation Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSave={handleCreateTask}
      />
    </div>
  );
};

export default AppLayout;
