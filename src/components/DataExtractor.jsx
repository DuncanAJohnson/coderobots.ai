/**
 * Data Extractor Component
 * Admin-only page for exporting message data with filters
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';

// Modal function endpoint (update after deploying the Modal function)
const MODAL_BASE_URL = import.meta.env.VITE_MODAL_DATA_EXPORT_URL || '';

// Message columns available for export
const MESSAGE_COLUMNS = [
  { key: 'id', label: 'ID', default: true },
  { key: 'user_id', label: 'User ID', default: false },
  { key: 'conversation_id', label: 'Conversation ID', default: false },
  { key: 'role', label: 'Role', default: true },
  { key: 'content', label: 'Content', default: true },
  { key: 'coding_level', label: 'Coding Level', default: true },
  { key: 'ai_model', label: 'AI Model', default: true },
  { key: 'prompt_tokens', label: 'Prompt Tokens', default: false },
  { key: 'completion_tokens', label: 'Completion Tokens', default: false },
  { key: 'code_context_id', label: 'Code Context ID', default: false },
  { key: 'console_context_id', label: 'Console Context ID', default: false },
  { key: 'timestamp', label: 'Timestamp', default: true },
  { key: 'port_configurations', label: 'Port Configurations', default: false },
];

function DataExtractor() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Filter states
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [emailsInput, setEmailsInput] = useState('');
  const [selectedColumns, setSelectedColumns] = useState(
    MESSAGE_COLUMNS.filter(c => c.default).map(c => c.key)
  );

  // UI states
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);
  const [exportResult, setExportResult] = useState(null);

  // Redirect non-admins
  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/');
    }
  }, [user, isAdmin, authLoading, navigate]);

  const getAuthHeaders = async () => {
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    return {
      user_id: currentSession?.user?.id,
      auth_token: currentSession?.access_token,
    };
  };

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    setExportResult(null);

    try {
      const auth = await getAuthHeaders();
      
      // Parse emails from input (comma or newline separated)
      const emails = emailsInput
        .split(/[,\n]/)
        .map(email => email.trim())
        .filter(email => email.length > 0);

      const response = await fetch(`${MODAL_BASE_URL}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...auth,
          start_time: startTime ? new Date(startTime).toISOString() : null,
          end_time: endTime ? new Date(endTime).toISOString() : null,
          emails: emails.length > 0 ? emails : null,
          columns: selectedColumns,
          format: 'csv',
        }),
      });
      const data = await response.json();

      if (data.success) {
        // Trigger CSV download
        const blob = new Blob([data.data], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `messages_export_${new Date().toISOString().split('T')[0]}.csv`;
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

  const toggleColumn = (columnKey) => {
    setSelectedColumns(prev =>
      prev.includes(columnKey)
        ? prev.filter(key => key !== columnKey)
        : [...prev, columnKey]
    );
  };

  const selectAllColumns = () => setSelectedColumns(MESSAGE_COLUMNS.map(c => c.key));
  const selectDefaultColumns = () => setSelectedColumns(MESSAGE_COLUMNS.filter(c => c.default).map(c => c.key));

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-slate-300 text-lg">Loading...</div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  const parsedEmails = emailsInput
    .split(/[,\n]/)
    .map(email => email.trim())
    .filter(email => email.length > 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="text-slate-400 hover:text-slate-200 transition-colors"
            >
              ← Back
            </button>
            <h1 className="text-md font-semibold tracking-tight">
              Data Extractor
            </h1>
          </div>
          <div className="text-sm text-slate-400">
            Logged in as <span className="text-emerald-400">{user.email}</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Error Banner */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-700/50 rounded-lg text-red-300">
            {error}
          </div>
        )}

        {/* Success Banner */}
        {exportResult?.success && (
          <div className="mb-6 p-4 bg-emerald-900/30 border border-emerald-700/50 rounded-lg text-emerald-300">
            Successfully exported {exportResult.rowCount} rows
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Time Range Filter */}
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
            <h2 className="text-lg font-medium mb-4 text-slate-200">Time Range</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Start Time</label>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">End Time</label>
                <input
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                />
              </div>
              <button
                onClick={() => { setStartTime(''); setEndTime(''); }}
                className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
              >
                Clear dates
              </button>
            </div>
          </div>

          {/* User Filter */}
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-slate-200">User Filter</h2>
              <button
                onClick={() => setEmailsInput('')}
                className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                Clear
              </button>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Emails <span className="text-slate-500">(comma or newline separated)</span>
                </label>
                <textarea
                  value={emailsInput}
                  onChange={(e) => setEmailsInput(e.target.value)}
                  placeholder="Leave empty for all users"
                  rows={4}
                  className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 resize-none font-mono text-sm"
                />
              </div>
              <div className="text-xs text-slate-500">
                {parsedEmails.length === 0 
                  ? 'All users will be included' 
                  : `${parsedEmails.length} email${parsedEmails.length !== 1 ? 's' : ''} specified`}
              </div>
            </div>
          </div>

          {/* Column Selection */}
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-slate-200">Columns</h2>
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
            
            <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
              {MESSAGE_COLUMNS.map((col) => (
                <label
                  key={col.key}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-700/30 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedColumns.includes(col.key)}
                    onChange={() => toggleColumn(col.key)}
                    className="w-4 h-4 rounded border-slate-500 bg-slate-900 text-emerald-500 focus:ring-emerald-500/50"
                  />
                  <span className="text-sm text-slate-300">{col.label}</span>
                </label>
              ))}
            </div>
            
            <div className="mt-3 text-xs text-slate-500">
              {selectedColumns.length} column{selectedColumns.length !== 1 ? 's' : ''} selected
            </div>
          </div>
        </div>

        {/* Export Button */}
        <div className="mt-8 flex justify-center">
          <button
            onClick={handleExport}
            disabled={exporting || selectedColumns.length === 0}
            className={`
              px-8 py-3 rounded-xl font-medium text-lg transition-all
              ${exporting || selectedColumns.length === 0
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-lg shadow-emerald-900/30 hover:shadow-emerald-900/50'
              }
            `}
          >
            {exporting ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
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

        {/* Summary */}
        <div className="mt-6 text-center text-sm text-slate-500">
          {parsedEmails.length === 0 ? 'All users' : `${parsedEmails.length} user${parsedEmails.length !== 1 ? 's' : ''}`}
          {' • '}
          {!startTime && !endTime ? 'All time' : `${startTime || 'Beginning'} to ${endTime || 'Now'}`}
          {' • '}
          {selectedColumns.length} column{selectedColumns.length !== 1 ? 's' : ''}
        </div>
      </main>
    </div>
  );
}

export default DataExtractor;
