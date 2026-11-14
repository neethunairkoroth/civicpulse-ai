import React, { useRef, useState } from 'react';
import { Database, Download, FileSpreadsheet, Trash2, UploadCloud } from 'lucide-react';

interface DatasetControlsProps {
  datasetName: string;
  totalAssets: number;
  appliedFixesCount: number;
  uploadNotice: string | null;
  uploadError: string | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onLoadSample: () => void;
  onFileSelected: (file: File) => void;
  onExportCSV: () => void;
  onClearDataset: () => void;
}

export const DatasetControls: React.FC<DatasetControlsProps> = ({
  datasetName,
  totalAssets,
  appliedFixesCount,
  uploadNotice,
  uploadError,
  fileInputRef,
  onLoadSample,
  onFileSelected,
  onExportCSV,
  onClearDataset,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const dragDepth = useRef(0);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current += 1;
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current -= 1;
    if (dragDepth.current <= 0) {
      dragDepth.current = 0;
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current = 0;
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      onFileSelected(file);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelected(file);
      e.target.value = '';
    }
  };

  return (
    <section
      aria-label="Dataset ingestion and sample controls"
      className="rounded-xl border border-slate-800/90 bg-[#0E1523] p-5"
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-bold tracking-tight text-slate-50 text-balance">
            Infrastructure & Transit Asset Intelligence
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <span className="font-medium text-slate-200">{datasetName}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums text-cyan-300">
              {totalAssets.toLocaleString()} assets
            </span>
            <span aria-hidden="true">·</span>
            <span>Audit baseline 2026-11-14</span>
            {appliedFixesCount > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums text-emerald-400">
                  {appliedFixesCount} AI remediation{appliedFixesCount === 1 ? '' : 's'} applied
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onLoadSample}
            className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-4 py-2.5 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/20 hover:border-cyan-400/60 transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            <Database className="h-3.5 w-3.5 text-cyan-300" aria-hidden="true" />
            Load NYC Transit & Municipal Asset Sample (500 Assets)
          </button>

          <button
            type="button"
            onClick={onExportCSV}
            disabled={totalAssets === 0}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/70 px-3.5 py-2.5 text-xs font-medium text-slate-200 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            <Download className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
            Export CSV
          </button>

          {totalAssets > 0 && (
            <button
              type="button"
              onClick={onClearDataset}
              aria-label="Clear active dataset"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-transparent px-3 py-2.5 text-xs font-medium text-slate-400 hover:text-slate-200 hover:border-slate-700 transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Drag-and-Drop CSV Uploader */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border border-dashed px-4 py-3 transition-colors duration-150 ${
          isDragging
            ? 'border-cyan-400 bg-cyan-500/10'
            : 'border-slate-700/80 bg-[#0A101B] hover:border-slate-600'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-800/80 text-cyan-300">
            <UploadCloud className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-200 truncate">
              {isDragging
                ? 'Drop CSV file to ingest into CivicPulse AI'
                : 'Drag and drop a municipal asset CSV here, or browse local files'}
            </p>
            <p className="text-[11px] text-slate-400 truncate">
              Columns: Asset_ID, Category, Location, Manufacturer, Install_Date, Condition_Score, Last_Inspection, Description
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleInputChange}
            className="sr-only"
            id="csv-upload-input"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-md border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-cyan-300" aria-hidden="true" />
            Choose CSV File
          </button>
        </div>
      </div>

      {uploadNotice && (
        <p className="mt-3 text-xs text-cyan-300" role="status">
          {uploadNotice}
        </p>
      )}
      {uploadError && (
        <p className="mt-3 text-xs text-red-400" role="alert">
          {uploadError}
        </p>
      )}
    </section>
  );
};
