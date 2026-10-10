import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Mail,
  Zap,
  CheckSquare,
  Clock,
  ChevronDown,
  Layers,
  Bot,
  Flame,
  FileText
} from 'lucide-react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const LandingPage = () => {
  const { loginDemo } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [demoLoading, setDemoLoading] = useState(false);
  const [activeFaq, setActiveFaq] = useState(null);
  const [previewTab, setPreviewTab] = useState('summary');

  const handleDemoClick = async () => {
    try {
      setDemoLoading(true);
      await loginDemo();
      addToast('Welcome to Demo Mode! Sample emails and tasks loaded.', 'success');
      navigate('/dashboard');
    } catch (err) {
      addToast('Demo sandbox initialization failed. Please try signing up.', 'error');
    } finally {
      setDemoLoading(false);
    }
  };

  const faqs = [
    {
      q: 'Is my email data secure and private?',
      a: 'Absolutely. We use official Google OAuth 2.0 with the minimum read-only scope (gmail.readonly). Your OAuth refresh tokens are encrypted at rest with AES-256 (Fernet) keys, and your email data is completely isolated to your account. We never sell your data or train foundation models on your messages.'
    },
    {
      q: 'Can I test the application without a Google account?',
      a: 'Yes! We built a full Demo Mode preloaded with realistic workplace scenarios (engineering architecture reviews, job offer letters, university coursework, and SaaS invoices) so you can experience AI summarization and action task management instantly.'
    },
    {
      q: 'Which AI models and providers are supported?',
      a: 'Our architecture is modular and supports OpenAI (GPT-4o, GPT-4o-mini), Google Gemini (Gemini 1.5 Pro / Flash), Anthropic Claude, and Groq via backend environment variables. We also feature a built-in smart NLP extraction engine as a bulletproof zero-config fallback.'
    },
    {
      q: 'How does Action Item extraction work?',
      a: 'Our AI scans email bodies for explicit requests, deadlines, and deliverables. It distinguishes verified commitments from vague statements, detects exact dates (e.g. "Friday at 5:00 PM EST"), and automatically schedules them into your interactive Action Center.'
    },
    {
      q: 'Will the AI ever send an email reply without my permission?',
      a: 'Never. Our suggested reply generator provides draft templates (in Professional, Friendly, Concise, or Direct tones) that you can review, edit, and copy. We never send messages autonomously.'
    }
  ];

  return (
    <div className="min-h-screen bg-[#fdfcfb] dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-indigo-100 selection:text-indigo-900">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-16 pb-20 sm:pt-24 sm:pb-28 overflow-hidden">
        {/* Glowing backdrop gradient */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-6xl h-96 bg-gradient-to-tr from-primary-500/15 via-brand-500/10 to-accent-500/15 blur-3xl pointer-events-none -z-10 rounded-full" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          {/* Highlight Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-50 dark:bg-primary-950/60 border border-primary-200 dark:border-primary-800/80 text-primary-700 dark:text-primary-300 text-xs font-semibold shadow-soft">
            <Sparkles className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400 animate-pulse" />
            <span>Next-Gen Executive Email Intelligence</span>
          </div>

          {/* Main Hero Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-white max-w-4xl mx-auto leading-[1.1]">
            Your Inbox, <span className="text-gradient">Understood.</span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Transform cluttered email threads into concise 3-sentence executive summaries, auto-extract actionable tasks with real deadlines, and draft smart replies in seconds.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              to="/signup"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-bold text-white bg-gradient-to-r from-primary-600 via-brand-600 to-indigo-600 hover:opacity-95 rounded-2xl shadow-lg shadow-primary-500/25 transition-all transform hover:-translate-y-0.5"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-5 h-5" />
            </Link>

            <button
              onClick={handleDemoClick}
              disabled={demoLoading}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-soft transition-all transform hover:-translate-y-0.5 disabled:opacity-50"
            >
              <Zap className="w-5 h-5 text-amber-500" />
              <span>{demoLoading ? 'Launching Demo...' : 'Explore Live Demo'}</span>
            </button>
          </div>

          {/* Social Proof Badges */}
          <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" /> No credit card required
            </span>
            <span className="flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-primary-500" /> AES-256 encrypted
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-accent-500" /> Official Gmail API verified
            </span>
          </div>

          {/* Interactive Product Preview Dashboard */}
          <div className="pt-10 max-w-5xl mx-auto">
            <div className="p-3 sm:p-4 rounded-3xl bg-slate-900/5 dark:bg-white/5 border border-slate-200/80 dark:border-slate-800/80 shadow-2xl backdrop-blur-xl">
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 sm:p-6 text-left shadow-soft space-y-4">
                {/* Preview Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary-100 dark:bg-primary-950/80 text-primary-600 dark:text-primary-400 font-bold flex items-center justify-center">
                      SC
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        Sarah Chen &lt;sarah.chen@techcorp.io&gt;
                      </h4>
                      <p className="text-xs text-slate-400">
                        Urgent: Final Architecture Review & Deployment Sign-off
                      </p>
                    </div>
                  </div>

                  {/* Preview Tabs */}
                  <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 text-xs font-semibold">
                    <button
                      onClick={() => setPreviewTab('summary')}
                      className={`px-3 py-1.5 rounded-lg transition-colors ${previewTab === 'summary' ? 'bg-white dark:bg-slate-900 text-primary-600 dark:text-primary-400 shadow-sm' : 'text-slate-500'}`}
                    >
                      AI Summary
                    </button>
                    <button
                      onClick={() => setPreviewTab('actions')}
                      className={`px-3 py-1.5 rounded-lg transition-colors ${previewTab === 'actions' ? 'bg-white dark:bg-slate-900 text-primary-600 dark:text-primary-400 shadow-sm' : 'text-slate-500'}`}
                    >
                      Action Items (3)
                    </button>
                    <button
                      onClick={() => setPreviewTab('original')}
                      className={`px-3 py-1.5 rounded-lg transition-colors ${previewTab === 'original' ? 'bg-white dark:bg-slate-900 text-primary-600 dark:text-primary-400 shadow-sm' : 'text-slate-500'}`}
                    >
                      Original Email
                    </button>
                  </div>
                </div>

                {/* Tab Content */}
                {previewTab === 'summary' && (
                  <div className="space-y-4 animate-in fade-in">
                    <div className="p-4 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-primary-700 dark:text-primary-300">
                        <Sparkles className="w-4 h-4 text-primary-600" />
                        <span>Executive Summary</span>
                      </div>
                      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                        Sarah Chen requests final architecture diagrams and security compliance checklists to be submitted and signed off before Friday, October 18 at 5:00 PM EST. The team is preparing for the major Q4 release with critical tasks around OAuth PKCE verification, load testing, and database backups.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                          Important Deadlines
                        </span>
                        <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> Friday, Oct 18 • 5:00 PM EST
                        </p>
                      </div>

                      <div className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                          Urgency Level
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          <Flame className="w-3.5 h-3.5" /> High Priority
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {previewTab === 'actions' && (
                  <div className="space-y-2.5 animate-in fade-in">
                    <div className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-md border-2 border-primary-500 flex items-center justify-center bg-primary-500 text-white">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">
                            Verify OAuth 2.0 PKCE and token refresh rotation
                          </p>
                          <span className="text-[11px] text-slate-400">Due: Oct 18, 2026</span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        High
                      </span>
                    </div>

                    <div className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-md border-2 border-slate-300 dark:border-slate-600" />
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">
                            Run email sync load test (500 concurrent requests)
                          </p>
                          <span className="text-[11px] text-slate-400">Due: Oct 18, 2026</span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        Medium
                      </span>
                    </div>
                  </div>
                )}

                {previewTab === 'original' && (
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 font-mono whitespace-pre-wrap leading-relaxed animate-in fade-in">
{`Hi Team,

I hope you're having a productive week.
We are entering the final sprint before our major Q4 release. Please make sure all architecture diagrams and security compliance checklists are submitted and signed off before Friday, October 18 at 5:00 PM EST.

Key items:
1. Finalize OAuth 2.0 PKCE implementation and verify token refresh rotation.
2. Complete load testing on email sync endpoints.
3. Confirm database backup schedules.

Best regards,
Sarah Chen`}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 border-t border-slate-200/80 dark:border-slate-800/80 bg-white/50 dark:bg-slate-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
              SaaS Superpowers
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
              Engineered for High-Velocity Inboxes
            </h2>
            <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base">
              Say goodbye to email fatigue. Antigravity AI email synthesis organizes your priorities automatically.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Feature 1 */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-soft hover:shadow-soft-lg transition-all space-y-4">
              <div className="w-12 h-12 rounded-xl bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 flex items-center justify-center">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                3-Sentence Summaries
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Condense multi-page threads into crisp, factual summaries without losing critical details.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-soft hover:shadow-soft-lg transition-all space-y-4">
              <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <CheckSquare className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Action Task Extraction
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Automatically detects deliverables, requests, and deadlines and converts them into tasks.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-soft hover:shadow-soft-lg transition-all space-y-4">
              <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <Flame className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Urgency & Priority Scoring
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Smart heuristics identify blockers and urgent requests so you tackle what matters first.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-soft hover:shadow-soft-lg transition-all space-y-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Bot className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Tone-Aware Draft Replies
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Generate professional, friendly, or concise reply drafts ready for 1-click clipboard copy.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 border-t border-slate-200/80 dark:border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
              Simple 3-Step Setup
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white">
              How It Works
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 relative space-y-3">
              <span className="w-8 h-8 rounded-full bg-primary-600 text-white font-bold text-sm flex items-center justify-center">
                1
              </span>
              <h4 className="text-base font-bold text-slate-900 dark:text-white">
                Connect Securely
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Authorize read-only access via Google's official OAuth 2.0 flow or launch instant Demo Mode.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 relative space-y-3">
              <span className="w-8 h-8 rounded-full bg-brand-600 text-white font-bold text-sm flex items-center justify-center">
                2
              </span>
              <h4 className="text-base font-bold text-slate-900 dark:text-white">
                AI Analyzes & Extracts
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Incoming messages are parsed into structured summaries, key bullet points, and deadlines.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 relative space-y-3">
              <span className="w-8 h-8 rounded-full bg-accent-600 text-white font-bold text-sm flex items-center justify-center">
                3
              </span>
              <h4 className="text-base font-bold text-slate-900 dark:text-white">
                Execute with Action Center
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Triage priority items, track deliverables to completion, and maintain Inbox Zero with ease.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Privacy & Security Section */}
      <section id="privacy" className="py-20 border-t border-slate-200/80 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-900/50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-8 sm:p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-soft space-y-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Security & Privacy First
                </h3>
                <p className="text-xs text-slate-400">
                  Built to adhere to stringent enterprise and Google API security requirements.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <div className="space-y-2">
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Read-Only Gmail Permission
                </span>
                <p>We only ask for read-only access. We cannot modify, delete, or send emails from your Gmail account.</p>
              </div>
              <div className="space-y-2">
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> AES-256 Token Encryption
                </span>
                <p>All stored OAuth credentials are encrypted at rest using industry standard Fernet cryptography.</p>
              </div>
              <div className="space-y-2">
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> No AI Model Training
                </span>
                <p>Your email text is treated as ephemeral passive data. Your personal content is never used to train LLMs.</p>
              </div>
              <div className="space-y-2">
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Prompt-Injection Defense
                </span>
                <p>Emails are sanitized and wrapped in strict data boundaries to eliminate prompt injection attacks.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Accordion Section */}
      <section id="faq" className="py-20 border-t border-slate-200/80 dark:border-slate-800/80">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
              Questions & Answers
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = activeFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden transition-colors"
                >
                  <button
                    onClick={() => setActiveFaq(isOpen ? null : idx)}
                    className="w-full p-5 text-left flex items-center justify-between gap-4 font-semibold text-sm sm:text-base text-slate-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 dark:border-slate-800/80 py-12 bg-white dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary-600 to-brand-600 flex items-center justify-center text-white">
              <Mail className="w-4 h-4" />
            </div>
            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
              AI Email Summarizer
            </span>
          </div>

          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} AI Email Summarizer. All rights reserved.
          </p>

          <div className="flex items-center gap-6 text-xs text-slate-500">
            <Link to="/login" className="hover:text-primary-600">Login</Link>
            <Link to="/signup" className="hover:text-primary-600">Sign Up</Link>
            <a href="#privacy" className="hover:text-primary-600">Privacy Policy</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
