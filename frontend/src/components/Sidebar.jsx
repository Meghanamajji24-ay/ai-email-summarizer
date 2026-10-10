import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Inbox,
  CheckSquare,
  Settings,
  RefreshCw,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Mail,
  Shield,
  Sparkles,
  Zap
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';

const Sidebar = ({ isCollapsed, setIsCollapsed, unreadCount = 0, pendingTasksCount = 0 }) => {
  const { user, logout, refreshUser } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    try {
      setSyncing(true);
      const resp = await api.post('/gmail/sync');
      addToast(resp.data.message || 'Inbox synchronized successfully!', 'success');
      await refreshUser();
      // Dispatch custom event to notify Inbox & Dashboard to re-fetch
      window.dispatchEvent(new CustomEvent('inbox-synced'));
    } catch (err) {
      addToast(err.response?.data?.detail || 'Email synchronization failed.', 'error');
    } finally {
      setSyncing(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    addToast('Signed out successfully.', 'info');
    navigate('/login');
  };

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/inbox', label: 'Inbox', icon: Inbox, badge: unreadCount > 0 ? unreadCount : null, badgeColor: 'bg-primary-500' },
    { to: '/actions', label: 'Action Center', icon: CheckSquare, badge: pendingTasksCount > 0 ? pendingTasksCount : null, badgeColor: 'bg-amber-500' },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside
      className={`relative flex flex-col border-r border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md transition-all duration-300 z-30 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100 dark:border-slate-800/60">
        <NavLink to="/dashboard" className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-tr from-primary-600 via-brand-600 to-accent-500 flex items-center justify-center shadow-md shadow-primary-500/20">
            <Mail className="w-5 h-5 text-white" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="font-bold text-sm leading-tight text-slate-900 dark:text-white">
                AI Email
              </span>
              <span className="text-[11px] font-semibold text-primary-600 dark:text-primary-400">
                Summarizer
              </span>
            </div>
          )}
        </NavLink>

        {/* Collapse toggle button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Gmail Status & Quick Sync Card */}
      {!isCollapsed ? (
        <div className="p-4 border-b border-slate-100 dark:border-slate-800/60">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
                <span className={`w-2 h-2 rounded-full ${user?.is_gmail_connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
                <span>{user?.is_gmail_connected ? 'Gmail Connected' : 'Demo Account'}</span>
              </div>
              <button
                onClick={handleSync}
                disabled={syncing}
                title="Sync inbox now"
                className="p-1 rounded-lg text-primary-600 hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {user?.gmail_account || 'demo.user@gmail.com'}
            </p>
          </div>
        </div>
      ) : (
        <div className="p-3 flex justify-center border-b border-slate-100 dark:border-slate-800/60">
          <button
            onClick={handleSync}
            disabled={syncing}
            title="Sync inbox now"
            className="p-2.5 rounded-xl bg-primary-50 dark:bg-slate-800 text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      )}

      {/* Main Navigation Links */}
      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-primary-500 text-white shadow-sm shadow-primary-500/30 dark:bg-primary-600'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
              } ${isCollapsed ? 'justify-center' : ''}`
            }
            title={isCollapsed ? item.label : undefined}
          >
            <item.icon className="w-5 h-5 shrink-0" />
            {!isCollapsed && <span className="flex-1">{item.label}</span>}
            {!isCollapsed && item.badge !== null && (
              <span className={`px-2 py-0.5 text-[11px] font-bold text-white rounded-full ${item.badgeColor}`}>
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User Footer Profile */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800/60">
        <div className={`flex items-center gap-3 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 ${isCollapsed ? 'justify-center' : ''}`}>
          <div className="w-9 h-9 shrink-0 rounded-full bg-gradient-to-tr from-primary-500 to-brand-500 text-white font-bold text-sm flex items-center justify-center shadow-sm">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
                {user?.name || 'User'}
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                {user?.email || 'user@example.com'}
              </p>
            </div>
          )}
          {!isCollapsed && (
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
