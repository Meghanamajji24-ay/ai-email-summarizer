import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Mail, ShieldCheck, Lock, Sparkles, CheckCircle2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const AuthLayout = () => {
  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-[#fdfcfb] dark:bg-slate-950 text-slate-900 dark:text-slate-100 relative overflow-hidden">
      {/* Decorative ambient background glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-primary-500/10 via-brand-500/5 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-flex items-center gap-3 group mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary-600 via-brand-600 to-accent-500 flex items-center justify-center shadow-lg shadow-primary-500/25 group-hover:scale-105 transition-transform">
            <Mail className="w-6 h-6 text-white" />
          </div>
          <div className="text-left">
            <span className="font-extrabold text-xl tracking-tight text-slate-900 dark:text-white block">
              AI Email <span className="text-primary-600 dark:text-primary-400">Summarizer</span>
            </span>
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
              Executive Inbox Intelligence
            </span>
          </div>
        </Link>
      </div>

      {/* Form Container Card */}
      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white dark:bg-slate-900 py-8 px-6 sm:px-10 shadow-soft-lg rounded-3xl border border-slate-100 dark:border-slate-800/80">
          <Outlet />
        </div>

        {/* Security Trust Badges */}
        <div className="mt-8 flex items-center justify-center gap-6 text-xs text-slate-400 dark:text-slate-500">
          <span className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-primary-500" /> End-to-End Encrypted
          </span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Read-Only Gmail OAuth
          </span>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
