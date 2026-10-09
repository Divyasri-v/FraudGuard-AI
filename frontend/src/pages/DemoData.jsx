import React, { useState, useEffect } from 'react';
import { Database, RefreshCw, AlertTriangle, CheckCircle, ShieldCheck, Play, RotateCcw } from 'lucide-react';
import { demoAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const DemoData = () => {
  const { user } = useAuth();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [customClaims, setCustomClaims] = useState(1000);

  const canManageDemo = !!user;

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const res = await demoAPI.getStatus();
      setStatus(res.data);
    } catch (err) {
      console.error('Failed to load demo status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (count) => {
    setProcessing(true);
    setFeedback(`Regenerating ${count.toLocaleString()} synthetic claims with fixed seed 42...`);
    try {
      const res = await demoAPI.generate(count, 42);
      setFeedback(`Success! ${res.data.claims_count.toLocaleString()} synthetic claims generated and evaluated.`);
      await loadStatus();
    } catch (err) {
      setFeedback(`Error: ${err.response?.data?.detail || 'Failed to regenerate demo data.'}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleReset = async () => {
    setProcessing(true);
    setFeedback('Resetting demo database to default 1,000 synthetic claims...');
    try {
      await demoAPI.reset();
      setFeedback('Demo database reset successfully.');
      await loadStatus();
    } catch (err) {
      setFeedback(`Error: ${err.response?.data?.detail || 'Failed to reset demo data.'}`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center space-x-2">
          <Database className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          <span>Synthetic Dataset Generator &amp; Demo Controls</span>
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Generate reproducible synthetic claims, train the Isolation Forest model, and reset demo benchmarks
        </p>
      </div>

      {/* Safety Constraint Banner */}
      <div className="bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 rounded-xl p-4 text-xs text-blue-900 dark:text-blue-200 space-y-1 shadow-2xs hover:shadow-xs transition-shadow">
        <div className="font-bold flex items-center space-x-1.5 text-blue-800 dark:text-blue-300">
          <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span>Strict Safety Constraint: Maximum 10,000 Claims</span>
        </div>
        <p className="text-blue-700 dark:text-blue-300/90 leading-relaxed">
          The synthetic data generator operates with a fixed random seed (42) to guarantee reproducible simulations.
          To maintain browser performance and safe prototype memory boundaries, requests exceeding <strong>10,000 claims</strong> are strictly rejected by the backend.
        </p>
      </div>

      {feedback && (
        <div className="p-3 bg-slate-900 text-white text-xs rounded-xl font-mono flex items-center space-x-2 shadow-md">
          <RefreshCw className={`w-4 h-4 text-blue-400 ${processing ? 'animate-spin' : ''}`} />
          <span>{feedback}</span>
        </div>
      )}

      {/* Database State Stats */}
      <div className="bg-white dark:bg-slate-900/90 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300">
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3">Current Synthetic Database State</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 hover:-translate-y-1 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300 cursor-default">
            <div className="text-xs text-slate-500 dark:text-slate-400">Synthetic Claims Ingested</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
              {status?.claims_count?.toLocaleString() || '0'}
            </div>
            <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Max limit: 10,000</div>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 hover:-translate-y-1 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/10 transition-all duration-300 cursor-default">
            <div className="text-xs text-slate-500 dark:text-slate-400">Synthetic Patients</div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
              {status?.patients_count?.toLocaleString() || '0'}
            </div>
            <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Fictional profiles</div>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 hover:-translate-y-1 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-300 cursor-default">
            <div className="text-xs text-slate-500 dark:text-slate-400">Synthetic Providers</div>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
              {status?.providers_count?.toLocaleString() || '0'}
            </div>
            <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Hospitals &amp; clinics</div>
          </div>
        </div>
      </div>

      {/* Generator Controls */}
      <div className="bg-white dark:bg-slate-900/90 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">One-Click Synthetic Dataset Generation</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Select a target volume to clear the database, generate fresh synthetic claims with the 10 fraud patterns, and retrain the ML model
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => handleGenerate(1000)}
            disabled={processing || !canManageDemo}
            className="group p-4 rounded-xl border-2 border-blue-500 dark:border-blue-500/80 bg-blue-50/50 dark:bg-blue-950/30 hover:bg-blue-100/70 dark:hover:bg-blue-900/40 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-500/15 active:translate-y-0 active:scale-98 disabled:opacity-50 cursor-pointer"
          >
            <div className="text-sm font-bold text-blue-900 dark:text-blue-300 flex items-center space-x-1.5">
              <Play className="w-4 h-4 text-blue-600 dark:text-blue-400 group-hover:scale-125 group-hover:translate-x-0.5 transition-transform duration-200" />
              <span>Generate 1,000 Claims</span>
            </div>
            <p className="text-xs text-blue-700 dark:text-blue-300/80 mt-1">Fastest setup • Ideal for development testing (~5-10s)</p>
          </button>

          <button
            onClick={() => handleGenerate(5000)}
            disabled={processing || !canManageDemo}
            className="group p-4 rounded-xl border-2 border-indigo-500 dark:border-indigo-500/80 bg-indigo-50/50 dark:bg-indigo-950/30 hover:bg-indigo-100/70 dark:hover:bg-indigo-900/40 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/15 active:translate-y-0 active:scale-98 disabled:opacity-50 cursor-pointer"
          >
            <div className="text-sm font-bold text-indigo-900 dark:text-indigo-300 flex items-center space-x-1.5">
              <Play className="w-4 h-4 text-indigo-600 dark:text-indigo-400 group-hover:scale-125 group-hover:translate-x-0.5 transition-transform duration-200" />
              <span>Generate 5,000 Claims</span>
            </div>
            <p className="text-xs text-indigo-700 dark:text-indigo-300/80 mt-1">Medium load • Rigorous fraud pattern distribution</p>
          </button>

          <button
            onClick={() => handleGenerate(10000)}
            disabled={processing || !canManageDemo}
            className="group p-4 rounded-xl border-2 border-purple-500 dark:border-purple-500/80 bg-purple-50/50 dark:bg-purple-950/30 hover:bg-purple-100/70 dark:hover:bg-purple-900/40 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-purple-500/15 active:translate-y-0 active:scale-98 disabled:opacity-50 cursor-pointer"
          >
            <div className="text-sm font-bold text-purple-900 dark:text-purple-300 flex items-center space-x-1.5">
              <Play className="w-4 h-4 text-purple-600 dark:text-purple-400 group-hover:scale-125 group-hover:translate-x-0.5 transition-transform duration-200" />
              <span>Generate 10,000 Claims</span>
            </div>
            <p className="text-xs text-purple-700 dark:text-purple-300/80 mt-1">Full benchmark scale • Strict maximum allowed capacity</p>
          </button>
        </div>

        {/* Reset */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Reset Demo Database</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">Restore factory baseline of 1,000 synthetic records</div>
          </div>
          <button
            onClick={handleReset}
            disabled={processing || !canManageDemo}
            className="px-3.5 py-2 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer shadow-2xs hover:shadow-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Demo Data</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DemoData;
