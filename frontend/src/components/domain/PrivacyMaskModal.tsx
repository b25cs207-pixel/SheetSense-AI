import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  Lock,
  Eye,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { fetchMaskedFinancialPreview } from '../../services/api';

interface PrivacyMaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  datasetId?: string;
}

export const PrivacyMaskModal: React.FC<PrivacyMaskModalProps> = ({
  isOpen,
  onClose,
  datasetId
}) => {
  const [data, setData] = useState<{ columns: string[]; sample_rows: any[] } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && datasetId) {
      setLoading(true);
      fetchMaskedFinancialPreview(datasetId)
        .then((res) => setData(res))
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [isOpen, datasetId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Financial Privacy & PII Data Masking</h2>
              <p className="text-xs text-slate-500">Sensitive account numbers, identifiers, and card credentials are automatically shielded.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex items-start space-x-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-900 space-y-1">
              <span className="font-bold">Active Privacy Shield Protection</span>
              <p className="text-emerald-800 leading-relaxed">
                Financial accounts, identifiers, and sensitive numbers are masked with safe suffixes (e.g., <code className="bg-emerald-100 px-1 py-0.5 rounded font-mono">****1234</code>) during client reporting and external sharing.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-800">Live Masked Data Sample (First 20 Records)</h3>
            {loading ? (
              <div className="py-12 text-center text-xs text-slate-400">Loading privacy preview...</div>
            ) : data && data.sample_rows.length > 0 ? (
              <div className="border border-slate-200 rounded-2xl overflow-x-auto max-h-72">
                <table className="w-full text-left text-xs divide-y divide-slate-100">
                  <thead className="bg-slate-50 text-slate-600 font-semibold sticky top-0">
                    <tr>
                      {data.columns.map((c) => (
                        <th key={c} className="py-2.5 px-3 whitespace-nowrap">{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {data.sample_rows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60 font-mono text-[11px]">
                        {data.columns.map((c) => (
                          <td key={c} className="py-2 px-3 whitespace-nowrap text-slate-700">
                            {row[c] !== null && row[c] !== undefined ? String(row[c]) : ''}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">No records available to display.</div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end bg-slate-50/60">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
};
