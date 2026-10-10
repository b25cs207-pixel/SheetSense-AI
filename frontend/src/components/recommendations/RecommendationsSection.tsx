import React, { useState } from 'react';
import {
  Compass,
  Play,
  CheckCircle2,
  Loader2,
  X,
  BarChart3,
  Columns
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ScatterChart,
  Scatter,
  AreaChart,
  Area
} from 'recharts';
import { Recommendation } from '../../types';
import { runRecommendationAnalysis } from '../../services/api';

interface RecommendationsSectionProps {
  datasetId: string;
  recommendations: Recommendation[];
}

export const RecommendationsSection: React.FC<RecommendationsSectionProps> = ({
  datasetId,
  recommendations,
}) => {
  const [runningId, setRunningId] = useState<string | null>(null);
  const [activeResult, setActiveResult] = useState<any | null>(null);

  if (!recommendations || recommendations.length === 0) return null;

  const handleRun = async (rec: Recommendation) => {
    try {
      setRunningId(rec.id);
      const res = await runRecommendationAnalysis(datasetId, rec.spec);
      setActiveResult(res);
    } catch (err: any) {
      alert(`Analysis failed: ${err.message}`);
    } finally {
      setRunningId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <Compass className="w-4 h-4 text-emerald-600" />
            <span>Proactive Recommendations — What Else Can You Discover?</span>
          </h2>
          <p className="text-xs text-slate-500">
            Suggested deep-dive inquiries tailored to your specific column definitions and distributions.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {recommendations.map((rec) => {
          const isRunning = runningId === rec.id;

          return (
            <div
              key={rec.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <h3 className="text-sm font-bold text-slate-900 leading-snug">
                  {rec.title}
                </h3>

                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  <span className="font-semibold text-slate-700">Why it matters:</span> {rec.why_it_matters}
                </p>

                {/* Required Columns */}
                <div className="mt-3 flex items-center flex-wrap gap-1.5">
                  <span className="text-[10px] text-slate-400 font-medium">Columns:</span>
                  {rec.required_columns.map((col) => (
                    <span
                      key={col}
                      className="text-[10px] font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200"
                    >
                      {col}
                    </span>
                  ))}
                </div>

                <div className="mt-2 text-[11px] text-slate-500">
                  <span className="font-semibold text-slate-700">Output:</span> {rec.expected_output}
                </div>
              </div>

              {/* Run Action */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end">
                <button
                  onClick={() => handleRun(rec)}
                  disabled={isRunning}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm shadow-emerald-600/20"
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Computing...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Run Analysis</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Result Modal */}
      {activeResult && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{activeResult.title}</h3>
                  <p className="text-xs text-slate-500">Real-time analysis executed</p>
                </div>
              </div>
              <button
                onClick={() => setActiveResult(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Chart */}
            <div className="my-6">
              {activeResult.chart_type === 'scatter' ? (
                <ResponsiveContainer width="100%" height={280}>
                  <ScatterChart margin={{ top: 10, right: 10, left: -10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="x" name={activeResult.x_label || 'X'} tick={{ fontSize: 11 }} />
                    <YAxis dataKey="y" name={activeResult.y_label || 'Y'} tick={{ fontSize: 11 }} />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                    <Scatter name="Data" data={activeResult.data} fill="#059669" />
                  </ScatterChart>
                </ResponsiveContainer>
              ) : activeResult.chart_type === 'area' ? (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={activeResult.data} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey={activeResult.x_key} tick={{ fontSize: 11 }} angle={-20} textAnchor="end" />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Area type="monotone" dataKey={activeResult.y_key} stroke="#059669" fill="#D1FAE5" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={activeResult.data} margin={{ top: 10, right: 10, left: -10, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey={activeResult.x_key} tick={{ fontSize: 11 }} angle={-25} textAnchor="end" interval={0} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey={activeResult.y_key || 'value'} fill="#059669" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl text-xs text-emerald-900 leading-relaxed">
              <span className="font-semibold">Summary Findings:</span> {activeResult.summary}
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setActiveResult(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
