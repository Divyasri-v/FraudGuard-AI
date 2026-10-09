import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Search, Filter, ChevronLeft, ChevronRight, Eye, ShieldAlert } from 'lucide-react';
import { providersAPI } from '../services/api';

const ProvidersList = () => {
  const [providers, setProviders] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProviders();
  }, [page, pageSize, specialization]);

  const loadProviders = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        page_size: pageSize,
        search: search.trim() || undefined,
        specialization: specialization || undefined,
      };
      const res = await providersAPI.getProviders(params);
      setProviders(res.data.items || []);
      setTotal(res.data.total || 0);
      setTotalPages(res.data.total_pages || 1);
    } catch (err) {
      console.error('Failed to load providers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadProviders();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <Building2 className="w-6 h-6 text-blue-600" />
            <span>Healthcare Provider Risk Directory</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Synthetic hospital and clinic risk monitoring ({total} registered facilities)
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Provider Name, ID, City..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
          </div>

          <div>
            <select
              value={specialization}
              onChange={(e) => {
                setSpecialization(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Specialties</option>
              <option value="General Medicine">General Medicine</option>
              <option value="Cardiology">Cardiology</option>
              <option value="Orthopedics">Orthopedics</option>
              <option value="General Surgery">General Surgery</option>
              <option value="Neurology">Neurology</option>
              <option value="Pediatrics">Pediatrics</option>
              <option value="Radiology">Radiology</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="submit"
              className="flex-1 py-2 px-3 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors"
            >
              Search
            </button>
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setSpecialization('');
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
                <th className="py-3 px-4">Provider ID</th>
                <th className="py-3 px-4">Provider Name</th>
                <th className="py-3 px-4">Specialty</th>
                <th className="py-3 px-4">City</th>
                <th className="py-3 px-4">Network</th>
                <th className="py-3 px-4 text-center">Provider Risk Score</th>
                <th className="py-3 px-4 text-right">Suspicious Rate</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-400">
                    Loading providers...
                  </td>
                </tr>
              ) : providers.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-400">
                    No providers match criteria.
                  </td>
                </tr>
              ) : (
                providers.map((p) => (
                  <tr key={p.provider_id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-blue-600">
                      <Link to={`/providers/${p.provider_id}`} className="hover:underline">
                        {p.provider_id}
                      </Link>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900">{p.provider_name}</td>
                    <td className="py-3 px-4 text-slate-600">{p.specialization}</td>
                    <td className="py-3 px-4 text-slate-600">{p.city}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                        p.network_status === 'IN_NETWORK' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {p.network_status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`font-bold font-mono text-xs px-2 py-0.5 rounded-full border ${
                        p.provider_risk_score >= 60 ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        {p.provider_risk_score}/100
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-rose-600">
                      {(p.historical_suspicious_rate * 100).toFixed(1)}%
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        to={`/providers/${p.provider_id}`}
                        className="inline-flex items-center space-x-1 text-blue-600 hover:text-blue-800 font-semibold text-xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Profile</span>
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
            <span>Page {page} of {totalPages}</span>
          </div>

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

export default ProvidersList;
