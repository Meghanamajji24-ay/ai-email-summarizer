import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, CheckSquare, Mail, MailOpen, Clock, Tag } from 'lucide-react';
import { formatTimeAgo, getPriorityStyle } from '../utils/formatters';

const EmailCard = ({ email, onToggleRead }) => {
  const navigate = useNavigate();
  const priorityStyle = getPriorityStyle(email.priority);

  const handleClick = () => {
    navigate(`/emails/${email.id}`);
  };

  const handleReadClick = (e) => {
    e.stopPropagation();
    if (onToggleRead) {
      onToggleRead(email.id, !email.is_read);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`group relative p-4 sm:p-5 rounded-2xl border transition-all duration-200 cursor-pointer ${
        !email.is_read
          ? 'bg-white dark:bg-slate-900 border-primary-200 dark:border-primary-900/60 shadow-sm'
          : 'bg-white/60 dark:bg-slate-900/40 border-slate-100 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-900 shadow-soft'
      }`}
    >
      <div className="flex items-start gap-3 sm:gap-4">
        {/* Unread indicator / Avatar */}
        <div className="relative shrink-0">
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-sm flex items-center justify-center group-hover:bg-primary-50 group-hover:text-primary-600 dark:group-hover:bg-slate-800 transition-colors">
            {email.sender_name.charAt(0).toUpperCase()}
          </div>
          {!email.is_read && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-primary-600 rounded-full ring-2 ring-white dark:ring-slate-900" />
          )}
        </div>

        {/* Center Content */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 truncate">
              <span className={`text-sm truncate ${!email.is_read ? 'font-bold text-slate-900 dark:text-white' : 'font-medium text-slate-700 dark:text-slate-300'}`}>
                {email.sender_name}
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-500 truncate hidden sm:inline">
                &lt;{email.sender_email}&gt;
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {formatTimeAgo(email.received_date)}
              </span>
            </div>
          </div>

          <h3 className={`text-sm sm:text-base leading-snug line-clamp-1 ${!email.is_read ? 'font-semibold text-slate-900 dark:text-white' : 'font-medium text-slate-800 dark:text-slate-200'}`}>
            {email.subject}
          </h3>

          {/* AI Summary snippet if available */}
          {email.short_summary ? (
            <div className="flex items-start gap-1.5 p-2 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100/60 dark:border-indigo-900/40 text-xs text-slate-700 dark:text-slate-300">
              <Sparkles className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400 shrink-0 mt-0.5" />
              <p className="line-clamp-2 leading-relaxed">{email.short_summary}</p>
            </div>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 leading-relaxed">
              {email.snippet}
            </p>
          )}

          {/* Bottom Badges */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {/* Priority Badge */}
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${priorityStyle.bg} ${priorityStyle.text} ${priorityStyle.border}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${priorityStyle.dot}`} />
              {priorityStyle.label}
            </span>

            {/* Action Items Count */}
            {email.action_count > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                <CheckSquare className="w-3 h-3 text-amber-600" />
                {email.action_count} {email.action_count === 1 ? 'Action' : 'Actions'}
              </span>
            )}

            {email.is_demo && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Sample
              </span>
            )}

            {/* Read/Unread Quick Toggle */}
            <button
              onClick={handleReadClick}
              className="ml-auto opacity-0 group-hover:opacity-100 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-opacity"
              title={email.is_read ? 'Mark as unread' : 'Mark as read'}
            >
              {email.is_read ? <Mail className="w-4 h-4" /> : <MailOpen className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailCard;
