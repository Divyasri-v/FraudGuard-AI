import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { PlusCircle, CheckCircle, ArrowRight, Activity, ShieldCheck, Loader2 } from 'lucide-react';
import { claimsAPI, patientsAPI, providersAPI } from '../services/api';
import RiskBadge from '../components/common/RiskBadge';

const SAMPLE_PROCEDURES = [
  { code: 'PROC_CONSULT_LVL2', name: 'Standard Consultation', type: 'Consultation', expected: 1500, diag: 'J18.9' },
  { code: 'PROC_CONSULT_LVL5', name: 'Complex Multi-organ Consultation', type: 'Consultation', expected: 4500, diag: 'I10' },
  { code: 'PROC_DIAG_XRAY', name: 'Chest Radiograph Multi-view', type: 'Diagnostic Imaging', expected: 2200, diag: 'J18.9' },
  { code: 'PROC_DIAG_MRI_CONTRAST', name: 'Dual-Phase Contrast MRI', type: 'Diagnostic Imaging', expected: 12500, diag: 'M54.5' },
  { code: 'PROC_LAP_CHOLE', name: 'Laparoscopic Cholecystectomy Package', type: 'Surgery', expected: 45000, diag: 'K80.2' },
  { code: 'PROC_OPEN_APPENDECTOMY', name: 'Open Surgical Appendectomy', type: 'Surgery', expected: 38000, diag: 'K35.8' },
  { code: 'PROC_LAP_APPENDECTOMY', name: 'Laparoscopic Appendectomy', type: 'Surgery', expected: 42000, diag: 'K35.8' },
  { code: 'PROC_KNEE_REPLACE', name: 'Total Knee Arthroplasty Package', type: 'Surgery', expected: 85000, diag: 'M17.1' },
  { code: 'PROC_CESAREAN', name: 'Cesarean Section Delivery', type: 'Surgery', expected: 52000, diag: 'O82' }
];

const CHECKLIST_RULES = [
  'Duplicate Check',
  'Upcoding Check',
  'Unbundling Check',
  'Phantom Check',
  'False Claim Check',
  'Inflated Billing Check',
  'Incorrect Billing Check',
  'Unsupported Service Check',
  'Timing Check',
  'Compatibility Check'
];

