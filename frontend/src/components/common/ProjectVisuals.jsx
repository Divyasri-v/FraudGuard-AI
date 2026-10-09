import React from 'react';

/**
 * High-tech Fraud Detection Cyber Shield with RGB glowing circuitry
 */
export const FraudShieldVisual = ({ size = 64, className = '' }) => (
  <div className={`relative inline-flex items-center justify-center ${className}`}>
    <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl animate-pulse pointer-events-none" />
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="relative drop-shadow-[0_0_12px_rgba(59,130,246,0.6)]"
    >
      <defs>
        <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="50%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
        <linearGradient id="shieldRim" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="50%" stopColor="#ec4899" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
        <linearGradient id="glowInner" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#1e3a8a" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#0f172a" stopOpacity="0.95" />
        </linearGradient>
      </defs>

      {/* Outer Hex Glow Ring */}
      <path
        d="M50 6 L86 24 L86 58 C86 78 50 94 50 94 C50 94 14 78 14 58 L14 24 Z"
        fill="url(#glowInner)"
        stroke="url(#shieldRim)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Cyber Circuit Traces */}
      <path
        d="M50 16 L74 29 L74 54 C74 68 50 82 50 82 C50 82 26 68 26 54 L26 29 Z"
        stroke="#38bdf8"
        strokeWidth="1.2"
        strokeDasharray="4 2"
        fill="none"
        opacity="0.6"
      />
      <circle cx="50" cy="16" r="2.5" fill="#38bdf8" />
      <circle cx="74" cy="29" r="2" fill="#818cf8" />
      <circle cx="26" cy="29" r="2" fill="#818cf8" />

      {/* Central Security Padlock & Cross */}
      <rect x="42" y="44" width="16" height="14" rx="3" fill="url(#shieldGrad)" />
      <path
        d="M45 44 V39 C45 36.2 47.2 34 50 34 C52.8 34 55 36.2 55 39 V44"
        stroke="#ffffff"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="50" cy="50" r="1.8" fill="#ffffff" />
      <path d="M50 52 V55" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />

      {/* Verified Shield Accent Wings */}
      <path
        d="M32 50 C32 64 50 74 50 74 C50 74 68 64 68 50"
        stroke="#10b981"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="3 3"
      />
    </svg>
  </div>
);

/**
 * AI Brain & Neural Copilot Visual with connected synapse nodes
 */
export const NeuralAIVisual = ({ size = 64, className = '', pulse = true }) => (
  <div className={`relative inline-flex items-center justify-center ${className}`}>
    <div className={`absolute inset-0 bg-indigo-500/25 rounded-full blur-xl pointer-events-none ${pulse ? 'animate-pulse' : ''}`} />
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="relative drop-shadow-[0_0_12px_rgba(99,102,241,0.65)]"
    >
      <defs>
        <linearGradient id="aiBrainGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="50%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#c084fc" />
        </linearGradient>
        <radialGradient id="aiCore" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#1e1b4b" stopOpacity="0.4" />
        </radialGradient>
      </defs>

      {/* Central AI Orb */}
      <circle cx="50" cy="50" r="28" fill="url(#aiCore)" stroke="#6366f1" strokeWidth="1.5" />

      {/* Synapse Network Paths */}
      <path d="M50 22 L50 36 M50 64 L50 78" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
      <path d="M22 50 L36 50 M64 50 L78 50" stroke="#c084fc" strokeWidth="2" strokeLinecap="round" />
      <path d="M30 30 L40 40 M60 60 L70 70" stroke="#818cf8" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M70 30 L60 40 M40 60 L30 70" stroke="#818cf8" strokeWidth="1.8" strokeLinecap="round" />

      {/* Neural Core Rings */}
      <circle cx="50" cy="50" r="16" stroke="url(#aiBrainGrad)" strokeWidth="2" strokeDasharray="6 3" />
      <circle cx="50" cy="50" r="8" fill="url(#aiBrainGrad)" />

      {/* Outer Pulse Nodes */}
      <circle cx="50" cy="18" r="3.5" fill="#38bdf8" className={pulse ? "animate-ping origin-center" : ""} />
      <circle cx="50" cy="18" r="3" fill="#38bdf8" />
      <circle cx="50" cy="82" r="3" fill="#38bdf8" />
      <circle cx="18" cy="50" r="3" fill="#c084fc" />
      <circle cx="82" cy="50" r="3" fill="#c084fc" />
      <circle cx="26" cy="26" r="2.5" fill="#818cf8" />
      <circle cx="74" cy="26" r="2.5" fill="#818cf8" />
      <circle cx="26" cy="74" r="2.5" fill="#818cf8" />
      <circle cx="74" cy="74" r="2.5" fill="#818cf8" />
    </svg>
  </div>
);

