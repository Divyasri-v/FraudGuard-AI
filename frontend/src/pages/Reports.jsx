import React, { useState, useEffect } from 'react';
import { BarChart3, Download, Printer, FileText, AlertTriangle, ShieldCheck, CheckCircle } from 'lucide-react';
import { reportsAPI } from '../services/api';

const Reports = () => {
  const [activeTab, setActiveTab] = useState('summary');
  const [fraudSummary, setFraudSummary] = useState(null);
  const [providerReport, setProviderReport] = useState(null);
  const [exposureReport, setExposureReport] = useState(null);
  const [ruleReport, setRuleReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllReports();
  }, []);

  const loadAllReports = async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        reportsAPI.getFraudSummary(),
        reportsAPI.getProviderRisk(),
        reportsAPI.getFinancialExposure(),
        reportsAPI.getRulePerformance(),
      ]);
      if (results[0].status === 'fulfilled') setFraudSummary(results[0].value.data);
      if (results[1].status === 'fulfilled') setProviderReport(results[1].value.data);
      if (results[2].status === 'fulfilled') setExposureReport(results[2].value.data);
      if (results[3].status === 'fulfilled') setRuleReport(results[3].value.data);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = async (type) => {
    try {
      const response = await reportsAPI.downloadCSV(type);
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `fraudguard_${type}_report.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download CSV via blob, opening direct link:', err);
      window.open(reportsAPI.exportCSV(type), '_blank');
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            <span>Compliance &amp; FWA Reports</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational summaries, provider exposure, and rule calibration metrics
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handlePrint}
            className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-lg flex items-center space-x-1.5 shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print View</span>
          </button>
          <button
            onClick={() => handleExportCSV('claims')}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center space-x-1.5 shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Mandatory Synthetic Data Notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 flex items-center space-x-2">
        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
        <span>
          <strong>SYNTHETIC DEMO DATA:</strong> All metrics, provider ratings, and financial exposure values in these reports are calculated strictly from synthetic educational data. Not for legal determinations.
        </span>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-slate-200/70 p-1 rounded-xl max-w-fit text-xs font-medium">
        <button
          onClick={() => setActiveTab('summary')}
          className={`px-3 py-1.5 rounded-lg transition-all ${
            activeTab === 'summary' ? 'bg-white text-blue-700 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Fraud Detection Summary
        </button>
        <button
          onClick={() => setActiveTab('providers')}
          className={`px-3 py-1.5 rounded-lg transition-all ${
            activeTab === 'providers' ? 'bg-white text-blue-700 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Provider Risk Report
        </button>
        <button
          onClick={() => setActiveTab('exposure')}
          className={`px-3 py-1.5 rounded-lg transition-all ${
            activeTab === 'exposure' ? 'bg-white text-blue-700 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Financial Exposure
        </button>
        <button
          onClick={() => setActiveTab('rules')}
          className={`px-3 py-1.5 rounded-lg transition-all ${
            activeTab === 'rules' ? 'bg-white text-blue-700 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Rule Performance
        </button>
      </div>

      {/* Tab 1: Fraud Summary */}
      {activeTab === 'summary' && fraudSummary && (
        <div className="space-y-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
          <div className="border-b border-slate-200 pb-3 flex justify-between items-center">
            <div>
              <h2 className="text-base font-bold text-slate-900">{fraudSummary.title}</h2>
              <div className="text-[11px] text-slate-500 font-mono mt-0.5">{fraudSummary.disclaimer}</div>
            </div>
            <button
              onClick={() => handleExportCSV('claims')}
              className="text-xs text-blue-600 hover:underline font-semibold flex items-center space-x-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Claims CSV</span>
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-xs text-slate-500">Total Ingested Claims</div>
              <div className="text-xl font-bold text-slate-900 mt-1">{fraudSummary.metrics.total_claims.toLocaleString()}</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-xs text-slate-500">Suspicious Claims</div>
              <div className="text-xl font-bold text-amber-600 mt-1">{fraudSummary.metrics.suspicious_claims.toLocaleString()}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">{fraudSummary.metrics.suspicious_rate_pct}% of total</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-xs text-slate-500">Critical Tier (Score ≥ 81)</div>
              <div className="text-xl font-bold text-rose-600 mt-1">{fraudSummary.metrics.critical_claims.toLocaleString()}</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-xs text-slate-500">Potential Exposure</div>
              <div className="text-xl font-bold text-red-600 mt-1 font-mono">
                ₹{fraudSummary.metrics.potential_risk_exposure.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Provider Risk Report */}
      {activeTab === 'providers' && providerReport && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex justify-between items-center">
            <div>
              <h2 className="text-base font-bold text-slate-900">{providerReport.title}</h2>
              <div className="text-[11px] text-slate-500 font-mono mt-0.5">{providerReport.disclaimer}</div>
            </div>
            <button
              onClick={() => handleExportCSV('providers')}
              className="text-xs text-blue-600 hover:underline font-semibold flex items-center space-x-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Providers CSV</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Provider ID</th>
                  <th className="py-2.5 px-4">Facility Name</th>
                  <th className="py-2.5 px-4">City</th>
                  <th className="py-2.5 px-4">Specialty</th>
                  <th className="py-2.5 px-4 text-center">Risk Score</th>
                  <th className="py-2.5 px-4 text-right">Suspicious Rate</th>
                  <th className="py-2.5 px-4 text-right">Claims Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {providerReport.data.map((p) => (
                  <tr key={p.provider_id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-4 font-mono font-bold text-blue-600">{p.provider_id}</td>
                    <td className="py-2.5 px-4 font-medium text-slate-800">{p.provider_name}</td>
                    <td className="py-2.5 px-4 text-slate-600">{p.city}</td>
                    <td className="py-2.5 px-4 text-slate-600">{p.specialization}</td>
                    <td className="py-2.5 px-4 text-center">
                      <span className="font-bold font-mono text-slate-900">{p.risk_score}</span>
                      <span className="text-[10px] text-slate-400">/100</span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-semibold text-rose-600">{p.suspicious_rate}%</td>
                    <td className="py-2.5 px-4 text-right text-slate-700">{p.total_claims}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Financial Exposure */}
      {activeTab === 'exposure' && exposureReport && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex justify-between items-center">
            <div>
              <h2 className="text-base font-bold text-slate-900">{exposureReport.title}</h2>
              <div className="text-[11px] text-slate-500 font-mono mt-0.5">{exposureReport.disclaimer}</div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Fraud Mechanism</th>
                  <th className="py-2.5 px-4 text-right">Detection Count</th>
                  <th className="py-2.5 px-4 text-right">Total Exposure (₹)</th>
                  <th className="py-2.5 px-4 text-right">Average Claim Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {exposureReport.data.map((item) => (
                  <tr key={item.fraud_mechanism} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-bold text-slate-800">{item.fraud_mechanism}</td>
                    <td className="py-3 px-4 text-right text-slate-600">{item.detection_count}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-rose-600">
                      ₹{item.total_exposure?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-700">
                      ₹{item.avg_claim_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Rule Performance */}
      {activeTab === 'rules' && ruleReport && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex justify-between items-center">
            <div>
              <h2 className="text-base font-bold text-slate-900">{ruleReport.title}</h2>
              <div className="text-[11px] text-slate-500 font-mono mt-0.5">{ruleReport.disclaimer}</div>
            </div>
            <button
              onClick={() => handleExportCSV('rules')}
              className="text-xs text-blue-600 hover:underline font-semibold flex items-center space-x-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Rules CSV</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Rule Name</th>
                  <th className="py-2.5 px-4">Severity</th>
                  <th className="py-2.5 px-4 text-center">Weight</th>
                  <th className="py-2.5 px-4 text-center">Status</th>
                  <th className="py-2.5 px-4 text-right">Triggered Times</th>
                  <th className="py-2.5 px-4 text-right">Avg Contribution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ruleReport.data.map((r) => (
                  <tr key={r.rule_code} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{r.rule_name}</div>
                      <div className="font-mono text-[10px] text-slate-400">{r.rule_code}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        r.severity === 'CRITICAL' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {r.severity}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-medium text-slate-800">
                      +{r.default_weight} pts
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        r.is_enabled ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {r.is_enabled ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">{r.times_triggered}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-700">+{r.avg_risk_contribution}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
