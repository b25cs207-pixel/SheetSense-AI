import React, { useEffect, useState } from 'react';
import {
  BrainCircuit,
  Lock,
  Calendar,
  Layers,
  Sparkles,
  BarChart3,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { Dataset } from '../../types';
import { fetchSharedDashboard } from '../../services/api';
import { KpiSection } from '../kpis/KpiSection';
import { ChartGallery } from '../charts/ChartGallery';
import { InsightsSection } from '../insights/InsightsSection';
import { RecommendationsSection } from '../recommendations/RecommendationsSection';

interface SharedDashboardViewProps {
  shareToken: string;
}

export const SharedDashboardView: React.FC<SharedDashboardViewProps> = ({ shareToken }) => {
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadShared();
  }, [shareToken]);

  const loadShared = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchSharedDashboard(shareToken);
      setDataset(data);
    } catch (err: any) {
      setError(err.message || 'Shared dashboard not found or link has expired.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex items-center space-x-2 text-sm text-slate-600">
          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          <span>Loading shared analytics dashboard...</span>
        </div>
      </div>
    );
  }

  if (error || !dataset) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl border border-slate-200 p-8 max-w-md w-full text-center shadow-lg space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-900">Dashboard Unavailable</h2>
          <p className="text-xs text-slate-500 leading-relaxed">{error}</p>
          <a
            href="/"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700"
          >
            Return to SheetSense AI
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Top Banner */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
            <BrainCircuit className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-slate-900 text-sm">SheetSense AI</span>
              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md text-[10px] font-semibold flex items-center space-x-1">
                <Lock className="w-3 h-3" />
                <span>Read-Only Share</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-500">{dataset.name}</p>
          </div>
        </div>

        <div className="text-xs text-slate-500 font-mono hidden sm:block">
          {dataset.row_count.toLocaleString()} observations • {dataset.col_count} columns
        </div>
      </header>

      {/* Main Shared Content */}
      <main className="max-w-7xl mx-auto p-6 md:p-8 space-y-8">
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {dataset.name}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Read-only analytical report shared securely via SheetSense AI.
          </p>
        </div>

        {/* KPIs */}
        <KpiSection kpis={dataset.summary.stats.kpis} />

        {/* AI Insights */}
        <InsightsSection insights={dataset.summary.insights} onExplore={() => {}} />

        {/* Charts Gallery */}
        <div className="space-y-4">
          <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <BarChart3 className="w-4 h-4 text-blue-600" />
            <span>Visualizations</span>
          </h2>
          <ChartGallery charts={dataset.summary.charts} />
        </div>

        {/* Proactive Recommendations */}
        <RecommendationsSection
          datasetId={dataset.id}
          recommendations={dataset.summary.recommendations}
        />
      </main>
    </div>
  );
};
