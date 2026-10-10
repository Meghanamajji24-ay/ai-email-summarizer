import React from 'react';
import { Mail, CheckSquare, Sparkles, Plus } from 'lucide-react';

const EmptyState = ({
  icon: Icon = Mail,
  title = "No items found",
  description = "There are no items matching your criteria.",
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondaryAction
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center max-w-md mx-auto">
      <div className="w-16 h-16 rounded-2xl bg-primary-50 dark:bg-slate-800 text-primary-600 dark:text-primary-400 flex items-center justify-center mb-4 shadow-soft">
        <Icon className="w-8 h-8" />
      </div>
      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1.5">
        {title}
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
        {description}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {actionLabel && (
          <button
            onClick={onAction}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold shadow-sm transition-all hover:shadow-primary-500/25"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>{actionLabel}</span>
          </button>
        )}

        {secondaryLabel && (
          <button
            onClick={onSecondaryAction}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
          >
            <span>{secondaryLabel}</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default EmptyState;