/**
 * Insurance Claim Document Visual with billing checkmark and medical badge
 */
export const ClaimDocumentVisual = ({ size = 56, className = '' }) => (
  <div className={`relative inline-flex items-center justify-center ${className}`}>
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="drop-shadow-[0_0_8px_rgba(59,130,246,0.4)]"
    >
      <defs>
        <linearGradient id="docGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#f1f5f9" />
        </linearGradient>
      </defs>

      {/* Main Document Body */}
      <rect x="18" y="10" width="44" height="60" rx="6" fill="url(#docGrad)" stroke="#3b82f6" strokeWidth="2" />
      {/* Fold corner */}
      <path d="M48 10 L62 24 L48 24 Z" fill="#93c5fd" stroke="#3b82f6" strokeWidth="1.5" />

      {/* Medical Cross Stamp */}
      <rect x="25" y="19" width="10" height="3" rx="1.5" fill="#2563eb" />
      <rect x="28.5" y="15.5" width="3" height="10" rx="1.5" fill="#2563eb" />

      {/* Text Lines */}
      <line x1="26" y1="34" x2="54" y2="34" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="26" y1="42" x2="48" y2="42" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="26" y1="50" x2="52" y2="50" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" />

      {/* Green Verified Audit Badge */}
      <circle cx="52" cy="58" r="9" fill="#10b981" stroke="#ffffff" strokeWidth="2" />
      <path d="M48.5 58 L51 60.5 L56 55.5" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </div>
);

/**
 * Dynamic Speedometer Risk Gauge with needle and RGB zone arcs
 */
export const RiskMeterGauge = ({ score = 50, size = 180, className = '' }) => {
  const clampedScore = Math.max(0, Math.min(100, Number(score) || 0));
  // Angle maps from -90 deg (score 0, green) to +90 deg (score 100, critical red)
  const angle = -90 + (clampedScore / 100) * 180;

  const getRiskInfo = (val) => {
    if (val <= 30) return { label: 'LOW RISK', color: '#10b981', glow: 'rgba(16,185,129,0.5)' };
    if (val <= 60) return { label: 'MEDIUM RISK', color: '#f59e0b', glow: 'rgba(245,158,11,0.5)' };
    if (val <= 80) return { label: 'HIGH RISK', color: '#f97316', glow: 'rgba(249,115,22,0.5)' };
    return { label: 'CRITICAL ALERT', color: '#ef4444', glow: 'rgba(239,68,68,0.6)' };
  };

  const risk = getRiskInfo(clampedScore);

  return (
    <div className={`flex flex-col items-center select-none ${className}`}>
      <svg
        width={size}
        height={size * 0.65}
        viewBox="0 0 200 130"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="overflow-visible"
      >
        <defs>
          <filter id="gaugeGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Outer Background Track */}
        <path
          d="M 25 105 A 75 75 0 0 1 175 105"
          stroke="#e2e8f0"
          strokeWidth="14"
          strokeLinecap="round"
          className="dark:stroke-slate-800"
        />

        {/* 4 Colored Risk Segments */}
        {/* Low: 0-30% (Green) */}
        <path
          d="M 25 105 A 75 75 0 0 1 54 44"
          stroke="#10b981"
          strokeWidth="12"
          strokeLinecap="round"
          opacity="0.9"
        />
        {/* Medium: 31-60% (Amber) */}
        <path
          d="M 54 44 A 75 75 0 0 1 118 32"
          stroke="#f59e0b"
          strokeWidth="12"
          opacity="0.9"
        />
        {/* High: 61-80% (Orange) */}
        <path
          d="M 118 32 A 75 75 0 0 1 155 52"
          stroke="#f97316"
          strokeWidth="12"
          opacity="0.9"
        />
        {/* Critical: 81-100% (Red) */}
        <path
          d="M 155 52 A 75 75 0 0 1 175 105"
          stroke="#ef4444"
          strokeWidth="12"
          strokeLinecap="round"
          opacity="0.9"
        />

        {/* Needle with pivot */}
        <g transform={`rotate(${angle} 100 105)`} className="transition-transform duration-700 ease-out">
          <line x1="100" y1="105" x2="100" y2="35" stroke="#1e293b" strokeWidth="3.5" strokeLinecap="round" className="dark:stroke-white" />
          <polygon points="100,26 95,40 105,40" fill={risk.color} filter="url(#gaugeGlow)" />
        </g>
        <circle cx="100" cy="105" r="9" fill="#1e293b" stroke="#ffffff" strokeWidth="2.5" className="dark:fill-slate-100 dark:stroke-slate-900" />
        <circle cx="100" cy="105" r="4" fill={risk.color} />

        {/* Text ticks */}
        <text x="20" y="125" fontSize="10" fill="#64748b" fontWeight="600">0</text>
        <text x="94" y="20" fontSize="10" fill="#64748b" fontWeight="600">50</text>
        <text x="170" y="125" fontSize="10" fill="#64748b" fontWeight="600">100</text>
      </svg>

      {/* Score and Label Badge */}
      <div className="mt-1 flex items-center space-x-2 text-center">
        <span
          className="font-mono text-xl font-extrabold tracking-tight px-2.5 py-0.5 rounded-lg border"
          style={{
            color: risk.color,
            borderColor: `${risk.color}60`,
            backgroundColor: `${risk.color}15`,
            boxShadow: `0 0 12px ${risk.glow}`
          }}
        >
          {clampedScore.toFixed(0)} / 100
        </span>
        <span
          className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md"
          style={{ color: risk.color, backgroundColor: `${risk.color}15` }}
        >
          {risk.label}
        </span>
      </div>
    </div>
  );
};

