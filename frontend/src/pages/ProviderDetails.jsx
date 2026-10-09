import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, Activity, ShieldAlert, CheckCircle, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { providersAPI } from '../services/api';
import RiskBadge from '../components/common/RiskBadge';
import StatusBadge from '../components/common/StatusBadge';

const ProviderDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProvider();
  }, [id]);

  const loadProvider = async () => {
    setLoading(true);
    try {
      const res = await providersAPI.getProvider(id);
      setData(res.data);
    } catch (err) {
      console.error('Failed to load provider profile:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
        <div className="text-slate-400 mb-2">Provider not found.</div>
        <Link to="/providers" className="text-blue-600 hover:underline text-xs">
          Return to Providers
        </Link>
      </div>
    );
  }

  const { provider, stats, fraud_breakdown, recent_claims } = data;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <button
          onClick={() => navigate(-1)}
          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">{provider.provider_name}</h1>
            <span className="font-mono text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
              {provider.provider_id}
            </span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
              provider.provider_risk_score >= 60 ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}>
              PROVIDER RISK: {provider.provider_risk_score}/100
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {provider.provider_type} • {provider.specialization} • {provider.city} • {provider.network_status}
          </p>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-semibold uppercase text-slate-500">Total Billed Claims</div>
          <div className="text-xl font-bold text-slate-900 mt-1">{stats.total_claims}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-semibold uppercase text-slate-500">Suspicious Claims</div>
          <div className="text-xl font-bold text-amber-600 mt-1">{stats.suspicious_claims}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">{stats.suspicious_rate}% rate</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-semibold uppercase text-slate-500">Critical Claims</div>
          <div className="text-xl font-bold text-rose-600 mt-1">{stats.critical_claims}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-semibold uppercase text-slate-500">SIU Investigations</div>
          <div className="text-xl font-bold text-indigo-600 mt-1">{stats.investigation_count}</div>
        </div>
      </div>

      {/* Fraud Breakdown Chart */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <h2 className="text-sm font-bold text-slate-900 mb-1">Detected Fraud Violations Distribution</h2>
        <p className="text-xs text-slate-500 mb-4">Rule infractions registered across claims from this provider</p>

        {fraud_breakdown.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-lg">
            No specific fraud rules have been triggered for this provider's synthetic claims.
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={fraud_breakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="rule" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Trigger Count" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Recent Claims Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <h2 className="text-sm font-bold text-slate-900">Recent Claims from this Provider</h2>
          <p className="text-xs text-slate-500">Sample of claims submitted by {provider.provider_name}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">Claim ID</th>
                <th className="py-2.5 px-4">Patient</th>
                <th className="py-2.5 px-4">Procedure</th>
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-4 text-right">Claimed</th>
                <th className="py-2.5 px-4 text-center">Risk</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recent_claims.map((c) => (
                <tr key={c.claim_id} className="hover:bg-slate-50/70">
                  <td className="py-3 px-4 font-mono font-bold text-blue-600">
                    <Link to={`/claims/${c.claim_id}`} className="hover:underline">
                      {c.claim_id}
                    </Link>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-700">{c.patient_id}</td>
                  <td className="py-3 px-4 font-mono text-slate-700">{c.procedure_code}</td>
                  <td className="py-3 px-4 text-slate-500">{c.service_date}</td>
                  <td className="py-3 px-4 text-right font-mono font-medium text-slate-900">
                    ₹{c.claimed_amount?.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <RiskBadge level={c.risk_level} score={c.hybrid_score} />
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={c.claim_status} />
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Link to={`/claims/${c.claim_id}`} className="text-blue-600 hover:underline font-semibold">
                      Inspect →
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

export default ProviderDetails;
