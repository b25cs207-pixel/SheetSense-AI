import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ScatterChart,
  Scatter,
  ZAxis
} from 'recharts';
import {
  BarChart3,
  PieChart as PieIcon,
  TrendingUp,
  Download,
  Info,
  SlidersHorizontal,
  ChevronDown,
  Maximize2
} from 'lucide-react';
import { ChartSpec } from '../../types';

interface ChartGalleryProps {
  charts: ChartSpec[];
}

const COLORS = [
  '#2563EB', '#3B82F6', '#60A5FA', '#93C5FD',
  '#0D9488', '#14B8A6', '#2DD4BF', '#F59E0B',
  '#EC4899', '#8B5CF6', '#6366F1', '#10B981'
];

export const ChartGallery: React.FC<ChartGalleryProps> = ({ charts }) => {
  const [selectedTypes, setSelectedTypes] = useState<Record<string, string>>({});
  const [sortOrders, setSortOrders] = useState<Record<string, 'default' | 'asc' | 'desc'>>({});

  if (!charts || charts.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
        <p className="text-slate-500 text-sm">No visualizations available for the current selection.</p>
      </div>
    );
  }

  const handleTypeChange = (chartId: string, newType: string) => {
    setSelectedTypes(prev => ({ ...prev, [chartId]: newType }));
  };

  const handleSortToggle = (chartId: string) => {
    setSortOrders(prev => {
      const cur = prev[chartId] || 'default';
      const next = cur === 'default' ? 'desc' : cur === 'desc' ? 'asc' : 'default';
      return { ...prev, [chartId]: next };
    });
  };

  const renderChartBody = (chart: ChartSpec) => {
    const activeType = selectedTypes[chart.id] || chart.type;
    const sortOrder = sortOrders[chart.id] || 'default';

    let displayData = [...chart.data];
    if (sortOrder !== 'default' && (chart.y_key || activeType === 'histogram')) {
      const key = chart.y_key || 'value';
      displayData.sort((a, b) => {
        const valA = Number(a[key] ?? 0);
        const valB = Number(b[key] ?? 0);
        return sortOrder === 'desc' ? valB - valA : valA - valB;
      });
    }

    // 1. Bar Chart
    if (activeType === 'bar' || activeType === 'histogram') {
      return (
        <ResponsiveContainer width="100%" height={290}>
          <BarChart data={displayData} margin={{ top: 10, right: 10, left: -10, bottom: 25 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis
              dataKey={chart.x_key}
              tick={{ fontSize: 11, fill: '#64748B' }}
              interval={0}
              angle={-25}
              textAnchor="end"
              height={45}
            />
            <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1E293B', borderRadius: '8px', color: '#fff', border: 'none', fontSize: '12px' }}
              itemStyle={{ color: '#93C5FD' }}
            />
            <Bar dataKey={chart.y_key || 'value'} fill="#2563EB" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      );
    }

    // 2. Horizontal Bar
    if (activeType === 'horizontal_bar') {
      return (
        <ResponsiveContainer width="100%" height={290}>
          <BarChart data={displayData} layout="vertical" margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11, fill: '#64748B' }} />
            <YAxis dataKey={chart.x_key} type="category" tick={{ fontSize: 11, fill: '#64748B' }} width={80} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1E293B', borderRadius: '8px', color: '#fff', border: 'none', fontSize: '12px' }}
            />
            <Bar dataKey={chart.y_key || 'value'} fill="#3B82F6" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      );
    }

    // 3. Donut / Pie
    if (activeType === 'pie' || activeType === 'donut') {
      const isDonut = activeType === 'donut';
      return (
        <ResponsiveContainer width="100%" height={290}>
          <PieChart>
            <Pie
              data={displayData}
              dataKey={chart.y_key || 'value'}
              nameKey={chart.x_key}
              cx="50%"
              cy="50%"
              innerRadius={isDonut ? 55 : 0}
              outerRadius={90}
              paddingAngle={isDonut ? 2 : 0}
              label={({ name, percent }) => `${name.slice(0, 10)} ${(percent * 100).toFixed(0)}%`}
              labelLine={false}
            >
              {displayData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ backgroundColor: '#1E293B', borderRadius: '8px', color: '#fff', border: 'none', fontSize: '12px' }}
            />
          </PieChart>
        </ResponsiveContainer>
      );
    }

    // 4. Line / Area
    if (activeType === 'line' || activeType === 'area') {
      return (
        <ResponsiveContainer width="100%" height={290}>
          <AreaChart data={displayData} margin={{ top: 10, right: 10, left: -10, bottom: 25 }}>
            <defs>
              <linearGradient id={`grad_${chart.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563EB" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis
              dataKey={chart.x_key}
              tick={{ fontSize: 11, fill: '#64748B' }}
              interval="preserveStartEnd"
              angle={-20}
              textAnchor="end"
            />
            <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1E293B', borderRadius: '8px', color: '#fff', border: 'none', fontSize: '12px' }}
            />
            {activeType === 'area' ? (
              <Area type="monotone" dataKey={chart.y_key || 'value'} stroke="#2563EB" strokeWidth={2.5} fillOpacity={1} fill={`url(#grad_${chart.id})`} />
            ) : (
              <Line type="monotone" dataKey={chart.y_key || 'value'} stroke="#2563EB" strokeWidth={2.5} dot={{ r: 3 }} />
            )}
          </AreaChart>
        </ResponsiveContainer>
      );
    }

    // 5. Scatter Plot
    if (activeType === 'scatter') {
      return (
        <ResponsiveContainer width="100%" height={290}>
          <ScatterChart margin={{ top: 10, right: 10, left: -10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
            <XAxis dataKey="x" name={chart.x_label || 'X'} tick={{ fontSize: 11, fill: '#64748B' }} />
            <YAxis dataKey="y" name={chart.y_label || 'Y'} tick={{ fontSize: 11, fill: '#64748B' }} />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              contentStyle={{ backgroundColor: '#1E293B', borderRadius: '8px', color: '#fff', border: 'none', fontSize: '12px' }}
            />
            <Scatter name="Observations" data={displayData} fill="#2563EB" opacity={0.7} />
          </ScatterChart>
        </ResponsiveContainer>
      );
    }

    // 6. Grouped Bar
    if (activeType === 'grouped_bar' && chart.series_keys) {
      return (
        <ResponsiveContainer width="100%" height={290}>
          <BarChart data={displayData} margin={{ top: 10, right: 10, left: -10, bottom: 25 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis dataKey={chart.x_key} tick={{ fontSize: 11, fill: '#64748B' }} angle={-20} textAnchor="end" />
            <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1E293B', borderRadius: '8px', color: '#fff', border: 'none', fontSize: '12px' }}
            />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
            {chart.series_keys.map((key, i) => (
              <Bar key={key} dataKey={key} fill={COLORS[i % COLORS.length]} radius={[3, 3, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      );
    }

    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {charts.map((chart) => {
        const activeType = selectedTypes[chart.id] || chart.type;
        const sortOrder = sortOrders[chart.id] || 'default';

        return (
          <div
            key={chart.id}
            id={chart.id}
            className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                  {chart.title}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 line-clamp-1" title={chart.description}>
                  {chart.description}
                </p>
              </div>

              {/* Controls */}
              <div className="flex items-center space-x-1.5 ml-2">
                {/* Switcher */}
                <select
                  value={activeType}
                  onChange={(e) => handleTypeChange(chart.id, e.target.value)}
                  className="text-[11px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 rounded-lg px-2 py-1 outline-none cursor-pointer"
                >
                  <option value="bar">Bar</option>
                  <option value="horizontal_bar">Horizontal</option>
                  <option value="donut">Donut</option>
                  <option value="pie">Pie</option>
                  <option value="area">Area</option>
                  <option value="line">Line</option>
                  {chart.type === 'scatter' && <option value="scatter">Scatter</option>}
                  {chart.type === 'histogram' && <option value="histogram">Histogram</option>}
                  {chart.type === 'grouped_bar' && <option value="grouped_bar">Grouped Bar</option>}
                </select>

                {/* Sort Toggle */}
                <button
                  onClick={() => handleSortToggle(chart.id)}
                  className={`p-1.5 rounded-lg border text-xs transition-colors ${
                    sortOrder !== 'default'
                      ? 'bg-blue-50 text-blue-600 border-blue-200'
                      : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                  }`}
                  title={`Sort order: ${sortOrder}`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Chart Area */}
            <div className="w-full my-2">
              {renderChartBody(chart)}
            </div>

            {/* Plain English Insights Footer */}
            {chart.insights && (
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-start space-x-2">
                <Info className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  <span className="font-semibold text-slate-800">Key takeaway:</span> {chart.insights}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
