import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAuth } from '../../contexts/AuthContext';
import { fetchAdminUsageAnalytics, formatUsd } from '../../services/adminUsage';

function formatDateForInput(date) {
  return date.toISOString().split('T')[0];
}

function formatDayLabel(isoDate) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  return `${date.getUTCMonth() + 1}/${date.getUTCDate()}`;
}

function AdminUsageDashboard() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [preset, setPreset] = useState('past_week');
  const [customStartDate, setCustomStartDate] = useState(() => formatDateForInput(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)));
  const [customEndDate, setCustomEndDate] = useState(() => formatDateForInput(new Date()));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/');
    }
  }, [user, isAdmin, authLoading, navigate]);

  const loadAnalytics = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await fetchAdminUsageAnalytics({
        preset,
        customStartDate,
        customEndDate,
      });
      setAnalytics(result);
    } catch (err) {
      setError(err.message || 'Failed to load analytics');
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user || !isAdmin) {
      return;
    }
    loadAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isAdmin, preset, customStartDate, customEndDate]);

  const chartData = useMemo(() => {
    if (!analytics) return [];
    return analytics.dailySpend.map((day) => ({
      ...day,
      dayLabel: formatDayLabel(day.date),
    }));
  }, [analytics]);

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

  return (
    <div className="h-screen bg-slate-900 flex flex-col overflow-hidden">
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
              Admin Usage Dashboard
            </h1>
          </div>
          <div className="text-sm text-slate-400">
            Logged in as <span className="text-emerald-400">{user.email}</span>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
            <h2 className="text-lg font-medium mb-4 text-slate-200">Time Range</h2>
            <div className="flex flex-wrap gap-3 mb-4">
              <button
                onClick={() => setPreset('past_week')}
                className={`px-4 py-2 rounded-lg border text-sm ${preset === 'past_week' ? 'bg-emerald-900/40 border-emerald-600/50 text-emerald-300' : 'bg-slate-700/30 border-slate-600/50 text-slate-300'}`}
              >
                Past Week
              </button>
              <button
                onClick={() => setPreset('past_month')}
                className={`px-4 py-2 rounded-lg border text-sm ${preset === 'past_month' ? 'bg-emerald-900/40 border-emerald-600/50 text-emerald-300' : 'bg-slate-700/30 border-slate-600/50 text-slate-300'}`}
              >
                Past Month
              </button>
              <button
                onClick={() => setPreset('custom')}
                className={`px-4 py-2 rounded-lg border text-sm ${preset === 'custom' ? 'bg-emerald-900/40 border-emerald-600/50 text-emerald-300' : 'bg-slate-700/30 border-slate-600/50 text-slate-300'}`}
              >
                Custom
              </button>
            </div>

            {preset === 'custom' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">End Date</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                  />
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 bg-red-900/30 border border-red-700/50 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}

          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
            <h2 className="text-lg font-medium text-slate-200 mb-2">Total Spend</h2>
            <div className="text-3xl font-semibold text-emerald-300">
              {loading || !analytics ? '—' : formatUsd(analytics.totalSpendUsd)}
            </div>
            {analytics && (
              <div className="text-xs text-slate-500 mt-2">
                {analytics.range.startIso} to {analytics.range.endIso}
              </div>
            )}
          </div>

          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
            <h2 className="text-lg font-medium text-slate-200 mb-4">Daily Spend (USD)</h2>
            <div className="h-72">
              {loading ? (
                <div className="h-full flex items-center justify-center text-slate-400">Loading chart...</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="dayLabel" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <Tooltip
                      formatter={(value) => formatUsd(Number(value || 0))}
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155' }}
                      labelStyle={{ color: '#cbd5e1' }}
                    />
                    <Bar dataKey="costUsd" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
            <h2 className="text-lg font-medium text-slate-200 mb-4">Usage by User</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700/70">
                    <th className="text-left py-2 text-slate-300">User</th>
                    <th className="text-right py-2 text-slate-300">LLM Calls</th>
                    <th className="text-right py-2 text-slate-300">Spend (USD)</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={3} className="py-4 text-center text-slate-400">Loading users...</td>
                    </tr>
                  ) : analytics && analytics.users.length > 0 ? (
                    analytics.users.map((item) => (
                      <tr key={item.userId} className="border-b border-slate-800">
                        <td className="py-2 text-slate-300">{item.email || item.userId}</td>
                        <td className="py-2 text-right text-slate-300">{item.llmCalls.toLocaleString()}</td>
                        <td className="py-2 text-right text-slate-300">{formatUsd(item.costUsd)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="py-4 text-center text-slate-400">No usage in selected range.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default AdminUsageDashboard;
