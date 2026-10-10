import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Sparkles } from 'lucide-react';

const NotFoundPage = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-[#fdfcfb] dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <div className="w-16 h-16 rounded-3xl bg-primary-50 dark:bg-slate-800 text-primary-600 dark:text-primary-400 flex items-center justify-center mb-6 shadow-soft">
        <Mail className="w-8 h-8" />
      </div>
      <h1 className="text-4xl font-extrabold mb-2 text-gradient">404</h1>
      <h2 className="text-xl font-bold mb-3">Page Not Found</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-8">
        The page you are looking for doesn't exist or has been moved.
      </p>
      <Link
        to="/"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold shadow-md shadow-primary-500/25 transition-all"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Home</span>
      </Link>
    </div>
  );
};

export default NotFoundPage;
