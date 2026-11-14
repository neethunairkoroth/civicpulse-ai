import React from 'react';
import type { DatasetSummary } from '../types/asset';

interface KpiSummaryStripProps {
  summary: DatasetSummary;
}

export const KpiSummaryStrip: React.FC<KpiSummaryStripProps> = ({ summary }) => {
  const completenessLabel =
    summary.overallCompletenessPct >= 92
      ? 'Nominal Coverage'
      : summary.overallCompletenessPct >= 80
      ? 'Moderate Gaps'
      : 'Degraded Coverage';

  const completenessColor =
    summary.overallCompletenessPct >= 92
      ? 'text-emerald-400'
      : summary.overallCompletenessPct >= 80
      ? 'text-amber-400'
      : 'text-red-400';

  const gapRate =
    summary.totalAssets > 0
      ? Math.round((summary.criticalMetadataGapAssets / summary.totalAssets) * 1000) / 10
      : 0;

  const highRiskRate =
    summary.totalAssets > 0
      ? Math.round((summary.highRiskAssets / summary.totalAssets) * 1000) / 10
      : 0;

  return (
    <section
      id="overview"
      aria-label="Executive KPI Summary"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      {/* Card 1: Total Assets */}
      <div className="rounded-xl border border-slate-800/90 bg-[#0E1523] p-5 flex flex-col justify-between gap-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-slate-400">Total Monitored Assets</span>
          <span className="text-[11px] font-medium text-cyan-300">Active Fleet</span>
        </div>
        <div>
          <div className="font-mono text-3xl font-semibold tracking-tight text-slate-50 tabular-nums">
            {summary.totalAssets.toLocaleString()}
          </div>
          <p className="mt-1.5 text-xs text-slate-400">
            {summary.categories.length} categories
            <span aria-hidden="true"> · </span>
            Avg condition{' '}
            <span className="font-mono tabular-nums text-slate-200">
              {summary.avgConditionScore !== null ? `${summary.avgConditionScore}/100` : 'N/A'}
            </span>
          </p>
        </div>
      </div>

      {/* Card 2: Overall Data Completeness */}
      <div className="rounded-xl border border-slate-800/90 bg-[#0E1523] p-5 flex flex-col justify-between gap-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-slate-400">Overall Data Completeness</span>
          <span className={`text-[11px] font-medium ${completenessColor}`}>
            {completenessLabel}
          </span>
        </div>
        <div>
          <div className="font-mono text-3xl font-semibold tracking-tight text-slate-50 tabular-nums">
            {summary.overallCompletenessPct.toFixed(1)}%
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-cyan-400 transition-all duration-300"
              style={{ width: `${Math.min(100, summary.overallCompletenessPct)}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-slate-400">
            <span className="font-mono tabular-nums text-slate-200">
              {summary.totalMissingCells.toLocaleString()}
            </span>{' '}
            missing metadata cells across 8 schema fields
          </p>
        </div>
      </div>

      {/* Card 3: Critical Metadata Gaps */}
      <div className="rounded-xl border border-slate-800/90 bg-[#0E1523] p-5 flex flex-col justify-between gap-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-slate-400">Critical Metadata Gaps</span>
          <span
            className={`text-[11px] font-medium ${
              summary.criticalMetadataGapAssets > 0 ? 'text-amber-400' : 'text-emerald-400'
            }`}
          >
            {summary.criticalMetadataGapAssets > 0 ? 'Needs Enrichment' : 'Schema Complete'}
          </span>
        </div>
        <div>
          <div className="font-mono text-3xl font-semibold tracking-tight text-slate-50 tabular-nums">
            {summary.criticalMetadataGapAssets.toLocaleString()}
          </div>
          <p className="mt-1.5 text-xs text-slate-400">
            <span className="font-mono tabular-nums text-amber-300">{gapRate}%</span> of fleet
            missing OEM, install date, score, or inspection
          </p>
        </div>
      </div>

      {/* Card 4: High-Risk Assets */}
      <div className="rounded-xl border border-slate-800/90 bg-[#0E1523] p-5 flex flex-col justify-between gap-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-slate-400">High-Risk Assets</span>
          <span
            className={`text-[11px] font-medium ${
              summary.highRiskAssets > 0 ? 'text-red-400' : 'text-emerald-400'
            }`}
          >
            {summary.highRiskAssets > 0 ? 'Critical Priority' : 'Within Threshold'}
          </span>
        </div>
        <div>
          <div className="font-mono text-3xl font-semibold tracking-tight text-slate-50 tabular-nums">
            {summary.highRiskAssets.toLocaleString()}
          </div>
          <p className="mt-1.5 text-xs text-slate-400">
            <span className="font-mono tabular-nums text-red-400">{highRiskRate}%</span> of fleet
            <span aria-hidden="true"> · </span>
            <span className="font-mono tabular-nums text-slate-200">
              {summary.overdueInspectionAssets}
            </span>{' '}
            overdue inspections
          </p>
        </div>
      </div>
    </section>
  );
};
