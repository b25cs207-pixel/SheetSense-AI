import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquareCode,
  Send,
  Sparkles,
  Bot,
  User,
  Loader2,
  BarChart3,
  Lightbulb,
  ArrowRight
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { ChatMessage, ChartSpec } from '../../types';
import { sendChatMessage, fetchChatHistory } from '../../services/api';

interface AskDataChatProps {
  datasetId: string;
  datasetName: string;
}

const COLORS = ['#2563EB', '#3B82F6', '#60A5FA', '#93C5FD', '#10B981', '#F59E0B', '#8B5CF6'];

export const AskDataChat: React.FC<AskDataChatProps> = ({ datasetId, datasetName }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([
    'Summarize this dataset',
    'What are the three most important findings?',
    'Which category has the highest total?',
    'Generate a pie chart of category breakdown',
    'Show the monthly trend over time',
    'Are there any missing values or outliers?'
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadHistory();
  }, [datasetId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const loadHistory = async () => {
    try {
      const history = await fetchChatHistory(datasetId);
      if (history.length > 0) {
        setMessages(history);
      } else {
        // Initial welcome message
        setMessages([
          {
            id: 'welcome',
            role: 'assistant',
            message: `Hello! I am your AI analyst for **${datasetName}**. You can ask me questions about metrics, rankings, trends, outliers, or ask me to generate charts in real time.`,
          }
        ]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || inputValue.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      message: text,
      created_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setLoading(true);

    try {
      const reply = await sendChatMessage(datasetId, text);
      const assistantMsg: ChatMessage = {
        id: `ast_${Date.now()}`,
        role: 'assistant',
        message: reply.text,
        chart_data: reply.chart_data,
        follow_ups: reply.follow_ups,
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, assistantMsg]);
      if (reply.follow_ups && reply.follow_ups.length > 0) {
        setSuggestedQuestions(reply.follow_ups);
      }
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: 'assistant',
          message: `Apologies, I encountered an error: ${err.message}`,
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const renderInlineChart = (chart: any) => {
    if (!chart || !chart.data) return null;

    if (chart.type === 'donut' || chart.type === 'pie') {
      return (
        <div className="my-3 p-3 bg-white rounded-xl border border-slate-200">
          <div className="text-xs font-bold text-slate-800 mb-2">{chart.title}</div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={chart.data}
                dataKey={chart.y_key || 'value'}
                nameKey={chart.x_key}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={75}
                label={({ name, percent }) => `${name.slice(0, 10)} ${(percent * 100).toFixed(0)}%`}
              >
                {chart.data.map((_: any, idx: number) => (
                  <Cell key={`c-${idx}`} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      );
    }

    if (chart.type === 'area' || chart.type === 'line') {
      return (
        <div className="my-3 p-3 bg-white rounded-xl border border-slate-200">
          <div className="text-xs font-bold text-slate-800 mb-2">{chart.title}</div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chart.data} margin={{ top: 5, right: 10, left: -10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey={chart.x_key} tick={{ fontSize: 10 }} angle={-20} textAnchor="end" />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Area type="monotone" dataKey={chart.y_key || 'value'} stroke="#2563EB" fill="#DBEAFE" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      );
    }

    return (
      <div className="my-3 p-3 bg-white rounded-xl border border-slate-200">
        <div className="text-xs font-bold text-slate-800 mb-2">{chart.title}</div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chart.data} margin={{ top: 5, right: 10, left: -10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
            <XAxis dataKey={chart.x_key} tick={{ fontSize: 10 }} angle={-20} textAnchor="end" />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Bar dataKey={chart.y_key || 'value'} fill="#2563EB" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[700px] overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">Ask Your Data</h2>
            <p className="text-[11px] text-slate-500">Conversational AI query engine with interactive chart synthesis</p>
          </div>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex items-start space-x-3 ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  isUser ? 'bg-slate-800 text-white' : 'bg-blue-100 text-blue-700'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={`max-w-2xl rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                  isUser
                    ? 'bg-blue-600 text-white rounded-tr-none'
                    : 'bg-slate-100/80 text-slate-800 rounded-tl-none border border-slate-200/60'
                }`}
              >
                {/* Message body formatted */}
                <div className="whitespace-pre-wrap">{msg.message}</div>

                {/* Inline rendered chart if available */}
                {msg.chart_data && renderInlineChart(msg.chart_data)}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-center space-x-3 text-xs text-slate-500">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <Bot className="w-4 h-4" />
            </div>
            <div className="flex items-center space-x-1.5 p-3 bg-slate-100 rounded-xl rounded-tl-none border border-slate-200/60">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              <span>Analyzing observations and formulating response...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Question Pills */}
      <div className="px-6 py-2.5 bg-slate-50/60 border-t border-slate-100 flex items-center space-x-2 overflow-x-auto no-scrollbar">
        <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0" />
        <span className="text-[11px] font-semibold text-slate-500 shrink-0">Try asking:</span>
        {suggestedQuestions.map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(q)}
            className="text-[11px] font-medium bg-white hover:bg-blue-50 hover:text-blue-700 text-slate-700 px-2.5 py-1 rounded-full border border-slate-200 transition-colors shrink-0 shadow-2xs"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input Form */}
      <div className="p-4 border-t border-slate-200 bg-white">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center space-x-2"
        >
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask a question about totals, categories, trends, or request a chart..."
            className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || loading}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 shadow-sm shadow-blue-600/20 transition-all shrink-0"
          >
            <span>Ask</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
