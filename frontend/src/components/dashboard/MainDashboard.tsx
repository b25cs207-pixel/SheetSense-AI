import React from 'react';
import {
  Sparkles,
  UploadCloud,
  FileSpreadsheet,
  Globe,
  Database,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Trash2,
  FileDown,
  BarChart3,
  Lightbulb,
  TableProperties,
  FileText
} from 'lucide-react';
import { Dataset } from '../../types';
import { KpiSection } from '../kpis/KpiSection';
import { ChartGallery } from '../charts/ChartGallery';
import { InsightsSection } from '../insights/InsightsSection';
import { RecommendationsSection } from '../recommendations/RecommendationsSection';
import { DataQualityReport } from '../profiler/DataQualityReport';

interface MainDashboardProps {
  activeDataset: Dataset | null;
  datasets: any[];
  onSelectDataset: (id: string) => void;
  onDeleteDataset: (id: string) => void;
  onOpenUpload: () => void;
  onOpenSample: (sampleKey: string) => void;
  onNavigateTab: (tab: string) => void;
  onRefreshActiveDataset: () => void;
}

export const MainDashboard: React.FC<MainDashboardProps> = ({
  activeDataset,
  datasets,
  onSelectDataset,
  onDeleteDataset,
  onOpenUpload,
  onOpenSample,
  onNavigateTab,
  onRefreshActiveDataset,
}) => {
  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Hero Banner when no dataset active */}
      {!activeDataset ? (
        <div className="space-y-8">
          <div className="text-center max-w-3xl mx-auto pt-6 pb-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-blue-50 border border-blue-200 rounded-full text-xs font-semibold text-blue-700 mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Universal Data Analyzer & Visualization Engine</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Turn Your Data into Decisions.
            </h1>
            <p className="text-sm sm:text-base text-slate-500 mt-3 max-w-2xl mx-auto leading-relaxed">
              Upload any supported data source. Discover insights, visualize trends, and make informed decisions with AI.
            </p>

            {/* Quick CTAs */}
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                onClick={onOpenUpload}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 flex items-center space-x-2 transition-all hover:scale-[1.02]"
              >
                <UploadCloud className="w-4 h-4" />
                <span>Upload a File</span>
              </button>
              <button
                onClick={() => onOpenSample('sales')}
                className="px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 rounded-xl text-xs font-bold shadow-xs flex items-center space-x-2 transition-all hover:scale-[1.02]"
              >
                <Database className="w-4 h-4 text-emerald-600" />
                <span>Try Sample Dataset</span>
              </button>
            </div>
          </div>

          {/* 4-Step Workflow Visual */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                step: '01',
                title: 'Multi-Modal Ingest',
                desc: 'Upload CSV, Excel, PDF, JSON, DOCX, or public web URL.',
                icon: UploadCloud,
                color: 'text-blue-600 bg-blue-50'
              },
              {
                step: '02',
                title: 'Deterministic Audit',
                desc: 'Automatic type inference, IQR outliers, and hygiene scoring.',
                icon: ShieldCheck,
                color: 'text-indigo-600 bg-indigo-50'
              },
              {
                step: '03',
                title: 'Smart Visualizations',
                desc: 'Interactive bar, donut, trend lines, histograms, and scatter plots.',
                icon: BarChart3,
                color: 'text-emerald-600 bg-emerald-50'
              },
              {
                step: '04',
                title: 'Ask Your Data',
                desc: 'Natural language Q&A, evidence-backed findings, and PDF export.',
                icon: Sparkles,
                color: 'text-purple-600 bg-purple-50'
              }
            ].map((st) => {
              const Icon = st.icon;
              return (
                <div key={st.step} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-mono font-bold text-slate-400">{st.step}</span>
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${st.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>
                  <h3 className="text-xs font-bold text-slate-900">{st.title}</h3>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{st.desc}</p>
                </div>
              );
            })}
          </div>

          {/* Sample Datasets Grid */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <div className="mb-4">
              <h2 className="text-sm font-bold text-slate-900">Explore Pre-loaded Sample Datasets</h2>
              <p className="text-xs text-slate-500">Instant one-click evaluation datasets to test the full pipeline.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { id: 'sales', name: 'Sales Performance', type: '150 rows', icon: '💼' },
                { id: 'student_performance', name: 'Student Academic', type: '120 rows', icon: '🎓' },
                { id: 'ecommerce_orders', name: 'E-Commerce Orders', type: '160 rows', icon: '🛍️' },
                { id: 'employee_attendance', name: 'Attendance & HR', type: '140 rows', icon: '⏱️' },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => onOpenSample(s.id)}
                  className="p-4 bg-slate-50 hover:bg-blue-50/60 border border-slate-200 hover:border-blue-300 rounded-2xl text-left transition-all group flex flex-col justify-between"
                >
                  <div>
                    <span className="text-2xl">{s.icon}</span>
                    <div className="text-xs font-bold text-slate-900 mt-2 group-hover:text-blue-600 transition-colors">
                      {s.name}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">{s.type}</div>
                  </div>
                  <span className="text-[10px] font-semibold text-blue-600 mt-3 flex items-center space-x-1">
                    <span>Load Dataset</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Active Dataset Dashboard Content */
        <div className="space-y-8">
          {/* Active Dataset Top Banner */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded-full text-[10px] font-bold tracking-wider uppercase">
                  {activeDataset.source_type}
                </span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs text-slate-500">
                  Uploaded {new Date(activeDataset.created_at).toLocaleDateString()}
                </span>
              </div>
              <h2 className="text-xl font-extrabold text-slate-900 mt-1 tracking-tight">
                {activeDataset.name}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {activeDataset.row_count.toLocaleString()} rows • {activeDataset.col_count} columns • {activeDataset.quality?.overall_quality_score}% Quality Score
              </p>
            </div>

            <div className="flex items-center flex-wrap gap-2">
              <button
                onClick={() => onNavigateTab('explorer')}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl flex items-center space-x-1.5 transition-colors"
              >
                <TableProperties className="w-4 h-4 text-slate-600" />
                <span>View Full Data Grid</span>
              </button>

              <button
                onClick={() => onNavigateTab('chat')}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl flex items-center space-x-1.5 shadow-sm shadow-blue-600/20 transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                <span>Ask Your Data</span>
              </button>
            </div>
          </div>

          {/* Document Intelligence & Extracted Content Banner (if document/PDF/drawing) */}
          {(activeDataset.summary.text_content || (activeDataset.summary.warnings && activeDataset.summary.warnings.length > 0)) && (
            <div className="bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-white rounded-2xl border border-blue-200/80 p-5 shadow-xs">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                      <span>Document & Entity Ingestion Notice</span>
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px] font-semibold">
                        Auto-Structured
                      </span>
                    </h3>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      {activeDataset.summary.warnings && activeDataset.summary.warnings[0]
                        ? activeDataset.summary.warnings[0]
                        : "Document text and measurements were automatically converted into structured records for statistical profiling."}
                    </p>
                  </div>
                </div>
              </div>

              {activeDataset.summary.text_content && (
                <details className="mt-3 pt-3 border-t border-blue-100/80 group">
                  <summary className="text-xs font-semibold text-blue-700 hover:text-blue-900 cursor-pointer select-none flex items-center space-x-1.5">
                    <span>Inspect Raw Extracted Document Text ({activeDataset.summary.text_content.length} characters)</span>
                  </summary>
                  <pre className="mt-2.5 p-3.5 bg-white/90 border border-slate-200 rounded-xl text-[11px] font-mono text-slate-700 max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                    {activeDataset.summary.text_content}
                  </pre>
                </details>
              )}
            </div>
          )}

          {/* KPI Section */}
          <KpiSection kpis={activeDataset.summary.stats.kpis} />

          {/* AI Insights Section */}
          <InsightsSection
            insights={activeDataset.summary.insights}
            onExplore={(target) => {
              if (target === 'Data Explorer' || target === 'Data Quality Report') {
                onNavigateTab('explorer');
              } else if (target) {
                const el = document.getElementById(target);
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }
            }}
          />

          {/* Visualizations Gallery */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center space-x-2">
                  <BarChart3 className="w-4 h-4 text-blue-600" />
                  <span>Interactive Visualizations Gallery</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Dynamically synthesized charts from verified numbers. Use controls to switch chart types or sort data.
                </p>
              </div>
            </div>
            <ChartGallery charts={activeDataset.summary.charts} />
          </div>

          {/* Proactive Recommendations */}
          <RecommendationsSection
            datasetId={activeDataset.id}
            recommendations={activeDataset.summary.recommendations}
          />

          {/* Data Quality & Schema Profiling Section */}
          <DataQualityReport
            datasetId={activeDataset.id}
            schema={activeDataset.schema}
            onRefreshDataset={onRefreshActiveDataset}
          />
        </div>
      )}

      {/* Recently Analyzed Datasets Table */}
      {datasets.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Analysis History & Saved Datasets</h2>
              <p className="text-xs text-slate-500">Easily switch between previously profiled datasets.</p>
            </div>
            <span className="text-xs font-semibold text-slate-500 font-mono">
              {datasets.length} Total
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs divide-y divide-slate-100">
              <thead className="bg-slate-50 text-slate-600 font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Dataset Name</th>
                  <th className="py-2.5 px-3">Source Type</th>
                  <th className="py-2.5 px-3">Rows</th>
                  <th className="py-2.5 px-3">Columns</th>
                  <th className="py-2.5 px-3">Created</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {datasets.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-slate-900">
                      <button
                        onClick={() => onSelectDataset(d.id)}
                        className="hover:text-blue-600 text-left font-semibold"
                      >
                        {d.name}
                      </button>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-mono text-slate-600">
                        {d.source_type}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono">{d.row_count?.toLocaleString()}</td>
                    <td className="py-2.5 px-3 font-mono">{d.col_count}</td>
                    <td className="py-2.5 px-3 text-slate-500">
                      {new Date(d.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-2.5 px-3 text-right space-x-2">
                      <button
                        onClick={() => onSelectDataset(d.id)}
                        className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 rounded-lg hover:bg-blue-100"
                      >
                        Open
                      </button>
                      <button
                        onClick={() => onDeleteDataset(d.id)}
                        className="p-1 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                        title="Delete dataset"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
