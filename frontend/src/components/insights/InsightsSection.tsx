import React from 'react';
import {
  Sparkles,
  ArrowUpRight,
  TrendingUp,
  AlertTriangle,
  Award,
  Link2,
  CheckCircle2,
  HelpCircle
} from 'lucide-react';
import { InsightCard } from '../../types';

interface InsightsSectionProps {
  insights: InsightCard[];
  onExplore: (target?: string) => void;
}

export const InsightsSection: React.FC<InsightsSectionProps> = ({ insights, onExplore }) => {
  if (!insights || insights.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
        <p className="text-slate-500 text-sm">No insights generated yet.</p>
      </div>
    );
  }

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'Key Finding':
        return { bg: 'bg-blue-50 text-blue-700 border-blue-200', icon: Sparkles };
      case 'Top Performer':
        return { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: Award };
      case 'Trend':
        return { bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: TrendingUp };
      case 'Relationship':
        return { bg: 'bg-purple-50 text-purple-700 border-purple-200', icon: Link2 };
      case 'Data Quality':
        return { bg: 'bg-amber-50 text-amber-700 border-amber-200', icon: AlertTriangle };
      default:
        return { bg: 'bg-slate-100 text-slate-700 border-slate-200', icon: CheckCircle2 };
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span>AI Discoveries & Grounded Insights</span>
          </h2>
          <p className="text-xs text-slate-500">
            Mathematically verified insights derived directly from your uploaded observations.
          </p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-200">
          {insights.length} Verified Findings
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {insights.map((card) => {
          const badge = getCategoryBadge(card.category);
          const Icon = badge.icon;

          return (
            <div
              key={card.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                {/* Category & Confidence */}
                <div className="flex items-center justify-between mb-3">
                  <span className={`inline-flex items-center space-x-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${badge.bg}`}>
                    <Icon className="w-3 h-3" />
                    <span>{card.category}</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium" title="Evidence confidence">
                    {card.confidence}
                  </span>
                </div>

                {/* Title & Key Finding */}
                <h3 className="text-sm font-bold text-slate-900 leading-snug">
                  {card.title}
                </h3>
                <p className="text-xs font-semibold text-blue-600 mt-1.5 leading-relaxed">
                  {card.finding}
                </p>

                {/* Metric pill */}
                {card.metric && (
                  <div className="mt-2.5 inline-block bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md text-[11px] font-mono text-slate-700">
                    {card.metric}
                  </div>
                )}

                {/* Plain-English Explanation */}
                <p className="text-xs text-slate-600 mt-2.5 leading-relaxed">
                  {card.explanation}
                </p>

                {/* Significance */}
                {card.significance && (
                  <div className="mt-2.5 text-[11px] text-slate-500">
                    <span className="font-semibold text-slate-700">Significance:</span> {card.significance}
                  </div>
                )}
              </div>

              {/* Action & Explore Button */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-500 truncate max-w-[180px]" title={card.suggested_action}>
                  {card.suggested_action}
                </span>

                <button
                  onClick={() => onExplore(card.explore_target)}
                  className="inline-flex items-center space-x-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors ml-2 shrink-0"
                >
                  <span>Explore</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
