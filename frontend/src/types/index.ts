export interface ColumnProfile {
  name: string;
  type: 'numeric' | 'categorical' | 'datetime' | 'currency' | 'percentage' | 'text' | 'boolean';
  missing_count: number;
  missing_percentage: number;
  unique_count: number;
  sample_values: string[];
  outlier_count: number;
  sample_outliers: number[];
}

export interface QualityIssue {
  column: string;
  type: string;
  severity: 'Low' | 'Medium' | 'High';
  message: string;
  recommendation: string;
}

export interface QualitySummary {
  total_rows: number;
  total_columns: number;
  duplicate_rows: number;
  duplicate_percentage: number;
  total_missing_cells: number;
  overall_quality_score: number;
}

export interface SchemaProfile {
  summary: QualitySummary;
  columns: ColumnProfile[];
  issues: QualityIssue[];
}

export interface KPI {
  label: string;
  value: string;
  raw_value: number | string;
  type: string;
  subtitle?: string;
}

export interface ChartSpec {
  id: string;
  title: string;
  type: 'bar' | 'horizontal_bar' | 'pie' | 'donut' | 'line' | 'area' | 'histogram' | 'scatter' | 'grouped_bar';
  category?: string;
  x_key: string;
  y_key?: string;
  x_label?: string;
  y_label?: string;
  series_keys?: string[];
  data: any[];
  description: string;
  insights?: string;
}

export interface InsightCard {
  id: string;
  title: string;
  category: 'Key Finding' | 'Top Performer' | 'Trend' | 'Relationship' | 'Data Quality';
  finding: string;
  metric: string;
  explanation: string;
  significance: string;
  suggested_action: string;
  confidence: string;
  explore_target?: string;
}

export interface Recommendation {
  id: string;
  title: string;
  why_it_matters: string;
  required_columns: string[];
  expected_output: string;
  spec: Record<string, any>;
}

export interface Dataset {
  id: string;
  name: string;
  filename: string;
  source_type: string;
  file_path: string;
  row_count: number;
  col_count: number;
  schema: SchemaProfile;
  quality: QualitySummary;
  summary: {
    stats: {
      kpis: KPI[];
      numeric_stats: Record<string, any>;
      categorical_stats: Record<string, any>;
      correlations: Record<string, Record<string, number>>;
      time_series?: any;
    };
    charts: ChartSpec[];
    insights: InsightCard[];
    recommendations: Recommendation[];
    warnings?: string[];
    last_cleaning_report?: any;
    text_content?: string;
    metadata?: Record<string, any>;
  };
  domain?: string;
  analysis_mode?: string;
  custom_objective?: string | null;
  version_count?: number;
  original_file_path?: string;
  is_shared?: number;
  share_token?: string | null;
  created_at: string;
  is_read_only?: boolean;
}

export type IndustryDomain =
  | 'business'
  | 'finance'
  | 'education'
  | 'accounting'
  | 'healthcare'
  | 'retail'
  | 'manufacturing'
  | 'logistics'
  | 'hr'
  | 'marketing'
  | 'general';

export type AnalysisMode = 'auto' | 'industry' | 'custom';

export interface EducationalConcept {
  id: string;
  title: string;
  category: string;
  summary: string;
  tip: string;
}

export interface DatasetVersion {
  id: string;
  dataset_id: string;
  version_number: number;
  file_path: string;
  change_summary: string;
  changes?: any[];
  row_count: number;
  col_count: number;
  created_at: string;
}

export interface EditorColumnMeta {
  name: string;
  type: 'numeric' | 'datetime' | 'text';
  null_count: number;
}

export interface EditorRowsResponse {
  total_rows: number;
  page: number;
  page_size: number;
  total_pages: number;
  columns: EditorColumnMeta[];
  rows: Record<string, any>[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  message: string;
  chart_data?: ChartSpec | null;
  follow_ups?: string[];
  created_at?: string;
}
