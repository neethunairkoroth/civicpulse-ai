import React, { useState } from 'react';
import type { CategoryMetrics } from '../types/asset';

interface CategoryChartsProps {
  categories: CategoryMetrics[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

export const CategoryCharts: React.FC<CategoryChartsProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
}) => {
  const [hoveredCompleteness, setHoveredCompleteness] = useState<CategoryMetrics | null>(null);
  const [hoveredRisk, setHoveredRisk] = useState<CategoryMetrics | null>(null);

  if (categories.length === 0) {
    return null;
  }

  return (
    <section
      id="analytics"
      aria-label="Category completeness and risk analytics"
      className="grid grid-cols-1 gap-6 lg:grid-cols-2"
    >
      {/* Left Chart: Data Completeness by Category */}
      <div className="rounded-xl border border-slate-800/90 bg-[#0E1523] p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-100">
                Data Completeness by Asset Category
              </h2>
              <p className="mt-0.5 text-xs text-slate-400">
                Click any category to filter the remediation queue below
              </p>
            </div>
            {selectedCategory !== 'ALL' && (
              <button
                type="button"
                onClick={() => onSelectCategory('ALL')}
                className="text-xs font-medium text-cyan-300 hover:text-cyan-200 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 rounded-sm"
              >
                Reset Filter ({selectedCategory})
              </button>
            )}
          </div>

          <div className="mt-5 space-y-3.5">
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat.category;
              const barColor =
                cat.completenessPct >= 92
                  ? 'bg-emerald-400'
                  : cat.completenessPct >= 84
                  ? 'bg-cyan-400'
                  : 'bg-amber-400';

              return (
                <button
                  key={cat.category}
                  type="button"
                  onClick={() =>
                    onSelectCategory(isSelected ? 'ALL' : cat.category)
                  }
                  onMouseEnter={() => setHoveredCompleteness(cat)}
                  onMouseLeave={() => setHoveredCompleteness(null)}
                  onFocus={() => setHoveredCompleteness(cat)}
                  onBlur={() => setHoveredCompleteness(null)}
                  className={`w-full text-left rounded-lg border px-3.5 py-2.5 transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                    isSelected
                      ? 'border-cyan-400/70 bg-cyan-500/10'
                      : 'border-slate-800/70 bg-[#0A101B] hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-medium text-slate-100 truncate">
                        {cat.category}
                      </span>
                      <span className="font-mono text-[11px] text-slate-400 tabular-nums shrink-0">
                        ({cat.total})
                      </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 font-mono tabular-nums">
                      <span className="text-[11px] text-slate-400 hidden sm:inline">
                        {cat.missingManufacturer} OEM · {cat.missingInstallDate} Date gaps
                      </span>
                      <span className="font-semibold text-slate-100">
                        {cat.completenessPct.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-800/90">
                    <div
                      className={`h-full rounded-full ${barColor} transition-all duration-300`}
                      style={{ width: `${Math.min(100, cat.completenessPct)}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Interactive Readout Footer */}
        <div className="mt-4 border-t border-slate-800/80 pt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
          {hoveredCompleteness ? (
            <>
              <span className="font-medium text-slate-200">
                {hoveredCompleteness.category} Breakdown:
              </span>
              <span className="font-mono tabular-nums text-slate-300">
                Missing OEM: {hoveredCompleteness.missingManufacturer} · Missing Install Date:{' '}
                {hoveredCompleteness.missingInstallDate} · Overdue Inspections:{' '}
                {hoveredCompleteness.overdueInspections}
              </span>
            </>
          ) : (
            <>
              <span>Schema coverage across 8 required asset fields</span>
              <span className="font-mono tabular-nums text-slate-300">
                Hover bar for field-level gap counts
              </span>
            </>
          )}
        </div>
      </div>

      {/* Right Chart: Risk & Condition Distribution by Category */}
      <div className="rounded-xl border border-slate-800/90 bg-[#0E1523] p-5 flex flex-col justify-between">
        <div>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-100">
                Risk Tier & Condition Breakdown
              </h2>
              <p className="mt-0.5 text-xs text-slate-400">
                Asset condition scores paired with inspection overdue exposure
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-300">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs bg-red-500" aria-hidden="true" />
                Critical
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs bg-amber-400" aria-hidden="true" />
                Watch
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs bg-emerald-500" aria-hidden="true" />
                Nominal
              </span>
            </div>
          </div>

          <div className="mt-5 space-y-3.5">
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat.category;
              const critPct = cat.total > 0 ? (cat.criticalCount / cat.total) * 100 : 0;
              const watchPct = cat.total > 0 ? (cat.watchCount / cat.total) * 100 : 0;
              const nomPct = cat.total > 0 ? (cat.nominalCount / cat.total) * 100 : 0;

              return (
                <button
                  key={cat.category}
                  type="button"
                  onClick={() =>
                    onSelectCategory(isSelected ? 'ALL' : cat.category)
                  }
                  onMouseEnter={() => setHoveredRisk(cat)}
                  onMouseLeave={() => setHoveredRisk(null)}
                  onFocus={() => setHoveredRisk(cat)}
                  onBlur={() => setHoveredRisk(null)}
                  className={`w-full text-left rounded-lg border px-3.5 py-2.5 transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                    isSelected
                      ? 'border-cyan-400/70 bg-cyan-500/10'
                      : 'border-slate-800/70 bg-[#0A101B] hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="font-medium text-slate-100 truncate">
                      {cat.category}
                    </span>
                    <div className="flex items-center gap-3 shrink-0 font-mono tabular-nums text-[11px]">
                      <span className="text-red-400">
                        {cat.criticalCount} Critical
                      </span>
                      <span className="text-slate-400">
                        Avg{' '}
                        <span className="text-slate-100 font-semibold">
                          {cat.avgConditionScore !== null
                            ? cat.avgConditionScore.toFixed(1)
                            : 'N/A'}
                        </span>
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 flex h-2.5 w-full overflow-hidden rounded-full bg-slate-800/90">
                    {critPct > 0 && (
                      <div
                        className="h-full bg-red-500 transition-all duration-300"
                        style={{ width: `${critPct}%` }}
                      />
                    )}
                    {watchPct > 0 && (
                      <div
                        className="h-full bg-amber-400 transition-all duration-300"
                        style={{ width: `${watchPct}%` }}
                      />
                    )}
                    {nomPct > 0 && (
                      <div
                        className="h-full bg-emerald-500 transition-all duration-300"
                        style={{ width: `${nomPct}%` }}
                      />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Interactive Readout Footer */}
        <div className="mt-4 border-t border-slate-800/80 pt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
          {hoveredRisk ? (
            <>
              <span className="font-medium text-slate-200">
                {hoveredRisk.category} Risk Mix:
              </span>
              <span className="font-mono tabular-nums text-slate-300">
                Critical: {hoveredRisk.criticalCount} · Watch: {hoveredRisk.watchCount} · Nominal:{' '}
                {hoveredRisk.nominalCount} · Overdue: {hoveredRisk.overdueInspections}
              </span>
            </>
          ) : (
            <>
              <span>Critical defined as condition &lt; 50 or overdue &gt; 365d</span>
              <span className="font-mono tabular-nums text-slate-300">
                Hover bar for risk tier counts
              </span>
            </>
          )}
        </div>
      </div>
    </section>
  );
};
