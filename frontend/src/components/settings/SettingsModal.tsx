import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  X,
  Sparkles,
  ShieldCheck,
  Key,
  Check,
  Save,
  Loader2,
  Cpu
} from 'lucide-react';
import { fetchSettings, updateSettings } from '../../services/api';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsUpdated: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onSettingsUpdated,
}) => {
  const [provider, setProvider] = useState<string>('gemini');
  const [geminiKey, setGeminiKey] = useState<string>('');
  const [openaiKey, setOpenAIKey] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [serverSettings, setServerSettings] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    try {
      const data = await fetchSettings();
      setServerSettings(data);
      setProvider(data.ai_provider || 'gemini');
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await updateSettings({
        ai_provider: provider,
        gemini_api_key: geminiKey || undefined,
        openai_api_key: openaiKey || undefined
      });
      setSavedSuccess(true);
      onSettingsUpdated();
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 1200);
    } catch (err: any) {
      alert(`Save failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <SettingsIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">System & AI Settings</h2>
              <p className="text-xs text-slate-500">Configure LLM providers and operational limits</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          {/* Provider Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Active AI Intelligence Engine</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'gemini', label: 'Google Gemini', desc: 'Gemini 2.5 Flash' },
                { id: 'openai', label: 'OpenAI GPT-4o', desc: 'GPT-4o Mini' },
                { id: 'fallback', label: 'Rule Engine', desc: '100% Deterministic' },
              ].map((p) => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => setProvider(p.id)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    provider === p.id
                      ? 'border-blue-600 bg-blue-50/50 text-blue-900 shadow-2xs font-semibold'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-xs font-bold">{p.label}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{p.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Gemini API Key */}
          {provider === 'gemini' && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700">Gemini API Key</label>
                {serverSettings?.gemini_configured && (
                  <span className="text-[10px] text-emerald-600 font-semibold flex items-center space-x-1">
                    <Check className="w-3 h-3" />
                    <span>Configured on server</span>
                  </span>
                )}
              </div>
              <div className="relative">
                <Key className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  placeholder={serverSettings?.gemini_configured ? "••••••••••••••••••••••••" : "Paste AIzaSy... key"}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white font-mono"
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Stored in server memory only. If left empty, the deterministic fallback engine handles all analyses.
              </p>
            </div>
          )}

          {/* OpenAI API Key */}
          {provider === 'openai' && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700">OpenAI API Key</label>
                {serverSettings?.openai_configured && (
                  <span className="text-[10px] text-emerald-600 font-semibold flex items-center space-x-1">
                    <Check className="w-3 h-3" />
                    <span>Configured on server</span>
                  </span>
                )}
              </div>
              <div className="relative">
                <Key className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  value={openaiKey}
                  onChange={(e) => setOpenAIKey(e.target.value)}
                  placeholder={serverSettings?.openai_configured ? "••••••••••••••••••••••••" : "Paste sk-... key"}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white font-mono"
                />
              </div>
            </div>
          )}

          {/* Privacy statement */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-500 flex items-start space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <p leading-relaxed>
              <span className="font-semibold text-slate-700">Zero Data Leakage:</span> Raw datasets are never forwarded to AI APIs. Only calculated statistical summaries and schema metadata are sent for natural language synthesis.
            </p>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 shadow-sm shadow-blue-600/20"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : savedSuccess ? (
                <Check className="w-4 h-4" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{savedSuccess ? 'Saved!' : 'Save Settings'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
