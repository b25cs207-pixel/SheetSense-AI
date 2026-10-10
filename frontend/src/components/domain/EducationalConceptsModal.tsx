import React, { useState, useEffect } from 'react';
import {
  X,
  BookOpen,
  HelpCircle,
  Lightbulb,
  CheckCircle2,
  TrendingUp,
  BarChart2,
  AlertCircle
} from 'lucide-react';
import { fetchEducationalConcepts } from '../../services/api';

interface EducationalConceptsModalProps {
  isOpen: boolean;
  onClose: () => void;
  datasetId?: string;
}

export const EducationalConceptsModal: React.FC<EducationalConceptsModalProps> = ({
  isOpen,
  onClose,
  datasetId,
}) => {
  const [concepts, setConcepts] = useState<any[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && datasetId) {
      setLoading(true);
      fetchEducationalConcepts(datasetId)
        .then((data) => {
          setConcepts(data);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [isOpen, datasetId]);

  if (!isOpen) return null;

  const current = concepts[selectedIdx];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Statistical Literacy & Concept Explainer</h2>
              <p className="text-xs text-slate-500">Understand the mathematical concepts behind your dataset's findings.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Concept Sidebar Nav */}
          <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-slate-100 p-4 space-y-2 bg-slate-50/50 overflow-y-auto">
            {concepts.map((c, i) => (
              <button
                key={c.id || i}
                onClick={() => setSelectedIdx(i)}
                className={`w-full text-left p-3 rounded-2xl transition-all flex flex-col ${
                  selectedIdx === i
                    ? 'bg-white border border-amber-300 shadow-xs'
                    : 'hover:bg-slate-100/80 border border-transparent'
                }`}
              >
                <span className="text-[10px] font-bold text-amber-700 tracking-wider uppercase">
                  {c.category}
                </span>
                <span className="text-xs font-bold text-slate-900 mt-0.5 line-clamp-1">
                  {c.title}
                </span>
              </button>
            ))}
          </div>

          {/* Active Concept Explanation */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4">
            {current ? (
              <>
                <div className="space-y-1">
                  <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full text-[10px] font-bold uppercase tracking-wider">
                    {current.category}
                  </span>
                  <h3 className="text-lg font-extrabold text-slate-900 mt-2">{current.title}</h3>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <h4 className="text-xs font-bold text-slate-700 mb-1 flex items-center space-x-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
                    <span>Plain English Explanation</span>
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">{current.summary}</p>
                </div>

                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200">
                  <h4 className="text-xs font-bold text-emerald-900 mb-1 flex items-center space-x-1.5">
                    <Lightbulb className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Actionable Decision Rule</span>
                  </h4>
                  <p className="text-xs text-emerald-800 leading-relaxed">{current.tip}</p>
                </div>

                <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-100 text-xs text-blue-900 space-y-1.5">
                  <div className="font-bold flex items-center space-x-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>How SheetSense AI Uses This:</span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    Our deterministic profiler audits your data against these mathematical principles automatically. When high skew is detected, SheetSense prioritizes median metrics and highlights potential outlier events.
                  </p>
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-xs text-slate-400">Loading concepts...</div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end bg-slate-50/60">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