/**
 * Case Investigation Dossier Forensic Badge
 */
export const InvestigationDossierVisual = ({ size = 64, className = '' }) => (
  <div className={`relative inline-flex items-center justify-center ${className}`}>
    <svg
      width={size}
      height={size}
      viewBox="0 0 90 90"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="drop-shadow-[0_0_10px_rgba(139,92,246,0.5)]"
    >
      <defs>
        <linearGradient id="folderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4f46e5" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
      </defs>

      {/* Dossier Folder */}
      <path
        d="M14 26 C14 22 17 19 21 19 L36 19 L42 26 L73 26 C77 26 80 29 80 33 L80 69 C80 73 77 76 73 76 L21 76 C17 76 14 73 14 69 Z"
        fill="url(#folderGrad)"
        stroke="#818cf8"
        strokeWidth="2"
      />
      {/* Inner Document Sheets */}
      <rect x="22" y="32" width="50" height="36" rx="3" fill="#f8fafc" />
      <line x1="28" y1="40" x2="52" y2="40" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="28" y1="48" x2="60" y2="48" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="28" y1="56" x2="46" y2="56" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" />

      {/* Forensic Magnifying Glass with Cyan Lens */}
      <circle cx="58" cy="50" r="14" fill="#06b6d4" fillOpacity="0.3" stroke="#22d3ee" strokeWidth="3" />
      <path d="M68 60 L78 70" stroke="#22d3ee" strokeWidth="4" strokeLinecap="round" />
      <circle cx="58" cy="50" r="6" stroke="#ffffff" strokeWidth="1.5" strokeDasharray="3 2" />
    </svg>
  </div>
);

/**
 * Healthcare Medical Facility Cross Visual
 */
export const HealthcareFacilityVisual = ({ size = 48, className = '' }) => (
  <div className={`relative inline-flex items-center justify-center ${className}`}>
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="14" width="48" height="42" rx="6" fill="#f0f9ff" stroke="#0284c7" strokeWidth="2.5" />
      <path d="M22 14 V8 C22 6.5 23.5 5 25 5 H39 C40.5 5 42 6.5 42 8 V14" stroke="#0284c7" strokeWidth="2.5" />
      {/* Medical Cross */}
      <rect x="27" y="24" width="10" height="18" rx="2" fill="#0284c7" />
      <rect x="23" y="28" width="18" height="10" rx="2" fill="#0284c7" />
    </svg>
  </div>
);
