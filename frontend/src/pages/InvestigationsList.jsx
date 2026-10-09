import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, ShieldAlert, ArrowUpRight, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { investigationsAPI } from '../services/api';
import RiskBadge from '../components/common/RiskBadge';
import StatusBadge from '../components/common/StatusBadge';

const InvestigationsList = () => {
  const [cases, setCases] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCases();
  }, [page, pageSize, statusFilter, priorityFilter]);

  const loadCases = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        page_size: pageSize,
        search: search.trim() || undefined,
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
      };
      const res = await investigationsAPI.getInvestigations(params);
      setCases(res.data.items || []);
      setTotal(res.data.total || 0);
      setTotalPages(res.data.total_pages || 1);
    } catch (err) {
      console.error('Failed to load investigation cases:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadCases();
  };

  return (
    <div className="space-y-5">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <ShieldAlert className="w-6 h-6 text-indigo-600" />
            <span>Special Investigation Unit (SIU) Cases</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Active in-depth fraud investigation dossiers, evidence logging, and investigator notes ({total} open cases)
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Case Number, Claim ID, Summary..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
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
              <option value="">All Case Statuses</option>
              <option value="NEW">New</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="ESCALATED">Escalated</option>
              <option value="MORE_INFORMATION_REQUIRED">More Info Required</option>
              <option value="APPROVED">Approved / Closed</option>
              <option value="REJECTED">Rejected / Closed</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="submit"
              className="flex-1 py-2 px-3 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors"
            >
              Filter Cases
            </button>
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setStatusFilter('');
                setPriorityFilter('');
                setPage(1);
              }}
              className="py-2 px-3 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-200 transition-colors"
            >
              Reset
            </button>
          </div>
        </form>
      </div>

      {/* Cases Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Case #</th>
                <th className="py-3 px-4">Claim ID</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4 text-center">Hybrid Score</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Investigator</th>
                <th className="py-3 px-4">Summary</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-400">
                    Loading cases...
                  </td>
                </tr>
              ) : cases.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-400">
                    No investigation cases found.
                  </td>
                </tr>
              ) : (
                cases.map((cs) => (
                  <tr key={cs.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-blue-600">
                      <Link to={`/investigations/${cs.id}`} className="hover:underline">
                        {cs.case_number}
                      </Link>
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-700">
                      <Link to={`/claims/${cs.claim_id}`} className="hover:text-blue-600">
                        {cs.claim_id}
                      </Link>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        cs.priority === 'CRITICAL' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {cs.priority}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <RiskBadge level={cs.risk_level} score={cs.hybrid_score} />
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={cs.status} />
                    </td>
                    <td className="py-3 px-4 text-slate-600 text-[11px] truncate max-w-[140px]">
                      {cs.investigator || cs.assigned_to}
                    </td>
                    <td className="py-3 px-4 text-slate-500 line-clamp-1 max-w-xs text-[11px]">
                      {cs.summary}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        to={`/investigations/${cs.id}`}
                        className="inline-flex items-center space-x-1 text-blue-600 hover:text-blue-800 font-semibold text-xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Dossier</span>
                      </Link>
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
    </div>
  );
};

export default InvestigationsList;
