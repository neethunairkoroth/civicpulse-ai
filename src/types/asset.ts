export type AssetCategory =
  | 'Subway Signals'
  | 'Escalators'
  | 'Track Switches'
  | 'Bridge Sensors'
  | 'EV Chargers'
  | string;

export interface InfrastructureAsset {
  Asset_ID: string;
  Category: AssetCategory;
  Location: string;
  Manufacturer: string | null;
  Install_Date: string | null;
  Condition_Score: number | null;
  Last_Inspection: string | null;
  Description: string | null;
}

export type RiskTier = 'Critical' | 'Watch' | 'Nominal';

export interface AnalyzedAsset extends InfrastructureAsset {
  missingFields: string[];
  completenessPct: number;
  daysSinceInspection: number | null;
  isOverdueInspection: boolean;
  isLowCondition: boolean;
  isHighRisk: boolean;
  hasMetadataGap: boolean;
  riskTier: RiskTier;
  anomalyReasons: string[];
}

export interface CategoryMetrics {
  category: string;
  total: number;
  completenessPct: number;
  missingManufacturer: number;
  missingInstallDate: number;
  missingDescription: number;
  missingConditionScore: number;
  overdueInspections: number;
  avgConditionScore: number | null;
  criticalCount: number;
  watchCount: number;
  nominalCount: number;
}

export interface DatasetSummary {
  datasetName: string;
  totalAssets: number;
  overallCompletenessPct: number;
  criticalMetadataGapAssets: number;
  totalMissingCells: number;
  highRiskAssets: number;
  overdueInspectionAssets: number;
  lowConditionAssets: number;
  avgConditionScore: number | null;
  fieldCompleteness: Record<string, number>;
  categories: CategoryMetrics[];
}

export interface RemediationProposal {
  assetId: string;
  inferredManufacturer: string;
  inferredInstallDate: string;
  suggestedNextInspection: string;
  confidence: 'High' | 'Medium' | 'Low';
  rationale: string;
  maintenanceTicket: {
    title: string;
    priority: 'P1 - Critical' | 'P2 - High' | 'P3 - Standard';
    department: string;
    estimatedCrewHours: number;
    checklist: string[];
  };
}

export interface InvestigatorPriorityAction {
  title: string;
  owner: string;
  timeframe: string;
  impact: string;
}

export interface InvestigatorResponse {
  summary: string;
  referencedAssetIds: string[];
  priorityActions: InvestigatorPriorityAction[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  referencedAssetIds?: string[];
  priorityActions?: InvestigatorPriorityAction[];
  timestamp: string;
  error?: string;
}
