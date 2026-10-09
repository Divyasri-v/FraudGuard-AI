import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, RefreshCw, ShieldAlert, CheckCircle, XCircle,
  FileText, AlertTriangle, ChevronDown, ChevronUp, Bot, ExternalLink,
  Building2, User, Activity, FileCheck, Sparkles
} from 'lucide-react';
import { claimsAPI, fraudAPI, reviewQueueAPI, investigationsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import RiskBadge from '../components/common/RiskBadge';
import StatusBadge from '../components/common/StatusBadge';
import { RiskMeterGauge, ClaimDocumentVisual, FraudShieldVisual } from '../components/common/ProjectVisuals';

const ClaimDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isInvestigator = user?.role === 'Investigator' || user?.role === 'INVESTIGATOR';
  const [claim, setClaim] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [expandedRules, setExpandedRules] = useState({});
  const [actionNote, setActionNote] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  useEffect(() => {
    loadClaimDetails();
  }, [id]);

  const loadClaimDetails = async () => {
    setLoading(true);
    try {
      const res = await claimsAPI.getClaim(id);
      setClaim(res.data);
      // Automatically expand triggered rules
      const initExpanded = {};
      res.data.detections?.forEach((d) => {
        if (d.triggered) initExpanded[d.rule_code] = true;
      });
      setExpandedRules(initExpanded);
    } catch (err) {
      console.error('Failed to load claim details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReanalyze = async () => {
    setAnalyzing(true);
    try {
      await fraudAPI.analyzeClaim(id);
      await loadClaimDetails();
      setActionSuccess('Re-analysis completed with updated 10-rule and ML scoring.');
      setTimeout(() => setActionSuccess(''), 4000);
    } catch (err) {
      console.error('Re-analysis error:', err);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleReviewAction = async (action) => {
    try {
      await reviewQueueAPI.updateAction(id, { action, note: actionNote });
      setActionNote('');
      setActionSuccess(`Claim marked as '${action}'.`);
      setTimeout(() => setActionSuccess(''), 4000);
      await loadClaimDetails();
    } catch (err) {
      console.error('Review action failed:', err);
    }
  };

  const toggleRule = (code) => {
    setExpandedRules((prev) => ({ ...prev, [code]: !prev[code] }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!claim) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
        <div className="text-slate-400 mb-2">Claim not found.</div>
        <Link to="/claims" className="text-blue-600 hover:underline text-xs">
          Return to Claims Repository
        </Link>
      </div>
    );
  }

  const triggeredCount = claim.detections?.filter((d) => d.triggered).length || 0;
  const ratio = (claim.claimed_amount / Math.max(claim.expected_amount, 1)).toFixed(2);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Breadcrumb & Action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight font-mono">{claim.claim_id}</h1>
              <RiskBadge level={claim.risk_level} score={claim.hybrid_score} size="lg" />
              <StatusBadge status={claim.claim_status} />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Service Date: {claim.service_date} • Submitted: {claim.submission_date}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleReanalyze}
            disabled={analyzing}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${analyzing ? 'animate-spin' : ''}`} />
            <span>{analyzing ? 'Evaluating...' : 'Re-run Analysis'}</span>
          </button>
          <Link
            to={`/assistant?claim_id=${claim.claim_id}`}
            className="px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-sm transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Ask AI Assistant</span>
          </Link>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg font-medium flex items-center space-x-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Overview Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Patient card */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-semibold uppercase tracking-wider">Patient Demographics</span>
            <User className="w-4 h-4 text-blue-500" />
          </div>
          <div className="font-bold text-slate-900 text-sm">
            {claim.patient?.synthetic_name || claim.patient_id}
          </div>
          <div className="text-xs text-slate-600 mt-1 space-y-0.5">
            <div>ID: <span className="font-mono text-blue-600">{claim.patient_id}</span></div>
            <div>Age: {claim.patient?.age || 'N/A'} • Gender: {claim.patient?.gender || 'N/A'}</div>
            <div>City: {claim.patient?.city || 'N/A'}</div>
            <div>Plan: <span className="font-medium text-slate-800">{claim.patient?.insurance_plan || 'N/A'}</span></div>
          </div>
          <Link
            to={`/patients/${claim.patient_id}`}
            className="text-[11px] text-blue-600 hover:underline mt-2 inline-block font-medium"
          >
            View patient claim history →
          </Link>
        </div>

        {/* Provider card */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-semibold uppercase tracking-wider">Healthcare Provider</span>
            <Building2 className="w-4 h-4 text-purple-500" />
          </div>
          <div className="font-bold text-slate-900 text-sm">
            {claim.provider?.provider_name || claim.provider_id}
          </div>
          <div className="text-xs text-slate-600 mt-1 space-y-0.5">
            <div>ID: <span className="font-mono text-purple-600">{claim.provider_id}</span></div>
            <div>Type: {claim.provider?.provider_type || 'Hospital'}</div>
            <div>City: {claim.provider?.city || 'N/A'}</div>
            <div>
              Suspicious Rate:{' '}
              <span className="font-bold text-rose-600 font-mono">
                {((claim.provider?.historical_suspicious_rate || 0) * 100).toFixed(1)}%
              </span>
            </div>
          </div>
          <Link
            to={`/providers/${claim.provider_id}`}
            className="text-[11px] text-blue-600 hover:underline mt-2 inline-block font-medium"
          >
            View provider risk profile →
          </Link>
        </div>

        {/* Financial Billing card */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-semibold uppercase tracking-wider">Billing &amp; Tariff Audit</span>
            <Activity className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Claimed Amount:</span>
              <span className="font-bold text-slate-900 font-mono text-sm">
                ₹{claim.claimed_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Benchmark Expected:</span>
              <span className="font-medium text-slate-700 font-mono">
                ₹{claim.expected_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-slate-100">
              <span className="text-slate-500">Inflation Ratio:</span>
              <span className={`font-mono font-bold ${ratio >= 1.5 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {ratio}×
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Prior Authorization:</span>
              <span className="font-medium text-slate-800">{claim.authorization_status}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Explainable AI: "Why Was This Claim Flagged?" Section with RiskMeterGauge */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white rounded-2xl p-6 shadow-xl border border-blue-500/30">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex-1 space-y-2.5">
            <div className="flex items-center space-x-2 text-cyan-300 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>Explainable AI • Automated Triage Rationale</span>
            </div>
            <h2 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
              WHY WAS THIS CLAIM FLAGGED?
            </h2>
            <div className="bg-slate-900/80 backdrop-blur-xs rounded-xl p-4 font-sans text-xs text-blue-50 leading-relaxed whitespace-pre-line border border-blue-500/20 shadow-inner">
              {claim.why_flagged || 'No anomalous indicators recorded. Parameters fall within standard bounds.'}
            </div>
            <div className="pt-1 flex flex-wrap items-center gap-4 text-xs text-blue-200">
              <div className="bg-slate-900/60 px-2.5 py-1 rounded-lg border border-slate-800">
                Hybrid Score: <strong className="text-white font-mono">{claim.hybrid_score}</strong>
              </div>
              <div className="bg-slate-900/60 px-2.5 py-1 rounded-lg border border-slate-800">
                Rule Score (70%): <strong className="text-emerald-400 font-mono">{claim.risk_score}</strong>
              </div>
              <div className="bg-slate-900/60 px-2.5 py-1 rounded-lg border border-slate-800">
                ML Anomaly (30%): <strong className="text-cyan-400 font-mono">{claim.ml_anomaly_score}</strong>
              </div>
              <div className="ml-auto text-[11px] font-bold text-amber-300">
                {triggeredCount} of 10 FWA Rules Triggered
              </div>
            </div>
          </div>

          {/* Visual Analog Risk Gauge */}
          <div className="p-4 bg-slate-900/80 rounded-2xl border border-blue-500/25 flex flex-col items-center justify-center flex-shrink-0 shadow-lg">
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">
              Calibrated Risk Meter
            </div>
            <RiskMeterGauge score={claim.hybrid_score} size={160} />
          </div>
        </div>
      </div>

      {/* 10 Fraud Detection Rules Breakdown (Expandable Accordion) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">10 Fraud Detection Rules Evaluation</h2>
            <p className="text-xs text-slate-500">Granular outcome for all active independent detection modules</p>
          </div>
          <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">
            {triggeredCount} Triggered
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {claim.detections?.map((d) => {
            const isOpen = !!expandedRules[d.rule_code];
            let evidenceParsed = null;
            try {
              if (d.evidence) evidenceParsed = typeof d.evidence === 'string' ? JSON.parse(d.evidence) : d.evidence;
            } catch (e) {
              evidenceParsed = d.evidence;
            }

            return (
              <div key={d.rule_code} className={`transition-colors ${d.triggered ? 'bg-amber-50/20' : ''}`}>
                <div
                  onClick={() => toggleRule(d.rule_code)}
                  className="px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-50"
                >
                  <div className="flex items-center space-x-3">
                    {d.triggered ? (
                      <XCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />
                    ) : (
                      <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    )}
                    <div>
                      <div className="font-semibold text-xs text-slate-900 flex items-center space-x-2">
                        <span>{d.rule_name}</span>
                        <span className="font-mono text-[10px] text-slate-400">({d.rule_code})</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{d.reason}</div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    {d.triggered ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                        DETECTED (+{d.risk_contribution} pts)
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                        NOT DETECTED
                      </span>
                    )}
                    {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </div>

                {isOpen && (
                  <div className="px-5 pb-4 pt-1 bg-slate-50/70 border-t border-slate-100 text-xs space-y-2">
                    <div>
                      <strong className="text-slate-700">Clinical / Billing Rationale:</strong>
                      <p className="text-slate-600 mt-0.5">{d.reason}</p>
                    </div>
                    {evidenceParsed && (
                      <div>
                        <strong className="text-slate-700">Evidentiary Telemetry:</strong>
                        <pre className="mt-1 p-2.5 bg-slate-900 text-emerald-400 rounded-lg text-[11px] font-mono overflow-x-auto">
                          {typeof evidenceParsed === 'object' ? JSON.stringify(evidenceParsed, null, 2) : evidenceParsed}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Synthetic Supporting Documents Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 hover:shadow-md transition-all duration-250">
        <div className="flex items-center space-x-3 mb-3">
          <ClaimDocumentVisual size={32} />
          <div>
            <h2 className="text-sm font-bold text-slate-900">Synthetic Supporting Evidence Documents</h2>
            <p className="text-xs text-slate-500">
              Simulated documentary attachments generated for this claim
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {claim.documents?.map((doc) => (
            <div key={doc.id} className="p-3 border border-slate-200 rounded-xl bg-slate-50 flex items-start space-x-3 hover:border-blue-400/50 hover:bg-blue-50/40 hover:scale-[1.01] transition-all duration-200">
              <FileCheck className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <div className="text-xs font-semibold text-slate-900 truncate">{doc.file_name}</div>
                <div className="text-[10px] text-slate-500 uppercase">{doc.document_type}</div>
                <div className="text-[10px] text-emerald-600 font-semibold mt-1">✓ Synthetic Verified</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action / Inspection Box */}
      {isInvestigator ? (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs">
          <div>
            <span className="font-bold text-blue-900 block sm:inline">Investigator Telemetry Mode:</span>
            <span className="text-blue-700 sm:ml-1.5">You are inspecting this claim via linked investigation case. Formal case findings, notes, and closure decisions must be completed in your Investigation Dossier.</span>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold flex-shrink-0 transition-all duration-200 shadow-sm hover:shadow-[0_0_15px_rgba(37,99,235,0.4)] hover:scale-102 cursor-pointer"
          >
            Return to Investigation Dossier
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-all duration-250">
          <h2 className="text-sm font-bold text-slate-900 mb-1">Fraud Analyst Triage Decision</h2>
          <p className="text-xs text-slate-500 mb-3">Analyze forensic indicators, move claim to Under Review, Clear, or Escalate to Investigator</p>
          <div className="space-y-3">
            <textarea
              value={actionNote}
              onChange={(e) => setActionNote(e.target.value)}
              placeholder="Add clinical audit note or handover justification for Investigator..."
              rows={2}
              className="w-full p-3 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-all"
            />
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => handleReviewAction('UNDER_REVIEW')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-all duration-200 hover:scale-102 hover:shadow-[0_0_15px_rgba(37,99,235,0.4)] cursor-pointer"
              >
                Mark Under Review
              </button>
              <button
                onClick={() => handleReviewAction('CLEAR')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-all duration-200 hover:scale-102 hover:shadow-[0_0_15px_rgba(16,185,129,0.4)] cursor-pointer"
              >
                Clear Claim
              </button>
              <button
                onClick={() => handleReviewAction('ESCALATE')}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 via-indigo-600 to-rose-600 hover:from-purple-700 hover:to-rose-700 text-white rounded-xl text-xs font-bold transition-all duration-200 hover:scale-102 hover:shadow-[0_0_20px_rgba(168,85,247,0.45)] flex items-center space-x-1.5 cursor-pointer"
              >
                <span>🚨 Escalate to Investigator</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClaimDetails;
