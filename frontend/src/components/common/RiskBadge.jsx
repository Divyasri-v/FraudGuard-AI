import React from 'react';

const RiskBadge = ({ level, score, showScore = true, size = 'sm' }) => {
  const normalizedLevel = (level || 'LOW').toUpperCase();

  const config = {
    LOW: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/70',
      dot: 'bg-emerald-500',
      label: 'LOW RISK'
    },
    MEDIUM: {
      bg: 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/70',
      dot: 'bg-amber-500',
      label: 'MEDIUM RISK'
    },
    HIGH: {
      bg: 'bg-orange-50 dark:bg-orange-950/50 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800/70',
      dot: 'bg-orange-500',
      label: 'HIGH RISK'
    },
    CRITICAL: {
      bg: 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/70',
      dot: 'bg-rose-500',
      label: 'CRITICAL RISK'
    }
  };

  const current = config[normalizedLevel] || config.LOW;
  const padding = size === 'lg' ? 'px-3 py-1.5 text-sm font-semibold' : 'px-2 py-0.5 text-xs font-medium';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border ${current.bg} ${padding} transition-transform duration-200 hover:scale-105`}>
      <span className={`w-1.5 h-1.5 rounded-full ${current.dot}`}></span>
      <span>{current.label}</span>
      {showScore && score !== undefined && score !== null && (
        <span className="opacity-80 font-mono text-[11px] font-semibold">({Number(score).toFixed(0)})</span>
      )}
    </span>
  );
};

export default RiskBadge;
