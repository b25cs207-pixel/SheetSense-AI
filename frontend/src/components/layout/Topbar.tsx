import {
  UploadCloud,
  FileDown,
  Sparkles,
  Database,
  CheckCircle2,
  Share2,
  Settings as SettingsIcon,
  Briefcase,
  BookOpen,
  Lock
} from 'lucide-react';
import { Dataset } from '../../types';

interface TopbarProps {
  currentTab: string;
  datasets: any[];
  activeDataset: Dataset | null;
  onSelectDataset: (id: string) => void;
  onOpenUpload: () => void;
  onOpenSettings: () => void;
  onExportPdf: () => void;
  onShare: () => void;
  onOpenDomainSelector?: () => void;
  onOpenConcepts?: () => void;
  onOpenPrivacyMask?: () => void;
  health: any;
}

export const Topbar: React.FC<TopbarProps> = ({
  currentTab,
  datasets,
  activeDataset,
  onSelectDataset,
  onOpenUpload,
  onOpenSettings,
  onExportPdf,
  onShare,
  onOpenDomainSelector,
  onOpenConcepts,
  onOpenPrivacyMask,
  health,
}) => {
  const getTabTitle = () => {
    switch (currentTab) {
      case 'dashboard': return 'Analytics Dashboard';
      case 'editor': return 'Interactive Spreadsheet Editor';
      case 'upload': return 'Upload & Analyze Data';
      case 'datasets': return 'Dataset Repository';
      case 'explorer': return 'Interactive Data Explorer';
      case 'insights': return 'AI Intelligence & Insights';
      case 'chat': return 'Ask Your Data (AI Assistant)';
      case 'reports': return 'Reports & Controlled Sharing';
      case 'settings': return 'System Settings';
      default: return 'SheetSense AI';
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 z-20">
      {/* Title & Dataset Selector */}
      <div className="flex items-center space-x-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-none">
            {getTabTitle()}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {activeDataset ? (
              <span className="flex items-center space-x-1.5">
                <span className="font-medium text-slate-700">{activeDataset.name}</span>
                <span>•</span>
                <span>{activeDataset.source_type}</span>
                <span>•</span>
                <span>{activeDataset.row_count.toLocaleString()} rows</span>
              </span>
            ) : (
              'Select or upload a dataset to begin'
            )}
          </p>
        </div>

        {/* Dataset Switcher Dropdown */}
        {datasets.length > 0 && (
          <div className="hidden md:flex items-center ml-2">
            <select
              value={activeDataset?.id || ''}
              onChange={(e) => onSelectDataset(e.target.value)}
              className="text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            >
              <option value="" disabled>Switch Dataset...</option>
              {datasets.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.row_count} rows)
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Action Controls */}
      <div className="flex items-center space-x-2.5">
        {/* AI Provider Status Pill */}
        <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-full text-xs text-slate-600">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span className="font-medium capitalize">
            {health?.ai_provider || 'Deterministic Engine'}
          </span>
        </div>

        {/* Action Buttons */}
        {activeDataset && (
          <>
            {/* Domain Switcher Pill */}
            <button
              onClick={onOpenDomainSelector}
              className="hidden md:flex items-center space-x-1.5 px-2.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200"
              title="Change Industry Domain Mode"
            >
              <Briefcase className="w-3.5 h-3.5 text-blue-600" />
              <span className="capitalize">{activeDataset.domain || 'Auto Domain'}</span>
            </button>

            {/* Educational Explainer Button */}
            <button
              onClick={onOpenConcepts}
              className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1.5 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors border border-amber-200"
              title="Learn statistical concepts used in this report"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-600" />
              <span>Stats Explainer</span>
            </button>

            {/* Privacy Shield Button */}
            <button
              onClick={onOpenPrivacyMask}
              className="hidden xl:flex items-center space-x-1.5 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200"
              title="Inspect masked data preview"
            >
              <Lock className="w-3.5 h-3.5 text-emerald-600" />
              <span>Privacy Shield</span>
            </button>

            <button
              onClick={onShare}
              className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200"
              title="Share Read-Only Report"
            >
              <Share2 className="w-3.5 h-3.5 text-slate-600" />
              <span>Share</span>
            </button>

            <button
              onClick={onExportPdf}
              className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200"
              title="Download Executive PDF Report"
            >
              <FileDown className="w-3.5 h-3.5 text-slate-600" />
              <span>Export PDF</span>
            </button>
          </>
        )}

        <button
          onClick={onOpenUpload}
          className="flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm shadow-blue-600/20 transition-colors"
        >
          <UploadCloud className="w-4 h-4" />
          <span>Upload Data</span>
        </button>

        <button
          onClick={onOpenSettings}
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
          title="Settings & AI Keys"
        >
          <SettingsIcon className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
