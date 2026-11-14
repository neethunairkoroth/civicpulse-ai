import type { InfrastructureAsset } from '../types/asset';

const HEADER_ALIASES: Record<string, keyof InfrastructureAsset> = {
  asset_id: 'Asset_ID',
  assetid: 'Asset_ID',
  id: 'Asset_ID',
  category: 'Category',
  asset_category: 'Category',
  type: 'Category',
  location: 'Location',
  station: 'Location',
  site: 'Location',
  manufacturer: 'Manufacturer',
  vendor: 'Manufacturer',
  oem: 'Manufacturer',
  make: 'Manufacturer',
  install_date: 'Install_Date',
  installdate: 'Install_Date',
  installed_on: 'Install_Date',
  condition_score: 'Condition_Score',
  conditionscore: 'Condition_Score',
  condition: 'Condition_Score',
  score: 'Condition_Score',
  last_inspection: 'Last_Inspection',
  lastinspection: 'Last_Inspection',
  inspection_date: 'Last_Inspection',
  description: 'Description',
  notes: 'Description',
  specs: 'Description',
};

function parseCSVRows(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  const cleanText = text.replace(/^\uFEFF/, '');

  for (let i = 0; i < cleanText.length; i++) {
    const ch = cleanText[i];
    const next = cleanText[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        currentCell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        currentCell += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        currentRow.push(currentCell.trim());
        currentCell = '';
      } else if (ch === '\r' && next === '\n') {
        currentRow.push(currentCell.trim());
        if (currentRow.some((c) => c !== '')) rows.push(currentRow);
        currentRow = [];
        currentCell = '';
        i++;
      } else if (ch === '\n' || ch === '\r') {
        currentRow.push(currentCell.trim());
        if (currentRow.some((c) => c !== '')) rows.push(currentRow);
        currentRow = [];
        currentCell = '';
      } else {
        currentCell += ch;
      }
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some((c) => c !== '')) rows.push(currentRow);
  }

  return rows;
}

function normalizeNull(val: string | undefined): string | null {
  if (!val) return null;
  const trimmed = val.trim();
  if (
    trimmed === '' ||
    trimmed.toLowerCase() === 'null' ||
    trimmed.toLowerCase() === 'na' ||
    trimmed.toLowerCase() === 'n/a' ||
    trimmed.toLowerCase() === 'none' ||
    trimmed === '-'
  ) {
    return null;
  }
  return trimmed;
}

export function parseInfrastructureCSV(csvText: string): {
  assets: InfrastructureAsset[];
  warnings: string[];
} {
  const rows = parseCSVRows(csvText);
  if (rows.length < 2) {
    throw new Error('CSV must include a header row and at least one asset record.');
  }

  const rawHeaders = rows[0];
  const columnMap = new Map<number, keyof InfrastructureAsset>();

  rawHeaders.forEach((h, idx) => {
    const normalized = h.toLowerCase().replace(/[\s-]+/g, '_');
    const mapped = HEADER_ALIASES[normalized];
    if (mapped) {
      columnMap.set(idx, mapped);
    }
  });

  if (!Array.from(columnMap.values()).includes('Asset_ID')) {
    throw new Error(
      'Missing required "Asset_ID" column. Expected headers: Asset_ID, Category, Location, Manufacturer, Install_Date, Condition_Score, Last_Inspection, Description.'
    );
  }

  const warnings: string[] = [];
  const assets: InfrastructureAsset[] = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const record: Partial<InfrastructureAsset> = {};

    columnMap.forEach((field, colIdx) => {
      const rawVal = row[colIdx];
      if (field === 'Condition_Score') {
        const cleaned = normalizeNull(rawVal);
        if (cleaned === null) {
          record.Condition_Score = null;
        } else {
          const parsed = Number(cleaned.replace(/[^0-9.-]/g, ''));
          record.Condition_Score = Number.isFinite(parsed)
            ? Math.max(0, Math.min(100, Math.round(parsed)))
            : null;
        }
      } else if (field === 'Asset_ID' || field === 'Category' || field === 'Location') {
        record[field] = normalizeNull(rawVal) ?? '';
      } else {
        record[field] = normalizeNull(rawVal);
      }
    });

    if (!record.Asset_ID) {
      warnings.push(`Skipped row ${r + 1}: missing Asset_ID.`);
      continue;
    }

    assets.push({
      Asset_ID: record.Asset_ID,
      Category: record.Category || 'Uncategorized',
      Location: record.Location || 'Unspecified Location',
      Manufacturer: record.Manufacturer ?? null,
      Install_Date: record.Install_Date ?? null,
      Condition_Score: record.Condition_Score ?? null,
      Last_Inspection: record.Last_Inspection ?? null,
      Description: record.Description ?? null,
    });
  }

  if (assets.length === 0) {
    throw new Error('No valid asset rows could be parsed from the uploaded CSV.');
  }

  return { assets, warnings };
}

function escapeCSVCell(val: string | number | null): string {
  if (val === null || val === undefined) return '';
  const s = String(val);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function exportAssetsToCSV(assets: InfrastructureAsset[]): string {
  const headers: (keyof InfrastructureAsset)[] = [
    'Asset_ID',
    'Category',
    'Location',
    'Manufacturer',
    'Install_Date',
    'Condition_Score',
    'Last_Inspection',
    'Description',
  ];

  const lines = [headers.join(',')];
  for (const asset of assets) {
    lines.push(headers.map((h) => escapeCSVCell(asset[h])).join(','));
  }
  return lines.join('\n');
}
