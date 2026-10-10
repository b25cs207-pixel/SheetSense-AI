import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  RotateCcw,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Eye,
  Columns,
  X
} from 'lucide-react';
import { SchemaProfile } from '../../types';
import { filterDataset } from '../../services/api';

interface DataExplorerProps {
  datasetId: string;
  schema: SchemaProfile;
}

export const DataExplorer: React.FC<DataExplorerProps> = ({ datasetId, schema }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  
  const [dataResult, setDataResult] = useState<any>({
    total_rows: 0,
    filtered_rows: 0,
    total_pages: 1,
    columns: [],
    rows: []
  });
  const [loading, setLoading] = useState(false);

  // Column filter states
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});
  const [filterDraft, setFilterDraft] = useState<{
    column: string;
    type: 'range' | 'category' | 'contains';
    min?: string;
    max?: string;
    selectedCategory?: string;
    containsText?: string;
  }>({
    column: schema.columns[0]?.name || '',
    type: 'contains',
    containsText: ''
  });

  // Column visibility
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(new Set());
  const [showColPicker, setShowColPicker] = useState(false);

  useEffect(() => {
    fetchFilteredData();
  }, [datasetId, searchTerm, sortCol, sortAsc, page, pageSize, activeFilters]);

  const fetchFilteredData = async () => {
    try {
      setLoading(true);
      const res = await filterDataset(datasetId, {
        search: searchTerm,
        sort_column: sortCol,
        sort_ascending: sortAsc,
        page,
        page_size: pageSize,
        column_filters: activeFilters
      });
      setDataResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (colName: string) => {
    if (sortCol === colName) {
      if (sortAsc) {
        setSortAsc(false);
      } else {
        setSortCol(null);
        setSortAsc(true);
      }
    } else {
      setSortCol(colName);
      setSortAsc(true);
    }
    setPage(1);
  };

  const addFilter = () => {
    if (!filterDraft.column) return;
    
    let filterPayload: any = { type: filterDraft.type };
    if (filterDraft.type === 'range') {
      filterPayload.min = filterDraft.min ? parseFloat(filterDraft.min) : undefined;
      filterPayload.max = filterDraft.max ? parseFloat(filterDraft.max) : undefined;
    } else if (filterDraft.type === 'category') {
      filterPayload.selected = filterDraft.selectedCategory ? [filterDraft.selectedCategory] : [];
    } else {
      filterPayload.value = filterDraft.containsText;
    }

    setActiveFilters(prev => ({ ...prev, [filterDraft.column]: filterPayload }));
    setPage(1);
    setShowFilterDrawer(false);
  };

  const removeFilter = (col: string) => {
    setActiveFilters(prev => {
      const copy = { ...prev };
      delete copy[col];
      return copy;
    });
    setPage(1);
  };

  const clearAllFilters = () => {
    setActiveFilters({});
    setSearchTerm('');
    setSortCol(null);
    setPage(1);
  };

  const toggleColumnVisibility = (col: string) => {
    setHiddenCols(prev => {
      const next = new Set(prev);
      if (next.has(col)) {
        next.delete(col);
      } else {
        next.add(col);
      }
      return next;
    });
  };

  const exportFilteredCSV = () => {
    if (!dataResult.rows || dataResult.rows.length === 0) return;
    const visibleCols = dataResult.columns.filter((c: string) => !hiddenCols.has(c));
    const headerLine = visibleCols.join(',');
    const rowsLines = dataResult.rows.map((row: any) =>
      visibleCols.map((c: string) => {
        const val = String(row[c] ?? '');
        return val.includes(',') ? `"${val}"` : val;
      }).join(',')
    );
    const csvContent = [headerLine, ...rowsLines].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Filtered_Data_Page_${page}.csv`;
    link.click();
  };

  const isFiltered = dataResult.filtered_rows < dataResult.total_rows || Object.keys(activeFilters).length > 0 || searchTerm !== '';
  const visibleColumns = (dataResult.columns || []).filter((c: string) => !hiddenCols.has(c));

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
      {/* Top Controls Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            placeholder="Search across all fields..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 text-xs"
            >
              ×
            </button>
          )}
        </div>

        {/* Buttons */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Add Filter */}
          <button
            onClick={() => setShowFilterDrawer(!showFilterDrawer)}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl flex items-center space-x-1.5 transition-colors"
          >
            <Filter className="w-3.5 h-3.5 text-blue-600" />
            <span>Add Filter</span>
            {Object.keys(activeFilters).length > 0 && (
              <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">
                {Object.keys(activeFilters).length}
              </span>
            )}
          </button>

          {/* Column Visibility */}
          <div className="relative">
            <button
              onClick={() => setShowColPicker(!showColPicker)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl flex items-center space-x-1.5 transition-colors"
            >
              <Columns className="w-3.5 h-3.5 text-slate-600" />
              <span>Columns ({visibleColumns.length})</span>
            </button>

            {showColPicker && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl p-3 z-30 space-y-1.5 max-h-60 overflow-y-auto">
                <div className="text-[11px] font-bold text-slate-500 uppercase pb-1 border-b">Toggle Columns</div>
                {schema.columns.map((col) => (
                  <label key={col.name} className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer hover:bg-slate-50 p-1 rounded">
                    <input
                      type="checkbox"
                      checked={!hiddenCols.has(col.name)}
                      onChange={() => toggleColumnVisibility(col.name)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="truncate">{col.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Clear Filters */}
          {isFiltered && (
            <button
              onClick={clearAllFilters}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-red-600 bg-slate-50 hover:bg-red-50 border border-slate-200 hover:border-red-200 rounded-xl flex items-center space-x-1 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}

          {/* Export Filtered CSV */}
          <button
            onClick={exportFilteredCSV}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl flex items-center space-x-1.5 transition-colors"
            title="Download visible filtered rows as CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Export View</span>
          </button>
        </div>
      </div>

      {/* Filter Builder Drawer */}
      {showFilterDrawer && (
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">Create Column Filter</span>
            <button onClick={() => setShowFilterDrawer(false)} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
            <div>
              <label className="text-[10px] font-semibold text-slate-500 block mb-1">Column</label>
              <select
                value={filterDraft.column}
                onChange={(e) => {
                  const col = e.target.value;
                  const colProf = schema.columns.find(c => c.name === col);
                  const isNum = colProf?.type === 'numeric' || colProf?.type === 'currency';
                  setFilterDraft(prev => ({
                    ...prev,
                    column: col,
                    type: isNum ? 'range' : 'contains'
                  }));
                }}
                className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2"
              >
                {schema.columns.map((c) => (
                  <option key={c.name} value={c.name}>{c.name} ({c.type})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-semibold text-slate-500 block mb-1">Condition Type</label>
              <select
                value={filterDraft.type}
                onChange={(e: any) => setFilterDraft(prev => ({ ...prev, type: e.target.value }))}
                className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2"
              >
                <option value="contains">Text Contains</option>
                <option value="range">Numeric Range (Min / Max)</option>
                <option value="category">Exact Category Match</option>
              </select>
            </div>

            {filterDraft.type === 'range' ? (
              <>
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 block mb-1">Min Value</label>
                  <input
                    type="number"
                    placeholder="Min"
                    value={filterDraft.min || ''}
                    onChange={(e) => setFilterDraft(prev => ({ ...prev, min: e.target.value }))}
                    className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 block mb-1">Max Value</label>
                  <input
                    type="number"
                    placeholder="Max"
                    value={filterDraft.max || ''}
                    onChange={(e) => setFilterDraft(prev => ({ ...prev, max: e.target.value }))}
                    className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2"
                  />
                </div>
              </>
            ) : filterDraft.type === 'category' ? (
              <div className="sm:col-span-2">
                <label className="text-[10px] font-semibold text-slate-500 block mb-1">Category Value</label>
                <input
                  type="text"
                  placeholder="e.g. Electronics or North"
                  value={filterDraft.selectedCategory || ''}
                  onChange={(e) => setFilterDraft(prev => ({ ...prev, selectedCategory: e.target.value }))}
                  className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2"
                />
              </div>
            ) : (
              <div className="sm:col-span-2">
                <label className="text-[10px] font-semibold text-slate-500 block mb-1">Substring</label>
                <input
                  type="text"
                  placeholder="Contains text..."
                  value={filterDraft.containsText || ''}
                  onChange={(e) => setFilterDraft(prev => ({ ...prev, containsText: e.target.value }))}
                  className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={addFilter}
              className="px-3.5 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-2xs"
            >
              Apply Filter
            </button>
          </div>
        </div>
      )}

      {/* Active Filter Badges */}
      {Object.keys(activeFilters).length > 0 && (
        <div className="flex items-center flex-wrap gap-2 pt-1">
          <span className="text-[11px] font-bold text-slate-500">Active Filters:</span>
          {Object.entries(activeFilters).map(([col, flt]) => (
            <span
              key={col}
              className="inline-flex items-center space-x-1.5 text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 rounded-full"
            >
              <span className="font-semibold">{col}:</span>
              <span>
                {flt.type === 'range' ? `[${flt.min ?? '-∞'} to ${flt.max ?? '+∞'}]` : flt.value || flt.selected?.join(', ')}
              </span>
              <button onClick={() => removeFilter(col)} className="text-blue-500 hover:text-blue-800 font-bold ml-1">
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Filter Status Badge */}
      <div className="flex items-center justify-between text-xs text-slate-500 pb-1">
        <div>
          Showing <span className="font-bold text-slate-800">{dataResult.rows.length}</span> of{' '}
          <span className="font-bold text-slate-800">{dataResult.filtered_rows.toLocaleString()}</span> observations
          {isFiltered && (
            <span className="ml-2 px-2 py-0.5 bg-amber-50 text-amber-700 rounded-md border border-amber-200 text-[10px] font-semibold">
              Filtered ({dataResult.total_rows.toLocaleString()} total in dataset)
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <span>Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="text-xs bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      {/* Interactive Data Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-left text-xs divide-y divide-slate-100">
          <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
            <tr>
              <th className="py-2.5 px-3 text-slate-400 w-12 text-center">#</th>
              {visibleColumns.map((col: string) => {
                const isSorted = sortCol === col;
                return (
                  <th
                    key={col}
                    onClick={() => handleSort(col)}
                    className="py-2.5 px-3 cursor-pointer hover:bg-slate-100/80 transition-colors select-none"
                  >
                    <div className="flex items-center space-x-1.5">
                      <span className="font-mono text-slate-800">{col}</span>
                      {isSorted ? (
                        sortAsc ? <ArrowUp className="w-3.5 h-3.5 text-blue-600" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {loading ? (
              <tr>
                <td colSpan={visibleColumns.length + 1} className="py-8 text-center text-slate-400">
                  Loading records...
                </td>
              </tr>
            ) : dataResult.rows.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length + 1} className="py-8 text-center text-slate-400">
                  No records matching your search or filters.
                </td>
              </tr>
            ) : (
              dataResult.rows.map((row: any, rIdx: number) => {
                const globalIndex = (page - 1) * pageSize + rIdx + 1;
                return (
                  <tr key={rIdx} className="hover:bg-blue-50/30 transition-colors">
                    <td className="py-2 px-3 text-slate-400 text-center font-mono text-[11px]">{globalIndex}</td>
                    {visibleColumns.map((col: string) => {
                      const val = row[col];
                      return (
                        <td key={col} className="py-2 px-3 text-slate-700 whitespace-nowrap">
                          {val === null || val === undefined ? (
                            <span className="text-slate-300 italic font-mono">null</span>
                          ) : typeof val === 'number' ? (
                            <span className="font-mono">{val.toLocaleString()}</span>
                          ) : (
                            String(val)
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between pt-2">
        <div className="text-xs text-slate-500">
          Page <span className="font-bold text-slate-800">{page}</span> of{' '}
          <span className="font-bold text-slate-800">{dataResult.total_pages}</span>
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => setPage(prev => Math.max(1, prev - 1))}
            disabled={page <= 1 || loading}
            className="p-1.5 text-slate-600 hover:text-slate-900 disabled:opacity-40 border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-semibold px-2">{page}</span>
          <button
            onClick={() => setPage(prev => Math.min(dataResult.total_pages, prev + 1))}
            disabled={page >= dataResult.total_pages || loading}
            className="p-1.5 text-slate-600 hover:text-slate-900 disabled:opacity-40 border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
