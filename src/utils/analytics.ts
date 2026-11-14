import type {
  AnalyzedAsset,
  CategoryMetrics,
  DatasetSummary,
  InfrastructureAsset,
  RiskTier,
} from '../types/asset';

// Current reference date aligned with runtime environment
export const REFERENCE_DATE_ISO = '2026-11-14';
const REFERENCE_TIME_MS = Date.parse(`${REFERENCE_DATE_ISO}T00:00:00Z`);
export const OVERDUE_THRESHOLD_DAYS = 180;

const MONITORED_FIELDS: (keyof InfrastructureAsset)[] = [
  'Asset_ID',
  'Category',
  'Location',
  'Manufacturer',
  'Install_Date',
  'Condition_Score',
  'Last_Inspection',
  'Description',
];

function isFilled(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  return true;
}

export function computeDaysSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const parsed = Date.parse(`${dateStr.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(parsed)) return null;
  return Math.max(0, Math.round((REFERENCE_TIME_MS - parsed) / 86400000));
}

export function analyzeAssets(assets: InfrastructureAsset[]): AnalyzedAsset[] {
  return assets.map((asset) => {
    const missingFields: string[] = [];
    for (const field of MONITORED_FIELDS) {
      if (!isFilled(asset[field])) {
        missingFields.push(field);
      }
    }

    const completenessPct = Math.round(
      ((MONITORED_FIELDS.length - missingFields.length) / MONITORED_FIELDS.length) * 100
    );

    const daysSinceInspection = computeDaysSince(asset.Last_Inspection);
    const isOverdueInspection =
      asset.Last_Inspection === null ||
      (daysSinceInspection !== null && daysSinceInspection > OVERDUE_THRESHOLD_DAYS);

    const isLowCondition =
      asset.Condition_Score !== null && asset.Condition_Score < 50;

    const hasCriticalGap =
      !isFilled(asset.Manufacturer) ||
      !isFilled(asset.Install_Date) ||
      !isFilled(asset.Last_Inspection) ||
      asset.Condition_Score === null;

    const isHighRisk =
      isLowCondition ||
      (daysSinceInspection !== null && daysSinceInspection > 365) ||
      (isOverdueInspection && (asset.Condition_Score ?? 100) < 65);

    let riskTier: RiskTier = 'Nominal';
    if (isHighRisk) {
      riskTier = 'Critical';
    } else if (
      isOverdueInspection ||
      (asset.Condition_Score !== null && asset.Condition_Score < 70) ||
      missingFields.length > 0
    ) {
      riskTier = 'Watch';
    }

    const anomalyReasons: string[] = [];
    if (!isFilled(asset.Manufacturer)) anomalyReasons.push('Missing Manufacturer');
    if (!isFilled(asset.Install_Date)) anomalyReasons.push('Missing Install Date');
    if (!isFilled(asset.Last_Inspection)) {
      anomalyReasons.push('No Inspection Record');
    } else if (daysSinceInspection !== null && daysSinceInspection > OVERDUE_THRESHOLD_DAYS) {
      anomalyReasons.push(`Inspection Overdue (${daysSinceInspection}d)`);
    }
    if (asset.Condition_Score === null) {
      anomalyReasons.push('Missing Condition Score');
    } else if (asset.Condition_Score < 50) {
      anomalyReasons.push(`Critical Condition (${asset.Condition_Score}/100)`);
    } else if (asset.Condition_Score < 70) {
      anomalyReasons.push(`Degraded Condition (${asset.Condition_Score}/100)`);
    }
    if (!isFilled(asset.Description)) anomalyReasons.push('Missing Description');

    return {
      ...asset,
      missingFields,
      completenessPct,
      daysSinceInspection,
      isOverdueInspection,
      isLowCondition,
      isHighRisk,
      hasMetadataGap: hasCriticalGap || missingFields.length > 0,
      riskTier,
      anomalyReasons,
    };
  });
}

export function summarizeDataset(
  analyzed: AnalyzedAsset[],
  datasetName: string
): DatasetSummary {
  const totalAssets = analyzed.length;
  if (totalAssets === 0) {
    return {
      datasetName,
      totalAssets: 0,
      overallCompletenessPct: 0,
      criticalMetadataGapAssets: 0,
      totalMissingCells: 0,
      highRiskAssets: 0,
      overdueInspectionAssets: 0,
      lowConditionAssets: 0,
      avgConditionScore: null,
      fieldCompleteness: {},
      categories: [],
    };
  }

  let filledCells = 0;
  let totalMissingCells = 0;
  let criticalMetadataGapAssets = 0;
  let highRiskAssets = 0;
  let overdueInspectionAssets = 0;
  let lowConditionAssets = 0;
  let scoreSum = 0;
  let scoreCount = 0;

  const fieldFilledCounts: Record<string, number> = {};
  for (const f of MONITORED_FIELDS) fieldFilledCounts[f] = 0;

  const categoryMap = new Map<string, AnalyzedAsset[]>();

  for (const item of analyzed) {
    const missingCount = item.missingFields.length;
    totalMissingCells += missingCount;
    filledCells += MONITORED_FIELDS.length - missingCount;

    for (const f of MONITORED_FIELDS) {
      if (isFilled(item[f])) fieldFilledCounts[f]++;
    }

    if (
      !isFilled(item.Manufacturer) ||
      !isFilled(item.Install_Date) ||
      !isFilled(item.Last_Inspection) ||
      item.Condition_Score === null
    ) {
      criticalMetadataGapAssets++;
    }
    if (item.isHighRisk) highRiskAssets++;
    if (item.isOverdueInspection) overdueInspectionAssets++;
    if (item.isLowCondition) lowConditionAssets++;
    if (item.Condition_Score !== null) {
      scoreSum += item.Condition_Score;
      scoreCount++;
    }

    const list = categoryMap.get(item.Category) ?? [];
    list.push(item);
    categoryMap.set(item.Category, list);
  }

  const fieldCompleteness: Record<string, number> = {};
  for (const f of MONITORED_FIELDS) {
    fieldCompleteness[f] = Math.round((fieldFilledCounts[f] / totalAssets) * 1000) / 10;
  }

  const categories: CategoryMetrics[] = Array.from(categoryMap.entries())
    .map(([category, items]) => {
      const catTotal = items.length;
      const catFilled = items.reduce(
        (acc, a) => acc + (MONITORED_FIELDS.length - a.missingFields.length),
        0
      );
      const catScores = items
        .map((a) => a.Condition_Score)
        .filter((s): s is number => s !== null);

      return {
        category,
        total: catTotal,
        completenessPct:
          Math.round((catFilled / (catTotal * MONITORED_FIELDS.length)) * 1000) / 10,
        missingManufacturer: items.filter((a) => !isFilled(a.Manufacturer)).length,
        missingInstallDate: items.filter((a) => !isFilled(a.Install_Date)).length,
        missingDescription: items.filter((a) => !isFilled(a.Description)).length,
        missingConditionScore: items.filter((a) => a.Condition_Score === null).length,
        overdueInspections: items.filter((a) => a.isOverdueInspection).length,
        avgConditionScore:
          catScores.length > 0
            ? Math.round((catScores.reduce((s, v) => s + v, 0) / catScores.length) * 10) / 10
            : null,
        criticalCount: items.filter((a) => a.riskTier === 'Critical').length,
        watchCount: items.filter((a) => a.riskTier === 'Watch').length,
        nominalCount: items.filter((a) => a.riskTier === 'Nominal').length,
      };
    })
    .sort((a, b) => b.total - a.total);

  return {
    datasetName,
    totalAssets,
    overallCompletenessPct:
      Math.round((filledCells / (totalAssets * MONITORED_FIELDS.length)) * 1000) / 10,
    criticalMetadataGapAssets,
    totalMissingCells,
    highRiskAssets,
    overdueInspectionAssets,
    lowConditionAssets,
    avgConditionScore:
      scoreCount > 0 ? Math.round((scoreSum / scoreCount) * 10) / 10 : null,
    fieldCompleteness,
    categories,
  };
}

/**
 * Selects the highest-relevance subset of asset rows to ground Gemini answers
 * in real Asset_IDs and fields without exceeding prompt size limits.
 */
export function selectRelevantRowsForQuery(
  analyzed: AnalyzedAsset[],
  query: string,
  limit = 45
): AnalyzedAsset[] {
  const q = query.toLowerCase();

  const wantsMissingManufacturer =
    q.includes('manufacturer') || q.includes('vendor') || q.includes('oem') || q.includes('gap');
  const wantsOverdue =
    q.includes('overdue') || q.includes('inspection') || q.includes('late');
  const wantsInstallDate = q.includes('install') || q.includes('date') || q.includes('age');
  const wantsLowCondition =
    q.includes('risk') || q.includes('condition') || q.includes('critical') || q.includes('score');

  const categoryKeywords = [
    'subway signals',
    'signals',
    'escalators',
    'track switches',
    'switches',
    'bridge sensors',
    'bridge',
    'ev chargers',
    'chargers',
  ];
  const mentionedCats = categoryKeywords.filter((kw) => q.includes(kw));

  const scored = analyzed.map((asset) => {
    let score = 0;

    // Exact Asset_ID or Location mention
    if (q.includes(asset.Asset_ID.toLowerCase())) score += 100;
    const locTokens = asset.Location.toLowerCase().split(/[\s—-]+/);
    for (const token of locTokens) {
      if (token.length > 3 && q.includes(token)) score += 12;
    }

    // Category relevance
    if (mentionedCats.length > 0) {
      const catLower = asset.Category.toLowerCase();
      if (mentionedCats.some((kw) => catLower.includes(kw.replace(/s$/, '')))) {
        score += 30;
      }
    }

    // Condition / gap relevance
    if (wantsMissingManufacturer && !asset.Manufacturer) score += 25;
    if (wantsOverdue && asset.isOverdueInspection) score += 25;
    if (wantsInstallDate && !asset.Install_Date) score += 20;
    if (wantsLowCondition && asset.isHighRisk) score += 25;

    // Bonus for dual-issue assets when both manufacturer + overdue are asked
    if (wantsMissingManufacturer && wantsOverdue && !asset.Manufacturer && asset.isOverdueInspection) {
      score += 40;
    }

    // General anomaly baseline priority
    if (asset.isHighRisk) score += 6;
    if (asset.missingFields.length > 0) score += asset.missingFields.length * 3;
    if (asset.Condition_Score !== null && asset.Condition_Score < 50) score += 8;

    return { asset, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.asset);
}
