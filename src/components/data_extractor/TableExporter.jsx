import { useState } from 'react';

/**
 * TableExporter Component
 * Reusable component for configuring and exporting table data
 * 
 * @param {string} tableName - Display name of the table being exported
 * @param {Array} columns - Array of column definitions: { key, label, default }
 * @param {string} startTime - Start time filter value (from parent)
 * @param {string} endTime - End time filter value (from parent)
 * @param {Array} emails - Parsed email list (from parent)
 * @param {Function} getAuthHeaders - Function to get auth headers
 * @param {string} modalBaseUrl - Base URL for the Modal export endpoint
 */
function TableExporter({
  tableName,
  columns,
  startTime,
  endTime,
  emails,
  getAuthHeaders,
  modalBaseUrl,
}) {
  // Internal state for this table's column selection
  const [selectedColumns, setSelectedColumns] = useState(
    columns.filter(c => c.default).map(c => c.key)
  );
  
  // Export states
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);
  const [exportResult, setExportResult] = useState(null);

  const toggleColumn = (columnKey) => {
    setSelectedColumns(prev =>
      prev.includes(columnKey)
        ? prev.filter(key => key !== columnKey)
        : [...prev, columnKey]
    );
  };

  const selectAllColumns = () => setSelectedColumns(columns.map(c => c.key));
  const selectDefaultColumns = () => setSelectedColumns(columns.filter(c => c.default).map(c => c.key));

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    setExportResult(null);

    try {
      const auth = await getAuthHeaders();

      const response = await fetch(modalBaseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...auth,
          table: tableName.toLowerCase().replace(/ /g, '_'),
          columns: selectedColumns,
          start_time: startTime ? new Date(startTime).toISOString() : null,
          end_time: endTime ? new Date(endTime).toISOString() : null,
          emails: emails.length > 0 ? emails : null,
        }),
      });
      const data = await response.json();


      console.log(data);
      
      if (data.success) {
        // Trigger CSV download
        const blob = new Blob([data.data], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${tableName.toLowerCase()}_export_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        setExportResult({
          success: true,
          rowCount: data.row_count,
        });
      } else {
        setError(data.error || 'Export failed');
      }
    } catch (err) {
      setError(`Export failed: ${err.message}`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="mb-10">
      {/* Table Name Header */}
      <h2 className="text-xl font-semibold text-slate-200 mb-4">{tableName}</h2>

      {/* Error Banner */}
      {error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-700/50 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Success Banner */}
      {exportResult?.success && (
        <div className="mb-4 p-3 bg-emerald-900/30 border border-emerald-700/50 rounded-lg text-emerald-300 text-sm">
          Successfully exported {exportResult.rowCount} rows
        </div>
      )}
      
      {/* Column Selection */}
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-slate-200">Columns</h3>
          <div className="flex gap-2 text-xs">
            <button
              onClick={selectAllColumns}
              className="text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              All
            </button>
            <span className="text-slate-600">|</span>
            <button
              onClick={selectDefaultColumns}
              className="text-slate-400 hover:text-slate-200 transition-colors"
            >
              Default
            </button>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2 mb-4">
          {columns.map((col) => (
            <button
              key={col.key}
              type="button"
              onClick={() => toggleColumn(col.key)}
              className={`
                px-3 py-1.5 rounded-lg cursor-pointer transition-colors text-sm
                ${selectedColumns.includes(col.key)
                  ? 'bg-emerald-900/40 border border-emerald-600/50 text-emerald-300'
                  : 'bg-slate-700/30 border border-slate-600/50 text-slate-400 hover:bg-slate-700/50'
                }
              `}
            >
              {col.label}
            </button>
          ))}
        </div>
        
        <div className="flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {selectedColumns.length} column{selectedColumns.length !== 1 ? 's' : ''} selected
          </div>
          
          {/* Export Button */}
          <button
            onClick={handleExport}
            disabled={exporting || selectedColumns.length === 0}
            className={`
              px-5 py-2 rounded-lg font-medium text-sm transition-all
              ${exporting || selectedColumns.length === 0
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-md shadow-emerald-900/30 hover:shadow-emerald-900/50'
              }
            `}
          >
            {exporting ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Exporting...
              </span>
            ) : (
              'Export to CSV'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default TableExporter;
