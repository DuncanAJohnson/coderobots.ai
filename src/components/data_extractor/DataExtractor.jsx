/**
 * Data Extractor Component
 * Admin-only page for exporting data from multiple tables with shared filters
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import TableExporter from './TableExporter';

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

const SESSION_COLUMNS = [
  { key: 'id', label: 'ID', default: true },
  { key: 'user_id', label: 'User ID', default: false },
  { key: 'start_time', label: 'Start Time', default: true },
  { key: 'last_updated', label: 'Last Updated', default: true },
  { key: 'loaded_timestamps', label: 'Loaded Timestamps', default: false },
  { key: 'current_code_id', label: 'Current Code ID', default: false },
  { key: 'current_console_id', label: 'Current Console ID', default: false },
  { key: 'current_conversation_id', label: 'Current Conversation ID', default: false },
  { key: 'name', label: 'Name', default: true },
  { key: 'firmware_version', label: 'Firmware Version', default: true },
];

const CONSOLE_COLUMNS = [
  { key: 'id', label: 'ID', default: true },
  { key: 'user_id', label: 'User ID', default: false },
  { key: 'session_id', label: 'Session ID', default: false },
  { key: 'timestamp', label: 'Timestamp', default: true },
  { key: 'content', label: 'Content', default: true },
  { key: 'save_source', label: 'Save Source', default: true },
];

const CODE_SNAPSHOT_COLUMNS = [
  { key: 'id', label: 'ID', default: true },
  { key: 'user_id', label: 'User ID', default: false },
  { key: 'code_id', label: 'Code ID', default: false },
  { key: 'session_id', label: 'Session ID', default: false },
  { key: 'timestamp', label: 'Timestamp', default: true },
  { key: 'content', label: 'Content', default: true },
  { key: 'save_source', label: 'Save Source', default: true },
];

const INTERACTION_COLUMNS = [
  { key: 'id', label: 'ID', default: true },
  { key: 'user_id', label: 'User ID', default: false },
  { key: 'session_id', label: 'Session ID', default: false },
  { key: 'timestamp', label: 'Timestamp', default: true },
  { key: 'button_name', label: 'Button Name', default: true },
];

const CONVERSATION_COLUMNS = [
  { key: 'id', label: 'ID', default: true },
  { key: 'user_id', label: 'User ID', default: false },
  { key: 'session_id', label: 'Session ID', default: false },
  { key: 'start_time', label: 'Start Time', default: true },
  { key: 'last_updated', label: 'Last Updated', default: true },
  { key: 'name', label: 'Name', default: true },
];

function DataExtractor() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Shared filter states
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [emailsInput, setEmailsInput] = useState('');

  // Redirect non-admins
  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/');
    }
  }, [user, isAdmin, authLoading, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
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
    <div className="h-screen bg-slate-900 flex flex-col overflow-hidden">
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
            <h1 className="text-md text-slate-200 font-semibold tracking-tight">
              Data Extractor
            </h1>
          </div>
          <div className="text-sm text-slate-400">
            Logged in as <span className="text-emerald-400">{user.email}</span>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col flex-1 min-h-0 w-full">
        {/* Filters row */}
        <div className="space-y-4 flex-shrink-0 bg-slate-900/80 backdrop-blur-sm">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
          </div>

          {/* Filter Summary */}
          <div className="text-center text-sm text-slate-500">
            {parsedEmails.length === 0 ? 'All users' : `${parsedEmails.length} user${parsedEmails.length !== 1 ? 's' : ''}`}
            {' • '}
            {!startTime && !endTime ? 'All time' : `${startTime || 'Beginning'} to ${endTime || 'Now'}`}
          </div>
        </div>

        {/* Table Exporters - scrollable */}
        <div className="flex flex-col gap-6 overflow-y-auto flex-1 min-h-0 p-2 mt-8">
          <TableExporter
            tableName="Messages"
            columns={MESSAGE_COLUMNS}
            startTime={startTime}
            endTime={endTime}
            emails={parsedEmails}
          />

          <TableExporter
            tableName="Sessions"
            columns={SESSION_COLUMNS}
            startTime={startTime}
            endTime={endTime}
            emails={parsedEmails}
          />

          <TableExporter
            tableName="Console"
            columns={CONSOLE_COLUMNS}
            startTime={startTime}
            endTime={endTime}
            emails={parsedEmails}
          />

          <TableExporter
            tableName="Code Snapshots"
            columns={CODE_SNAPSHOT_COLUMNS}
            startTime={startTime}
            endTime={endTime}
            emails={parsedEmails}
          />

          <TableExporter
            tableName="Interactions"
            columns={INTERACTION_COLUMNS}
            startTime={startTime}
            endTime={endTime}
            emails={parsedEmails}
          />

          <TableExporter
            tableName="Conversations"
            columns={CONVERSATION_COLUMNS}
            startTime={startTime}
            endTime={endTime}
            emails={parsedEmails}
          />
        </div>
        </div>
      </main>
    </div>
  );
}

export default DataExtractor;
