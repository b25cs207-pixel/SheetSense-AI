import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Briefcase,
  Wallet,
  GraduationCap,
  Calculator,
  Activity,
  ShoppingBag,
  Factory,
  Truck,
  Users,
  Megaphone,
  BarChart3,
  Check,
  Target
} from 'lucide-react';
import { IndustryDomain, AnalysisMode } from '../../types';

interface DomainSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDomain: string;
  currentMode: string;
  currentObjective?: string | null;
  onApplyDomain: (domain: string, mode: AnalysisMode, objective?: string) => Promise<void>;
}

const DOMAINS: Array<{
  id: IndustryDomain;
  title: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}> = [
  {
    id: 'business',
    title: 'Business Intelligence & Sales',
    desc: 'Revenue, profit margins, sales reps, quota attainment, deal segments.',
    icon: Briefcase,
    color: 'text-blue-600 bg-blue-50 border-blue-200'
  },
  {
    id: 'finance',
    title: 'Banking & Personal Finance',
    desc: 'Cash flow, deposits vs withdrawals, budget allocation, transaction categorization.',
    icon: Wallet,
    color: 'text-emerald-600 bg-emerald-50 border-emerald-200'
  },
  {
    id: 'education',
    title: 'Education & Student Performance',
    desc: 'Exam marks, GPA spread, attendance rates, subject grade cohorts, passing benchmarks.',
    icon: GraduationCap,
    color: 'text-amber-600 bg-amber-50 border-amber-200'
  },
  {
    id: 'accounting',
    title: 'Accounting & Corporate Finance',
    desc: 'Invoices, receivables vs payables, ledger balances, depreciation, tax compliance.',
    icon: Calculator,
    color: 'text-purple-600 bg-purple-50 border-purple-200'
  },
  {
    id: 'healthcare',
    title: 'Healthcare Administration',
    desc: 'Patient admissions, clinic wait times, length of stay, provider capacity.',
    icon: Activity,
    color: 'text-rose-600 bg-rose-50 border-rose-200'
  },
  {
    id: 'retail',
    title: 'Retail & Inventory Analytics',
    desc: 'Stock levels, low-inventory alerts, unit prices, SKU velocity, suppliers.',
    icon: ShoppingBag,
    color: 'text-orange-600 bg-orange-50 border-orange-200'
  },
  {
    id: 'manufacturing',
    title: 'Manufacturing & Production',
    desc: 'Batch yields, defect rates, scrap counts, machine downtime incidents.',
    icon: Factory,
    color: 'text-slate-700 bg-slate-100 border-slate-300'
  },
  {
    id: 'logistics',
    title: 'Logistics & Supply Chain',
    desc: 'Shipment transit times, delay analysis, carrier routes, freight dispatch.',
    icon: Truck,
    color: 'text-cyan-600 bg-cyan-50 border-cyan-200'
  },
  {
    id: 'hr',
    title: 'Human Resources & Workforce',
    desc: 'Headcount by department, overtime logs, payroll volume, attendance tracking.',
    icon: Users,
    color: 'text-indigo-600 bg-indigo-50 border-indigo-200'
  },
  {
    id: 'marketing',
    title: 'Marketing & Advertising',
    desc: 'Ad spend, conversions, cost per acquisition (CPA), campaign click-through rates.',
    icon: Megaphone,
    color: 'text-pink-600 bg-pink-50 border-pink-200'
  },
  {
    id: 'general',
    title: 'Universal General Analytics',
    desc: 'Balanced multi-attribute analysis without domain-biased heuristics.',
    icon: BarChart3,
    color: 'text-teal-600 bg-teal-50 border-teal-200'
  }
];

export const DomainSelectorModal: React.FC<DomainSelectorModalProps> = ({
  isOpen,
  onClose,
  currentDomain,
  currentMode,
  currentObjective,
  onApplyDomain
}) => {
  const [mode, setMode] = useState<AnalysisMode>((currentMode as AnalysisMode) || 'auto');
  const [selectedDomain, setSelectedDomain] = useState<string>(currentDomain || 'auto');
  const [objective, setObjective] = useState<string>(currentObjective || '');
  const [loading, setLoading] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleApply = async () => {
    setLoading(true);
    try {
      const domToApply = mode === 'auto' ? 'auto' : selectedDomain;
      await onApplyDomain(domToApply, mode, mode === 'custom' ? objective : undefined);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Analysis Engine & Domain Modes</h2>
              <p className="text-xs text-slate-500">Configure industry-specific metrics and tailored AI intelligence.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="px-6 pt-4 border-b border-slate-100 flex space-x-2">
          {[
            { id: 'auto', label: 'Mode A: Auto-Detect', icon: Sparkles },
            { id: 'industry', label: 'Mode B: Industry Workspace', icon: Briefcase },
            { id: 'custom', label: 'Mode C: Custom Objective', icon: Target },
          ].map((m) => {
            const Icon = m.icon;
            const isSel = mode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setMode(m.id as AnalysisMode)}
                className={`flex items-center space-x-2 pb-3 px-3 text-xs font-semibold border-b-2 transition-all ${
                  isSel
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {mode === 'auto' && (
            <div className="p-5 bg-blue-50/60 border border-blue-100 rounded-2xl space-y-2">
              <h3 className="text-sm font-bold text-blue-900">Automatic Intelligent Domain Inference</h3>
              <p className="text-xs text-blue-700 leading-relaxed">
                The platform will automatically inspect your column titles, value distributions, and text content to assign the most appropriate KPIs and analysis templates.
              </p>
              <div className="pt-2 text-xs text-slate-600 flex items-center space-x-1.5">
                <span className="font-semibold text-slate-700">Currently active detection:</span>
                <span className="px-2 py-0.5 bg-white border border-blue-200 rounded-md font-mono text-blue-800 uppercase text-[10px]">
                  {currentDomain}
                </span>
              </div>
            </div>
          )}

          {mode === 'industry' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500">
                Choose the industry workspace that best represents this dataset:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-80 overflow-y-auto pr-1">
                {DOMAINS.map((dom) => {
                  const Icon = dom.icon;
                  const isSel = selectedDomain === dom.id;
                  return (
                    <button
                      key={dom.id}
                      onClick={() => setSelectedDomain(dom.id)}
                      className={`p-3 rounded-2xl border text-left transition-all flex items-start space-x-3 ${
                        isSel
                          ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${dom.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 truncate">{dom.title}</span>
                          {isSel && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5 leading-snug line-clamp-2">{dom.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {mode === 'custom' && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">
                  Describe Your Analytical Objective in Natural Language
                </label>
                <p className="text-xs text-slate-500 mb-2">
                  E.g., "Analyze our monthly branch sales, identify the top 10% highest spending clients, and detect irregular expenses."
                </p>
                <textarea
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  placeholder="Enter your custom analytical goal..."
                  rows={4}
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">
                  Base Domain Framework
                </label>
                <select
                  value={selectedDomain}
                  onChange={(e) => setSelectedDomain(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                >
                  {DOMAINS.map((d) => (
                    <option key={d.id} value={d.id}>{d.title}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/60">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            disabled={loading}
            onClick={handleApply}
            className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm shadow-blue-600/20 transition-all flex items-center space-x-1.5"
          >
            {loading ? (
              <span>Updating Analysis...</span>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Apply & Re-Calculate</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
