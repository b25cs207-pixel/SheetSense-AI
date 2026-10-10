import React, { useState } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  Copy,
  Trash2,
  Wand2,
  RefreshCw,
  Sliders,
  CheckCircle2,
  Check,
  ChevronDown
} from 'lucide-react';
import { SchemaProfile } from '../../types';
import { cleanDataset } from '../../services/api';

interface DataQualityReportProps {
  datasetId: string;
  schema: SchemaProfile;
  onRefreshDataset: () => void;
}

export const DataQualityReport: React.FC<DataQualityReportProps> = ({
  datasetId,
  schema,
  onRefreshDataset,
}) => {
  const [cleaningAction, setCleaningAction] = useState<string | null>(null);
  const [actionParams, setActionParams] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const { summary, columns, issues } = schema;

  const handleApplyClean = async (action: string, params: Record<string, any> = {}) => {
    try {
      setLoading(true);
      setMessage(null);
      const res = await cleanDataset(datasetId, action, params);
      setMessage(res.report?.message || 'Operation succeeded.');
      onRefreshDataset();
      setCleaningAction(null);
    } catch (err: any) {
      alert(`Error cleaning data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (score >= 70) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Schema Profiling & Data Quality Audit
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Automated validation across {summary.total_columns} columns and {summary.total_rows.toLocaleString()} observations.
          </p>
        </div>

        {/* Health Score Badge */}
        <div className={`px-4 py-2 rounded-xl border flex items-center space-x-3 shrink-0 ${getScoreColor(summary.overall_quality_score)}`}>
          <div>
            <div className="text-xs uppercase font-semibold">Quality Index</div>
            <div className="text-xl font-extrabold">{summary.overall_quality_score}%</div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {message && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 flex items-center justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage(null)} className="text-blue-600 hover:text-blue-900 font-bold">×</button>
        </div>
      )}

      {/* Quick Cleaning Actions Bar */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
        <span className="text-xs font-bold text-slate-700 flex items-center space-x-1 mr-2">
          <Wand2 className="w-3.5 h-3.5 text-blue-600" />
          <span>Quick Clean:</span>
        </span>

        {summary.duplicate_rows > 0 && (
          <button
            onClick={() => handleApplyClean('drop_duplicates')}
            disabled={loading}
            className="px-2.5 py-1 text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 transition-colors flex items-center space-x-1"
          >
            <Copy className="w-3 h-3 text-amber-600" />
            <span>Remove {summary.duplicate_rows} Duplicates</span>
          </button>
        )}

        {summary.total_missing_cells > 0 && (
          <button
            onClick={() => handleApplyClean('drop_missing')}
            disabled={loading}
            className="px-2.5 py-1 text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 transition-colors flex items-center space-x-1"
          >
            <Trash2 className="w-3 h-3 text-red-600" />
            <span>Drop Null Rows</span>
          </button>
        )}

        <button
          onClick={onRefreshDataset}
          disabled={loading}
          className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 ml-auto flex items-center space-x-1"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Audit</span>
        </button>
      </div>

      {/* Identified Issues */}
      {issues.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Identified Hygiene Opportunities ({issues.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {issues.map((issue, idx) => (
              <div
                key={idx}
                className="p-3 bg-white border border-slate-200 rounded-xl text-xs flex items-start space-x-2.5 shadow-xs"
              >
                {issue.severity === 'High' ? (
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-900">{issue.column}</span>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                      issue.severity === 'High' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                    }`}>
                      {issue.severity} Severity
                    </span>
                  </div>
                  <p className="text-slate-600 mt-0.5">{issue.message}</p>
                  <p className="text-[11px] text-blue-600 mt-1 font-medium">{issue.recommendation}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Column Schema Table */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
          Column Schema & Inferred Data Types
        </h3>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="py-2.5 px-3">Column Name</th>
                <th className="py-2.5 px-3">Inferred Type</th>
                <th className="py-2.5 px-3">Missing Values</th>
                <th className="py-2.5 px-3">Unique Values</th>
                <th className="py-2.5 px-3">Outliers</th>
                <th className="py-2.5 px-3">Sample Values</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {columns.map((col) => (
                <tr key={col.name} className="hover:bg-slate-50/50">
                  <td className="py-2.5 px-3 font-semibold text-slate-900 font-mono">
                    {col.name}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md text-[11px] font-medium border border-blue-100">
                      {col.type}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    {col.missing_count > 0 ? (
                      <span className="text-amber-600 font-semibold">
                        {col.missing_count} ({col.missing_percentage}%)
                      </span>
                    ) : (
                      <span className="text-emerald-600 font-medium">0%</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">
                    {col.unique_count.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3">
                    {col.outlier_count > 0 ? (
                      <span className="text-red-600 font-semibold">
                        {col.outlier_count}
                      </span>
                    ) : (
                      <span className="text-slate-400">0</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px] truncate max-w-xs" title={col.sample_values.join(', ')}>
                    {col.sample_values.slice(0, 3).join(', ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
