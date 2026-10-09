import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ShieldCheck, AlertTriangle, FileText, CheckCircle,
  Clock, Plus, Upload, User, Building2, ChevronRight, Activity, Paperclip, Sparkles,
  XCircle, X, ExternalLink
} from 'lucide-react';
import { investigationsAPI } from '../services/api';
import RiskBadge from '../components/common/RiskBadge';
import StatusBadge from '../components/common/StatusBadge';
import { InvestigationDossierVisual, RiskMeterGauge, FraudShieldVisual } from '../components/common/ProjectVisuals';

const InvestigationDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);

  // New note form state
  const [noteContent, setNoteContent] = useState('');
  const [noteType, setNoteType] = useState('OBSERVATION');
  const [submittingNote, setSubmittingNote] = useState(false);

  // New evidence form state
  const [evidenceDesc, setEvidenceDesc] = useState('');
  const [evidenceType, setEvidenceType] = useState('SYNTHETIC_INVOICE');
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const [showInspectModal, setShowInspectModal] = useState(false);

  // Status update state
  const [newStatus, setNewStatus] = useState('');
  const [newRecommendation, setNewRecommendation] = useState('');
  const [feedback, setFeedback] = useState('');

  const handleQuickDecision = async (decisionStatus) => {
    try {
      const rec = newRecommendation || (
        decisionStatus === 'CLOSED_NO_CONCERN'
          ? 'Case cleared. No conclusive billing fraud detected.'
          : decisionStatus === 'CLOSED_FINDINGS'
          ? 'Investigation closed with findings. Billing anomalies confirmed.'
          : decisionStatus === 'IN_PROGRESS'
          ? 'Investigator commenced active inquiry.'
          : 'Status updated by investigator.'
      );
      await investigationsAPI.updateInvestigation(id, {
        status: decisionStatus,
        recommendation: rec,
      });
      setFeedback(`Investigation status successfully updated to ${decisionStatus}.`);
      setTimeout(() => setFeedback(''), 4000);
      await loadCaseDetails();
    } catch (err) {
      console.error('Decision update failed:', err);
    }
  };

  useEffect(() => {
    loadCaseDetails();
  }, [id]);

  const loadCaseDetails = async () => {
    setLoading(true);
    try {
      const res = await investigationsAPI.getInvestigation(id);
      setCaseData(res.data);
      setNewStatus(res.data.status);
      setNewRecommendation(res.data.recommendation || '');
    } catch (err) {
      console.error('Failed to load investigation details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!noteContent.trim()) return;
    setSubmittingNote(true);
    try {
      await investigationsAPI.addNote(id, { content: noteContent.trim(), note_type: noteType });
      setNoteContent('');
      setFeedback('Investigation note added successfully.');
      setTimeout(() => setFeedback(''), 4000);
      await loadCaseDetails();
    } catch (err) {
      console.error('Failed to add note:', err);
    } finally {
      setSubmittingNote(false);
    }
  };

  const handleAddEvidence = async (e) => {
    e.preventDefault();
    if (!evidenceDesc.trim()) return;
    try {
      await investigationsAPI.addEvidence(id, {
        description: evidenceDesc.trim(),
        evidence_type: evidenceType,
        source: 'Synthetic Hospital Electronic Records',
      });
      setEvidenceDesc('');
      setShowEvidenceModal(false);
      setFeedback('Synthetic evidence document registered.');
      setTimeout(() => setFeedback(''), 4000);
      await loadCaseDetails();
    } catch (err) {
      console.error('Failed to add evidence:', err);
    }
  };

  const handleUpdateStatus = async () => {
    try {
      await investigationsAPI.updateInvestigation(id, {
        status: newStatus,
        recommendation: newRecommendation,
      });
      setFeedback(`Investigation status updated to ${newStatus}.`);
      setTimeout(() => setFeedback(''), 4000);
      await loadCaseDetails();
    } catch (err) {
      console.error('Status update failed:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
        <div className="text-slate-400 mb-2">Investigation case dossier not found.</div>
        <Link to="/investigations" className="text-blue-600 hover:underline text-xs">
          Return to Investigations List
        </Link>
      </div>
    );
  }

  const claim = caseData.claim;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Breadcrumb & Header with Investigation Dossier Visual */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center space-x-3.5">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 shadow-2xs hover:scale-105 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="p-1 rounded-xl bg-slate-900 border border-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.35)] flex-shrink-0">
            <InvestigationDossierVisual size={42} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight font-mono">{caseData.case_number}</h1>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border shadow-2xs ${
                caseData.priority === 'CRITICAL' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                {caseData.priority} PRIORITY
              </span>
              <StatusBadge status={caseData.status} />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Assigned: {caseData.investigator || caseData.assigned_to} • Opened: {new Date(caseData.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
          <button
            onClick={() => setShowInspectModal(true)}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 shadow-sm hover:shadow-[0_0_15px_rgba(37,99,235,0.4)] hover:scale-102 transition-all cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Inspect Claim</span>
          </button>
          <button
            onClick={() => setShowEvidenceModal(true)}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 shadow-sm hover:scale-102 transition-all cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Add Evidence</span>
          </button>
          {(caseData.claim?.claim_id || caseData.claim_id) && (
            <Link
              to={`/assistant?claim_id=${caseData.claim?.claim_id || caseData.claim_id}`}
              className="px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 shadow-sm hover:shadow-[0_0_15px_rgba(99,102,241,0.4)] hover:scale-102 transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Consult AI Assistant</span>
            </Link>
          )}
        </div>
      </div>

      {feedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-medium flex items-center space-x-2 shadow-2xs">
          <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Investigator Decision Bar & Case Lifecycle */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 hover:shadow-md transition-all duration-250">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Investigator Decision Actions</h2>
            <p className="text-xs text-slate-500">Human investigator makes the final determination based on evidentiary audit</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {caseData.status === 'OPEN' && (
              <button
                onClick={() => handleQuickDecision('IN_PROGRESS')}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all duration-200 hover:scale-102 hover:shadow-[0_0_15px_rgba(37,99,235,0.4)] cursor-pointer"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Start Investigation (IN_PROGRESS)</span>
              </button>
            )}
            <button
              onClick={() => handleQuickDecision('CLOSED_NO_CONCERN')}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all duration-200 hover:scale-102 hover:shadow-[0_0_18px_rgba(16,185,129,0.45)] cursor-pointer"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Approve / Clear Claim</span>
            </button>
            <button
              onClick={() => handleQuickDecision('CLOSED_FINDINGS')}
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all duration-200 hover:scale-102 hover:shadow-[0_0_18px_rgba(244,63,94,0.45)] cursor-pointer"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Reject / Close With Findings</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Investigation Status</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full p-2 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 font-medium"
              >
                <option value="OPEN">OPEN</option>
                <option value="IN_PROGRESS">IN_PROGRESS</option>
                <option value="PENDING_EVIDENCE">PENDING_EVIDENCE</option>
                <option value="CLOSED_NO_CONCERN">CLOSED_NO_CONCERN (Approve / Clear)</option>
                <option value="CLOSED_FINDINGS">CLOSED_FINDINGS (Reject / Close with Findings)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Investigator Recommendation / Findings</label>
              <input
                type="text"
                value={newRecommendation}
                onChange={(e) => setNewRecommendation(e.target.value)}
                placeholder="e.g. Clinical review shows valid medical necessity / suspicious unbundling confirmed..."
                className="w-full p-2 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <button
            onClick={handleUpdateStatus}
            className="w-full md:w-auto px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors flex-shrink-0"
          >
            Save Status &amp; Notes
          </button>
        </div>
      </div>

      {/* Main Grid: Claim + Patient + Provider Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Claim Summary */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Target Claim Data
          </div>
          {claim ? (
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Claim ID:</span>
                <Link
                  to={`/claims/${claim.claim_id}`}
                  className="font-mono font-bold text-blue-600 hover:underline"
                >
                  {claim.claim_id}
                </Link>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Service Date:</span>
                <span className="text-slate-800">{claim.service_date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Claimed:</span>
                <span className="font-mono font-bold text-slate-900">
                  ₹{claim.claimed_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Expected:</span>
                <span className="font-mono text-slate-700">
                  ₹{claim.expected_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-100">
                <span className="text-slate-500">Risk Assessment:</span>
                <RiskBadge level={claim.risk_level} score={claim.hybrid_score} />
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-400">Claim record unavailable.</div>
          )}
        </div>

        {/* Patient Demographic */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Synthetic Patient Demographics
          </div>
          {caseData.patient ? (
            <div className="space-y-1.5 text-xs">
              <div className="font-bold text-slate-900">{caseData.patient.name}</div>
              <div className="text-slate-500">ID: <span className="font-mono text-blue-600">{caseData.patient.patient_id}</span></div>
              <div className="text-slate-600">Age: {caseData.patient.age} • Gender: {caseData.patient.gender}</div>
              <div className="text-slate-600">City: {caseData.patient.city}</div>
              <div className="text-slate-600">Plan: {caseData.patient.plan}</div>
            </div>
          ) : (
            <div className="text-xs text-slate-400">Patient information unavailable.</div>
          )}
        </div>

        {/* Provider Profile */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Synthetic Healthcare Provider
          </div>
          {caseData.provider ? (
            <div className="space-y-1.5 text-xs">
              <div className="font-bold text-slate-900">{caseData.provider.name}</div>
              <div className="text-slate-500">ID: <span className="font-mono text-purple-600">{caseData.provider.provider_id}</span></div>
              <div className="text-slate-600">Type: {caseData.provider.type} • City: {caseData.provider.city}</div>
              <div className="text-slate-600">
                Risk Score: <strong className="font-mono text-slate-900">{caseData.provider.risk_score}</strong>
              </div>
              <div className="text-rose-600 font-semibold">
                Suspicious Rate: {(caseData.provider.suspicious_rate * 100).toFixed(1)}%
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-400">Provider information unavailable.</div>
          )}
        </div>
      </div>

      {/* Fraud Detections Summary */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <h2 className="text-sm font-bold text-slate-900 mb-1">Triggered Fraud Rules Checklist</h2>
        <p className="text-xs text-slate-500 mb-3">
          Rule-based telemetry triggering this special investigation case
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {caseData.detections?.map((d) => (
            <div
              key={d.rule_code}
              className={`p-3 rounded-lg border text-xs ${
                d.triggered ? 'bg-rose-50/50 border-rose-200' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-slate-900">{d.rule_name}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  d.triggered ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-600'
                }`}>
                  {d.triggered ? `DETECTED (+${d.risk_contribution})` : 'NOT DETECTED'}
                </span>
              </div>
              <div className="text-slate-600 text-[11px]">{d.reason}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Synthetic Evidence & Documents Section */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Synthetic Evidence Attachments</h2>
            <p className="text-xs text-slate-500">Documentary exhibits and audit logs logged for this investigation</p>
          </div>
          <button
            onClick={() => setShowEvidenceModal(true)}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Add Synthetic Evidence</span>
          </button>
        </div>

        {caseData.evidences?.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
            No evidentiary exhibits attached yet. Click "Add Synthetic Evidence" to register invoices or ledger records.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {caseData.evidences.map((ev) => (
              <div key={ev.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs flex items-start space-x-3">
                <Paperclip className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="font-bold text-slate-900">{ev.evidence_type}</div>
                  <div className="text-slate-600 text-[11px] mt-0.5 line-clamp-2">{ev.description}</div>
                  <div className="text-[10px] text-slate-400 mt-1 font-mono">
                    Source: {ev.source || 'Synthetic'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Investigation Notes & Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Notes Timeline */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Investigation Notes &amp; Findings</h2>
            <p className="text-xs text-slate-500">Chronological journal of investigator actions, interviews, and audits</p>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {caseData.notes?.length === 0 ? (
              <div className="text-xs text-slate-400 py-4 text-center">No notes added yet.</div>
            ) : (
              caseData.notes.map((n) => (
                <div key={n.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-slate-800">{n.author_role}: {n.author_email}</span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-blue-100 text-blue-800">
                      {n.note_type}
                    </span>
                  </div>
                  <p className="text-slate-700 leading-relaxed">{n.content}</p>
                  <div className="text-[10px] text-slate-400">
                    {new Date(n.created_at).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Add Note Form */}
          <form onSubmit={handleAddNote} className="pt-3 border-t border-slate-200 space-y-3">
            <div className="flex items-center space-x-2">
              <label className="text-xs font-semibold text-slate-700">Type:</label>
              <select
                value={noteType}
                onChange={(e) => setNoteType(e.target.value)}
                className="p-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50"
              >
                <option value="OBSERVATION">OBSERVATION</option>
                <option value="INTERVIEW">INTERVIEW</option>
                <option value="AUDIT">AUDIT</option>
                <option value="DECISION">DECISION</option>
              </select>
            </div>
            <textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              required
              rows={2}
              placeholder="Record investigative observation or action..."
              className="w-full p-2.5 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={submittingNote}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50"
            >
              {submittingNote ? 'Adding Note...' : 'Add Case Note'}
            </button>
          </form>
        </div>

        {/* Related Patient Claims */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <h2 className="text-sm font-bold text-slate-900">Related Claims for Patient</h2>
          <p className="text-xs text-slate-500">Other billing submissions recorded for this patient</p>

          <div className="space-y-2">
            {caseData.related_claims?.map((rel) => (
              <div key={rel.claim_id} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                <div className="flex justify-between items-center">
                  <Link to={`/claims/${rel.claim_id}`} className="font-mono font-bold text-blue-600 hover:underline">
                    {rel.claim_id}
                  </Link>
                  <RiskBadge level={rel.risk_level} score={rel.hybrid_score} />
                </div>
                <div className="text-[11px] text-slate-600">
                  {rel.service_date} • ₹{rel.claimed_amount?.toLocaleString('en-IN')}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal for adding synthetic evidence */}
      {showEvidenceModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Add Synthetic Evidence Exhibit</h3>
              <p className="text-xs text-slate-500">Simulate document attachment or encounter cross-reference</p>
            </div>

            <form onSubmit={handleAddEvidence} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Evidence Type</label>
                <select
                  value={evidenceType}
                  onChange={(e) => setEvidenceType(e.target.value)}
                  className="w-full p-2 text-xs border border-slate-200 rounded-lg bg-slate-50"
                >
                  <option value="SYNTHETIC_INVOICE">Synthetic Invoice / Bill</option>
                  <option value="SYNTHETIC_AUTHORIZATION">Synthetic Prior Authorization Form</option>
                  <option value="SYNTHETIC_DISCHARGE_SUMMARY">Synthetic Clinical Discharge Summary</option>
                  <option value="PROVIDER_STATEMENT">Provider Clarification Statement</option>
                  <option value="CROSS_ENCOUNTER_LOG">Cross-Encounter Ledger Verification</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description / Summary</label>
                <textarea
                  value={evidenceDesc}
                  onChange={(e) => setEvidenceDesc(e.target.value)}
                  required
                  rows={3}
                  placeholder="Details of the synthetic evidence..."
                  className="w-full p-2.5 text-xs border border-slate-200 rounded-lg bg-slate-50"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEvidenceModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700"
                >
                  Register Evidence
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal for Inspecting Claim Dossier */}
      {showInspectModal && claim && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto space-y-5 animate-in fade-in duration-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-50 text-blue-700 rounded-lg">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-base font-bold text-slate-900 font-mono">
                      Inspection Dossier: {claim.claim_id}
                    </h3>
                    <RiskBadge level={claim.risk_level} score={claim.hybrid_score} />
                  </div>
                  <p className="text-xs text-slate-500">
                    Evidentiary telemetry, clinical coding cross-check &amp; fraud indicators
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowInspectModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Financial & Clinical Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Service Date</span>
                <span className="font-semibold text-slate-800">{claim.service_date}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Claimed vs Expected</span>
                <span className="font-bold font-mono text-slate-900">
                  ₹{claim.claimed_amount?.toLocaleString('en-IN')}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  Exp: ₹{claim.expected_amount?.toLocaleString('en-IN')}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Procedure / Diagnosis</span>
                <span className="font-mono font-semibold text-blue-700">{claim.procedure_code}</span>
                <span className="text-[10px] font-mono text-slate-500 block">{claim.diagnosis_code}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Scoring Breakdown</span>
                <span className="font-semibold text-slate-800">Hybrid: {claim.hybrid_score}/100</span>
                <span className="text-[10px] text-slate-500 block">
                  Rule: {claim.risk_score} • ML: {claim.ml_anomaly_score}
                </span>
              </div>
            </div>

            {/* Triggered Fraud Detection Rules */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                <span>Triggered Fraud Detection Rules ({caseData.detections?.filter(d => d.triggered).length || 0})</span>
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {caseData.detections?.filter(d => d.triggered).length === 0 ? (
                  <div className="text-xs text-slate-400 p-3 bg-slate-50 rounded-lg text-center">
                    No deterministic fraud rules triggered on initial ingestion.
                  </div>
                ) : (
                  caseData.detections?.filter(d => d.triggered).map((d) => (
                    <div key={d.rule_id} className="p-2.5 bg-rose-50/70 border border-rose-200 rounded-lg text-xs">
                      <div className="flex items-center justify-between font-semibold text-rose-900">
                        <span>{d.rule_name}</span>
                        <span className="font-mono text-[10px] bg-rose-200/60 px-1.5 py-0.5 rounded text-rose-800">
                          +{d.risk_contribution} pts
                        </span>
                      </div>
                      <p className="text-slate-600 text-[11px] mt-1">{d.reason}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Patient & Provider Mini Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                <div className="font-bold text-slate-800 flex items-center space-x-1.5">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  <span>Patient: {caseData.patient?.name || 'N/A'}</span>
                </div>
                <div className="text-slate-500">ID: {caseData.patient?.patient_id} • Plan: {caseData.patient?.plan}</div>
                <div className="text-slate-500">Location: {caseData.patient?.city} • Age: {caseData.patient?.age}</div>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                <div className="font-bold text-slate-800 flex items-center space-x-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>Provider: {caseData.provider?.name || 'N/A'}</span>
                </div>
                <div className="text-slate-500">ID: {caseData.provider?.provider_id} • Specialty: {caseData.provider?.specialty}</div>
                <div className="text-slate-500">Risk Category: {caseData.provider?.risk_category} • City: {caseData.provider?.city}</div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              <Link
                to={`/claims/${claim.claim_id}`}
                className="inline-flex items-center space-x-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800"
              >
                <span>Open Full Claim Details Page</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
              <button
                type="button"
                onClick={() => setShowInspectModal(false)}
                className="px-4 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
              >
                Close Inspection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvestigationDetails;
