import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FileText, PlusCircle, AlertOctagon, Search,
  Building2, Users, BarChart3, Bot, Bell, ShieldAlert, Database, X,
  ArrowRight, ShieldCheck, Activity, IndianRupee, AlertTriangle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { dashboardAPI } from '../../services/api';
import { FraudShieldVisual, NeuralAIVisual, RiskMeterGauge } from '../common/ProjectVisuals';

const Sidebar = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isInvestigator = user?.role === 'Investigator' || user?.role === 'INVESTIGATOR';

  // Live dashboard summary cache for hover preview
  const [summaryData, setSummaryData] = useState(null);
  const [showDashPreview, setShowDashPreview] = useState(false);
  const [dashCoords, setDashCoords] = useState({ top: 0, left: 0 });
  const hideTimeoutRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    dashboardAPI.getSummary()
      .then((res) => {
        if (mounted) setSummaryData(res.data);
      })
      .catch(() => {
        // Silently fallback to synthetic defaults
      });
    return () => {
      mounted = false;
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, []);

  const handleDashMouseEnter = (e) => {
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    const rect = e.currentTarget.getBoundingClientRect();
    // Clamp top position within viewport
    const top = Math.max(12, Math.min(window.innerHeight - 390, rect.top - 20));
    const left = rect.right + 12;
    setDashCoords({ top, left });
    setShowDashPreview(true);
  };

  const handleDashMouseLeave = () => {
    hideTimeoutRef.current = setTimeout(() => {
      setShowDashPreview(false);
    }, 140);
  };

  const handlePreviewMouseEnter = () => {
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
  };

  const handlePreviewMouseLeave = () => {
    setShowDashPreview(false);
  };

  const handlePreviewClick = () => {
    setShowDashPreview(false);
    navigate('/');
    if (onClose) onClose();
  };

  const formatCurrency = (val) => {
    if (!val) return '₹8.45 Cr';
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
    return `₹${Number(val).toLocaleString('en-IN')}`;
  };

  // Section 1: Role-dependent Operations & Triage
  const operationsItems = isInvestigator
    ? [
        {
          to: '/',
          label: 'Dashboard',
          icon: LayoutDashboard,
          isDashboard: true,
          glowHover: 'hover:border-blue-500/50 hover:shadow-[0_0_16px_rgba(59,130,246,0.35)]',
          badge: 'Live',
        },
        {
          to: '/investigations',
          label: 'Investigations',
          icon: Search,
          glowHover: 'hover:border-purple-500/50 hover:shadow-[0_0_16px_rgba(168,85,247,0.35)]',
        },
      ]
    : [
        {
          to: '/',
          label: 'Dashboard',
          icon: LayoutDashboard,
          isDashboard: true,
          glowHover: 'hover:border-blue-500/50 hover:shadow-[0_0_16px_rgba(59,130,246,0.35)]',
          badge: 'Live',
        },
        {
          to: '/claims',
          label: 'Claims',
          icon: FileText,
          glowHover: 'hover:border-sky-500/50 hover:shadow-[0_0_16px_rgba(14,165,233,0.3)]',
        },
        {
          to: '/claims/new',
          label: 'Submit Claim',
          icon: PlusCircle,
          glowHover: 'hover:border-blue-400/50 hover:shadow-[0_0_16px_rgba(96,165,250,0.3)]',
        },
        {
          to: '/review-queue',
          label: 'Review Queue',
          icon: AlertOctagon,
          glowHover: 'hover:border-rose-500/50 hover:shadow-[0_0_16px_rgba(244,63,94,0.35)]',
          badge: 'Triage',
        },
      ];

  // Section 2: Entities & Insights (Both Roles)
  const insightsItems = [
    {
      to: '/providers',
      label: 'Providers',
      icon: Building2,
      glowHover: 'hover:border-teal-500/50 hover:shadow-[0_0_16px_rgba(20,184,166,0.3)]',
    },
    {
      to: '/patients',
      label: 'Patients',
      icon: Users,
      glowHover: 'hover:border-emerald-500/50 hover:shadow-[0_0_16px_rgba(16,185,129,0.3)]',
    },
    {
      to: '/reports',
      label: 'Reports',
      icon: BarChart3,
      glowHover: 'hover:border-indigo-500/50 hover:shadow-[0_0_16px_rgba(99,102,241,0.3)]',
    },
    {
      to: '/assistant',
      label: 'AI Assistant',
      icon: Bot,
      glowHover: 'hover:border-cyan-400/60 hover:shadow-[0_0_20px_rgba(34,211,238,0.4)]',
      badge: 'Gemini',
      isAI: true,
    },
  ];

  // Section 3: System & Audit (Both Roles)
  const systemItems = [
    {
      to: '/notifications',
      label: 'Notifications',
      icon: Bell,
      glowHover: 'hover:border-amber-500/50 hover:shadow-[0_0_16px_rgba(245,158,11,0.3)]',
    },
    {
      to: '/audit-logs',
      label: 'Audit Logs',
      icon: ShieldAlert,
      glowHover: 'hover:border-rose-500/50 hover:shadow-[0_0_16px_rgba(244,63,94,0.3)]',
    },
    {
      to: '/demo-data',
      label: 'Demo Data',
      icon: Database,
      glowHover: 'hover:border-slate-500/50 hover:shadow-[0_0_16px_rgba(148,163,184,0.25)]',
    },
  ];

  const renderNavItem = (item) => {
    const Icon = item.icon;
    const isDash = item.isDashboard;

    return (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.to === '/'}
        onClick={() => {
          setShowDashPreview(false);
          if (onClose) onClose();
        }}
        onMouseEnter={isDash ? handleDashMouseEnter : undefined}
        onMouseLeave={isDash ? handleDashMouseLeave : undefined}
        className={({ isActive }) =>
          `group relative flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all duration-250 cursor-pointer ${
            isActive
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/35 border-blue-400/40 translate-x-1'
              : `text-slate-300 border-transparent hover:text-white hover:bg-slate-800/90 hover:translate-x-1.5 hover:scale-[1.015] ${item.glowHover}`
          }`
        }
      >
        <div className="flex items-center space-x-3">
          <Icon className="w-4 h-4 flex-shrink-0 transition-transform duration-250 group-hover:scale-115 group-hover:text-blue-400" />
          <span className="tracking-tight">{item.label}</span>
        </div>

        {item.badge && (
          <span
            className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider ${
              item.isAI
                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-xs shadow-cyan-500/50'
                : 'bg-slate-800/80 text-blue-300 border border-blue-500/30'
            }`}
          >
            {item.badge}
          </span>
        )}
      </NavLink>
    );
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header with Cyber Shield Visual */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-500 p-0.5 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <FraudShieldVisual size={28} />
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-white block">
                FraudGuard AI
              </span>
              <span className="text-[10px] text-blue-400 font-semibold tracking-wider uppercase block -mt-0.5">
                {isInvestigator ? 'Investigator Portal' : 'Analyst Portal'}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation items */}
        <div className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
          <div className="px-3 pb-1 pt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Operations &amp; Triage
          </div>
          {operationsItems.map(renderNavItem)}

          <div className="px-3 pb-1 pt-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Entities &amp; Insights
          </div>
          {insightsItems.map(renderNavItem)}

          <div className="px-3 pb-1 pt-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            System &amp; Audit
          </div>
          {systemItems.map(renderNavItem)}
        </div>

        {/* Footer status with live system indicator */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/50 text-[11px] text-slate-400">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-semibold text-slate-200">
              {isInvestigator ? 'Investigator' : 'Fraud Analyst'}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800/80 shadow-[0_0_8px_rgba(16,185,129,0.3)]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
              Live Online
            </span>
          </div>
          <div className="text-[10px] text-slate-500 truncate flex items-center justify-between">
            <span>10 FWA Rules • Isolation Forest</span>
            <span className="text-blue-400 font-mono">10,000 DB</span>
          </div>
        </div>
      </aside>

      {/* Floating Dashboard Hover Preview Popover */}
      {showDashPreview && (
        <div
          onMouseEnter={handlePreviewMouseEnter}
          onMouseLeave={handlePreviewMouseLeave}
          onClick={handlePreviewClick}
          style={{
            position: 'fixed',
            top: `${dashCoords.top}px`,
            left: `${dashCoords.left}px`,
            zIndex: 9999,
          }}
          className="w-80 bg-slate-900/95 backdrop-blur-md border border-blue-500/50 rounded-2xl shadow-[0_12px_36px_rgba(0,0,0,0.85),0_0_25px_rgba(59,130,246,0.3)] p-4 text-slate-200 popover-animate-in cursor-pointer select-none"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <NeuralAIVisual size={22} pulse={false} />
              <div>
                <span className="text-xs font-bold text-white block">Dashboard Telemetry</span>
                <span className="text-[10px] text-slate-400 block -mt-0.5">Real-time SIU Overview</span>
              </div>
            </div>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800/80">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1 animate-pulse" />
              Active
            </span>
          </div>

          {/* KPI Mini Grid */}
          <div className="grid grid-cols-2 gap-2 my-3">
            <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60 hover:border-blue-500/40 transition-colors">
              <div className="text-[10px] text-slate-400 font-medium">Ingested Claims</div>
              <div className="text-base font-extrabold text-blue-400 font-mono mt-0.5">
                {summaryData?.total_claims?.toLocaleString() || '10,000'}
              </div>
              <div className="text-[9px] text-slate-500">Synthetic DB</div>
            </div>

            <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60 hover:border-amber-500/40 transition-colors">
              <div className="text-[10px] text-slate-400 font-medium">Flagged Anomalies</div>
              <div className="text-base font-extrabold text-amber-400 font-mono mt-0.5">
                {summaryData?.suspicious_claims?.toLocaleString() || '2,148'}
              </div>
              <div className="text-[9px] text-amber-500 font-semibold">
                {summaryData?.suspicious_claim_percentage || '21.5'}% density
              </div>
            </div>

            <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60 hover:border-rose-500/40 transition-colors">
              <div className="text-[10px] text-slate-400 font-medium">Critical Alert Tier</div>
              <div className="text-base font-extrabold text-rose-400 font-mono mt-0.5">
                {summaryData?.critical_claims || '300'}
              </div>
              <div className="text-[9px] text-rose-400">Score ≥ 81.0 hold</div>
            </div>

            <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60 hover:border-emerald-500/40 transition-colors">
              <div className="text-[10px] text-slate-400 font-medium">Risk Exposure</div>
              <div className="text-base font-extrabold text-emerald-400 font-mono mt-0.5">
                {formatCurrency(summaryData?.potential_risk_amount)}
              </div>
              <div className="text-[9px] text-slate-500">Flagged pool</div>
            </div>
          </div>

          {/* Risk Segmentation Bar */}
          <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 mb-3">
            <div className="flex justify-between items-center text-[10px] font-semibold mb-1.5">
              <span className="text-slate-400 uppercase tracking-wider">Risk Segmentation</span>
              <span className="text-indigo-400 font-mono">
                Avg: {summaryData?.average_risk_score || 38.6}/100
              </span>
            </div>
            {/* Visual segmented bar */}
            <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden flex">
              <div style={{ width: '78.5%' }} className="bg-emerald-500 h-full" title="Low: 78.5%" />
              <div style={{ width: '12.4%' }} className="bg-amber-500 h-full" title="Medium: 12.4%" />
              <div style={{ width: '6.1%' }} className="bg-orange-500 h-full" title="High: 6.1%" />
              <div style={{ width: '3.0%' }} className="bg-rose-500 h-full" title="Critical: 3.0%" />
            </div>
            <div className="flex justify-between text-[9px] font-semibold text-slate-400 mt-1.5 px-0.5">
              <span className="text-emerald-400">● Low</span>
              <span className="text-amber-400">● Med</span>
              <span className="text-orange-400">● High</span>
              <span className="text-rose-400">● Critical</span>
            </div>
          </div>

          {/* Action Callout */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px] text-blue-400 font-semibold group">
            <span className="group-hover:text-white transition-colors">Click to launch full analytics</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
