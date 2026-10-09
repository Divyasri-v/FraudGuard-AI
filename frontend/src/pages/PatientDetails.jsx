import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Calendar, ShieldAlert, CheckCircle, AlertTriangle, FileText } from 'lucide-react';
import { patientsAPI } from '../services/api';
import RiskBadge from '../components/common/RiskBadge';
import StatusBadge from '../components/common/StatusBadge';

const PatientDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPatient();
  }, [id]);

  const loadPatient = async () => {
    setLoading(true);
    try {
      const res = await patientsAPI.getPatient(id);
      setData(res.data);
    } catch (err) {
      console.error('Failed to load patient history:', err);
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
        <div className="text-slate-400 mb-2">Patient not found.</div>
        <Link to="/patients" className="text-blue-600 hover:underline text-xs">
          Return to Patients
        </Link>
      </div>
    );
  }

  const { patient, stats, timeline, suspicious_claims } = data;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex items-center space-x-3">
        <button
          onClick={() => navigate(-1)}
          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">{patient.synthetic_name}</h1>
            <span className="font-mono text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              {patient.patient_id}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {patient.age} years old • {patient.gender} • {patient.city} • Plan: {patient.insurance_plan}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-semibold uppercase text-slate-500">Total Billed Claims</div>
          <div className="text-xl font-bold text-slate-900 mt-1">{stats.total_claims}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-semibold uppercase text-slate-500">Flagged Suspicious Claims</div>
          <div className="text-xl font-bold text-amber-600 mt-1">{stats.suspicious_claims_count}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-semibold uppercase text-slate-500">Total Claimed Sum</div>
          <div className="text-xl font-bold text-slate-900 mt-1 font-mono">
            ₹{stats.total_claimed_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Chronological Claim Timeline */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
        <h2 className="text-sm font-bold text-slate-900 mb-1">Chronological Claim Timeline</h2>
        <p className="text-xs text-slate-500 mb-5">History of service encounters and submitted insurance claims</p>

        <div className="relative border-l-2 border-slate-200 ml-4 space-y-6">
          {timeline.map((c) => {
            const isSuspicious = ['MEDIUM', 'HIGH', 'CRITICAL'].includes(c.risk_level);
            return (
              <div key={c.claim_id} className="relative pl-6">
                {/* Dot */}
                <div
                  className={`absolute -left-2 top-1.5 w-3.5 h-3.5 rounded-full border-2 bg-white ${
                    isSuspicious ? 'border-rose-500 bg-rose-100' : 'border-blue-500 bg-blue-100'
                  }`}
                />

                <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl hover:bg-slate-100/70 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-xs">
                    <div className="flex items-center space-x-2">
                      <Link to={`/claims/${c.claim_id}`} className="font-mono font-bold text-blue-600 hover:underline">
                        {c.claim_id}
                      </Link>
                      <RiskBadge level={c.risk_level} score={c.hybrid_score} />
                      <StatusBadge status={c.claim_status} />
                    </div>
                    <span className="text-slate-500 font-mono text-[11px]">{c.service_date}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2 pt-2 border-t border-slate-200 text-xs text-slate-700">
                    <div>
                      <span className="text-slate-500 text-[11px]">Provider: </span>
                      <Link to={`/providers/${c.provider_id}`} className="font-mono text-purple-600 hover:underline font-medium">
                        {c.provider_id}
                      </Link>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[11px]">Procedure: </span>
                      <span className="font-medium">{c.procedure_code} ({c.service_type})</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[11px]">Amount: </span>
                      <span className="font-bold font-mono">₹{c.claimed_amount?.toLocaleString('en-IN')}</span>
                      <span className="text-[10px] text-slate-400"> (Exp: ₹{c.expected_amount?.toLocaleString('en-IN')})</span>
                    </div>
                  </div>

                  {c.why_flagged && isSuspicious && (
                    <div className="mt-2.5 p-2 bg-amber-50/70 border border-amber-200/60 rounded text-[11px] text-amber-900 leading-relaxed">
                      <strong>Flagged Anomaly Rationale:</strong> {c.why_flagged}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PatientDetails;
