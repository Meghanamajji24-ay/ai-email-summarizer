import React from 'react';

export const StatCardSkeleton = () => (
  <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 animate-pulse">
    <div className="flex justify-between items-center">
      <div className="h-3 w-24 bg-slate-200 dark:bg-slate-800 rounded" />
      <div className="w-10 h-10 bg-slate-200 dark:bg-slate-800 rounded-xl" />
    </div>
    <div className="mt-4 h-8 w-16 bg-slate-200 dark:bg-slate-800 rounded" />
  </div>
);

export const EmailCardSkeleton = () => (
  <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 animate-pulse space-y-3">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-800 shrink-0" />
      <div className="space-y-1.5 flex-1">
        <div className="h-4 w-40 bg-slate-200 dark:bg-slate-800 rounded" />
        <div className="h-3 w-64 bg-slate-200 dark:bg-slate-800 rounded" />
      </div>
    </div>
    <div className="h-10 w-full bg-slate-100 dark:bg-slate-800/60 rounded-xl" />
    <div className="flex gap-2">
      <div className="h-5 w-20 bg-slate-200 dark:bg-slate-800 rounded-full" />
      <div className="h-5 w-24 bg-slate-200 dark:bg-slate-800 rounded-full" />
    </div>
  </div>
);

export const EmailDetailSkeleton = () => (
  <div className="space-y-6 animate-pulse">
    <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 space-y-4">
      <div className="h-7 w-3/4 bg-slate-200 dark:bg-slate-800 rounded" />
      <div className="flex gap-4">
        <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-slate-800" />
        <div className="space-y-2 flex-1">
          <div className="h-4 w-48 bg-slate-200 dark:bg-slate-800 rounded" />
          <div className="h-3 w-32 bg-slate-200 dark:bg-slate-800 rounded" />
        </div>
      </div>
    </div>
    <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 space-y-3">
      <div className="h-5 w-32 bg-slate-200 dark:bg-slate-800 rounded" />
      <div className="h-4 w-full bg-slate-200 dark:bg-slate-800 rounded" />
      <div className="h-4 w-5/6 bg-slate-200 dark:bg-slate-800 rounded" />
      <div className="h-4 w-4/6 bg-slate-200 dark:bg-slate-800 rounded" />
    </div>
  </div>
);

export const ActionListSkeleton = () => (
  <div className="space-y-3">
    {[1, 2, 3, 4].map((i) => (
      <div key={i} className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 animate-pulse flex items-center justify-between">
        <div className="space-y-2 flex-1">
          <div className="h-4 w-60 bg-slate-200 dark:bg-slate-800 rounded" />
          <div className="h-3 w-40 bg-slate-200 dark:bg-slate-800 rounded" />
        </div>
        <div className="h-7 w-24 bg-slate-200 dark:bg-slate-800 rounded-full" />
      </div>
    ))}
  </div>
);
