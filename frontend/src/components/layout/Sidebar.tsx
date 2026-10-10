import React from 'react';
import {
  LayoutDashboard,
  UploadCloud,
  Database,
  TableProperties,
  Sparkles,
  MessageSquareCode,
  FileDown,
  Settings,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  BrainCircuit,
  FileSpreadsheet
} from 'lucide-react';
import { Dataset } from '../../types';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  activeDataset: Dataset | null;
  collapsed: boolean;
  setCollapsed: (c: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  activeDataset,
  collapsed,
  setCollapsed,
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'editor', label: 'Spreadsheet Editor', icon: FileSpreadsheet, requiresDataset: true },
    { id: 'upload', label: 'Upload & Analyze', icon: UploadCloud },
    { id: 'datasets', label: 'My Datasets', icon: Database },
    { id: 'explorer', label: 'Data Explorer', icon: TableProperties, requiresDataset: true },
    { id: 'insights', label: 'AI Insights', icon: Sparkles, requiresDataset: true },
    { id: 'chat', label: 'Ask Your Data', icon: MessageSquareCode, requiresDataset: true },
    { id: 'reports', label: 'Reports & Exports', icon: FileDown, requiresDataset: true },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside
      className={`bg-white border-r border-slate-200 transition-all duration-300 flex flex-col z-30 shrink-0 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100">
        <div className="flex items-center space-x-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/20 shrink-0">
            <BrainCircuit className="w-5 h-5" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-bold text-slate-900 tracking-tight text-base leading-none">
                SheetSense<span className="text-blue-600 ml-0.5">AI</span>
              </span>
              <span className="text-[10px] text-slate-400 font-medium tracking-wider uppercase mt-1">
                Data Intelligence
              </span>
            </div>
          )}
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Active Dataset Pill */}
      {!collapsed && activeDataset && (
        <div className="px-4 py-3 m-3 bg-blue-50/60 border border-blue-100 rounded-xl flex items-center space-x-2.5">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <div className="overflow-hidden flex-1">
            <p className="text-[11px] font-semibold text-blue-900 truncate">{activeDataset.name}</p>
            <p className="text-[10px] text-blue-700/80">
              {activeDataset.row_count.toLocaleString()} rows • {activeDataset.col_count} cols
            </p>
          </div>
        </div>
      )}

      {/* Nav Menu */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          const isDisabled = item.requiresDataset && !activeDataset;

          return (
            <button
              key={item.id}
              disabled={isDisabled}
              onClick={() => setCurrentTab(item.id)}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30 font-semibold'
                  : isDisabled
                  ? 'text-slate-300 cursor-not-allowed opacity-60'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : isDisabled ? 'text-slate-300' : 'text-slate-500'}`} />
              {!collapsed && (
                <span className="truncate flex-1 text-left">{item.label}</span>
              )}
              {!collapsed && item.requiresDataset && !activeDataset && (
                <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">Select</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-100">
        {!collapsed ? (
          <div className="flex items-center space-x-2 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="truncate text-[11px]">Deterministic calculations</span>
          </div>
        ) : (
          <div className="flex justify-center" title="Deterministic calculations verified">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
        )}
      </div>
    </aside>
  );
};
