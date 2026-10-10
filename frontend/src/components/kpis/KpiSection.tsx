import React from 'react';
import {
  TrendingUp,
  BarChart3,
  Layers,
  Sparkles,
  ShieldAlert,
  Hash,
  DollarSign,
  Percent,
  CheckCircle2
} from 'lucide-react';
import { KPI } from '../../types';

interface KpiSectionProps {
  kpis: KPI[];
}

export const KpiSection: React.FC<KpiSectionProps> = ({ kpis }) => {
  if (!kpis || kpis.length === 0) return null;

  const getKpiIcon = (type: string, index: number) => {
    switch (type) {
      case 'count': return Hash;
      case 'currency': return DollarSign;
      case 'percentage': return Percent;
      default:
        return index === 0 ? Layers : index === 1 ? TrendingUp : BarChart3;
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi, idx) => {
        const Icon = getKpiIcon(kpi.type, idx);
        return (
          <div
            key={idx}
            className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow transition-shadow flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {kpi.label}
              </span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4" />
              </div>
            </div>

            <div className="my-3">
              <div className="text-2xl font-bold text-slate-900 tracking-tight">
                {kpi.value}
              </div>
            </div>

            {kpi.subtitle && (
              <p className="text-xs text-slate-500 truncate" title={kpi.subtitle}>
                {kpi.subtitle}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
};
