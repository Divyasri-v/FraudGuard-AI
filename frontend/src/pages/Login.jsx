import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Lock, Mail, AlertTriangle, ArrowRight, Sparkles, Cpu, ShieldAlert } from 'lucide-react';
import { useAuth, DEMO_ACCOUNTS } from '../context/AuthContext';
import { FraudShieldVisual, NeuralAIVisual } from '../components/common/ProjectVisuals';

const Login = () => {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('analyst@fraudguard.demo');
  const [password, setPassword] = useState('Analyst@123');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const res = await login(email, password);
    if (res.success) {
      navigate('/');
    } else {
      setError(res.error);
    }
  };

  const handleQuickLogin = async (acc) => {
    setEmail(acc.email);
    setPassword(acc.password);
    setError('');
    const res = await login(acc.email, acc.password);
    if (res.success) {
      navigate('/');
    } else {
      setError(res.error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background aesthetic RGB glow blobs */}
      <div className="absolute top-0 -left-20 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-0 -right-20 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10">
        <div className="flex justify-center mb-4">
          <div className="p-3 rounded-2xl bg-slate-900/80 border border-blue-500/40 shadow-[0_0_30px_rgba(59,130,246,0.35)] transition-transform duration-300 hover:scale-105">
            <FraudShieldVisual size={68} />
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center justify-center gap-2">
          <span>FraudGuard AI</span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/40">
            v2.0
          </span>
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-400">
          Explainable Healthcare Insurance Claim Fraud Detection &amp; Investigation Platform
        </p>

        <div className="mt-3 mx-auto max-w-sm bg-amber-500/10 border border-amber-500/30 rounded-lg p-2 text-xs text-amber-300 font-medium flex items-center justify-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span>SYNTHETIC DEMO DATA – NOT REAL PATIENT DATA</span>
        </div>

        {/* Feature Badges */}
        <div className="mt-3 flex items-center justify-center gap-2 text-[10px] text-slate-400 font-medium flex-wrap">
          <span className="inline-flex items-center gap-1 bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700/80">
            <ShieldAlert className="w-3 h-3 text-rose-400" /> 10 FWA Rules
          </span>
          <span className="inline-flex items-center gap-1 bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700/80">
            <Cpu className="w-3 h-3 text-blue-400" /> Isolation Forest (30%)
          </span>
          <span className="inline-flex items-center gap-1 bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700/80">
            <Sparkles className="w-3 h-3 text-cyan-400" /> Gemini Copilot
          </span>
        </div>
      </div>

      {/* Login Card */}
      <div className="mt-5 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4 sm:px-0">
        <div className="bg-white dark:bg-slate-900/90 py-8 px-6 shadow-2xl rounded-2xl border border-slate-200 dark:border-slate-800 sm:px-10 backdrop-blur-md transition-all duration-300 hover:shadow-[0_0_35px_rgba(59,130,246,0.15)] hover:border-blue-500/40">
          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs rounded-lg animate-in fade-in duration-200">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Demo Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="analyst@fraudguard.demo"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center justify-center space-x-2 transition-all duration-250 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 disabled:opacity-50 cursor-pointer"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In to Portal'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Accounts */}
          <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5 text-center">
              Quick One-Click Demo Logins
            </div>
            <div className="grid grid-cols-1 gap-2">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => handleQuickLogin(acc)}
                  className="w-full text-left p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 hover:bg-blue-50/70 dark:hover:bg-blue-950/40 hover:border-blue-400/60 dark:hover:border-blue-500/60 transition-all duration-250 hover:scale-[1.015] active:scale-[0.99] hover:shadow-[0_0_15px_rgba(59,130,246,0.25)] cursor-pointer flex items-center justify-between text-xs group"
                >
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{acc.label || acc.role}:</span>{' '}
                    <span className="text-slate-600 dark:text-slate-400 font-mono text-[11px] block sm:inline">{acc.email}</span>
                  </div>
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-100/90 dark:bg-blue-950/90 border border-blue-200 dark:border-blue-800 px-2.5 py-1 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-all">
                    Login →
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
