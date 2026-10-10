import React from 'react';
import {
  Database,
  Calendar,
  Layers,
  Trash2,
  ExternalLink,
  FileDown,
  UploadCloud,
  FileSpreadsheet
} from 'lucide-react';
import { getExportUrl } from '../../services/api';

interface DatasetsViewProps {
  datasets: any[];
  activeDatasetId: string | null;
  onSelectDataset: (id: string) => void;
  onDeleteDataset: (id: string) => void;
  onOpenUpload: () => void;
}

export const DatasetsView: React.FC<DatasetsViewProps> = ({
  datasets,
  activeDatasetId,
  onSelectDataset,
  onDeleteDataset,
  onOpenUpload,
}) => {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <Database className="w-5 h-5 text-blue-600" />
            <span>Dataset Repository</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your analyzed data sources, review profiles, or export reports.
          </p>
        </div>

        <button
          onClick={onOpenUpload}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 shadow-sm shadow-blue-600/20"
        >
          <UploadCloud className="w-4 h-4" />
          <span>Upload New Source</span>
        </button>
      </div>

      {datasets.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Database className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">No Datasets Uploaded Yet</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Get started by uploading a CSV, Excel spreadsheet, document, image, or loading a sample dataset.
            </p>
          </div>
          <button
            onClick={onOpenUpload}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700"
          >
            Upload Data
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {datasets.map((d) => {
            const isActive = d.id === activeDatasetId;
            return (
              <div
                key={d.id}
                className={`bg-white rounded-2xl border p-5 shadow-sm transition-all flex flex-col justify-between ${
                  isActive
                    ? 'border-blue-500 ring-2 ring-blue-500/10'
                    : 'border-slate-200 hover:shadow-md'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md text-[10px] font-mono font-semibold">
                      {d.source_type}
                    </span>
                    {isActive && (
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-bold">
                        Active
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 leading-snug line-clamp-1" title={d.name}>
                    {d.name}
                  </h3>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Observations</span>
                      <span className="font-mono font-bold text-slate-800">{d.row_count?.toLocaleString()} rows</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Dimensions</span>
                      <span className="font-mono font-bold text-slate-800">{d.col_count} columns</span>
                    </div>
                  </div>

                  <div className="mt-3 text-[11px] text-slate-400 flex items-center space-x-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Analyzed {new Date(d.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onSelectDataset(d.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        isActive
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {isActive ? 'Current View' : 'Select'}
                    </button>

                    <a
                      href={getExportUrl(d.id, 'pdf')}
                      download
                      className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg"
                      title="Download PDF Report"
                    >
                      <FileDown className="w-4 h-4" />
                    </a>
                  </div>

                  <button
                    onClick={() => onDeleteDataset(d.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete dataset"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
