import React, { useState } from 'react';
import { Check, Copy, Loader2, RefreshCw, Sparkles, X } from 'lucide-react';
import type { AnalyzedAsset, RemediationProposal } from '../types/asset';

interface RemediationDrawerProps {
  asset: AnalyzedAsset | null;
  proposal: RemediationProposal | null;
  isLoading: boolean;
  error: string | null;
  isApplied: boolean;
  onClose: () => void;
  onRetry: (asset: AnalyzedAsset) => void;
  onApplyMetadata: (assetId: string, proposal: RemediationProposal) => void;
}

export const RemediationDrawer: React.FC<RemediationDrawerProps> = ({
  asset,
  proposal,
  isLoading,
  error,
  isApplied,
  onClose,
  onRetry,
  onApplyMetadata,
}) => {
  const [copied, setCopied] = useState(false);

  if (!asset) return null;

  const handleCopyTicket = () => {
    if (!proposal) return;
    const ticketText = [
      `MAINTENANCE WORK ORDER — ${asset.Asset_ID}`,
      `Title: ${proposal.maintenanceTicket.title}`,
      `Priority: ${proposal.maintenanceTicket.priority}`,
      `Department: ${proposal.maintenanceTicket.department}`,
      `Location: ${asset.Location} (${asset.Category})`,
      `Estimated Crew Hours: ${proposal.maintenanceTicket.estimatedCrewHours} hrs`,
      `Inferred OEM: ${proposal.inferredManufacturer}`,
      `Inferred Install Date: ${proposal.inferredInstallDate}`,
      `Suggested Next Inspection: ${proposal.suggestedNextInspection}`,
      '',
      'Field Checklist:',
      ...proposal.maintenanceTicket.checklist.map((item, idx) => `${idx + 1}. ${item}`),
    ].join('\n');

    navigator.clipboard.writeText(ticketText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="remediation-drawer-title"
    >
      <div
        className="flex-1"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className="relative flex h-full w-full max-w-xl flex-col border-l border-slate-800 bg-[#0B111E] shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 px-6 py-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-cyan-300 font-medium">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Gemini Remediation & Work Order</span>
            </div>
            <h3
              id="remediation-drawer-title"
              className="mt-1 font-mono text-lg font-semibold text-slate-50"
            >
              {asset.Asset_ID}
            </h3>
            <p className="text-xs text-slate-400">
              {asset.Category}
              <span aria-hidden="true"> · </span>
              {asset.Location}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close remediation panel"
            className="rounded-lg border border-slate-800 p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Current Record Snapshot */}
          <div className="rounded-lg border border-slate-800 bg-[#0E1523] p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-200">Current Asset Record</span>
              <span className="font-mono tabular-nums text-slate-400">
                {asset.completenessPct}% Complete
              </span>
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
              <div>
                <dt className="text-slate-400">Manufacturer</dt>
                <dd className={asset.Manufacturer ? 'font-medium text-slate-100' : 'font-medium text-amber-400'}>
                  {asset.Manufacturer ?? 'Missing'}
                </dd>
              </div>
              <div>
                <dt className="text-slate-400">Install Date</dt>
                <dd className={`font-mono tabular-nums ${asset.Install_Date ? 'text-slate-100' : 'text-amber-400'}`}>
                  {asset.Install_Date ?? 'Null'}
                </dd>
              </div>
              <div>
                <dt className="text-slate-400">Condition Score</dt>
                <dd
                  className={`font-mono tabular-nums ${
                    asset.Condition_Score === null
                      ? 'text-amber-400'
                      : asset.Condition_Score < 50
                      ? 'text-red-400'
                      : asset.Condition_Score < 70
                      ? 'text-amber-300'
                      : 'text-emerald-400'
                  }`}
                >
                  {asset.Condition_Score !== null ? `${asset.Condition_Score}/100` : 'Missing'}
                </dd>
              </div>
              <div>
                <dt className="text-slate-400">Last Inspection</dt>
                <dd
                  className={`font-mono tabular-nums ${
                    asset.isOverdueInspection ? 'text-red-400' : 'text-slate-100'
                  }`}
                >
                  {asset.Last_Inspection ?? 'No Record'}
                  {asset.daysSinceInspection !== null && asset.isOverdueInspection
                    ? ` (${asset.daysSinceInspection}d overdue)`
                    : ''}
                </dd>
              </div>
            </dl>

            <div className="border-t border-slate-800/80 pt-2.5 text-xs">
              <span className="text-slate-400">Description: </span>
              <span className={asset.Description ? 'text-slate-200' : 'text-amber-400'}>
                {asset.Description ?? 'Missing engineering description'}
              </span>
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="rounded-lg border border-slate-800 bg-[#0E1523] p-6 space-y-4">
              <div className="flex items-center gap-2.5 text-xs font-medium text-cyan-300">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                <span>Inferring specifications & drafting maintenance work order...</span>
              </div>
              <div className="space-y-2.5 animate-pulse">
                <div className="h-4 w-3/4 rounded bg-slate-800" />
                <div className="h-4 w-1/2 rounded bg-slate-800" />
                <div className="h-20 w-full rounded bg-slate-800/80" />
              </div>
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 space-y-3">
              <p className="text-xs text-red-300">{error}</p>
              <button
                type="button"
                onClick={() => onRetry(asset)}
                className="inline-flex items-center gap-1.5 rounded-md border border-red-400/40 bg-red-500/15 px-3 py-1.5 text-xs font-medium text-red-200 hover:bg-red-500/25 cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                Retry Gemini Analysis
              </button>
            </div>
          )}

          {/* Proposal Output */}
          {proposal && !isLoading && (
            <>
              <div className="rounded-lg border border-cyan-500/30 bg-[#0E1523] p-4 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-100">
                    Inferred Metadata & Engineering Rationale
                  </span>
                  <span className="font-mono text-[11px] text-cyan-300">
                    Confidence: {proposal.confidence}
                  </span>
                </div>

                <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs border-y border-slate-800/80 py-3">
                  <div>
                    <dt className="text-slate-400">Suggested OEM</dt>
                    <dd className="mt-0.5 font-medium text-cyan-200">
                      {proposal.inferredManufacturer}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-400">Est. Install Date</dt>
                    <dd className="mt-0.5 font-mono tabular-nums text-cyan-200">
                      {proposal.inferredInstallDate}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-400">Next Inspection</dt>
                    <dd className="mt-0.5 font-mono tabular-nums text-emerald-300">
                      {proposal.suggestedNextInspection}
                    </dd>
                  </div>
                </dl>

                <p className="text-xs leading-relaxed text-slate-300">
                  {proposal.rationale}
                </p>

                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  <button
                    type="button"
                    disabled={isApplied}
                    onClick={() => onApplyMetadata(asset.Asset_ID, proposal)}
                    className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-400 disabled:bg-emerald-500/20 disabled:text-emerald-300 disabled:border disabled:border-emerald-500/40 transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                  >
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    {isApplied ? 'Metadata Applied to Dataset' : 'Apply Suggested Metadata'}
                  </button>
                </div>
              </div>

              {/* Drafted Maintenance Ticket */}
              <div className="rounded-lg border border-slate-800 bg-[#0E1523] p-4 space-y-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-medium text-slate-400">
                      Auto-Drafted Field Work Order
                    </span>
                    <h4 className="mt-0.5 text-sm font-semibold text-slate-100">
                      {proposal.maintenanceTicket.title}
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyTicket}
                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800 shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                        Copy Ticket
                      </>
                    )}
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                  <span
                    className={`font-semibold ${
                      proposal.maintenanceTicket.priority.startsWith('P1')
                        ? 'text-red-400'
                        : proposal.maintenanceTicket.priority.startsWith('P2')
                        ? 'text-amber-400'
                        : 'text-cyan-300'
                    }`}
                  >
                    {proposal.maintenanceTicket.priority}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{proposal.maintenanceTicket.department}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">
                    Est. {proposal.maintenanceTicket.estimatedCrewHours} crew hrs
                  </span>
                </div>

                <div className="border-t border-slate-800/80 pt-3">
                  <p className="text-xs font-medium text-slate-300 mb-2">
                    Field Verification & Maintenance Checklist
                  </p>
                  <ul className="space-y-2 text-xs text-slate-300">
                    {proposal.maintenanceTicket.checklist.map((step, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <span className="font-mono text-[11px] text-cyan-400 mt-0.5 tabular-nums">
                          {String(i + 1).padStart(2, '0')}.
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </>
          )}
        </div>
      </aside>
    </div>
  );
};
