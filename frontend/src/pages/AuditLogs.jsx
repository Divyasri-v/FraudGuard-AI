import React, { useState, useEffect } from 'react';
import { ShieldCheck, Search, Filter, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { auditLogsAPI } from '../services/api';

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, [page, pageSize, actionFilter, entityFilter]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        page_size: pageSize,
        action: actionFilter || undefined,
        entity_type: entityFilter || undefined,
        search: search.trim() || undefined,
      };
      const res = await auditLogsAPI.getLogs(params);
      setLogs(res.data.items || []);
      setTotal(res.data.total || 0);
      setTotalPages(res.data.total_pages || 1);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadLogs();
  };

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
          <ShieldCheck className="w-6 h-6 text-blue-600" />
          <span>Security &amp; Operational Audit Trail</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Immutable event ledger tracking logins, claim triage decisions, investigation updates, and rule edits ({total.toLocaleString()} total events)
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search user, entity ID, details..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Action Types</option>
              <option value="LOGIN">LOGIN</option>
              <option value="CLAIM_CREATED">CLAIM_CREATED</option>
              <option value="CLAIM_VIEWED">CLAIM_VIEWED</option>
              <option value="CLAIM_UPDATED">CLAIM_UPDATED</option>
              <option value="RISK_CALCULATED">RISK_CALCULATED</option>
              <option value="STATUS_CHANGED">STATUS_CHANGED</option>
              <option value="NOTE_ADDED">NOTE_ADDED</option>
              <option value="EVIDENCE_ADDED">EVIDENCE_ADDED</option>
              <option value="RULE_CONFIG_CHANGED">RULE_CONFIG_CHANGED</option>
              <option value="REPORT_GENERATED">REPORT_GENERATED</option>
            </select>
          </div>

          <div>
            <select
              value={entityFilter}
              onChange={(e) => {
                setEntityFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Entity Types</option>
              <option value="CLAIM">CLAIM</option>
              <option value="INVESTIGATION">INVESTIGATION</option>
              <option value="USER">USER</option>
              <option value="RULE">RULE</option>
              <option value="REPORT">REPORT</option>
              <option value="SYSTEM">SYSTEM</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="submit"
              className="flex-1 py-2 px-3 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors"
            >
              Filter Logs
            </button>
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setActionFilter('');
                setEntityFilter('');
                setPage(1);
              }}
              className="py-2 px-3 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-200 transition-colors"
            >
              Reset
            </button>
          </div>
        </form>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">Timestamp</th>
                <th className="py-2.5 px-4">Operator</th>
                <th className="py-2.5 px-4">Action</th>
                <th className="py-2.5 px-4">Entity Type</th>
                <th className="py-2.5 px-4">Entity ID</th>
                <th className="py-2.5 px-4">Audit Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-400">
                    Loading audit trail...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-400">
                    No audit records matching query.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-800 font-medium">
                      {log.user_id}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-semibold">{log.entity_type}</td>
                    <td className="py-3 px-4 font-mono text-blue-600">{log.entity_id || '-'}</td>
                    <td className="py-3 px-4 text-slate-600 max-w-sm truncate text-[11px] font-mono">
                      {log.details || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
          <div>Page {page} of {totalPages}</div>
          <div className="flex items-center space-x-2">
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

export default AuditLogs;
