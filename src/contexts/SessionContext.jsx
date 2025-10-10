/**
 * Session Context
 * Manages active session state and provides session switching logic
 */

import { createContext, useContext, useState, useCallback } from 'react';
import {
  getUserSessions,
  createNewSession,
} from '../services/sessionManager';
import {
  getConversationHistory,
  getLatestCode,
  updateSessionOnLoad,
} from '../services/dataLogger';
import { spikePriming } from '../prompts/spike_priming';

const SessionContext = createContext();

export const SessionProvider = ({ children }) => {
  const [activeSession, setActiveSession] = useState(null);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);

  /**
   * Load all user sessions from database
   */
  const loadSessions = useCallback(async () => {
    setLoading(true);
    try {
      const userSessions = await getUserSessions();
      setSessions(userSessions);
      return userSessions;
    } catch (error) {
      console.error('Error loading sessions:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Switch to a specific session or create a new one
   */
  const setActiveSessionById = useCallback(async (sessionId) => {
    setLoading(true);
    try {
      let session;

      if (sessionId === 'new') {
        // Create new session
        session = await createNewSession();
        if (!session) {
          console.error('Failed to create new session');
          return false;
        }

        // Clear conversation history for new session
        setConversationHistory([]);
        
        // Reload sessions list to include new one
        await loadSessions();
      } else {
        // Load existing session
        const allSessions = await getUserSessions();
        session = allSessions.find((s) => s.id === sessionId);

        if (!session) {
          console.error(`Session ${sessionId} not found`);
          return false;
        }

        // Update session timestamps
        await updateSessionOnLoad(sessionId);

        // Load conversation history
        if (session.current_conversation_id) {
          const history = await getConversationHistory(session.current_conversation_id);
          setConversationHistory(history);
        }
      }

      setActiveSession(session);
      console.log(`✅ Active session set to: ${session.id}`);
      return true;
    } catch (error) {
      console.error('Error setting active session:', error);
      return false;
    } finally {
      setLoading(false);
    }
  }, [loadSessions]);

  /**
   * Get the initial system priming message for building conversation
   */
  const getSystemPriming = useCallback(() => {
    return spikePriming;
  }, []);

  /**
   * Clear conversation history (for UI)
   */
  const clearConversation = useCallback(() => {
    setConversationHistory([]);
  }, []);

  const value = {
    activeSession,
    conversationHistory,
    sessions,
    loading,
    loadSessions,
    setActiveSessionById,
    getSystemPriming,
    clearConversation,
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
};

