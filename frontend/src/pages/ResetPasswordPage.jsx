import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Lock, Eye, EyeOff, AlertCircle, ArrowRight, KeyRound } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import api from '../services/api';

const resetSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  new_password: z.string().min(8, 'Password must be at least 8 characters'),
  confirm_password: z.string().min(8, 'Please confirm your password'),
}).refine((data) => data.new_password === data.confirm_password, {
  message: "Passwords do not match",
  path: ["confirm_password"],
});

const ResetPasswordPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const { addToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const tokenParam = searchParams.get('token') || '';

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      token: tokenParam,
    },
  });

  useEffect(() => {
    if (tokenParam) {
      setValue('token', tokenParam);
    }
  }, [tokenParam, setValue]);

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      setApiError('');
      await api.post('/auth/reset-password', {
        token: data.token.trim(),
        new_password: data.new_password,
      });
      addToast('Password reset successfully! Please sign in with your new password.', 'success');
      navigate('/login');
    } catch (err) {
      setApiError(err.response?.data?.detail || 'Invalid or expired password reset token.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          Set New Password
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Enter your reset token and new secure password
        </p>
      </div>

      {apiError && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{apiError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Token Field */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
            Reset Token
          </label>
          <div className="relative">
            <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              {...register('token')}
              placeholder="Paste token received"
              className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm font-mono bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 ${
                errors.token ? 'border-rose-400 focus:ring-rose-400/40' : 'border-slate-200 dark:border-slate-700 focus:ring-primary-500/40'
              }`}
            />
          </div>
          {errors.token && (
            <p className="mt-1 text-xs text-rose-500 font-medium">{errors.token.message}</p>
          )}
        </div>

        {/* New Password Field */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
            New Password
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type={showPassword ? 'text' : 'password'}
              {...register('new_password')}
              placeholder="Min. 8 characters"
              className={`w-full pl-10 pr-10 py-2.5 rounded-xl border text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 ${
                errors.new_password ? 'border-rose-400 focus:ring-rose-400/40' : 'border-slate-200 dark:border-slate-700 focus:ring-primary-500/40'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.new_password && (
            <p className="mt-1 text-xs text-rose-500 font-medium">{errors.new_password.message}</p>
          )}
        </div>

        {/* Confirm Password Field */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
            Confirm New Password
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type={showPassword ? 'text' : 'password'}
              {...register('confirm_password')}
              placeholder="••••••••"
              className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 ${
                errors.confirm_password ? 'border-rose-400 focus:ring-rose-400/40' : 'border-slate-200 dark:border-slate-700 focus:ring-primary-500/40'
              }`}
            />
          </div>
          {errors.confirm_password && (
            <p className="mt-1 text-xs text-rose-500 font-medium">{errors.confirm_password.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 rounded-xl text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 shadow-md shadow-primary-500/25 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <span>Update Password</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="text-center">
        <Link
          to="/login"
          className="text-xs font-bold text-primary-600 hover:text-primary-700 dark:text-primary-400"
        >
          Remember your password? Sign in
        </Link>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
