import React, { useMemo, useRef, useState } from 'react';
import { CategoryCharts } from './components/CategoryCharts';
import { DatasetControls } from './components/DatasetControls';
import { InvestigatorPanel } from './components/InvestigatorPanel';
import { KpiSummaryStrip } from './components/KpiSummaryStrip';
import { RemediationDrawer } from './components/RemediationDrawer';
import { RemediationTable } from './components/RemediationTable';
import { TopBar } from './components/TopBar';
import { generateNYCSampleDataset } from './data/nycSampleDataset';
import type {
  AnalyzedAsset,
  ChatMessage,
  InfrastructureAsset,
  InvestigatorResponse,
  RemediationProposal,
} from './types/asset';
import {
  analyzeAssets,
  REFERENCE_DATE_ISO,
  selectRelevantRowsForQuery,
  summarizeDataset,
} from './utils/analytics';
import { exportAssetsToCSV, parseInfrastructureCSV } from './utils/csv';

export default function App() {
  const [rawAssets, setRawAssets] = useState<InfrastructureAsset[]>(() =>
    generateNYCSampleDataset()
  );
  const [datasetName, setDatasetName] = useState<string>(
    'NYC Transit & Municipal Asset Sample'
  );
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Gemini Investigator Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isInvestigating, setIsInvestigating] = useState(false);

  // Per-row Gemini Remediation State
  const [activeDrawerAssetId, setActiveDrawerAssetId] = useState<string | null>(null);
  const [proposalsByAssetId, setProposalsByAssetId] = useState<
    Record<string, RemediationProposal>
  >({});
  const [appliedAssetIds, setAppliedAssetIds] = useState<Record<string, boolean>>({});
  const [remediatingAssetId, setRemediatingAssetId] = useState<string | null>(null);
  const [remediationError, setRemediationError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const analyzedAssets = useMemo(() => analyzeAssets(rawAssets), [rawAssets]);
  const summary = useMemo(
    () => summarizeDataset(analyzedAssets, datasetName),
    [analyzedAssets, datasetName]
  );
  const categoryNames = useMemo(
    () => summary.categories.map((c) => c.category),
    [summary.categories]
  );

  const activeDrawerAsset = useMemo(
    () => analyzedAssets.find((a) => a.Asset_ID === activeDrawerAssetId) ?? null,
    [analyzedAssets, activeDrawerAssetId]
  );

  const handleLoadNYCSample = () => {
    const sample = generateNYCSampleDataset();
    setRawAssets(sample);
    setDatasetName('NYC Transit & Municipal Asset Sample');
    setSelectedCategory('ALL');
    setSearchQuery('');
    setChatMessages([]);
    setProposalsByAssetId({});
    setAppliedAssetIds({});
    setActiveDrawerAssetId(null);
    setUploadError(null);
    setUploadNotice('Loaded 500 NYC Transit & Municipal assets with realistic metadata gaps.');
  };

  const handleClearDataset = () => {
    setRawAssets([]);
    setDatasetName('No Active Dataset');
    setSelectedCategory('ALL');
    setSearchQuery('');
    setChatMessages([]);
    setProposalsByAssetId({});
    setAppliedAssetIds({});
    setActiveDrawerAssetId(null);
    setUploadError(null);
    setUploadNotice(null);
  };

  const handleFileSelected = async (file: File) => {
    setUploadError(null);
    setUploadNotice(null);
    try {
      const text = await file.text();
      const { assets, warnings } = parseInfrastructureCSV(text);
      setRawAssets(assets);
      setDatasetName(file.name);
      setSelectedCategory('ALL');
      setSearchQuery('');
      setChatMessages([]);
      setProposalsByAssetId({});
      setAppliedAssetIds({});
      setActiveDrawerAssetId(null);
      const warnSuffix =
        warnings.length > 0 ? ` (${warnings.length} malformed rows skipped)` : '';
      setUploadNotice(
        `Ingested ${assets.length.toLocaleString()} assets from ${file.name}${warnSuffix}.`
      );
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : 'Unable to parse the selected CSV file.'
      );
    }
  };

  const handleExportCSV = () => {
    if (rawAssets.length === 0) return;
    const csvContent = exportAssetsToCSV(rawAssets);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'civicpulse_assets_export.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleInvestigateQuery = async (question: string) => {
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: question,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const nextHistory = [...chatMessages, userMsg];
    setChatMessages(nextHistory);
    setIsInvestigating(true);

    try {
      const missingMfgAndOverdue = analyzedAssets.filter(
        (a) => !a.Manufacturer && a.isOverdueInspection
      );
      const missingInstallAndLowCond = analyzedAssets.filter(
        (a) => !a.Install_Date && a.isLowCondition
      );

      const crossTabMetrics = {
        referenceDate: REFERENCE_DATE_ISO,
        missingManufacturerAndOverdueInspectionCount: missingMfgAndOverdue.length,
        missingManufacturerAndOverdueSampleIds: missingMfgAndOverdue
          .slice(0, 15)
          .map((a) => a.Asset_ID),
        missingInstallDateAndLowConditionCount: missingInstallAndLowCond.length,
        overdueAndLowConditionCount: analyzedAssets.filter(
          (a) => a.isOverdueInspection && a.isLowCondition
        ).length,
      };

      const matchingRows = selectRelevantRowsForQuery(analyzedAssets, question, 45).map(
        (a) => ({
          Asset_ID: a.Asset_ID,
          Category: a.Category,
          Location: a.Location,
          Manufacturer: a.Manufacturer ?? null,
          Install_Date: a.Install_Date ?? null,
          Condition_Score: a.Condition_Score,
          Last_Inspection: a.Last_Inspection ?? null,
          Days_Since_Inspection: a.daysSinceInspection,
          Risk_Tier: a.riskTier,
          Issues: a.anomalyReasons,
        })
      );

      const res = await fetch('/api/investigate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          history: chatMessages.map((m) => ({ role: m.role, content: m.content })),
          datasetSummary: summary,
          crossTabMetrics,
          matchingRows,
        }),
      });

      const data = (await res.json()) as InvestigatorResponse & { error?: string };
      if (!res.ok) {
        throw new Error(data.error || `Server error (${res.status})`);
      }

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.summary,
        referencedAssetIds: data.referencedAssetIds ?? [],
        priorityActions: data.priorityActions ?? [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setChatMessages([...nextHistory, assistantMsg]);
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: '',
        error:
          err instanceof Error
            ? err.message
            : 'Unable to complete Gemini investigation request.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setChatMessages([...nextHistory, errorMsg]);
    } finally {
      setIsInvestigating(false);
    }
  };

  const handleRequestRemediation = async (asset: AnalyzedAsset) => {
    setActiveDrawerAssetId(asset.Asset_ID);
    setRemediationError(null);

    if (proposalsByAssetId[asset.Asset_ID]) {
      return;
    }

    setRemediatingAssetId(asset.Asset_ID);
    try {
      const peerManufacturers = Array.from(
        new Set(
          rawAssets
            .filter((r) => r.Category === asset.Category && r.Manufacturer)
            .map((r) => r.Manufacturer as string)
        )
      );

      const res = await fetch('/api/remediate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asset: {
            Asset_ID: asset.Asset_ID,
            Category: asset.Category,
            Location: asset.Location,
            Manufacturer: asset.Manufacturer,
            Install_Date: asset.Install_Date,
            Condition_Score: asset.Condition_Score,
            Last_Inspection: asset.Last_Inspection,
            Description: asset.Description,
            Anomaly_Reasons: asset.anomalyReasons,
          },
          peerManufacturers,
          referenceDate: REFERENCE_DATE_ISO,
        }),
      });

      const data = (await res.json()) as RemediationProposal & { error?: string };
      if (!res.ok) {
        throw new Error(data.error || `Server error (${res.status})`);
      }

      setProposalsByAssetId((prev) => ({
        ...prev,
        [asset.Asset_ID]: data,
      }));
    } catch (err) {
      setRemediationError(
        err instanceof Error
          ? err.message
          : 'Failed to generate Gemini remediation suggestion.'
      );
    } finally {
      setRemediatingAssetId(null);
    }
  };

  const handleApplyMetadata = (assetId: string, proposal: RemediationProposal) => {
    setRawAssets((prev) =>
      prev.map((row) => {
        if (row.Asset_ID !== assetId) return row;
        return {
          ...row,
          Manufacturer: row.Manufacturer ?? proposal.inferredManufacturer,
          Install_Date: row.Install_Date ?? proposal.inferredInstallDate,
        };
      })
    );
    setAppliedAssetIds((prev) => ({ ...prev, [assetId]: true }));
  };

  const handleSelectAssetFromChat = (assetId: string) => {
    setSelectedCategory('ALL');
    setSearchQuery(assetId);
    const el = document.getElementById('remediation');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen bg-[#080D16] text-slate-100 flex flex-col">
      <TopBar onTriggerUpload={() => fileInputRef.current?.click()} />

      <main className="mx-auto w-full max-w-[1440px] flex-1 px-6 py-6 space-y-6">
        <DatasetControls
          datasetName={datasetName}
          totalAssets={summary.totalAssets}
          appliedFixesCount={Object.keys(appliedAssetIds).length}
          uploadNotice={uploadNotice}
          uploadError={uploadError}
          fileInputRef={fileInputRef}
          onLoadSample={handleLoadNYCSample}
          onFileSelected={handleFileSelected}
          onExportCSV={handleExportCSV}
          onClearDataset={handleClearDataset}
        />

        <KpiSummaryStrip summary={summary} />

        <CategoryCharts
          categories={summary.categories}
          selectedCategory={selectedCategory}
          onSelectCategory={(cat) => {
            setSelectedCategory(cat);
            if (cat !== 'ALL') {
              document
                .getElementById('remediation')
                ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
          }}
        />

        <InvestigatorPanel
          messages={chatMessages}
          isLoading={isInvestigating}
          disabled={analyzedAssets.length === 0}
          onSendQuery={handleInvestigateQuery}
          onResetChat={() => setChatMessages([])}
          onSelectAssetId={handleSelectAssetFromChat}
        />

        <RemediationTable
          assets={analyzedAssets}
          categories={categoryNames}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          proposalsByAssetId={proposalsByAssetId}
          appliedAssetIds={appliedAssetIds}
          loadingAssetId={remediatingAssetId}
          onSuggestFix={handleRequestRemediation}
          onLoadSample={handleLoadNYCSample}
        />
      </main>

      <footer className="border-t border-slate-800/80 py-5 px-6 text-center text-xs text-slate-500">
        CivicPulse AI · Municipal & Transit Infrastructure Asset Intelligence
      </footer>

      <RemediationDrawer
        asset={activeDrawerAsset}
        proposal={
          activeDrawerAsset ? proposalsByAssetId[activeDrawerAsset.Asset_ID] ?? null : null
        }
        isLoading={
          Boolean(activeDrawerAsset) && remediatingAssetId === activeDrawerAsset?.Asset_ID
        }
        error={remediationError}
        isApplied={
          Boolean(activeDrawerAsset) && Boolean(appliedAssetIds[activeDrawerAsset!.Asset_ID])
        }
        onClose={() => setActiveDrawerAssetId(null)}
        onRetry={handleRequestRemediation}
        onApplyMetadata={handleApplyMetadata}
      />
    </div>
  );
}
