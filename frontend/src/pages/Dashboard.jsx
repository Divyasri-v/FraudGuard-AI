import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText, CheckCircle2, AlertTriangle, AlertOctagon,
  Search, IndianRupee, Activity, Percent, ArrowUpRight,
  TrendingUp, ShieldAlert, Sparkles, Cpu, Layers
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from 'recharts';
import { dashboardAPI } from '../services/api';
import RiskBadge from '../components/common/RiskBadge';
import StatusBadge from '../components/common/StatusBadge';
import {
  FraudShieldVisual,
  NeuralAIVisual,
  RiskMeterGauge,
  ClaimDocumentVisual,
  HealthcareFacilityVisual
} from '../components/common/ProjectVisuals';

const Dashboard = () => {
  const [summary, setSummary] = useState(null);
  const [trends, setTrends] = useState([]);
  const [riskDist, setRiskDist] = useState([]);
  const [fraudTypes, setFraudTypes] = useState([]);
  const [topProviders, setTopProviders] = useState([]);
  const [exposureData, setExposureData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [sumRes, trRes, riskRes, fraudRes, provRes, expRes] = await Promise.all([
        dashboardAPI.getSummary(),
        dashboardAPI.getTrends(),
        dashboardAPI.getRiskDistribution(),
        dashboardAPI.getFraudTypes(),
        dashboardAPI.getTopProviders(),
        dashboardAPI.getFinancialExposure(),
      ]);

      setSummary(sumRes.data);
      setTrends(trRes.data);
      setRiskDist(riskRes.data);
      setFraudTypes(fraudRes.data);
      setTopProviders(provRes.data);
      setExposureData(expRes.data);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val) => {
    if (!val) return '₹0';
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
    return `₹${Number(val).toLocaleString('en-IN')}`;
  };

  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const kpis = [
    {
      label: 'Total Ingested Claims',
      val: summary?.total_claims?.toLocaleString() || '10,000',
      sub: 'Synthetic ledger database',
      icon: FileText,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-950/40 border-blue-100 dark:border-blue-900/60',
      glow: 'hover:shadow-[0_0_22px_rgba(59,130,246,0.35)] hover:border-blue-500/50',
    },
    {
      label: 'Adjudicated / Reviewed',
      val: summary?.claims_reviewed?.toLocaleString() || '0',
      sub: 'Triage actions recorded',
      icon: CheckCircle2,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-100 dark:border-emerald-900/60',
      glow: 'hover:shadow-[0_0_22px_rgba(16,185,129,0.35)] hover:border-emerald-500/50',
    },
    {
      label: 'Suspicious Claims',
      val: summary?.suspicious_claims?.toLocaleString() || '0',
      sub: 'MEDIUM / HIGH / CRITICAL',
      icon: AlertTriangle,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-100 dark:border-amber-900/60',
      glow: 'hover:shadow-[0_0_22px_rgba(245,158,11,0.35)] hover:border-amber-500/50',
    },
    {
      label: 'Critical Alert Tier',
      val: summary?.critical_claims?.toLocaleString() || '0',
      sub: 'Score ≥ 81.0 priority hold',
      icon: AlertOctagon,
      color: 'text-rose-600 dark:text-rose-400',
      bg: 'bg-rose-50 dark:bg-rose-950/40 border-rose-100 dark:border-rose-900/60',
      glow: 'hover:shadow-[0_0_22px_rgba(244,63,94,0.4)] hover:border-rose-500/60',
    },
    {
      label: 'Under Investigation',
      val: summary?.under_investigation?.toLocaleString() || '0',
      sub: 'Active SIU dossiers',
      icon: Search,
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-50 dark:bg-purple-950/40 border-purple-100 dark:border-purple-900/60',
      glow: 'hover:shadow-[0_0_22px_rgba(168,85,247,0.35)] hover:border-purple-500/50',
    },
    {
      label: 'Potential Risk Exposure',
      val: formatCurrency(summary?.potential_risk_amount),
      sub: 'Flagged claims cumulative',
      icon: IndianRupee,
      color: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-50 dark:bg-red-950/40 border-red-100 dark:border-red-900/60',
      glow: 'hover:shadow-[0_0_22px_rgba(239,68,68,0.4)] hover:border-red-500/60',
    },
    {
      label: 'Average Risk Score',
      val: `${summary?.average_risk_score || 0}/100`,
      sub: 'Population mean index',
      icon: Activity,
      color: 'text-indigo-600 dark:text-indigo-400',
      bg: 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-100 dark:border-indigo-900/60',
      glow: 'hover:shadow-[0_0_22px_rgba(99,102,241,0.35)] hover:border-indigo-500/50',
    },
    {
      label: 'Suspicious Ratio',
      val: `${summary?.suspicious_claim_percentage || 0}%`,
      sub: 'Total anomaly density',
      icon: Percent,
      color: 'text-orange-600 dark:text-orange-400',
      bg: 'bg-orange-50 dark:bg-orange-950/40 border-orange-100 dark:border-orange-900/60',
      glow: 'hover:shadow-[0_0_22px_rgba(249,115,22,0.35)] hover:border-orange-500/50',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2.5">
            <span>Healthcare Fraud Analytics Dashboard</span>
            <span className="text-xs bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/70 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live SIU Platform
            </span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time hybrid detection (70% Rules + 30% Isolation Forest) calibrated across 10,000 synthetic claim records
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Link
            to="/assistant"
            className="px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-xs font-semibold rounded-xl shadow-md shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-105 active:scale-95 flex items-center space-x-1.5 transition-all duration-250 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
            <span>AI Assistant</span>
          </Link>
          <Link
            to="/claims/new"
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-md shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-105 active:scale-95 flex items-center space-x-1.5 transition-all duration-250 cursor-pointer"
          >
            <span>Submit Claim</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            to="/review-queue"
            className="px-3.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl shadow-xs hover:shadow-md hover:scale-105 active:scale-95 transition-all duration-250 cursor-pointer"
          >
            Review Queue
          </Link>
        </div>
      </div>

      {/* Visual Telemetry Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-850 to-blue-950 p-5 border border-slate-800 shadow-xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-10 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div className="flex items-start sm:items-center space-x-4">
            <div className="p-2.5 rounded-xl bg-slate-950/80 border border-blue-500/40 shadow-[0_0_20px_rgba(59,130,246,0.3)] flex-shrink-0">
              <FraudShieldVisual size={46} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-bold text-white tracking-tight">
                  Dual-Engine SIU Decision Telemetry
                </span>
                <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/40 px-2 py-0.5 rounded-md font-mono font-bold">
                  70/30 HYBRID
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                Deterministic domain rule evaluation (10 FWA rules) coupled with unsupervised Isolation Forest ML anomaly scoring. Grounded Gemini AI copilot ready for claim deconstruction.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 self-start md:self-auto flex-shrink-0">
            <div className="bg-slate-950/60 border border-slate-800 px-3.5 py-2 rounded-xl text-center">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">FWA Rules</div>
              <div className="text-sm font-bold text-emerald-400 font-mono">10 Active</div>
            </div>
            <div className="bg-slate-950/60 border border-slate-800 px-3.5 py-2 rounded-xl text-center">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">ML Engine</div>
              <div className="text-sm font-bold text-cyan-400 font-mono">IsoForest</div>
            </div>
            <div className="bg-slate-950/60 border border-slate-800 px-3.5 py-2 rounded-xl text-center">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Gemini AI</div>
              <div className="text-sm font-bold text-amber-400 font-mono">2.5 Flash</div>
            </div>
          </div>
        </div>
      </div>

      {/* 8 KPI Cards Grid with RGB Neon Hover Elevation */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              className={`group bg-white dark:bg-slate-900/90 p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-2xs hover:-translate-y-1 hover:scale-[1.015] transition-all duration-280 flex items-start space-x-3.5 cursor-default ${kpi.glow}`}
            >
              <div className={`p-2.5 rounded-xl border ${kpi.bg} ${kpi.color} flex-shrink-0 mt-0.5 group-hover:scale-115 group-hover:rotate-3 transition-transform duration-280`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">{kpi.label}</div>
                <div className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5 tracking-tight truncate">{kpi.val}</div>
                <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">{kpi.sub}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Grid Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Claims Over Time */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:shadow-lg transition-all duration-280">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Claim Ingestion &amp; Suspicious Volume Over Time</h2>
              <p className="text-xs text-slate-500">Timeline of total submissions vs flagged claims</p>
            </div>
            <span className="text-[11px] text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded">Timeline</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trends}>
                <defs>
                  <linearGradient id="totalColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="suspColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Area type="monotone" dataKey="total_claims" stroke="#3b82f6" fillOpacity={1} fill="url(#totalColor)" name="Total Claims" />
                <Area type="monotone" dataKey="suspicious_claims" stroke="#ef4444" fillOpacity={1} fill="url(#suspColor)" name="Suspicious Claims" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Risk Tier Distribution & Speedometer Gauge */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:shadow-lg transition-all duration-280 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Risk Tier Distribution</h2>
                <p className="text-xs text-slate-500">Population categorization &amp; mean gauge</p>
              </div>
              <span className="text-[11px] text-purple-600 font-semibold bg-purple-50 px-2 py-0.5 rounded">Classification</span>
            </div>

            {/* Visual Risk Gauge */}
            <div className="py-2 flex justify-center">
              <RiskMeterGauge score={summary?.average_risk_score || 38.6} size={150} />
            </div>

            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={riskDist}
                    dataKey="count"
                    nameKey="level"
                    cx="50%"
                    cy="50%"
                    innerRadius={36}
                    outerRadius={56}
                    paddingAngle={3}
                  >
                    {riskDist.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 text-xs">
            {riskDist.map((r) => (
              <div key={r.level} className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: r.color }} />
                <span className="font-medium text-slate-600">{r.level}:</span>
                <span className="font-bold text-slate-900">{r.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Grid Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 3: Fraud Patterns Distribution */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:shadow-lg transition-all duration-280">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">10 Fraud Rules Distribution</h2>
              <p className="text-xs text-slate-500">Number of triggered detections by FWA rule type</p>
            </div>
            <span className="text-[11px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded">Detection Rules</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={fraudTypes} margin={{ left: 30, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis dataKey="rule_name" type="category" tick={{ fontSize: 10 }} width={120} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Trigger Count" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Financial Exposure by Fraud Mechanism */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:shadow-lg transition-all duration-280">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Financial Exposure by Fraud Type</h2>
              <p className="text-xs text-slate-500">Aggregate claimed amount flagged per violation</p>
            </div>
            <span className="text-[11px] text-rose-600 font-semibold bg-rose-50 px-2 py-0.5 rounded">Financial Risk</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={exposureData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="rule" tick={{ fontSize: 9 }} angle={-25} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(val) => formatCurrency(val)}
                  contentStyle={{ fontSize: 11, borderRadius: 8 }}
                />
                <Bar dataKey="exposure" fill="#f43f5e" radius={[4, 4, 0, 0]} name="Exposure (₹)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Suspicious Providers Table with Facility Visual */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden hover:shadow-lg transition-all duration-280">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <HealthcareFacilityVisual size={28} />
            <div>
              <h2 className="text-sm font-bold text-slate-900">Top Suspicious Healthcare Providers</h2>
              <p className="text-xs text-slate-500">Facilities exhibiting elevated anomaly rates and high-risk claims</p>
            </div>
          </div>
          <Link
            to="/providers"
            className="text-xs text-blue-600 font-semibold hover:text-blue-800 transition-colors flex items-center gap-1"
          >
            <span>View all providers</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">Provider ID</th>
                <th className="py-2.5 px-4">Provider Name</th>
                <th className="py-2.5 px-4">Risk Score</th>
                <th className="py-2.5 px-4">Suspicious Rate</th>
                <th className="py-2.5 px-4">Total Claims</th>
                <th className="py-2.5 px-4">Critical Claims</th>
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {topProviders.map((p) => (
                <tr key={p.provider_id} className="hover:bg-blue-50/40 transition-colors">
                  <td className="py-3 px-4 font-mono font-medium text-blue-600">{p.provider_id}</td>
                  <td className="py-3 px-4 font-medium text-slate-800">{p.provider_name}</td>
                  <td className="py-3 px-4">
                    <span className="font-bold font-mono text-slate-800">{p.risk_score}</span>
                    <span className="text-[10px] text-slate-400">/100</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-rose-600 font-semibold">{p.suspicious_rate}%</span>
                  </td>
                  <td className="py-3 px-4 text-slate-600">{p.total_claims}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                      {p.critical_claims} critical
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Link
                      to={`/providers/${p.provider_id}`}
                      className="text-blue-600 hover:text-blue-800 font-medium hover:underline text-xs"
                    >
                      Profile →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
