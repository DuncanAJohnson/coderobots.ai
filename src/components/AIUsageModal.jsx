/**
 * AI Usage Modal Component
 * Displays AI token usage and costs broken down by model
 */

import { useState, useEffect } from 'react';
import {
  getWeeklyUsage,
  getAllTimeUsage,
  getUserAccessLevel,
  formatCurrency,
  formatNumber,
} from '../services/aiUsage';
import './AIUsageModal.css';

const AIUsageModal = ({ visible, onClose }) => {
  const [weeklyStats, setWeeklyStats] = useState(null);
  const [allTimeStats, setAllTimeStats] = useState(null);
  const [accessLevel, setAccessLevel] = useState('standard');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!visible) return;

    const fetchUsageData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const [weekly, allTime, level] = await Promise.all([
          getWeeklyUsage(),
          getAllTimeUsage(),
          getUserAccessLevel(),
        ]);
        
        setWeeklyStats(weekly);
        setAllTimeStats(allTime);
        setAccessLevel(level);
      } catch (err) {
        console.error('Error fetching usage data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUsageData();
  }, [visible]);

  if (!visible) return null;

  const renderModelStats = (stats, title) => {
    if (!stats) return null;

    const models = Object.keys(stats.byModel).sort();
    
    if (models.length === 0) {
      return (
        <div className="usage-section">
          <h3>{title}</h3>
          <p className="no-usage">No usage recorded yet</p>
        </div>
      );
    }

    return (
      <div className="usage-section">
        <h3>{title}</h3>
        <table className="usage-table">
          <thead>
            <tr>
              <th>Model</th>
              <th>Requests</th>
              <th>Input Tokens</th>
              <th>Output Tokens</th>
              <th>Cached Input</th>
              <th>Reasoning</th>
              <th>Cost</th>
            </tr>
          </thead>
          <tbody>
            {models.map(model => {
              const modelStats = stats.byModel[model];
              return (
                <tr key={model}>
                  <td className="model-name">{model}</td>
                  <td>{formatNumber(modelStats.request_count)}</td>
                  <td>{formatNumber(modelStats.input_tokens)}</td>
                  <td>{formatNumber(modelStats.output_tokens)}</td>
                  <td>{formatNumber(modelStats.cached_input_tokens)}</td>
                  <td>{formatNumber(modelStats.reasoning_tokens)}</td>
                  <td className="cost">{formatCurrency(modelStats.total_cost)}</td>
                </tr>
              );
            })}
            <tr className="total-row">
              <td><strong>Total</strong></td>
              <td><strong>{formatNumber(stats.totals.request_count)}</strong></td>
              <td><strong>{formatNumber(stats.totals.input_tokens)}</strong></td>
              <td><strong>{formatNumber(stats.totals.output_tokens)}</strong></td>
              <td><strong>{formatNumber(stats.totals.cached_input_tokens)}</strong></td>
              <td><strong>{formatNumber(stats.totals.reasoning_tokens)}</strong></td>
              <td className="cost"><strong>{formatCurrency(stats.totals.total_cost)}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  const getBudgetInfo = () => {
    if (accessLevel === 'en1') {
      return (
        <div className="budget-info en1">
          <p><strong>Your Plan:</strong> EN1 Access</p>
          <p><strong>gpt-5-nano:</strong> Unlimited ♾️</p>
          <p><strong>gpt-5-mini & gpt-5:</strong> Limited weekly budget</p>
        </div>
      );
    } else {
      return (
        <div className="budget-info standard">
          <p><strong>Your Plan:</strong> Standard Access</p>
          <p><strong>All Models:</strong> Limited weekly budget</p>
        </div>
      );
    }
  };

  return (
    <>
      <div className="modal-overlay" onClick={onClose}></div>
      <div className="modal-container ai-usage-modal">
        <div className="modal-header">
          <h2>📊 AI Usage Statistics</h2>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {loading ? (
            <div className="loading">Loading usage data...</div>
          ) : error ? (
            <div className="error">Error loading data: {error}</div>
          ) : (
            <>
              {getBudgetInfo()}
              {renderModelStats(weeklyStats, '📅 This Week (Monday - Sunday, Eastern Time)')}
              {renderModelStats(allTimeStats, '📈 All Time')}
            </>
          )}
        </div>
        <div className="modal-footer">
          <button className="modal-btn primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </>
  );
};

export default AIUsageModal;

