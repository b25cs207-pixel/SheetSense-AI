import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  Globe,
  Database,
  FileText,
  Image,
  FileCode,
  Sparkles,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { uploadFile, uploadUrl, loadSampleDataset } from '../../services/api';
import { Dataset } from '../../types';

interface UploadViewProps {
  onDatasetLoaded: (dataset: Dataset) => void;
}

export const UploadView: React.FC<UploadViewProps> = ({ onDatasetLoaded }) => {
  const [activeTab, setActiveTab] = useState<'file' | 'url' | 'sample'>('file');
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // URL state
  const [urlInput, setUrlInput] = useState('');

  // Excel sheet selection state
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const sampleDatasets = [
    {
      key: 'sales',
      title: 'Sales Performance',
      desc: '150 transactions: Region, Category, Revenue, Profit, Customer Segment.',
      records: '150 rows',
      icon: '💼'
    },
    {
      key: 'student_performance',
      title: 'Student Academic Performance',
      desc: '120 students: Department, Attendance, Midterm & Final Scores, Study Hours.',
      records: '120 rows',
      icon: '🎓'
    },
    {
      key: 'ecommerce_orders',
      title: 'E-Commerce Orders',
      desc: '160 customer orders: City, Item Price, Discount, Order Status, Ratings.',
      records: '160 rows',
      icon: '🛍️'
    },
    {
      key: 'employee_attendance',
      title: 'Employee Attendance & HR',
      desc: '140 daily logs: Department, Hours Worked, Overtime, Remote Work, Check-In.',
      records: '140 rows',
      icon: '⏱️'
    }
  ];

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const processSelectedFile = async (file: File) => {
    try {
      setLoading(true);
      setErrorMessage(null);
      setStatusMessage(`Validating and profiling '${file.name}'...`);

      const res = await uploadFile(file);
      onDatasetLoaded(res);
    } catch (err: any) {
      setErrorMessage(err.message || 'File ingestion failed.');
    } finally {
      setLoading(false);
      setStatusMessage(null);
    }
  };

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    try {
      setLoading(true);
      setErrorMessage(null);
      setStatusMessage(`Validating URL safety and downloading source...`);

      const res = await uploadUrl(urlInput.trim());
      onDatasetLoaded(res);
    } catch (err: any) {
      setErrorMessage(err.message || 'URL ingestion failed.');
    } finally {
      setLoading(false);
      setStatusMessage(null);
    }
  };

  const handleLoadSample = async (sampleKey: string) => {
    try {
      setLoading(true);
      setErrorMessage(null);
      setStatusMessage(`Loading synthetic sample data...`);

      const res = await loadSampleDataset(sampleKey);
      onDatasetLoaded(res);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load sample dataset.');
    } finally {
      setLoading(false);
      setStatusMessage(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Tab Switcher */}
      <div className="flex items-center space-x-2 p-1 bg-slate-100 rounded-2xl w-fit mx-auto border border-slate-200">
        <button
          onClick={() => setActiveTab('file')}
          className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'file'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <UploadCloud className="w-4 h-4" />
          <span>Upload File</span>
        </button>
        <button
          onClick={() => setActiveTab('url')}
          className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'url'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>Analyze URL</span>
        </button>
        <button
          onClick={() => setActiveTab('sample')}
          className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'sample'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Try Sample Data</span>
        </button>
      </div>

      {/* Error alert */}
      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800 flex items-start space-x-3">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold">Ingestion Warning: </span>
            {errorMessage}
          </div>
        </div>
      )}

      {/* Status banner */}
      {statusMessage && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-800 flex items-center space-x-3 animate-pulse">
          <Loader2 className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* TAB 1: File Upload */}
      {activeTab === 'file' && (
        <div className="space-y-4">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-3xl p-12 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-blue-600 bg-blue-50/50 scale-[1.01]'
                : 'border-slate-300 hover:border-blue-400 bg-white hover:bg-slate-50/50'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInputChange}
              accept=".csv,.xlsx,.xls,.json,.pdf,.docx,.txt,.png,.jpg,.jpeg"
              className="hidden"
            />

            <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4 shadow-xs">
              <UploadCloud className="w-8 h-8" />
            </div>

            <h3 className="text-base font-bold text-slate-900">
              Drop your file here, or{' '}
              <span className="text-blue-600 hover:underline">browse files</span>
            </h3>
            <p className="text-xs text-slate-500 mt-2 max-w-md mx-auto">
              Supports CSV, Excel (.xlsx, .xls), JSON, PDF documents, Word (.docx), Plain Text, and Images (PNG/JPG).
            </p>

            <div className="mt-6 flex flex-wrap justify-center items-center gap-2">
              <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-[11px] font-mono font-medium">.csv</span>
              <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-[11px] font-mono font-medium">.xlsx</span>
              <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-[11px] font-mono font-medium">.json</span>
              <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-[11px] font-mono font-medium">.pdf</span>
              <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-[11px] font-mono font-medium">.docx</span>
              <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-[11px] font-mono font-medium">.png / .jpg</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: URL Ingestion */}
      {activeTab === 'url' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-4">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Analyze a Public URL</h3>
              <p className="text-xs text-slate-500">
                Enter a publicly accessible link to a CSV, Excel, PDF, JSON file or HTML webpage table.
              </p>
            </div>
          </div>

          <form onSubmit={handleUrlSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Source Web URL</label>
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://example.com/dataset.csv or https://example.com/data-table"
                required
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-500 leading-relaxed">
              <span className="font-semibold text-slate-700">Security Guarantee:</span> SSRF protection is strictly enforced. Internal network ranges (e.g. localhost, 127.0.0.1, 10.x, 192.168.x) are blocked to ensure system isolation.
            </div>

            <button
              type="submit"
              disabled={loading || !urlInput.trim()}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 shadow-sm shadow-blue-600/20"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>Fetch & Analyze URL</span>
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: Sample Datasets */}
      {activeTab === 'sample' && (
        <div className="space-y-3">
          <div className="text-center mb-4">
            <h3 className="text-sm font-bold text-slate-900">Demonstration Datasets</h3>
            <p className="text-xs text-slate-500">
              Realistic synthetic benchmarks built to test various chart types, filters, and AI recommendations.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {sampleDatasets.map((sample) => (
              <div
                key={sample.key}
                onClick={() => handleLoadSample(sample.key)}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">{sample.icon}</span>
                    <span className="text-[10px] font-semibold font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-100">
                      {sample.records}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                    {sample.title}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    {sample.desc}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-blue-600">
                  <span>Load Dataset</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
