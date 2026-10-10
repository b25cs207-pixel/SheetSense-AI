import React, { useState } from 'react';
import {
  FileDown,
  FileSpreadsheet,
  FileText,
  Share2,
  Copy,
  Check,
  Shield,
  Eye,
  AlertCircle,
  ExternalLink,
  Lock,
  Globe
} from 'lucide-react';
import { Dataset } from '../../types';
import { getExportUrl, toggleShare } from '../../services/api';

interface ReportsViewProps {
  dataset: Dataset;
  onRefreshDataset: () => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ dataset, onRefreshDataset }) => {
  const [copied, setCopied] = useState(false);
  const [sharingLoading, setSharingLoading] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const isShared = Boolean(dataset.is_shared && dataset.share_token);
  const shareUrl = isShared
    ? `${window.location.origin}/#shared/${dataset.share_token}`
    : null;

  const handleToggleShare = async () => {
    try {
      setSharingLoading(true);
      await toggleShare(dataset.id, !isShared);
      onRefreshDataset();
    } catch (err: any) {
      alert(`Sharing update failed: ${err.message}`);
    } finally {
      setSharingLoading(false);
    }
  };

  const copyShareLink = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Export Options Cards */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <FileDown className="w-5 h-5 text-blue-600" />
            <span>Download Reports & Raw Data Exports</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Export comprehensive analytical reports or sanitized data files in your preferred format.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          {/* PDF Report */}
          <a
            href={getExportUrl(dataset.id, 'pdf')}
            download
            className="p-5 rounded-2xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 transition-all flex flex-col justify-between group"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mb-3">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600">
                Executive PDF Report
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Complete multi-page report with KPI cards, insights, and data hygiene audits.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center text-xs font-semibold text-blue-600">
              <span>Download PDF</span>
              <FileDown className="w-3.5 h-3.5 ml-1.5" />
            </div>
          </a>

          {/* Excel .xlsx */}
          <a
            href={getExportUrl(dataset.id, 'xlsx')}
            download
            className="p-5 rounded-2xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/40 transition-all flex flex-col justify-between group"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-700">
                Excel Workbook (.xlsx)
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Formatted spreadsheet with styled headers and auto-adjusted column widths.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center text-xs font-semibold text-emerald-600">
              <span>Download Excel</span>
              <FileDown className="w-3.5 h-3.5 ml-1.5" />
            </div>
          </a>

          {/* Sanitized CSV */}
          <a
            href={getExportUrl(dataset.id, 'csv')}
            download
            className="p-5 rounded-2xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 transition-all flex flex-col justify-between group"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
                <Shield className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600">
                Safe CSV Export
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Defends against CSV/DDE spreadsheet formula injection with sanitized tokens.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center text-xs font-semibold text-indigo-600">
              <span>Download CSV</span>
              <FileDown className="w-3.5 h-3.5 ml-1.5" />
            </div>
          </a>
        </div>
      </div>

      {/* Controlled Read-Only Sharing Section */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Controlled Read-Only Dashboard Sharing
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Generate an access-controlled, read-only web link to share your dashboard and insights.
              </p>
            </div>
          </div>

          {/* Status badge */}
          <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center space-x-1.5 border ${
            isShared ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'
          }`}>
            {isShared ? <Globe className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
            <span>{isShared ? 'Public Link Active' : 'Private (Not Shared)'}</span>
          </span>
        </div>

        {/* Security and privacy notice */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-start space-x-2.5">
          <Shield className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <span className="font-semibold text-slate-800">Privacy Safeguard:</span> Anyone with the link can view KPI cards, charts, and AI summaries in read-only mode. Your underlying raw file system path and database are never exposed, and editing operations are disabled.
          </p>
        </div>

        {/* Link section */}
        {isShared && shareUrl ? (
          <div className="space-y-3 pt-1">
            <label className="text-xs font-bold text-slate-700 block">Your Read-Only Share Link</label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-mono outline-none"
              />
              <button
                onClick={copyShareLink}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-xs"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Link'}</span>
              </button>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => window.open(shareUrl, '_blank')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center space-x-1"
              >
                <span>Open shared view in new tab</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={handleToggleShare}
                disabled={sharingLoading}
                className="text-xs font-semibold text-red-600 hover:text-red-800 hover:underline"
              >
                Revoke Share Link
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-slate-500">
              Generate a secure link to enable stakeholders to view this dashboard without logging in.
            </span>
            <button
              onClick={handleToggleShare}
              disabled={sharingLoading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors flex items-center space-x-1.5"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Create Share Link</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
