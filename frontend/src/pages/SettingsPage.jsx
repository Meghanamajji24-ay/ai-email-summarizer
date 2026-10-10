import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Lock,
  Mail,
  Sliders,
  Download,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  Moon,
  Sun,
  Laptop
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';

const SettingsPage = () => {
  const { user, logout, refreshUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('profile'); // profile, security, gmail, preferences, data

  // Settings State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [summaryLength, setSummaryLength] = useState('standard');
  const [autoExtractTasks, setAutoExtractTasks] = useState(true);
  const [defaultPriority, setDefaultPriority] = useState('medium');
  const [syncFreq, setSyncFreq] = useState(15);
  const [syncLimit, setSyncLimit] = useState(50);

  // Gmail status state
  const [gmailStatus, setGmailStatus] = useState(null);
  const [gmailLoading, setGmailLoading] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);

  // Delete account modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const [settingsRes, gmailRes] = await Promise.all([
        api.get('/settings'),
        api.get('/gmail/status')
      ]);

      const s = settingsRes.data;
      setName(s.name || '');
      setEmail(s.email || '');
      setSummaryLength(s.summary_length || 'standard');
      setAutoExtractTasks(s.auto_extract_tasks ?? true);
      setDefaultPriority(s.default_priority_threshold || 'medium');
      setSyncFreq(s.sync_frequency_minutes || 15);
      setSyncLimit(s.sync_limit || 50);

      setGmailStatus(gmailRes.data);
    } catch (err) {
      addToast('Failed to load settings.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.patch('/settings', { name: name.trim() });
      await refreshUser();
      addToast('Profile updated successfully!', 'success');
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to update profile.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePreferences = async () => {
    try {
      setSaving(true);
      await api.patch('/settings', {
        summary_length: summaryLength,
        auto_extract_tasks: autoExtractTasks,
        default_priority_threshold: defaultPriority,
        sync_frequency_minutes: syncFreq,
        sync_limit: syncLimit,
        theme: theme,
      });
      addToast('Preferences saved successfully!', 'success');
    } catch (err) {
      addToast('Failed to save preferences.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      addToast('New passwords do not match.', 'error');
      return;
    }
    try {
      setPwdLoading(true);
      await api.post('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      addToast('Password updated successfully!', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to change password.', 'error');
    } finally {
      setPwdLoading(false);
    }
  };

  const handleConnectGmail = async () => {
    try {
      setGmailLoading(true);
      const resp = await api.get('/gmail/connect');
      if (resp.data.oauth_url) {
        window.location.href = resp.data.oauth_url;
      } else {
        // Fallback or demo connect
        await api.post('/gmail/demo-connect');
        addToast('Demo Gmail account connected with realistic sample emails!', 'success');
        await fetchSettings();
        await refreshUser();
      }
    } catch (err) {
      addToast('Failed to connect Gmail.', 'error');
    } finally {
      setGmailLoading(false);
    }
  };

  const handleDisconnectGmail = async () => {
    if (window.confirm('Disconnect your Gmail account? Stored tokens will be revoked. Synced emails in your app will remain.')) {
      try {
        setGmailLoading(true);
        await api.post('/gmail/disconnect');
        addToast('Gmail disconnected successfully.', 'info');
        await fetchSettings();
        await refreshUser();
      } catch (err) {
        addToast('Failed to disconnect Gmail.', 'error');
      } finally {
        setGmailLoading(false);
      }
    }
  };

  const handleExportData = async () => {
    try {
      const resp = await api.post('/settings/export-data');
      const blob = new Blob([JSON.stringify(resp.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ai_email_export_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addToast('Data backup exported successfully!', 'success');
    } catch (err) {
      addToast('Failed to export data.', 'error');
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      addToast('Please type DELETE to confirm account deletion.', 'warning');
      return;
    }
    try {
      setDeletingAccount(true);
      await api.delete('/api/account');
      addToast('Your account and all associated data have been permanently deleted.', 'info');
      await logout();
      navigate('/login');
    } catch (err) {
      addToast('Failed to delete account.', 'error');
    } finally {
      setDeletingAccount(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile Information', icon: User },
    { id: 'security', label: 'Security & Password', icon: Lock },
    { id: 'gmail', label: 'Gmail Integration', icon: Mail },
    { id: 'preferences', label: 'AI & Sync Settings', icon: Sliders },
    { id: 'data', label: 'Data & Privacy', icon: Download },
  ];

  return (
    <div className="space-y-6 animate-in fade-in max-w-5xl mx-auto pb-16">
      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-800">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-primary-600 text-white shadow-sm shadow-primary-500/25'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* TAB 1: PROFILE */}
      {activeTab === 'profile' && (
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 shadow-soft space-y-6 animate-in fade-in">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Profile Information
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Update your account details and display name
            </p>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4 max-w-lg">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-500 text-sm cursor-not-allowed"
              />
              <p className="mt-1 text-[11px] text-slate-400">Email cannot be changed directly.</p>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </form>
        </div>
      )}

      {/* TAB 2: SECURITY */}
      {activeTab === 'security' && (
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 shadow-soft space-y-6 animate-in fade-in">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Change Password
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Ensure your account is using a secure, unique password
            </p>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4 max-w-lg">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Current Password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min. 8 characters"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                required
              />
            </div>

            <button
              type="submit"
              disabled={pwdLoading}
              className="px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50"
            >
              {pwdLoading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: GMAIL INTEGRATION */}
      {activeTab === 'gmail' && (
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 shadow-soft space-y-6 animate-in fade-in">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Gmail Integration
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Connect your Google account to enable automated email synchronization and AI summarization
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-primary-600 shadow-sm">
                <Mail className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Google Workspace / Gmail
                  </h4>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      gmailStatus?.is_connected
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    {gmailStatus?.is_connected ? (gmailStatus?.is_demo ? 'Demo Connected' : 'Connected') : 'Not Connected'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {gmailStatus?.google_account_email
                    ? `Active account: ${gmailStatus.google_account_email}`
                    : 'Read-only access to synchronize inbox messages'}
                </p>
              </div>
            </div>

            {gmailStatus?.is_connected ? (
              <button
                onClick={handleDisconnectGmail}
                disabled={gmailLoading}
                className="px-4 py-2 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-bold hover:bg-rose-100 transition-colors disabled:opacity-50"
              >
                {gmailLoading ? 'Disconnecting...' : 'Disconnect Gmail'}
              </button>
            ) : (
              <button
                onClick={handleConnectGmail}
                disabled={gmailLoading}
                className="px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50 flex items-center gap-2"
              >
                <Mail className="w-4 h-4" />
                <span>{gmailLoading ? 'Connecting...' : 'Connect Gmail Account'}</span>
              </button>
            )}
          </div>

          <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100/60 dark:border-indigo-900/40 text-xs text-slate-600 dark:text-slate-300 space-y-2">
            <span className="font-bold text-primary-700 dark:text-primary-300 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" /> Security Guarantee
            </span>
            <p>
              Disconnecting your Gmail account revokes Google OAuth tokens and cleans up stored credentials. Disconnecting does NOT delete emails from your Gmail account.
            </p>
          </div>
        </div>
      )}

      {/* TAB 4: PREFERENCES */}
      {activeTab === 'preferences' && (
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 shadow-soft space-y-6 animate-in fade-in">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              AI & Synchronization Preferences
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Customize AI summarization length, automatic task detection, and sync frequency
            </p>
          </div>

          <div className="space-y-5 max-w-lg">
            {/* Theme Preference */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Interface Theme
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                    theme === 'light'
                      ? 'bg-primary-50 dark:bg-primary-950/60 border-primary-500 text-primary-700 dark:text-primary-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Sun className="w-4 h-4" /> Light Mode
                </button>
                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                    theme === 'dark'
                      ? 'bg-primary-50 dark:bg-primary-950/60 border-primary-500 text-primary-700 dark:text-primary-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Moon className="w-4 h-4" /> Dark Mode
                </button>
              </div>
            </div>

            {/* Summary Length */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Default Summary Length
              </label>
              <select
                value={summaryLength}
                onChange={(e) => setSummaryLength(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none"
              >
                <option value="concise">Concise (1-2 sentences)</option>
                <option value="standard">Standard (3-4 sentences)</option>
                <option value="detailed">Detailed (Comprehensive Breakdown)</option>
              </select>
            </div>

            {/* Auto Task Extraction Toggle */}
            <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                  Auto-Extract Action Items
                </span>
                <span className="text-[11px] text-slate-400">
                  Automatically populate detected deliverables into your Action Center
                </span>
              </div>
              <input
                type="checkbox"
                checked={autoExtractTasks}
                onChange={(e) => setAutoExtractTasks(e.target.checked)}
                className="w-5 h-5 accent-primary-600 rounded cursor-pointer"
              />
            </div>

            {/* Sync Frequency */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Sync Batch Limit
              </label>
              <select
                value={syncLimit}
                onChange={(e) => setSyncLimit(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none"
              >
                <option value={25}>25 messages per sync</option>
                <option value={50}>50 messages per sync</option>
                <option value={100}>100 messages per sync</option>
              </select>
            </div>

            <button
              onClick={handleSavePreferences}
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        </div>
      )}

      {/* TAB 5: DATA & PRIVACY */}
      {activeTab === 'data' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Export Data */}
          <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 shadow-soft space-y-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Export Data Backup
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Download a complete JSON export of all your synchronized emails, AI summaries, and action tasks
              </p>
            </div>

            <button
              onClick={handleExportData}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm transition-all"
            >
              <Download className="w-4 h-4 text-primary-500" />
              <span>Download JSON Export</span>
            </button>
          </div>

          {/* Delete Account */}
          <div className="p-6 sm:p-8 rounded-3xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/60 shadow-soft space-y-4">
            <div>
              <h3 className="text-lg font-bold text-rose-700 dark:text-rose-300">
                Delete Account
              </h3>
              <p className="text-xs text-rose-600/80 dark:text-rose-400">
                Permanently delete your account and all associated emails, AI summaries, and tasks. This action cannot be undone.
              </p>
            </div>

            <button
              onClick={() => setShowDeleteModal(true)}
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Account Permanently</span>
            </button>
          </div>
        </div>
      )}

      {/* Delete Account Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-200 dark:border-rose-900 space-y-4">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400 font-bold text-lg">
              <AlertCircle className="w-6 h-6" />
              <span>Confirm Account Deletion</span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              This will permanently delete all your emails, extracted summaries, tasks, and Google OAuth credentials from our database.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Type <span className="font-mono font-bold text-rose-600">DELETE</span> to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-rose-500/40"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== 'DELETE' || deletingAccount}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all disabled:opacity-50"
              >
                {deletingAccount ? 'Deleting...' : 'Delete Everything'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
