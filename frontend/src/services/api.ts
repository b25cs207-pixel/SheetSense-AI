import { Dataset, ChatMessage } from '../types';

const API_BASE = '/api';

export async function checkHealth() {
  const res = await fetch(`${API_BASE}/health`);
  return res.json();
}

export async function fetchDatasets(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/datasets`);
  if (!res.ok) throw new Error('Failed to fetch datasets');
  return res.json();
}

export async function fetchDataset(id: string): Promise<Dataset> {
  const res = await fetch(`${API_BASE}/datasets/${id}`);
  if (!res.ok) throw new Error('Failed to fetch dataset details');
  return res.json();
}

export async function uploadFile(file: File, sheetName?: string): Promise<Dataset> {
  const formData = new FormData();
  formData.append('file', file);
  if (sheetName) {
    formData.append('sheet_name', sheetName);
  }
  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.detail || 'Upload failed');
  }
  return res.json();
}

export async function uploadUrl(url: string): Promise<Dataset> {
  const res = await fetch(`${API_BASE}/upload/url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.detail || 'Failed to ingest URL');
  }
  return res.json();
}

export async function loadSampleDataset(sampleKey: string): Promise<Dataset> {
  const res = await fetch(`${API_BASE}/sample/${sampleKey}`, {
    method: 'POST',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to load sample dataset');
  }
  return res.json();
}

export async function deleteDataset(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/datasets/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete dataset');
}

export async function cleanDataset(id: string, action: string, params?: Record<string, any>): Promise<any> {
  const res = await fetch(`${API_BASE}/datasets/${id}/clean`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, params }),
  });
  if (!res.ok) throw new Error('Data cleaning operation failed');
  return res.json();
}

export async function sendChatMessage(id: string, message: string): Promise<{ text: string; chart_data: any; follow_ups: string[] }> {
  const res = await fetch(`${API_BASE}/datasets/${id}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });
  if (!res.ok) throw new Error('Chat failed');
  return res.json();
}

export async function fetchChatHistory(id: string): Promise<ChatMessage[]> {
  const res = await fetch(`${API_BASE}/datasets/${id}/chat`);
  if (!res.ok) return [];
  return res.json();
}

export async function runRecommendationAnalysis(id: string, spec: Record<string, any>): Promise<any> {
  const res = await fetch(`${API_BASE}/datasets/${id}/recommendation/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ spec }),
  });
  if (!res.ok) throw new Error('Failed to execute recommendation');
  return res.json();
}

export async function filterDataset(id: string, params: Record<string, any>): Promise<any> {
  const res = await fetch(`${API_BASE}/datasets/${id}/filter`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error('Filtering failed');
  return res.json();
}

export function getExportUrl(id: string, format: 'csv' | 'xlsx' | 'pdf'): string {
  return `${API_BASE}/datasets/${id}/export/${format}`;
}

export async function toggleShare(id: string, isShared: boolean): Promise<{ is_shared: boolean; share_token: string | null; share_url: string | null }> {
  const res = await fetch(`${API_BASE}/datasets/${id}/share`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_shared: isShared }),
  });
  if (!res.ok) throw new Error('Failed to update share status');
  return res.json();
}

export async function fetchSharedDashboard(token: string): Promise<Dataset> {
  const res = await fetch(`${API_BASE}/shared/${token}`);
  if (!res.ok) throw new Error('Shared dashboard not found');
  return res.json();
}

export async function fetchSettings(): Promise<any> {
  const res = await fetch(`${API_BASE}/settings`);
  return res.json();
}

