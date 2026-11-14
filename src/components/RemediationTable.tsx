import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Search, Sparkles } from 'lucide-react';
import type { AnalyzedAsset, RemediationProposal } from '../types/asset';

export type AnomalyFilterMode =
  | 'ANOMALIES'
  | 'MISSING_METADATA'
  | 'OVERDUE'
  | 'LOW_CONDITION'
  | 'ALL';

interface RemediationTableProps {
  assets: AnalyzedAsset[];
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  proposalsByAssetId: Record<string, RemediationProposal>;
  appliedAssetIds: Record<string, boolean>;
  loadingAssetId: string | null;
  onSuggestFix: (asset: AnalyzedAsset) => void;
  onLoadSample: () => void;
}

const PAGE_SIZE = 15;

export const RemediationTable: React.FC<RemediationTableProps> = ({
  assets,
  categories,
  selectedCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  proposalsByAssetId,
  appliedAssetIds,
  loadingAssetId,
  onSuggestFix,
  onLoadSample,
}) => {
  const [filterMode, setFilterMode] = useState<AnomalyFilterMode>('ANOMALIES');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const list = assets.filter((a) => {
      if (selectedCategory !== 'ALL' && a.Category !== selectedCategory) return false;

      if (filterMode === 'ANOMALIES' && a.anomalyReasons.length === 0) return false;
      if (filterMode === 'MISSING_METADATA' && a.missingFields.length === 0) return false;
      if (filterMode === 'OVERDUE' && !a.isOverdueInspection) return false;
      if (filterMode === 'LOW_CONDITION' && !a.isLowCondition) return false;

      if (q) {
        const hay = [
          a.Asset_ID,
          a.Category,
          a.Location,
          a.Manufacturer ?? '',
          a.Description ?? '',
          ...a.anomalyReasons,
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    });

    // Prioritize highest-risk / most anomalous rows first
    return [...list].sort((a, b) => {
      if (a.isHighRisk !== b.isHighRisk) return a.isHighRisk ? -1 : 1;
      if (b.anomalyReasons.length !== a.anomalyReasons.length) {
        return b.anomalyReasons.length - a.anomalyReasons.length;
      }
      return (a.Condition_Score ?? 0) - (b.Condition_Score ?? 0);
    });
  }, [assets, selectedCategory, filterMode, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(pageStart, pageStart + PAGE_SIZE);

  const handleFilterChange = (mode: AnomalyFilterMode) => {
    setFilterMode(mode);
    setPage(1);
  };

  const tabs: { id: AnomalyFilterMode; label: string }[] = [
    { id: 'ANOMALIES', label: 'All Anomalies' },
    { id: 'MISSING_METADATA', label: 'Missing Metadata' },
    { id: 'OVERDUE', label: 'Overdue Inspections' },
    { id: 'LOW_CONDITION', label: 'Low Condition (<50)' },
    { id: 'ALL', label: 'All Assets' },
  ];

  return (
    <section
      id="remediation"
      aria-label="Automated Anomaly and Remediation Table"
      className="rounded-xl border border-slate-800/90 bg-[#0E1523] p-5"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-100">
            Automated Anomaly & Remediation Queue
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Assets flagged for missing specifications, overdue inspections, or degraded physical condition
          </p>
        </div>

        {/* Segmented Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1 rounded-lg bg-[#090E18] p-1 border border-slate-800/80">
          {tabs.map((tab) => {
            const active = filterMode === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleFilterChange(tab.id)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                  active
                    ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/40'
                    : 'text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Search & Category Controls */}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
            aria-hidden="true"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              onSearchChange(e.target.value);
              setPage(1);
            }}
            placeholder="Filter by Asset_ID, station, OEM, or issue..."
            aria-label="Search assets"
            className="w-full rounded-lg border border-slate-700/80 bg-[#0A101B] py-2 pl-9 pr-3 text-xs text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
          />
        </div>

        <div className="flex items-center gap-3">
          <label htmlFor="category-filter-select" className="text-xs text-slate-400 whitespace-nowrap">
            Category:
          </label>
          <select
            id="category-filter-select"
            value={selectedCategory}
            onChange={(e) => {
              onSelectCategory(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-slate-700/80 bg-[#0A101B] px-3 py-2 text-xs text-slate-100 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
          >
            <option value="ALL">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Empty State */}
      {assets.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-slate-800 py-14 text-center">
          <p className="text-sm font-medium text-slate-200">No asset dataset loaded</p>
          <p className="mt-1 text-xs text-slate-400">
            Load the 500-asset NYC Transit & Municipal sample or upload a custom CSV file to inspect anomalies.
          </p>
          <button
            type="button"
            onClick={onLoadSample}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-400 transition-colors cursor-pointer"
          >
            Load 500 NYC Assets
          </button>
        </div>
      ) : pageRows.length === 0 ? (
        <div className="mt-6 rounded-lg border border-slate-800/80 bg-[#0A101B] py-12 text-center">
          <p className="text-sm font-medium text-slate-200">No matching assets</p>
          <p className="mt-1 text-xs text-slate-400">
            Try clearing your search query or switching to All Assets.
          </p>
          <button
            type="button"
            onClick={() => {
              onSearchChange('');
              onSelectCategory('ALL');
              setFilterMode('ALL');
            }}
            className="mt-3 text-xs font-medium text-cyan-300 hover:text-cyan-200 cursor-pointer"
          >
            Reset all filters
          </button>
        </div>
      ) : (
        <>
          <div className="mt-4 overflow-x-auto rounded-lg border border-slate-800/80">
            <table className="w-full min-w-[920px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-[#0A101B] text-[11px] font-semibold text-slate-400">
                  <th className="py-3 pl-4 pr-3">Asset ID</th>
                  <th className="py-3 px-3">Category & Location</th>
                  <th className="py-3 px-3">Manufacturer</th>
                  <th className="py-3 px-3">Install Date</th>
                  <th className="py-3 px-3 text-right">Condition</th>
                  <th className="py-3 px-3">Last Inspection</th>
                  <th className="py-3 px-3">Detected Issues</th>
                  <th className="py-3 pl-3 pr-4 text-right">Remediation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {pageRows.map((asset) => {
                  const hasProposal = Boolean(proposalsByAssetId[asset.Asset_ID]);
                  const isApplied = Boolean(appliedAssetIds[asset.Asset_ID]);
                  const isRowLoading = loadingAssetId === asset.Asset_ID;

                  const conditionColor =
                    asset.Condition_Score === null
                      ? 'text-amber-400'
                      : asset.Condition_Score < 50
                      ? 'text-red-400'
                      : asset.Condition_Score < 70
                      ? 'text-amber-300'
                      : 'text-emerald-400';

                  return (
                    <tr
                      key={asset.Asset_ID}
                      className="hover:bg-slate-800/35 transition-colors duration-100"
                    >
                      <td className="py-3 pl-4 pr-3 font-mono font-medium text-slate-100 whitespace-nowrap tabular-nums">
                        {asset.Asset_ID}
                      </td>
                      <td className="py-3 px-3 max-w-[240px]">
                        <div className="font-medium text-slate-100 truncate">
                          {asset.Category}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate" title={asset.Location}>
                          {asset.Location}
                        </div>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        {asset.Manufacturer ? (
                          <span className="text-slate-200">{asset.Manufacturer}</span>
                        ) : (
                          <span className="font-medium text-amber-400">Missing OEM</span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono tabular-nums whitespace-nowrap">
                        {asset.Install_Date ? (
                          <span className="text-slate-300">{asset.Install_Date}</span>
                        ) : (
                          <span className="font-medium text-amber-400">Null</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                        {asset.Condition_Score !== null ? (
                          <span className={`font-semibold ${conditionColor}`}>
                            {asset.Condition_Score}/100
                          </span>
                        ) : (
                          <span className="font-medium text-amber-400">Null</span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono tabular-nums whitespace-nowrap">
                        {asset.Last_Inspection ? (
                          <span className={asset.isOverdueInspection ? 'text-red-400' : 'text-slate-300'}>
                            {asset.Last_Inspection}
                          </span>
                        ) : (
                          <span className="font-medium text-red-400">Missing</span>
                        )}
                      </td>
                      <td className="py-3 px-3 max-w-[230px]">
                        {asset.anomalyReasons.length > 0 ? (
                          <span
                            className={`text-[11px] leading-snug ${
                              asset.isHighRisk ? 'text-red-300' : 'text-amber-300'
                            }`}
                          >
                            {asset.anomalyReasons.join(' · ')}
                          </span>
                        ) : (
                          <span className="text-[11px] text-emerald-400">Nominal</span>
                        )}
                      </td>
                      <td className="py-3 pl-3 pr-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onSuggestFix(asset)}
                          disabled={isRowLoading}
                          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-semibold transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                            isApplied
                              ? 'border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                              : hasProposal
                              ? 'border border-cyan-500/50 bg-cyan-500/15 text-cyan-200 hover:bg-cyan-500/25'
                              : 'border border-cyan-500/40 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20'
                          }`}
                        >
                          <Sparkles className="h-3 w-3 shrink-0" aria-hidden="true" />
                          {isRowLoading
                            ? 'Analyzing...'
                            : isApplied
                            ? 'View Applied Fix'
                            : hasProposal
                            ? 'View Gemini Proposal'
                            : 'Auto-Suggest Fix with Gemini'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-slate-400">
            <span className="font-mono tabular-nums">
              Showing {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, filtered.length)} of{' '}
              {filtered.length.toLocaleString()} matching assets
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
                Previous
              </button>
              <span className="font-mono tabular-nums px-2 text-slate-300">
                Page {safePage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
};
