import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { User, Mail, Lock, Eye, EyeOff, AlertCircle, ArrowRight, Zap, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(8, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

const SignupPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const { register: registerUser, loginDemo } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(signupSchema),
  });

  const pwd = watch('password', '');

  // Calculate password strength
  const getPasswordStrength = (val) => {
    if (!val) return 0;
    let score = 0;
    if (val.length >= 8) score += 1;
    if (/[A-Z]/.test(val)) score += 1;
    if (/[0-9]/.test(val)) score += 1;
    if (/[^A-Za-z0-9]/.test(val)) score += 1;
    return score;
  };

  const strengthScore = getPasswordStrength(pwd);

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      setApiError('');
      await registerUser(data.name, data.email, data.password);
      addToast('Account created successfully! Welcome to AI Email Summarizer.', 'success');
      navigate('/dashboard');
    } catch (err) {
      setApiError(err.response?.data?.detail || 'Failed to create account.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    try {
      setDemoLoading(true);
      setApiError('');
      await loginDemo();
      addToast('Demo sandbox ready! Sample emails and tasks loaded.', 'success');
      navigate('/dashboard');
    } catch (err) {
      setApiError('Failed to launch demo account.');
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          Create Your Account
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Get started free with intelligent executive email summaries
        </p>
      </div>

      {apiError && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{apiError}</span>
        </div>
      )}

      {/* Demo 1-Click Sandbox Button */}
      <button
        type="button"
        onClick={handleDemoLogin}
        disabled={demoLoading || loading}
        className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-primary-500/10 to-brand-500/10 hover:from-amber-500/20 hover:to-brand-500/20 border border-amber-500/30 text-amber-700 dark:text-amber-300 font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-sm"
      >
        <Zap className="w-4 h-4 text-amber-500" />
        <span>{demoLoading ? 'Creating Demo Sandbox...' : '1-Click Instant Demo Access'}</span>
      </button>

      <div className="relative flex items-center justify-center">
        <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
        <span className="bg-white dark:bg-slate-900 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          or register with email
        </span>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Full Name */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
            Full Name
          </label>
          <div className="relative">
            <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              {...register('name')}
              placeholder="Alex Morgan"
              className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 ${
                errors.name ? 'border-rose-400 focus:ring-rose-400/40' : 'border-slate-200 dark:border-slate-700 focus:ring-primary-500/40'
              }`}
            />
          </div>
          {errors.name && (
            <p className="mt-1 text-xs text-rose-500 font-medium">{errors.name.message}</p>
          )}
        </div>

        {/* Email Field */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
            Email Address
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              {...register('email')}
              placeholder="you@example.com"
              className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 ${
                errors.email ? 'border-rose-400 focus:ring-rose-400/40' : 'border-slate-200 dark:border-slate-700 focus:ring-primary-500/40'
              }`}
            />
          </div>
          {errors.email && (
            <p className="mt-1 text-xs text-rose-500 font-medium">{errors.email.message}</p>
          )}
        </div>

        {/* Password Field */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
            Password
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type={showPassword ? 'text' : 'password'}
              {...register('password')}
              placeholder="Min. 8 characters"
              className={`w-full pl-10 pr-10 py-2.5 rounded-xl border text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 ${
                errors.password ? 'border-rose-400 focus:ring-rose-400/40' : 'border-slate-200 dark:border-slate-700 focus:ring-primary-500/40'
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
          {/* Password Strength Indicator */}
          {pwd && (
            <div className="mt-2 space-y-1">
              <div className="flex gap-1.5 h-1">
                {[1, 2, 3, 4].map((step) => (
                  <div
                    key={step}
                    className={`flex-1 rounded-full transition-all ${
                      strengthScore >= step
                        ? strengthScore <= 2
                          ? 'bg-rose-500'
                          : strengthScore === 3
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                        : 'bg-slate-200 dark:bg-slate-700'
                    }`}
                  />
                ))}
              </div>
              <p className="text-[10px] text-slate-400 text-right">
                {strengthScore <= 2 ? 'Weak' : strengthScore === 3 ? 'Good' : 'Strong'}
              </p>
            </div>
          )}
          {errors.password && (
            <p className="mt-1 text-xs text-rose-500 font-medium">{errors.password.message}</p>
          )}
        </div>

        {/* Confirm Password Field */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
            Confirm Password
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type={showPassword ? 'text' : 'password'}
              {...register('confirmPassword')}
              placeholder="••••••••"
              className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 ${
                errors.confirmPassword ? 'border-rose-400 focus:ring-rose-400/40' : 'border-slate-200 dark:border-slate-700 focus:ring-primary-500/40'
              }`}
            />
          </div>
          {errors.confirmPassword && (
            <p className="mt-1 text-xs text-rose-500 font-medium">{errors.confirmPassword.message}</p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || demoLoading}
          className="w-full py-3 px-4 rounded-xl text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 shadow-md shadow-primary-500/25 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <span>Create Account</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Switch to Login */}
      <div className="text-center text-xs text-slate-500 dark:text-slate-400">
        Already have an account?{' '}
        <Link to="/login" className="font-bold text-primary-600 hover:text-primary-700 dark:text-primary-400">
          Sign in
        </Link>
      </div>
    </div>
  );
};

export default SignupPage;
