import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertOctagon, Search, Filter, CheckCircle, XCircle,
  HelpCircle, ArrowUpRight, UserCheck, ChevronLeft, ChevronRight, Eye
} from 'lucide-react';
import { reviewQueueAPI } from '../services/api';
import RiskBadge from '../components/common/RiskBadge';
import StatusBadge from '../components/common/StatusBadge';
import { FraudShieldVisual } from '../components/common/ProjectVisuals';

const FRAUD_RULE_TYPES = [
  { code: 'DUPLICATE_BILLING', label: 'Duplicate Billing' },
  { code: 'UPCODING', label: 'Upcoding' },
  { code: 'UNBUNDLING', label: 'Unbundling' },
  { code: 'PHANTOM_BILLING', label: 'Phantom Billing' },
  { code: 'FALSE_CLAIM', label: 'False Claims' },
  { code: 'INFLATED_BILLING', label: 'Inflated Billing' },
  { code: 'INCORRECT_BILLING', label: 'Incorrect Billing' },
  { code: 'UNSUPPORTED_SERVICES', label: 'Unsupported Services' },
  { code: 'IMPOSSIBLE_TIMING', label: 'Impossible Timing' },
  { code: 'MUTUALLY_EXCLUSIVE', label: 'Mutually Exclusive' }
];

