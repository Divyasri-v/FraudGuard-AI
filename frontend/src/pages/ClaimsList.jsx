import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, Filter, Plus, ArrowUpDown, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { claimsAPI } from '../services/api';
import RiskBadge from '../components/common/RiskBadge';
import StatusBadge from '../components/common/StatusBadge';
import { ClaimDocumentVisual } from '../components/common/ProjectVisuals';

const ClaimsList = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [claims, setClaims] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1', 10));
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [riskLevel, setRiskLevel] = useState(searchParams.get('risk_level') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClaims();
  }, [page, pageSize, riskLevel, statusFilter]);

  const loadClaims = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        page_size: pageSize,
        search: search.trim() || undefined,
        risk_level: riskLevel || undefined,
        status: statusFilter || undefined,
      };
      const res = await claimsAPI.getClaims(params);
      setClaims(res.data.items || []);
      setTotal(res.data.total || 0);
      setTotalPages(res.data.total_pages || 1);
    } catch (err) {
      console.error('Failed to load claims:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadClaims();
  };

  const handleResetFilters = () => {
    setSearch('');
    setRiskLevel('');
    setStatusFilter('');
    setPage(1);
  };

  return (
    <div className="space-y-5">
      {/* Page Title & Actions with Claim Document Visual */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-1 rounded-xl bg-slate-900 border border-blue-500/40 shadow-[0_0_15px_rgba(59,130,246,0.3)] flex-shrink-0">
            <ClaimDocumentVisual size={36} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
              <span>Claims Repository</span>
              <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 rounded-full font-bold">
                10,000 DB
              </span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Browse and query all synthetic healthcare insurance claims ({total.toLocaleString()} total records)
            </p>
          </div>
        </div>
        <Link
          to="/claims/new"
          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-semibold rounded-xl shadow-md hover:shadow-[0_0_18px_rgba(59,130,246,0.45)] hover:scale-105 active:scale-95 flex items-center justify-center space-x-2 transition-all duration-200 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Submit Synthetic Claim</span>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Claim ID, Patient ID, Provider..."
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
              <option value="">All Risk Levels</option>
              <option value="LOW">Low (0-30)</option>
              <option value="MEDIUM">Medium (31-60)</option>
              <option value="HIGH">High (61-80)</option>
              <option value="CRITICAL">Critical (81-100)</option>
            </select>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="MORE_INFORMATION_REQUIRED">More Info Required</option>
              <option value="ESCALATED">Escalated</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="submit"
              className="flex-1 py-2 px-3 bg-slate-900 dark:bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 dark:hover:bg-blue-700 hover:scale-102 active:scale-98 transition-all duration-150 cursor-pointer shadow-xs"
            >
              Search
            </button>
            <button
              type="button"
              onClick={handleResetFilters}
              className="py-2 px-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium hover:bg-slate-200 dark:hover:bg-slate-700 hover:scale-102 active:scale-98 transition-all duration-150 cursor-pointer"
            >
              Reset
            </button>
          </div>
        </form>
      </div>

      {/* Claims Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Claim ID</th>
                <th className="py-3 px-4">Patient</th>
                <th className="py-3 px-4">Provider</th>
                <th className="py-3 px-4">Procedure</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4 text-right">Claimed Amount</th>
                <th className="py-3 px-4 text-center">Risk Level</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="9" className="py-8 text-center text-slate-400">
                    Loading claims records...
                  </td>
                </tr>
              ) : claims.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-8 text-center text-slate-400">
                    No claims match the specified filter criteria.
                  </td>
                </tr>
              ) : (
                claims.map((claim) => (
                  <tr key={claim.claim_id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-blue-600">
                      <Link to={`/claims/${claim.claim_id}`} className="hover:underline">
                        {claim.claim_id}
                      </Link>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700">
                      <Link to={`/patients/${claim.patient_id}`} className="hover:text-blue-600">
                        {claim.patient_id}
                      </Link>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700">
                      <Link to={`/providers/${claim.provider_id}`} className="hover:text-blue-600">
                        {claim.provider_id}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">
                      <span className="font-mono text-[11px] block text-slate-500">{claim.procedure_code}</span>
                      <span className="text-slate-900">{claim.service_type}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-500">{claim.service_date}</td>
                    <td className="py-3 px-4 text-right font-medium text-slate-900 font-mono">
                      ₹{claim.claimed_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <RiskBadge level={claim.risk_level} score={claim.hybrid_score} />
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={claim.claim_status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        to={`/claims/${claim.claim_id}`}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/50 font-semibold text-xs transition-all duration-150 hover:scale-105 active:scale-95 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect</span>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
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
    </div>
  );
};

export default ClaimsList;
