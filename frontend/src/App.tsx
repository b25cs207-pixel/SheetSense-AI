import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Topbar } from './components/layout/Topbar';
import { MainDashboard } from './components/dashboard/MainDashboard';
import { UploadView } from './components/upload/UploadView';
import { DatasetsView } from './components/datasets/DatasetsView';
import { DataExplorer } from './components/explorer/DataExplorer';
import { InsightsSection } from './components/insights/InsightsSection';
import { AskDataChat } from './components/chat/AskDataChat';
import { ReportsView } from './components/reports/ReportsView';
import { SettingsModal } from './components/settings/SettingsModal';
import { SharedDashboardView } from './components/shared/SharedDashboardView';
import { SpreadsheetEditor } from './components/editor/SpreadsheetEditor';
import { DomainSelectorModal } from './components/domain/DomainSelectorModal';
import { EducationalConceptsModal } from './components/domain/EducationalConceptsModal';
import { PrivacyMaskModal } from './components/domain/PrivacyMaskModal';
import { Dataset } from './types';
import {
  fetchDatasets,
  fetchDataset,
  deleteDataset,
  loadSampleDataset,
  checkHealth,
  getExportUrl,
  updateDatasetDomain
} from './services/api';

export function App() {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [datasets, setDatasets] = useState<any[]>([]);
  const [activeDataset, setActiveDataset] = useState<Dataset | null>(null);
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [domainModalOpen, setDomainModalOpen] = useState<boolean>(false);
  const [conceptsModalOpen, setConceptsModalOpen] = useState<boolean>(false);
  const [privacyModalOpen, setPrivacyModalOpen] = useState<boolean>(false);
  const [health, setHealth] = useState<any>(null);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Check shared link in hash
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#shared/')) {
        const token = hash.replace('#shared/', '');
        setShareToken(token);
      } else {
        setShareToken(null);
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  // Initial data load
  useEffect(() => {
    refreshDatasets();
    refreshHealth();
  }, []);

  const refreshHealth = async () => {
    try {
      const h = await checkHealth();
      setHealth(h);
    } catch (err) {
      console.error(err);
    }
  };

  const refreshDatasets = async () => {
    try {
      const list = await fetchDatasets();
      setDatasets(list);
      // If no active dataset and items exist, select the first one
      if (!activeDataset && list.length > 0) {
        handleSelectDataset(list[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectDataset = async (id: string) => {
    try {
      const full = await fetchDataset(id);
      setActiveDataset(full);
    } catch (err: any) {
      showToast(`Failed to load dataset: ${err.message}`);
    }
  };

  const handleDeleteDataset = async (id: string) => {
    if (!confirm('Are you sure you want to delete this dataset?')) return;
    try {
      await deleteDataset(id);
      showToast('Dataset deleted.');
      if (activeDataset?.id === id) {
        setActiveDataset(null);
      }
      refreshDatasets();
    } catch (err: any) {
      showToast(`Delete failed: ${err.message}`);
    }
  };

  const handleDatasetLoaded = (dataset: Dataset) => {
    setActiveDataset(dataset);
    refreshDatasets();
    setCurrentTab('dashboard');
    showToast(`Successfully analyzed '${dataset.name}'!`);
  };

  const handleLoadSample = async (sampleKey: string) => {
    try {
      showToast('Loading sample dataset...');
      const dataset = await loadSampleDataset(sampleKey);
      setActiveDataset(dataset);
      refreshDatasets();
      setCurrentTab('dashboard');
      showToast(`Sample dataset '${dataset.name}' loaded!`);
    } catch (err: any) {
      showToast(`Sample load failed: ${err.message}`);
    }
  };

  const handleApplyDomain = async (domain: string, mode: any, objective?: string) => {
    if (!activeDataset) return;
    try {
      showToast('Updating analysis domain...');
      const updated = await updateDatasetDomain(activeDataset.id, domain, mode, objective);
      setActiveDataset(updated);
      refreshDatasets();
      showToast(`Domain applied: ${updated.domain || domain}`);
    } catch (err: any) {
      showToast(`Failed to update domain: ${err.message}`);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // If viewing shared link
  if (shareToken) {
    return <SharedDashboardView shareToken={shareToken} />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F9FAFB]">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xl border border-slate-700 animate-slideUp flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Sidebar */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={(tab) => {
          if (tab === 'settings') {
            setSettingsOpen(true);
          } else {
            setCurrentTab(tab);
          }
        }}
        activeDataset={activeDataset}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
      />

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <Topbar
          currentTab={currentTab}
          datasets={datasets}
          activeDataset={activeDataset}
          onSelectDataset={handleSelectDataset}
          onOpenUpload={() => setCurrentTab('upload')}
          onOpenSettings={() => setSettingsOpen(true)}
          onExportPdf={() => {
            if (activeDataset) {
              window.open(getExportUrl(activeDataset.id, 'pdf'), '_blank');
            }
          }}
          onShare={() => setCurrentTab('reports')}
          onOpenDomainSelector={() => setDomainModalOpen(true)}
          onOpenConcepts={() => setConceptsModalOpen(true)}
          onOpenPrivacyMask={() => setPrivacyModalOpen(true)}
          health={health}
        />

        {/* Dynamic Tab Body */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {currentTab === 'dashboard' && (
            <MainDashboard
              activeDataset={activeDataset}
              datasets={datasets}
              onSelectDataset={handleSelectDataset}
              onDeleteDataset={handleDeleteDataset}
              onOpenUpload={() => setCurrentTab('upload')}
              onOpenSample={handleLoadSample}
              onNavigateTab={(tab) => setCurrentTab(tab)}
              onRefreshActiveDataset={() => {
                if (activeDataset) handleSelectDataset(activeDataset.id);
              }}
            />
          )}

          {currentTab === 'editor' && activeDataset && (
            <SpreadsheetEditor
              dataset={activeDataset}
              onDatasetUpdated={(updated) => {
                setActiveDataset(updated);
                refreshDatasets();
              }}
              showToast={showToast}
            />
          )}

          {currentTab === 'upload' && (
            <UploadView onDatasetLoaded={handleDatasetLoaded} />
          )}

          {currentTab === 'datasets' && (
            <DatasetsView
              datasets={datasets}
              activeDatasetId={activeDataset?.id || null}
              onSelectDataset={(id) => {
                handleSelectDataset(id);
                setCurrentTab('dashboard');
              }}
              onDeleteDataset={handleDeleteDataset}
              onOpenUpload={() => setCurrentTab('upload')}
            />
          )}

          {currentTab === 'explorer' && activeDataset && (
            <DataExplorer
              datasetId={activeDataset.id}
              schema={activeDataset.schema}
            />
          )}

          {currentTab === 'insights' && activeDataset && (
            <div className="max-w-7xl mx-auto space-y-6">
              <InsightsSection
                insights={activeDataset.summary.insights}
                onExplore={(target) => {
                  if (target === 'Data Explorer') {
                    setCurrentTab('explorer');
                  } else {
                    setCurrentTab('dashboard');
                  }
                }}
              />
            </div>
          )}

          {currentTab === 'chat' && activeDataset && (
            <div className="max-w-4xl mx-auto">
              <AskDataChat
                datasetId={activeDataset.id}
                datasetName={activeDataset.name}
              />
            </div>
          )}

          {currentTab === 'reports' && activeDataset && (
            <ReportsView
              dataset={activeDataset}
              onRefreshDataset={() => handleSelectDataset(activeDataset.id)}
            />
          )}
        </main>
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSettingsUpdated={() => {
          refreshHealth();
          showToast('Settings saved successfully.');
        }}
      />

      {/* Domain Selector Modal */}
      {activeDataset && (
        <DomainSelectorModal
          isOpen={domainModalOpen}
          onClose={() => setDomainModalOpen(false)}
          currentDomain={activeDataset.domain || 'auto'}
          currentMode={activeDataset.analysis_mode || 'auto'}
          currentObjective={activeDataset.custom_objective}
          onApplyDomain={handleApplyDomain}
        />
      )}

      {/* Educational Concepts Modal */}
      <EducationalConceptsModal
        isOpen={conceptsModalOpen}
        onClose={() => setConceptsModalOpen(false)}
        datasetId={activeDataset?.id}
      />

      {/* Privacy Mask Modal */}
      <PrivacyMaskModal
        isOpen={privacyModalOpen}
        onClose={() => setPrivacyModalOpen(false)}
        datasetId={activeDataset?.id}
      />
    </div>
  );
}

export default App;