const ReviewQueue = () => {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [riskLevel, setRiskLevel] = useState('');
  const [fraudType, setFraudType] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Action modal state
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [actionType, setActionType] = useState('UNDER_REVIEW');
  const [actionNote, setActionNote] = useState('');
  const [analystAssign, setAnalystAssign] = useState('Marcus Vance (analyst@fraudguard.demo)');
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadQueue();
  }, [page, pageSize, riskLevel, fraudType, statusFilter]);

  const loadQueue = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        page_size: pageSize,
        search: search.trim() || undefined,
        risk_level: riskLevel || undefined,
        fraud_type: fraudType || undefined,
        status: statusFilter || undefined,
      };
      const res = await reviewQueueAPI.getQueue(params);
      setItems(res.data.items || []);
      setTotal(res.data.total || 0);
      setTotalPages(res.data.total_pages || 1);
    } catch (err) {
      console.error('Failed to load review queue:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadQueue();
  };

  const handleOpenAction = (claim, act) => {
    setSelectedClaim(claim);
    setActionType(act);
    setActionNote('');
  };

  const handleExecuteAction = async () => {
    if (!selectedClaim) return;
    setActionSubmitting(true);
    try {
      await reviewQueueAPI.updateAction(selectedClaim.claim_id, {
        action: actionType,
        note: actionNote,
        assigned_analyst: actionType === 'ASSIGN' ? analystAssign : undefined,
      });
      setMessage(`Successfully applied '${actionType}' to claim ${selectedClaim.claim_id}.`);
      setSelectedClaim(null);
      setTimeout(() => setMessage(''), 4000);
      await loadQueue();
    } catch (err) {
      console.error('Review action failed:', err);
    } finally {
      setActionSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Page Title with Cyber Shield Visual */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-1 rounded-xl bg-slate-900 border border-blue-500/40 shadow-[0_0_15px_rgba(59,130,246,0.3)] flex-shrink-0">
            <FraudShieldVisual size={36} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
              <span>Fraud Review Queue</span>
              <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded-full font-bold">
                Triage Desk
              </span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Operational triage queue for claims with detected anomalies ({total.toLocaleString()} pending review)
            </p>
          </div>
        </div>
      </div>

      {message && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg font-medium flex items-center space-x-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Claim ID, Patient ID, Provider ID..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
          </div>

          <div>
            <select
              value={riskLevel}
              onChange={(e) => {
                setRiskLevel(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Risk Tiers</option>
              <option value="MEDIUM">Medium (31-60)</option>
              <option value="HIGH">High (61-80)</option>
              <option value="CRITICAL">Critical (81-100)</option>
            </select>
          </div>

          <div>
            <select
              value={fraudType}
              onChange={(e) => {
                setFraudType(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Fraud Patterns</option>
              {FRAUD_RULE_TYPES.map((f) => (
                <option key={f.code} value={f.code}>{f.label}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="submit"
              className="flex-1 py-2 px-3 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors"
            >
              Filter Queue
            </button>
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setRiskLevel('');
                setFraudType('');
                setStatusFilter('');
                setPage(1);
              }}
              className="py-2 px-3 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-200 transition-colors"
            >
              Reset
            </button>
          </div>
        </form>
      </div>

      {/* Review Queue Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Claim ID</th>
                <th className="py-3 px-4">Patient</th>
                <th className="py-3 px-4">Provider</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-center">Hybrid Score</th>
                <th className="py-3 px-4">Detected Rules</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Analyst</th>
                <th className="py-3 px-4 text-right">Quick Triage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="9" className="py-8 text-center text-slate-400">
                    Loading review queue...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-8 text-center text-slate-400">
                    No suspicious claims currently in queue matching criteria.
                  </td>
                </tr>
              ) : (
                items.map((c) => (
                  <tr key={c.claim_id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-blue-600">
                      <Link to={`/claims/${c.claim_id}`} className="hover:underline">
                        {c.claim_id}
                      </Link>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700">{c.patient_id}</td>
                    <td className="py-3 px-4 font-mono text-slate-700">{c.provider_id}</td>
                    <td className="py-3 px-4 text-right font-medium text-slate-900 font-mono">
                      ₹{c.claimed_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <RiskBadge level={c.risk_level} score={c.hybrid_score} />
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {c.detected_rules && c.detected_rules.length > 0 ? (
                          c.detected_rules.map((r) => (
                            <span
                              key={r}
                              className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-rose-50 text-rose-700 border border-rose-200"
                            >
                              {r.replace(/_/g, ' ')}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400 text-[11px]">ML Anomaly Only</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={c.claim_status} />
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px] truncate max-w-[120px]">
                      {c.assigned_analyst || 'Unassigned'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <Link
                          to={`/claims/${c.claim_id}`}
                          title="Analyze Claim Details"
                          className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-150 hover:scale-115 active:scale-95 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          onClick={() => handleOpenAction(c, 'UNDER_REVIEW')}
                          title="Mark Under Review"
                          className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-all duration-150 hover:scale-115 active:scale-95 cursor-pointer"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenAction(c, 'CLEAR')}
                          title="Clear Claim"
                          className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-all duration-150 hover:scale-115 active:scale-95 cursor-pointer"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenAction(c, 'ESCALATE')}
                          title="Escalate to Investigator"
                          className="p-1.5 rounded-lg text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/60 font-bold transition-all duration-150 hover:scale-115 active:scale-95 cursor-pointer"
                        >
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center space-x-2">
            <span>Show</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="border border-slate-300 rounded px-2 py-1 bg-white text-xs"
            >
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span>of {total.toLocaleString()} records</span>
          </div>

          <div className="flex items-center space-x-2">
            <span>
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Action Dialog Modal */}
      {selectedClaim && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Analyst Review Action</div>
              <h3 className="text-base font-bold text-slate-900 mt-0.5">
                Apply Action to <span className="text-blue-600 font-mono">{selectedClaim.claim_id}</span>
              </h3>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Select Action</label>
              <select
                value={actionType}
                onChange={(e) => setActionType(e.target.value)}
                className="w-full p-2 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 font-medium"
              >
                <option value="UNDER_REVIEW">Move to Under Review</option>
                <option value="CLEAR">Clear Claim (No Fraud Risk)</option>
                <option value="ESCALATE">🚨 Escalate to Investigator</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Audit Note / Clinical Rationale</label>
              <textarea
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
                rows={3}
                placeholder="Reasoning for audit trail and investigator handover..."
                className="w-full p-2.5 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedClaim(null)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteAction}
                disabled={actionSubmitting}
                className={`px-4 py-1.5 rounded-lg text-white text-xs font-semibold disabled:opacity-50 transition-colors ${
                  actionType === 'ESCALATE'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : actionType === 'CLEAR'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {actionSubmitting ? 'Processing...' : actionType === 'ESCALATE' ? 'Escalate to Investigator' : 'Confirm Action'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewQueue;