const ClaimSubmit = () => {
  const navigate = useNavigate();
  const [patientId, setPatientId] = useState('PAT00001');
  const [providerId, setProviderId] = useState('HSP0001');
  const [serviceDate, setServiceDate] = useState('2026-04-15');
  const [procedureCode, setProcedureCode] = useState('PROC_CONSULT_LVL2');
  const [diagnosisCode, setDiagnosisCode] = useState('J18.9');
  const [serviceType, setServiceType] = useState('Consultation');
  const [claimedAmount, setClaimedAmount] = useState('1500');
  const [expectedAmount, setExpectedAmount] = useState('1500');
  const [quantity, setQuantity] = useState(1);
  const [authStatus, setAuthStatus] = useState('PRE_APPROVED');
  const [docStatus, setDocStatus] = useState('COMPLETE');

  const [submitting, setSubmitting] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [createdClaim, setCreatedClaim] = useState(null);
  const [error, setError] = useState('');

  const handleProcedureSelect = (proc) => {
    setProcedureCode(proc.code);
    setServiceType(proc.type);
    setExpectedAmount(proc.expected.toString());
    setClaimedAmount(proc.expected.toString());
    setDiagnosisCode(proc.diag);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    setAnalysisStep(0);
    setCreatedClaim(null);

    try {
      const payload = {
        patient_id: patientId.trim(),
        provider_id: providerId.trim(),
        service_date: serviceDate,
        procedure_code: procedureCode,
        diagnosis_code: diagnosisCode,
        service_type: serviceType,
        claimed_amount: parseFloat(claimedAmount),
        expected_amount: parseFloat(expectedAmount),
        quantity: parseInt(quantity, 10),
        authorization_status: authStatus,
        supporting_document_status: docStatus,
      };

      // Step-by-step UI animation simulating 10-rule engine audit
      for (let i = 1; i <= CHECKLIST_RULES.length; i++) {
        await new Promise((res) => setTimeout(res, 80));
        setAnalysisStep(i);
      }

      const res = await claimsAPI.createClaim(payload);
      setCreatedClaim(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit claim. Check inputs.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
          <PlusCircle className="w-6 h-6 text-blue-600" />
          <span>Synthetic Claim Intake &amp; Live Fraud Analysis</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Submit a new synthetic healthcare claim and execute live rule-based triage and ML anomaly assessment
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Container */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Quick Templates */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Quick Procedure Templates
              </label>
              <div className="flex flex-wrap gap-1.5">
                {SAMPLE_PROCEDURES.slice(0, 6).map((p) => (
                  <button
                    key={p.code}
                    type="button"
                    onClick={() => handleProcedureSelect(p)}
                    className={`px-2.5 py-1 text-[11px] rounded-lg border transition-colors ${
                      procedureCode === p.code
                        ? 'bg-blue-50 border-blue-400 text-blue-700 font-bold'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Synthetic Patient ID</label>
                <input
                  type="text"
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  required
                  placeholder="e.g. PAT00001"
                  className="w-full p-2 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Synthetic Provider ID</label>
                <input
                  type="text"
                  value={providerId}
                  onChange={(e) => setProviderId(e.target.value)}
                  required
                  placeholder="e.g. HSP0001"
                  className="w-full p-2 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Service Date</label>
                <input
                  type="date"
                  value={serviceDate}
                  onChange={(e) => setServiceDate(e.target.value)}
                  required
                  className="w-full p-2 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Diagnosis Code (ICD-10)</label>
                <input
                  type="text"
                  value={diagnosisCode}
                  onChange={(e) => setDiagnosisCode(e.target.value)}
                  required
                  className="w-full p-2 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Procedure Code</label>
                <input
                  type="text"
                  value={procedureCode}
                  onChange={(e) => setProcedureCode(e.target.value)}
                  required
                  className="w-full p-2 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Claimed Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={claimedAmount}
                  onChange={(e) => setClaimedAmount(e.target.value)}
                  required
                  className="w-full p-2 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Benchmark Tariff (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={expectedAmount}
                  onChange={(e) => setExpectedAmount(e.target.value)}
                  required
                  className="w-full p-2 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full p-2 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Authorization Status</label>
                <select
                  value={authStatus}
                  onChange={(e) => setAuthStatus(e.target.value)}
                  className="w-full p-2 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="PRE_APPROVED">PRE_APPROVED</option>
                  <option value="PENDING">PENDING</option>
                  <option value="MISSING">MISSING (Triggers Unsupported)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Supporting Documents</label>
                <select
                  value={docStatus}
                  onChange={(e) => setDocStatus(e.target.value)}
                  className="w-full p-2 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="COMPLETE">COMPLETE (Verified)</option>
                  <option value="PARTIAL">PARTIAL</option>
                  <option value="MISSING">MISSING (Triggers Unsupported)</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-4 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-sm flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Evaluating 10 Fraud Rules &amp; Isolation Forest...</span>
                </>
              ) : (
                <>
                  <span>Create &amp; Analyze Synthetic Claim</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Live Analysis Terminal Display */}
        <div className="bg-slate-900 text-slate-300 p-5 rounded-xl border border-slate-800 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
              <span className="text-xs font-mono font-bold text-emerald-400">⚡ FRAUD SCAN CONSOLE</span>
              <span className="text-[10px] text-slate-500 font-mono">ENGINE V1.0</span>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="text-slate-400">Claim Ingestion Status:</div>
              <div className="text-slate-100 flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                <span>{submitting ? 'Pipeline executing...' : (createdClaim ? 'Claim Evaluated' : 'Awaiting input')}</span>
              </div>

              <div className="pt-2 text-[11px] text-slate-400">Pipeline Rules Check:</div>
              <div className="space-y-1 pt-1">
                {CHECKLIST_RULES.map((ruleName, idx) => {
                  const done = analysisStep > idx || createdClaim;
                  return (
                    <div
                      key={ruleName}
                      className={`flex items-center space-x-2 text-[11px] ${
                        done ? 'text-emerald-400' : 'text-slate-600'
                      }`}
                    >
                      <span>{done ? '✓' : '○'}</span>
                      <span>{ruleName}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Outcome Card */}
          {createdClaim && (
            <div className="mt-4 pt-4 border-t border-slate-800 space-y-2 bg-slate-950/60 p-3 rounded-lg">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Claim ID:</span>
                <span className="font-mono font-bold text-blue-400">{createdClaim.claim_id}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Hybrid Risk Score:</span>
                <span className="font-mono font-bold text-white">{createdClaim.hybrid_score}/100</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Risk Level:</span>
                <RiskBadge level={createdClaim.risk_level} score={createdClaim.hybrid_score} />
              </div>

              <Link
                to={`/claims/${createdClaim.claim_id}`}
                className="mt-2 w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-center block text-xs font-semibold font-sans transition-colors"
              >
                Inspect Detailed Claim Analysis →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClaimSubmit;
