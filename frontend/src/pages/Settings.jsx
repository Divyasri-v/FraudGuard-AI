import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, CheckCircle, ShieldAlert, Sliders } from 'lucide-react';
import { fraudAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const Settings = () => {
  const { user } = useAuth();
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingCode, setSavingCode] = useState(null);
  const [feedback, setFeedback] = useState('');

  const isAdmin = user?.role === 'Admin';

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    setLoading(true);
    try {
      const res = await fraudAPI.getRules();
      setRules(res.data || []);
    } catch (err) {
      console.error('Failed to load rules:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (code, field, val) => {
    setRules((prev) =>
      prev.map((r) => (r.rule_code === code ? { ...r, [field]: val } : r))
    );
  };

  const handleSaveRule = async (rule) => {
    setSavingCode(rule.rule_code);
    try {
      await fraudAPI.updateRule(rule.rule_code, {
        severity: rule.severity,
        default_weight: parseFloat(rule.default_weight),
        threshold: parseFloat(rule.threshold),
        is_enabled: rule.is_enabled,
      });
      setFeedback(`Rule '${rule.rule_name}' updated successfully.`);
      setTimeout(() => setFeedback(''), 4000);
    } catch (err) {
      console.error('Failed to update rule:', err);
    } finally {
      setSavingCode(null);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
          <SettingsIcon className="w-6 h-6 text-blue-600" />
          <span>Fraud Detection Rule Settings &amp; Calibration</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure activation status, risk point contributions, thresholds, and severity classifications for all 10 FWA detection modules
        </p>
      </div>

      {!isAdmin && (
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl">
          ℹ️ You are viewing settings in read-only mode ({user?.role}). Only <strong>Admin</strong> users can modify detection weights and thresholds.
        </div>
      )}

      {feedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-medium flex items-center space-x-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800">10 Modular FWA Detection Engines</span>
          <span className="text-xs text-slate-500 font-mono">Formula: Cap at 100 points</span>
        </div>

        <div className="divide-y divide-slate-100">
          {rules.map((rule) => (
            <div key={rule.rule_code} className="p-4 hover:bg-slate-50/50 transition-colors">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-bold text-slate-900">{rule.rule_name}</span>
                    <span className="font-mono text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                      {rule.rule_code}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{rule.description}</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Enabled Toggle */}
                  <div className="flex items-center space-x-1.5">
                    <label className="text-[11px] font-semibold text-slate-600">Active:</label>
                    <input
                      type="checkbox"
                      checked={rule.is_enabled}
                      disabled={!isAdmin}
                      onChange={(e) => handleFieldChange(rule.rule_code, 'is_enabled', e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                    />
                  </div>

                  {/* Severity */}
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase">Severity</label>
                    <select
                      value={rule.severity}
                      disabled={!isAdmin}
                      onChange={(e) => handleFieldChange(rule.rule_code, 'severity', e.target.value)}
                      className="p-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 disabled:opacity-60"
                    >
                      <option value="LOW">LOW</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="HIGH">HIGH</option>
                      <option value="CRITICAL">CRITICAL</option>
                    </select>
                  </div>

                  {/* Weight */}
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase">Weight (pts)</label>
                    <input
                      type="number"
                      step="1"
                      value={rule.default_weight}
                      disabled={!isAdmin}
                      onChange={(e) => handleFieldChange(rule.rule_code, 'default_weight', e.target.value)}
                      className="w-20 p-1.5 text-xs font-mono border border-slate-200 rounded-lg bg-slate-50 disabled:opacity-60"
                    />
                  </div>

                  {/* Threshold */}
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase">Threshold</label>
                    <input
                      type="number"
                      step="0.1"
                      value={rule.threshold}
                      disabled={!isAdmin}
                      onChange={(e) => handleFieldChange(rule.rule_code, 'threshold', e.target.value)}
                      className="w-20 p-1.5 text-xs font-mono border border-slate-200 rounded-lg bg-slate-50 disabled:opacity-60"
                    />
                  </div>

                  {isAdmin && (
                    <button
                      onClick={() => handleSaveRule(rule)}
                      disabled={savingCode === rule.rule_code}
                      className="mt-3.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 shadow-xs transition-colors disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{savingCode === rule.rule_code ? 'Saving...' : 'Save'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Settings;