export async function updateSettings(settings: any): Promise<any> {
  const res = await fetch(`${API_BASE}/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  return res.json();
}

// ==================== DOMAIN INTELLIGENCE API ====================

export async function updateDatasetDomain(
  id: string,
  domain: string,
  analysisMode: string = 'industry',
  customObjective?: string
): Promise<Dataset> {
  const res = await fetch(`${API_BASE}/datasets/${id}/domain`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      domain,
      analysis_mode: analysisMode,
      custom_objective: customObjective || null,
    }),
  });
  if (!res.ok) throw new Error('Failed to update dataset domain');
  return res.json();
}

export async function fetchEducationalConcepts(id: string): Promise<any[]> {
  const res = await fetch(`${API_BASE}/datasets/${id}/educational-concepts`);
  if (!res.ok) return [];
  return res.json();
}

export async function fetchMaskedFinancialPreview(id: string): Promise<{ columns: string[]; sample_rows: any[] }> {
  const res = await fetch(`${API_BASE}/datasets/${id}/mask-financial`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to fetch masked financial preview');
  return res.json();
}

// ==================== SPREADSHEET EDITOR API ====================

export async function fetchEditorRows(id: string, page: number = 1, pageSize: number = 50): Promise<any> {
  const res = await fetch(`${API_BASE}/datasets/${id}/editor/rows?page=${page}&page_size=${pageSize}`);
  if (!res.ok) throw new Error('Failed to fetch spreadsheet rows');
  return res.json();
}

export async function saveEditorChanges(
  id: string,
  changes: Array<{ row: number; column: string; value: any }>,
  evaluateFormulas: boolean = true,
  summary?: string
): Promise<any> {
  const res = await fetch(`${API_BASE}/datasets/${id}/editor/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      changes,
      evaluate_formulas: evaluateFormulas,
      summary: summary || 'Spreadsheet manual edits',
    }),
  });
  if (!res.ok) throw new Error('Failed to save spreadsheet changes');
  return res.json();
}

export async function addEditorRow(id: string, rowData?: Record<string, any>): Promise<any> {
  const res = await fetch(`${API_BASE}/datasets/${id}/editor/row/add`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ row_data: rowData || null }),
  });
  if (!res.ok) throw new Error('Failed to add row');
  return res.json();
}

export async function deleteEditorRows(id: string, indices: number[]): Promise<any> {
  const res = await fetch(`${API_BASE}/datasets/${id}/editor/row/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ indices }),
  });
  if (!res.ok) throw new Error('Failed to delete rows');
  return res.json();
}

export async function addEditorColumn(id: string, colName: string, colType: string = 'text', defaultVal: any = ''): Promise<any> {
  const res = await fetch(`${API_BASE}/datasets/${id}/editor/column/add`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ col_name: colName, col_type: colType, default_val: defaultVal }),
  });
  if (!res.ok) throw new Error('Failed to add column');
  return res.json();
}

export async function renameEditorColumn(id: string, oldName: string, newName: string): Promise<any> {
  const res = await fetch(`${API_BASE}/datasets/${id}/editor/column/rename`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ old_name: oldName, new_name: newName }),
  });
  if (!res.ok) throw new Error('Failed to rename column');
  return res.json();
}

export async function deleteEditorColumn(id: string, colName: string): Promise<any> {
  const res = await fetch(`${API_BASE}/datasets/${id}/editor/column/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ col_name: colName }),
  });
  if (!res.ok) throw new Error('Failed to delete column');
  return res.json();
}

export async function findAndReplaceEditor(
  id: string,
  searchTerm: string,
  replaceTerm: string,
  targetColumn?: string,
  matchCase: boolean = false
): Promise<any> {
  const res = await fetch(`${API_BASE}/datasets/${id}/editor/find-replace`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      search_term: searchTerm,
      replace_term: replaceTerm,
      target_column: targetColumn || null,
      match_case: matchCase,
    }),
  });
  if (!res.ok) throw new Error('Failed to find and replace');
  return res.json();
}

export async function quickCleanEditor(id: string, action: string, column?: string): Promise<any> {
  const res = await fetch(`${API_BASE}/datasets/${id}/editor/quick-clean`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, column: column || null }),
  });
  if (!res.ok) throw new Error('Failed to run quick cleaning');
  return res.json();
}

export async function fetchEditorVersions(id: string): Promise<any[]> {
  const res = await fetch(`${API_BASE}/datasets/${id}/editor/versions`);
  if (!res.ok) return [];
  return res.json();
}

export async function restoreEditorVersion(id: string, versionNumber: number): Promise<any> {
  const res = await fetch(`${API_BASE}/datasets/${id}/editor/versions/${versionNumber}/restore`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error(`Failed to restore version ${versionNumber}`);
  return res.json();
}

export async function restoreOriginalUpload(id: string): Promise<any> {
  const res = await fetch(`${API_BASE}/datasets/${id}/editor/restore-original`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to restore original file');
  return res.json();
}
