import React, { useState, useEffect } from 'react';
import {
  Save,
  RotateCcw,
  Plus,
  Trash2,
  Search,
  Sparkles,
  History,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Check,
  X,
  AlertCircle,
  HelpCircle,
  Wand2,
  ArrowUpDown
} from 'lucide-react';
import {
  fetchEditorRows,
  saveEditorChanges,
  addEditorRow,
  deleteEditorRows,
  addEditorColumn,
  renameEditorColumn,
  deleteEditorColumn,
  findAndReplaceEditor,
  quickCleanEditor,
  fetchEditorVersions,
  restoreEditorVersion,
  restoreOriginalUpload
} from '../../services/api';
import { Dataset, EditorColumnMeta } from '../../types';

interface SpreadsheetEditorProps {
  dataset: Dataset;
  onDatasetUpdated: (updatedDataset: Dataset) => void;
  showToast: (msg: string) => void;
}

export const SpreadsheetEditor: React.FC<SpreadsheetEditorProps> = ({
  dataset,
  onDatasetUpdated,
  showToast
}) => {
  const [columns, setColumns] = useState<EditorColumnMeta[]>([]);
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [totalRows, setTotalRows] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  // Unsaved cell edits: key = `${rowIndex}_${colName}` -> { row, column, value, originalValue }
  const [edits, setEdits] = useState<Record<string, { row: number; column: string; value: any; originalValue: any }>>({});
  
  // Selected row indices for deletion
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

  // Active cell currently being edited: { rowIdx: number, colName: string }
  const [editingCell, setEditingCell] = useState<{ rowIdx: number; colName: string } | null>(null);
  const [cellInputValue, setCellInputValue] = useState<string>('');

  // Modals & Drawers
  const [showAddColModal, setShowAddColModal] = useState<boolean>(false);
  const [newColName, setNewColName] = useState<string>('');
  const [newColType, setNewColType] = useState<string>('text');

  const [showRenameColModal, setShowRenameColModal] = useState<boolean>(false);
  const [colToRename, setColToRename] = useState<string>('');
  const [renamedColName, setRenamedColName] = useState<string>('');

  const [showFindReplaceModal, setShowFindReplaceModal] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [replaceTerm, setReplaceTerm] = useState<string>('');
  const [findCol, setFindCol] = useState<string>('all');
  const [matchCase, setMatchCase] = useState<boolean>(false);

  const [showVersionsDrawer, setShowVersionsDrawer] = useState<boolean>(false);
  const [versions, setVersions] = useState<any[]>([]);
  const [loadingVersions, setLoadingVersions] = useState<boolean>(false);

  // Load rows when page or dataset changes
  useEffect(() => {
    loadPageData(page, pageSize);
  }, [dataset.id, page, pageSize]);

  const loadPageData = async (targetPage: number, targetPageSize: number) => {
    setLoading(true);
    try {
      const data = await fetchEditorRows(dataset.id, targetPage, targetPageSize);
      setColumns(data.columns);
      setRows(data.rows);
      setTotalRows(data.total_rows);
      setSelectedRows(new Set());
    } catch (err: any) {
      showToast(`Error loading spreadsheet data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Start editing a cell
  const startEditing = (rowIdx: number, colName: string, currentValue: any) => {
    const editKey = `${rowIdx}_${colName}`;
    const val = edits[editKey] ? edits[editKey].value : (currentValue !== null && currentValue !== undefined ? String(currentValue) : '');
    setEditingCell({ rowIdx, colName });
    setCellInputValue(val);
  };

  // Commit editing a cell
  const commitEditing = () => {
    if (!editingCell) return;
    const { rowIdx, colName } = editingCell;
    const originalRow = rows.find(r => r._row_index === rowIdx);
    const origVal = originalRow ? originalRow[colName] : '';

    if (String(origVal) !== String(cellInputValue)) {
      setEdits(prev => ({
        ...prev,
        [`${rowIdx}_${colName}`]: {
          row: rowIdx,
          column: colName,
          value: cellInputValue,
          originalValue: origVal
        }
      }));
    } else {
      // If changed back to original, remove from edits
      setEdits(prev => {
        const copy = { ...prev };
        delete copy[`${rowIdx}_${colName}`];
        return copy;
      });
    }
    setEditingCell(null);
  };

  // Save all pending edits and re-calculate
  const handleSaveAndRecalculate = async () => {
    const changeList = Object.values(edits).map(e => ({
      row: e.row,
      column: e.column,
      value: e.value
    }));

    setSaving(true);
    try {
      const res = await saveEditorChanges(
        dataset.id,
        changeList,
        true,
        `Spreadsheet edit (${changeList.length} cells modified)`
      );
      setEdits({});
      onDatasetUpdated(res.dataset);
      showToast(`Saved and recalculated! Generated Version #${res.version}.`);
      loadPageData(page, pageSize);
    } catch (err: any) {
      showToast(`Failed to save edits: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Add new row
  const handleAddRow = async () => {
    try {
      const res = await addEditorRow(dataset.id);
      onDatasetUpdated(res.dataset);
      showToast(`Row added (Total: ${res.row_count}).`);
      loadPageData(page, pageSize);
    } catch (err: any) {
      showToast(`Failed to add row: ${err.message}`);
    }
  };

  // Delete selected rows
  const handleDeleteSelectedRows = async () => {
    if (selectedRows.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedRows.size} selected row(s)?`)) return;
    try {
      const indices = Array.from(selectedRows);
      const res = await deleteEditorRows(dataset.id, indices);
      setSelectedRows(new Set());
      setEdits({});
      onDatasetUpdated(res.dataset);
      showToast(`Deleted ${indices.length} rows.`);
      loadPageData(page, pageSize);
    } catch (err: any) {
      showToast(`Failed to delete rows: ${err.message}`);
    }
  };

  // Add column
  const handleAddColumn = async () => {
    if (!newColName.trim()) return;
    try {
      const res = await addEditorColumn(dataset.id, newColName.trim(), newColType, '');
      setShowAddColModal(false);
      setNewColName('');
      onDatasetUpdated(res.dataset);
      showToast(`Column '${newColName}' added.`);
      loadPageData(page, pageSize);
    } catch (err: any) {
      showToast(`Failed to add column: ${err.message}`);
    }
  };

  // Rename column
  const handleRenameColumn = async () => {
    if (!renamedColName.trim() || !colToRename) return;
    try {
      const res = await renameEditorColumn(dataset.id, colToRename, renamedColName.trim());
      setShowRenameColModal(false);
      setRenamedColName('');
      onDatasetUpdated(res.dataset);
      showToast(`Renamed column to '${renamedColName}'.`);
      loadPageData(page, pageSize);
    } catch (err: any) {
      showToast(`Failed to rename column: ${err.message}`);
    }
  };

  // Delete column
  const handleDeleteColumn = async (colName: string) => {
    if (!confirm(`Are you sure you want to delete column '${colName}'?`)) return;
    try {
      const res = await deleteEditorColumn(dataset.id, colName);
      onDatasetUpdated(res.dataset);
      showToast(`Column '${colName}' deleted.`);
      loadPageData(page, pageSize);
    } catch (err: any) {
      showToast(`Failed to delete column: ${err.message}`);
    }
  };

  // Find & Replace
  const handleFindReplace = async () => {
    if (!searchTerm) return;
    try {
      const targetCol = findCol === 'all' ? undefined : findCol;
      const res = await findAndReplaceEditor(dataset.id, searchTerm, replaceTerm, targetCol, matchCase);
      setShowFindReplaceModal(false);
      onDatasetUpdated(res.dataset);
      showToast(`Replaced ${res.matches_replaced} occurrence(s).`);
      loadPageData(page, pageSize);
    } catch (err: any) {
      showToast(`Find & Replace failed: ${err.message}`);
    }
  };

  // Quick Clean action
  const handleQuickClean = async (action: string) => {
    try {
      const res = await quickCleanEditor(dataset.id, action);
      onDatasetUpdated(res.dataset);
      showToast(`Applied: ${res.message}`);
      loadPageData(page, pageSize);
    } catch (err: any) {
      showToast(`Quick clean failed: ${err.message}`);
    }
  };

  // Load Version History
  const openVersionHistory = async () => {
    setShowVersionsDrawer(true);
    setLoadingVersions(true);
    try {
      const v = await fetchEditorVersions(dataset.id);
      setVersions(v);
    } catch (err: any) {
      showToast(`Failed to load versions: ${err.message}`);
    } finally {
      setLoadingVersions(false);
    }
  };

  // Restore specific past version
  const handleRestoreVersion = async (verNum: number) => {
    if (!confirm(`Restore spreadsheet to Version #${verNum}? Any unsaved edits will be discarded.`)) return;
    try {
      const res = await restoreEditorVersion(dataset.id, verNum);
      setShowVersionsDrawer(false);
      setEdits({});
      onDatasetUpdated(res.dataset);
      showToast(`Restored to Version #${verNum}!`);
      loadPageData(page, pageSize);
    } catch (err: any) {
      showToast(`Rollback failed: ${err.message}`);
    }
  };

  // Restore untouched original upload
  const handleRestoreOriginal = async () => {
    if (!confirm("Are you sure you want to reset this dataset to its initial uploaded state?")) return;
    try {
      const res = await restoreOriginalUpload(dataset.id);
      setEdits({});
      onDatasetUpdated(res.dataset);
      showToast("Reset to pristine initial upload!");
      loadPageData(page, pageSize);
    } catch (err: any) {
      showToast(`Reset failed: ${err.message}`);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const pendingEditCount = Object.keys(edits).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Action Header */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded-full text-[10px] font-bold tracking-wider uppercase">
              Interactive Spreadsheet Editor
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-600 font-medium">
              Version #{dataset.version_count || 1}
            </span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 mt-1 tracking-tight">
            {dataset.name} Data Editor
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Click any cell to edit. Enter formulas like <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-blue-700">=SUM(col)</code> or <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-blue-700">=AVERAGE(col)</code>.
          </p>
        </div>

        {/* Toolbar Action Buttons */}
        <div className="flex items-center flex-wrap gap-2">
          {pendingEditCount > 0 && (
            <span className="px-2.5 py-1 bg-amber-50 border border-amber-300 text-amber-800 rounded-xl text-xs font-bold animate-pulse">
              {pendingEditCount} Unsaved Edit{pendingEditCount > 1 ? 's' : ''}
            </span>
          )}

          <button
            disabled={saving || pendingEditCount === 0}
            onClick={handleSaveAndRecalculate}
            className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center space-x-1.5 shadow-sm transition-all ${
              pendingEditCount > 0
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save & Recalculate'}</span>
          </button>

          <button
            onClick={openVersionHistory}
            className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl flex items-center space-x-1.5 transition-colors"
            title="View timestamped version history and rollback"
          >
            <History className="w-4 h-4 text-slate-600" />
            <span>Versions ({dataset.version_count || 1})</span>
          </button>

          <button
            onClick={handleRestoreOriginal}
            className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl flex items-center space-x-1.5 transition-colors"
            title="Revert all changes and restore original upload"
          >
            <RotateCcw className="w-4 h-4 text-slate-600" />
            <span>Reset to Original</span>
          </button>
        </div>
      </div>

      {/* Grid Controls Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={handleAddRow}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-lg flex items-center space-x-1 border border-slate-200"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Row</span>
          </button>

          <button
            disabled={selectedRows.size === 0}
            onClick={handleDeleteSelectedRows}
            className={`px-3 py-1.5 font-semibold rounded-lg flex items-center space-x-1 border transition-colors ${
              selectedRows.size > 0
                ? 'bg-red-50 text-red-700 hover:bg-red-100 border-red-200'
                : 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Selected ({selectedRows.size})</span>
          </button>

          <div className="h-4 w-px bg-slate-200 mx-1" />

          <button
            onClick={() => setShowAddColModal(true)}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-lg flex items-center space-x-1 border border-slate-200"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Column</span>
          </button>

          <button
            onClick={() => setShowFindReplaceModal(true)}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-lg flex items-center space-x-1 border border-slate-200"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Find & Replace</span>
          </button>

          <div className="h-4 w-px bg-slate-200 mx-1" />

          {/* Quick Clean Actions */}
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-500 font-medium">Quick Clean:</span>
            <button
              onClick={() => handleQuickClean('trim_whitespace')}
              className="px-2 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded border border-slate-200"
              title="Strip leading and trailing whitespace"
            >
              Trim Spaces
            </button>
            <button
              onClick={() => handleQuickClean('uppercase')}
              className="px-2 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded border border-slate-200"
              title="Convert text to uppercase"
            >
              UPPERCASE
            </button>
            <button
              onClick={() => handleQuickClean('lowercase')}
              className="px-2 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded border border-slate-200"
              title="Convert text to lowercase"
            >
              lowercase
            </button>
            <button
              onClick={() => handleQuickClean('titlecase')}
              className="px-2 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded border border-slate-200"
              title="Convert text to Title Case"
            >
              Title Case
            </button>
          </div>
        </div>

        {/* Row count info */}
        <div className="text-slate-500 font-mono">
          Showing {rows.length} of {totalRows.toLocaleString()} rows • {columns.length} columns
        </div>
      </div>

      {/* Spreadsheet Grid Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
        <div className="overflow-x-auto max-h-[600px] relative">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100/90 backdrop-blur-xs text-slate-700 font-bold sticky top-0 z-10 border-b border-slate-200">
              <tr>
                {/* Checkbox Col */}
                <th className="py-2.5 px-3 w-10 text-center border-r border-slate-200 bg-slate-100">
                  <input
                    type="checkbox"
                    checked={rows.length > 0 && selectedRows.size === rows.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedRows(new Set(rows.map(r => r._row_index)));
                      } else {
                        setSelectedRows(new Set());
                      }
                    }}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                {/* Row Number */}
                <th className="py-2.5 px-3 w-12 text-center text-slate-400 font-mono border-r border-slate-200 bg-slate-100">
                  #
                </th>
                {/* Column Headers */}
                {columns.map((col) => (
                  <th
                    key={col.name}
                    className="py-2.5 px-3 border-r border-slate-200 bg-slate-100/90 whitespace-nowrap min-w-[140px] group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5 overflow-hidden">
                        <span className="font-semibold text-slate-900 truncate">{col.name}</span>
                        <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-slate-200/70 text-slate-600 uppercase">
                          {col.type}
                        </span>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1 ml-2">
                        <button
                          onClick={() => {
                            setColToRename(col.name);
                            setRenamedColName(col.name);
                            setShowRenameColModal(true);
                          }}
                          className="p-1 text-slate-400 hover:text-blue-600 rounded hover:bg-slate-200"
                          title="Rename column"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteColumn(col.name)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-slate-200"
                          title="Delete column"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white font-mono">
              {loading ? (
                <tr>
                  <td colSpan={columns.length + 2} className="py-12 text-center text-slate-400">
                    Loading spreadsheet rows...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 2} className="py-12 text-center text-slate-400">
                    No rows available. Click "Add Row" to start editing.
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const rowIdx = row._row_index;
                  const isRowSelected = selectedRows.has(rowIdx);

                  return (
                    <tr
                      key={rowIdx}
                      className={`hover:bg-blue-50/30 transition-colors ${
                        isRowSelected ? 'bg-blue-50/60' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-2 px-3 text-center border-r border-slate-100 bg-slate-50/40">
                        <input
                          type="checkbox"
                          checked={isRowSelected}
                          onChange={(e) => {
                            const newSet = new Set(selectedRows);
                            if (e.target.checked) newSet.add(rowIdx);
                            else newSet.delete(rowIdx);
                            setSelectedRows(newSet);
                          }}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>

                      {/* Row Index */}
                      <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px] border-r border-slate-100 bg-slate-50/40 select-none">
                        {rowIdx + 1}
                      </td>

                      {/* Data Cells */}
                      {columns.map((col) => {
                        const editKey = `${rowIdx}_${col.name}`;
                        const isEdited = editKey in edits;
                        const cellVal = isEdited ? edits[editKey].value : row[col.name];
                        const isCurrentlyEditing = editingCell?.rowIdx === rowIdx && editingCell?.colName === col.name;

                        return (
                          <td
                            key={col.name}
                            onClick={() => {
                              if (!isCurrentlyEditing) {
                                startEditing(rowIdx, col.name, cellVal);
                              }
                            }}
                            className={`py-1.5 px-2.5 border-r border-slate-100 whitespace-nowrap cursor-pointer transition-colors relative text-[11px] ${
                              isEdited
                                ? 'bg-amber-50 text-amber-950 font-bold'
                                : 'text-slate-800'
                            }`}
                            title={isEdited ? `Original: ${edits[editKey].originalValue}` : undefined}
                          >
                            {isCurrentlyEditing ? (
                              <div className="flex items-center space-x-1">
                                <input
                                  type="text"
                                  autoFocus
                                  value={cellInputValue}
                                  onChange={(e) => setCellInputValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') commitEditing();
                                    if (e.key === 'Escape') setEditingCell(null);
                                  }}
                                  onBlur={commitEditing}
                                  className="w-full text-xs p-1 bg-white border border-blue-500 rounded outline-none shadow-xs font-mono"
                                />
                              </div>
                            ) : (
                              <div className="flex items-center justify-between">
                                <span className="truncate">
                                  {cellVal !== null && cellVal !== undefined ? String(cellVal) : ''}
                                </span>
                                {isEdited && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 ml-1.5" />
                                )}
                              </div>
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

        {/* Pagination Bar */}
        <div className="px-6 py-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/60 text-xs">
          <div className="flex items-center space-x-2 text-slate-500">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="bg-white border border-slate-200 rounded-lg px-2 py-1 outline-none text-slate-700"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-slate-600 font-semibold px-2">
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Add Column Modal */}
      {showAddColModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Add New Column</h3>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Column Name</label>
              <input
                type="text"
                autoFocus
                value={newColName}
                onChange={(e) => setNewColName(e.target.value)}
                placeholder="e.g., Discount_Pct"
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Data Type</label>
              <select
                value={newColType}
                onChange={(e) => setNewColType(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="text">Text (String)</option>
                <option value="numeric">Numeric (Integer/Float)</option>
                <option value="datetime">Datetime (Date/Time)</option>
              </select>
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setShowAddColModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleAddColumn}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs"
              >
                Create Column
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Column Modal */}
      {showRenameColModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Rename Column '{colToRename}'</h3>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">New Column Name</label>
              <input
                type="text"
                autoFocus
                value={renamedColName}
                onChange={(e) => setRenamedColName(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setShowRenameColModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleRenameColumn}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs"
              >
                Save Name
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Find and Replace Modal */}
      {showFindReplaceModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <Search className="w-4 h-4 text-blue-600" />
              <span>Find & Replace in Dataset</span>
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Find Text</label>
                <input
                  type="text"
                  autoFocus
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search value..."
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Replace With</label>
                <input
                  type="text"
                  value={replaceTerm}
                  onChange={(e) => setReplaceTerm(e.target.value)}
                  placeholder="Replacement value..."
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Target Column</label>
                <select
                  value={findCol}
                  onChange={(e) => setFindCol(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Columns</option>
                  {columns.map(c => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
              <label className="flex items-center space-x-2 text-xs text-slate-700 select-none cursor-pointer">
                <input
                  type="checkbox"
                  checked={matchCase}
                  onChange={(e) => setMatchCase(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Match Case</span>
              </label>
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setShowFindReplaceModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                disabled={!searchTerm}
                onClick={handleFindReplace}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs disabled:opacity-50"
              >
                Replace All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Version History Drawer / Modal */}
      {showVersionsDrawer && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Version History & Rollback</h3>
                  <p className="text-xs text-slate-500">All modifications are archived with audit timestamps.</p>
                </div>
              </div>
              <button
                onClick={() => setShowVersionsDrawer(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-3 flex-1">
              {loadingVersions ? (
                <div className="py-12 text-center text-xs text-slate-400">Loading version logs...</div>
              ) : versions.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">No versions recorded.</div>
              ) : (
                versions.map((ver) => {
                  const isCurrent = ver.version_number === (dataset.version_count || 1);
                  return (
                    <div
                      key={ver.id}
                      className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${
                        isCurrent
                          ? 'border-blue-500 bg-blue-50/40 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isCurrent ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
                          }`}>
                            Version #{ver.version_number}
                          </span>
                          {isCurrent && (
                            <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">
                              (Current Active)
                            </span>
                          )}
                          <span className="text-xs text-slate-400 font-mono">
                            {new Date(ver.created_at).toLocaleTimeString()} • {new Date(ver.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-slate-800 mt-1">
                          {ver.change_summary}
                        </p>
                        <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                          {ver.row_count} rows • {ver.col_count} columns
                        </p>
                      </div>

                      {!isCurrent && (
                        <button
                          onClick={() => handleRestoreVersion(ver.version_number)}
                          className="px-3 py-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-xl border border-blue-200 transition-colors"
                        >
                          Restore
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end bg-slate-50/60">
              <button
                onClick={() => setShowVersionsDrawer(false)}
                className="px-5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
