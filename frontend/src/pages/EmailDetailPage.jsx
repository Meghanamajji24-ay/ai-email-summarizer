import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import DOMPurify from 'dompurify';
import {
  ArrowLeft,
  Sparkles,
  RefreshCw,
  CheckSquare,
  Clock,
  ExternalLink,
  Trash2,
  Copy,
  Check,
  Send,
  AlertCircle,
  FileText,
  MessageSquare,
  Bot,
  User,
  ShieldCheck,
  ChevronDown
} from 'lucide-react';
import { EmailDetailSkeleton } from '../components/LoadingSkeleton';
import { useToast } from '../context/ToastContext';
import { formatDate, getPriorityStyle } from '../utils/formatters';
import api from '../services/api';

const EmailDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [email, setEmail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [summaryLength, setSummaryLength] = useState('standard');
  const [activeTab, setActiveTab] = useState('summary'); // summary, original

  // Reply generator state
  const [replyTone, setReplyTone] = useState('professional');
  const [replyInstructions, setReplyInstructions] = useState('');
  const [suggestedReply, setSuggestedReply] = useState('');
  const [generatingReply, setGeneratingReply] = useState(false);
  const [copiedReply, setCopiedReply] = useState(false);

  const fetchEmail = async () => {
    try {
      setLoading(true);
      const resp = await api.get(`/emails/${id}`);
      setEmail(resp.data);
      if (resp.data.summary?.suggested_reply) {
        setSuggestedReply(resp.data.summary.suggested_reply);
      }
    } catch (err) {
      addToast('Failed to load email details.', 'error');
      navigate('/inbox');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchEmail();
    }
  }, [id]);

  const handleRegenerateSummary = async () => {
    try {
      setRegenerating(true);
      const resp = await api.post(`/emails/${id}/summarize`, {
        summary_length: summaryLength,
      });
      setEmail((prev) => ({ ...prev, summary: resp.data }));
      addToast('AI summary regenerated successfully!', 'success');
      window.dispatchEvent(new CustomEvent('inbox-synced'));
    } catch (err) {
      addToast('Failed to regenerate summary.', 'error');
    } finally {
      setRegenerating(false);
    }
  };

  const handleGenerateReply = async () => {
    try {
      setGeneratingReply(true);
      const resp = await api.post(`/emails/${id}/suggest-reply`, {
        tone: replyTone,
        instructions: replyInstructions.trim() || undefined,
      });
      setSuggestedReply(resp.data.suggested_reply);
      addToast('Draft reply generated!', 'success');
    } catch (err) {
      addToast('Failed to generate draft reply.', 'error');
    } finally {
      setGeneratingReply(false);
    }
  };

  const handleCopyReply = () => {
    if (!suggestedReply) return;
    navigator.clipboard.writeText(suggestedReply);
    setCopiedReply(true);
    addToast('Reply copied to clipboard!', 'info');
    setTimeout(() => setCopiedReply(false), 3000);
  };

  const handleAddTask = async (item) => {
    try {
      await api.post('/actions', {
        title: item.title,
        description: item.description || `Extracted from email: ${email.subject}`,
        due_date: item.due_date || null,
        priority: item.priority || 'medium',
        email_id: email.id,
        email_subject: email.subject,
        status: 'pending',
      });
      addToast('Action item saved to Action Center!', 'success');
      window.dispatchEvent(new CustomEvent('inbox-synced'));
    } catch (err) {
      addToast('Failed to save action item.', 'error');
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this email from your application?')) {
      try {
        await api.delete(`/emails/${id}`);
        addToast('Email deleted successfully.', 'info');
        window.dispatchEvent(new CustomEvent('inbox-synced'));
        navigate('/inbox');
      } catch (err) {
        addToast('Failed to delete email.', 'error');
      }
    }
  };

  if (loading || !email) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-32 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
        <EmailDetailSkeleton />
      </div>
    );
  }

  const priorityStyle = getPriorityStyle(email.priority);
  const summary = email.summary;

  return (
    <div className="space-y-6 animate-in fade-in max-w-5xl mx-auto pb-12">
      {/* Top Header Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          to="/inbox"
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-soft"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Inbox</span>
        </Link>

        <div className="flex items-center gap-2">
          {email.gmail_link && (
            <a
              href={email.gmail_link}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-primary-600 shadow-soft"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open in Gmail</span>
            </a>
          )}

          <button
            onClick={handleDelete}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-400 hover:text-rose-600 hover:border-rose-200 dark:hover:border-rose-900 shadow-soft transition-colors"
            title="Delete Email"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Email Card Header */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 shadow-soft space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${priorityStyle.bg} ${priorityStyle.text} ${priorityStyle.border}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${priorityStyle.dot}`} />
                {priorityStyle.label}
              </span>
              {email.is_demo && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 uppercase tracking-wider">
                  Sample Message
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white leading-tight">
              {email.subject}
            </h1>
          </div>

          <span className="text-xs text-slate-400 font-medium shrink-0 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            {formatDate(email.received_date)}
          </span>
        </div>

        {/* Sender & Recipient info */}
        <div className="flex items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary-500 to-brand-500 text-white font-bold flex items-center justify-center text-sm shadow-sm">
            {email.sender_name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                {email.sender_name}
              </span>
              <span className="text-xs text-slate-400 font-mono truncate">
                &lt;{email.sender_email}&gt;
              </span>
            </div>
            {email.recipients && email.recipients.length > 0 && (
              <p className="text-xs text-slate-400 truncate">
                To: {email.recipients.map((r) => r.email).join(', ')}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Tabs Switcher: AI Summary vs Original Email */}
      <div className="flex rounded-2xl bg-slate-100 dark:bg-slate-800 p-1.5 max-w-sm">
        <button
          onClick={() => setActiveTab('summary')}
          className={`flex-1 py-2 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'summary'
              ? 'bg-white dark:bg-slate-900 text-primary-600 dark:text-primary-400 shadow-sm'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>AI Intelligence</span>
        </button>

        <button
          onClick={() => setActiveTab('original')}
          className={`flex-1 py-2 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'original'
              ? 'bg-white dark:bg-slate-900 text-primary-600 dark:text-primary-400 shadow-sm'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Original Email</span>
        </button>
      </div>

      {/* TAB 1: AI SUMMARY & ACTION ITEMS */}
      {activeTab === 'summary' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Executive Summary Card */}
          <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 shadow-soft space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                <div className="p-1.5 rounded-lg bg-primary-50 dark:bg-primary-950/60 text-primary-600">
                  <Sparkles className="w-4 h-4" />
                </div>
                <span>Executive Summary</span>
              </div>

              {/* Length selector & Regenerate button */}
              <div className="flex items-center gap-2">
                <select
                  value={summaryLength}
                  onChange={(e) => setSummaryLength(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none"
                >
                  <option value="concise">Concise (2 sentences)</option>
                  <option value="standard">Standard (3-4 sentences)</option>
                  <option value="detailed">Detailed (Comprehensive)</option>
                </select>

                <button
                  onClick={handleRegenerateSummary}
                  disabled={regenerating}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? 'animate-spin' : ''}`} />
                  <span>{regenerating ? 'Analyzing...' : 'Regenerate'}</span>
                </button>
              </div>
            </div>

            {/* Summary Text */}
            <div className="p-5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100/60 dark:border-indigo-900/40 text-sm sm:text-base text-slate-800 dark:text-slate-200 leading-relaxed font-normal">
              {summary?.summary || 'No summary available.'}
            </div>

            {/* Key Points Bullet List */}
            {summary?.key_points && summary.key_points.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Key Facts & Updates
                </h3>
                <div className="space-y-2">
                  {summary.key_points.map((pt, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-2 shrink-0" />
                      <p className="leading-relaxed">{pt}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Important Dates & Deadlines */}
            {summary?.important_dates && summary.important_dates.length > 0 && (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                  Important Dates & Deadlines
                </span>
                <div className="flex flex-wrap gap-2">
                  {summary.important_dates.map((d, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-semibold"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>{d}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Decisions and Commitments */}
            {summary?.decisions && summary.decisions.length > 0 && (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                  Decisions & Commitments
                </span>
                <div className="space-y-1.5">
                  {summary.decisions.map((dec, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                      <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>{dec}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Extracted Action Items Section */}
          <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 shadow-soft space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600">
                  <CheckSquare className="w-4 h-4" />
                </div>
                <span>Extracted Action Items</span>
              </div>
              <span className="text-xs text-slate-400">
                {summary?.action_items?.length || 0} tasks identified
              </span>
            </div>

            {summary?.action_items && summary.action_items.length > 0 ? (
              <div className="space-y-3">
                {summary.action_items.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-primary-200 transition-colors"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        {item.title}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <span>Due: {item.due_date ? item.due_date : 'No deadline detected'}</span>
                        <span>•</span>
                        <span className="capitalize font-semibold text-slate-700 dark:text-slate-300">
                          Priority: {item.priority}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleAddTask(item)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-slate-700 shadow-sm transition-colors shrink-0"
                    >
                      <CheckSquare className="w-3.5 h-3.5" />
                      <span>Save to Actions</span>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-4 text-center">
                No explicit action items were detected in this message.
              </p>
            )}
          </div>

          {/* AI Suggested Reply Generator */}
          <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 shadow-soft space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                <div className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600">
                  <Bot className="w-4 h-4" />
                </div>
                <span>Suggested Reply Draft</span>
              </div>

              {/* Tone Buttons */}
              <div className="flex flex-wrap gap-1.5">
                {['professional', 'friendly', 'concise', 'direct'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setReplyTone(t)}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold capitalize transition-all border ${
                      replyTone === t
                        ? 'bg-sky-500 border-sky-500 text-white shadow-sm'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Instructions Input */}
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={replyInstructions}
                onChange={(e) => setReplyInstructions(e.target.value)}
                placeholder="Optional instructions (e.g., 'Confirm attendance for Thursday at 2 PM')..."
                className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/40"
              />
              <button
                onClick={handleGenerateReply}
                disabled={generatingReply}
                className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50 shrink-0"
              >
                {generatingReply ? 'Drafting...' : 'Regenerate Draft'}
              </button>
            </div>

            {/* Suggested Reply Box */}
            {suggestedReply && (
              <div className="space-y-3">
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/80 relative">
                  <textarea
                    value={suggestedReply}
                    onChange={(e) => setSuggestedReply(e.target.value)}
                    rows={6}
                    className="w-full bg-transparent text-xs sm:text-sm font-sans text-slate-800 dark:text-slate-200 leading-relaxed resize-y focus:outline-none"
                  />
                  <div className="flex items-center justify-between pt-3 border-t border-slate-200/60 dark:border-slate-700 mt-2">
                    <span className="text-[11px] text-slate-400 italic">
                      AI draft suggestion — review before sending
                    </span>
                    <button
                      onClick={handleCopyReply}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
                    >
                      {copiedReply ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedReply ? 'Copied!' : 'Copy Reply'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: ORIGINAL EMAIL FULL PREVIEW */}
      {activeTab === 'original' && (
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 shadow-soft space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Raw Content & Safe Render
            </span>
          </div>

          {email.body_html ? (
            <div
              className="prose dark:prose-invert max-w-none text-xs sm:text-sm leading-relaxed overflow-x-auto"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(email.body_html) }}
            />
          ) : (
            <div className="font-mono text-xs sm:text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
              {email.body_text || '(No body content available)'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EmailDetailPage;
