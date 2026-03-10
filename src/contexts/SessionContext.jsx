/**
 * Session Context
 * Manages active session state and provides session switching logic
 */

import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import {
  getUserSessions,
  createNewSession,
  updateSessionName as updateSessionNameService,
  getSessionConversations,
  createConversation,
  updateConversationName as updateConversationNameService,
  updateSessionConversation,
  getSessionCode,
  createCode,
  updateCodeName as updateCodeNameService,
  updateCodeContent as updateCodeContentService,
  updateSessionCode as updateSessionCodeService,
  createCodeSnapshot,
} from '../services/sessionManager';
import {
  getConversationHistory,
  getLatestCode,
  updateSessionOnLoad,
} from '../services/dataLogger';
import { lilyBotPriming } from '../prompts/spike_priming';

const SessionContext = createContext();

export const SessionProvider = ({ children }) => {
  const [activeSession, setActiveSession] = useState(null);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [codeRecords, setCodeRecords] = useState([]);
  const [currentCodeId, setCurrentCodeId] = useState(null);
  const [currentCodeContent, setCurrentCodeContent] = useState('# Start your project here!\n');
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [firmwareVersion, setFirmwareVersion] = useState('3');
  
  // Debounce timer for live code saving
  const saveDebounceTimer = useRef(null);

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
   * Load conversations for the current session
   */
  const loadConversations = useCallback(async (sessionId) => {
    if (!sessionId) {
      setConversations([]);
      return [];
    }
    
    try {
      const sessionConversations = await getSessionConversations(sessionId);
      setConversations(sessionConversations);
      return sessionConversations;
    } catch (error) {
      console.error('Error loading conversations:', error);
      return [];
    }
  }, []);

  /**
   * Load code records for the current session
   */
  const loadCodeRecords = useCallback(async (sessionId) => {
    if (!sessionId) {
      setCodeRecords([]);
      return [];
    }
    
    try {
      const sessionCode = await getSessionCode(sessionId);
      setCodeRecords(sessionCode);
      return sessionCode;
    } catch (error) {
      console.error('Error loading code records:', error);
      return [];
    }
  }, []);

  /**
   * Switch to a specific session or create a new one
   */
  const setActiveSessionById = useCallback(async (sessionId, newFirmwareVersion = '3') => {
    setLoading(true);
    try {
      // Save current code before switching sessions
      if (currentCodeId && currentCodeContent && activeSession) {
        await updateCodeContentService(currentCodeId, currentCodeContent);
        console.log(`✅ Saved current code before switching sessions`);
      }

      let session;

      if (sessionId === 'new') {
        // Create new session with firmware version
        session = await createNewSession(newFirmwareVersion);
        if (!session) {
          console.error('Failed to create new session');
          return false;
        }

        // Clear conversation history for new session
        setConversationHistory([]);
        setCurrentConversationId(session.current_conversation_id);
        
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
          setCurrentConversationId(session.current_conversation_id);
        }
      }

      setActiveSession(session);
      
      // Set firmware version from session
      setFirmwareVersion(session.firmware_version || '3');
      
      // Load all conversations for this session
      await loadConversations(session.id);
      
      // Load all code records for this session
      const sessionCodeRecords = await loadCodeRecords(session.id);

      // Set current code if available
      if (session.current_code_id) {
        // Use getLatestCode to load the previously selected code content directly
        const latestCode = await getLatestCode(session.id);
        if (latestCode !== null) {
          setCurrentCodeId(session.current_code_id);
          setCurrentCodeContent(latestCode);
        } else if (sessionCodeRecords.length > 0) {
          // current_code_id is stale or deleted — fall back to first record
          setCurrentCodeId(sessionCodeRecords[0].id);
          setCurrentCodeContent(sessionCodeRecords[0].content || '# Start your project here!\n');
        }
      } else if (sessionCodeRecords.length > 0) {
        // Fall back to first code record if no current_code_id
        setCurrentCodeId(sessionCodeRecords[0].id);
        setCurrentCodeContent(sessionCodeRecords[0].content || '# Start your project here!\n');
      }
      
      console.log(`✅ Active session set to: ${session.id}`);
      return true;
    } catch (error) {
      console.error('Error setting active session:', error);
      return false;
    } finally {
      setLoading(false);
    }
  }, [loadSessions, loadConversations, currentCodeId, currentCodeContent, activeSession, loadCodeRecords]);

  /**
   * Get the initial system priming message for building conversation
   */
  const getSystemPriming = useCallback(() => {
    return lilyBotPriming;
  }, []);

  /**
   * Clear conversation history (for UI)
   */
  const clearConversation = useCallback(() => {
    setConversationHistory([]);
  }, []);

  /**
   * Update the name of the active session
   */
  const updateSessionName = useCallback(async (sessionId, name) => {
    try {
      const updatedSession = await updateSessionNameService(sessionId, name);
      if (updatedSession) {
        // Update active session if it's the one being renamed
        if (activeSession && activeSession.id === sessionId) {
          setActiveSession(updatedSession);
        }
        // Reload sessions list to reflect the change
        await loadSessions();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating session name:', error);
      return false;
    }
  }, [activeSession, loadSessions]);

  /**
   * Switch to a different conversation within the current session
   */
  const switchConversation = useCallback(async (conversationId) => {
    if (!activeSession) {
      console.error('No active session');
      return false;
    }

    try {
      // Load conversation history
      const history = await getConversationHistory(conversationId);
      setConversationHistory(history);
      setCurrentConversationId(conversationId);

      // Update session's current conversation
      const updatedSession = await updateSessionConversation(activeSession.id, conversationId);
      if (updatedSession) {
        setActiveSession(updatedSession);
      }

      console.log(`✅ Switched to conversation ${conversationId}`);
      return true;
    } catch (error) {
      console.error('Error switching conversation:', error);
      return false;
    }
  }, [activeSession]);

  /**
   * Create a new conversation in the current session
   */
  const createNewConversation = useCallback(async () => {
    if (!activeSession) {
      console.error('No active session');
      return null;
    }

    try {
      const name = `Chat ${conversations.length + 1}`;
      const newConversation = await createConversation(activeSession.id, name);
      if (newConversation) {
        // Reload conversations list
        await loadConversations(activeSession.id);
        
        // Switch to the new conversation
        await switchConversation(newConversation.id);
        
        return newConversation;
      }
      return null;
    } catch (error) {
      console.error('Error creating conversation:', error);
      return null;
    }
  }, [activeSession, conversations.length, loadConversations, switchConversation]);

  /**
   * Rename a conversation
   */
  const updateConversationName = useCallback(async (conversationId, name) => {
    if (!activeSession) {
      console.error('No active session');
      return false;
    }

    try {
      const updatedConversation = await updateConversationNameService(conversationId, name);
      if (updatedConversation) {
        // Reload conversations list to reflect the change
        await loadConversations(activeSession.id);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating conversation name:', error);
      return false;
    }
  }, [activeSession, loadConversations]);

  /**
   * Switch to a different code record within the current session
   */
  const switchCode = useCallback(async (codeId) => {
    if (!activeSession) {
      console.error('No active session');
      return false;
    }

    try {
      // Reload code records and use the returned value (not the state which updates asynchronously)
      const freshCodeRecords = await loadCodeRecords(activeSession.id);
      // Find the code record
      const codeRecord = freshCodeRecords.find(code => code.id === codeId);
      if (!codeRecord) {
        console.error(`Code record ${codeId} not found`);
        return false;
      }

      setCurrentCodeId(codeId);
      setCurrentCodeContent(codeRecord.content || '# Start your project here!\n');

      // Update session's current code
      const updatedSession = await updateSessionCodeService(activeSession.id, codeId);
      if (updatedSession) {
        setActiveSession(updatedSession);
      }

      console.log(`✅ Switched to code ${codeId}`);
      return true;
    } catch (error) {
      console.error('Error switching code:', error);
      return false;
    }
  }, [activeSession, loadCodeRecords]);

  /**
   * Create a new code record in the current session
   */
  const createNewCode = useCallback(async () => {
    if (!activeSession) {
      console.error('No active session');
      return null;
    }

    try {
      const name = `Code tab ${codeRecords.length + 1}`;
      const newCode = await createCode(activeSession.id, name);
      if (newCode) {
        // Switch to the new code record (this will reload code records internally)
        await switchCode(newCode.id);
        
        return newCode;
      }
      return null;
    } catch (error) {
      console.error('Error creating code record:', error);
      return null;
    }
  }, [activeSession, codeRecords.length, switchCode]);

  /**
   * Rename a code record
   */
  const updateCodeName = useCallback(async (codeId, name) => {
    if (!activeSession) {
      console.error('No active session');
      return false;
    }

    try {
      const updatedCode = await updateCodeNameService(codeId, name);
      if (updatedCode) {
        // Reload code records list to reflect the change
        await loadCodeRecords(activeSession.id);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating code name:', error);
      return false;
    }
  }, [activeSession, loadCodeRecords]);

  /**
   * Update the content of the current code record with debounced live save
   */
  const updateCurrentCodeContent = useCallback((content) => {
    setCurrentCodeContent(content);
    
    // Clear existing timer
    if (saveDebounceTimer.current) {
      clearTimeout(saveDebounceTimer.current);
    }
    
    // Set new timer for live save (1 second after user stops typing)
    saveDebounceTimer.current = setTimeout(async () => {
      if (currentCodeId) {
        try {
          await updateCodeContentService(currentCodeId, content);
          console.log(`🔄 Auto-saved code (debounced)`);
        } catch (error) {
          console.error('Error auto-saving code:', error);
        }
      }
    }, 1000); // 1 second debounce
  }, [currentCodeId]);

  /**
   * Create a code snapshot (for historical record keeping)
   * @param {string} saveSource - The source/reason for the snapshot
   * @param {string} [content] - Optional content to snapshot (defaults to currentCodeContent)
   */
  const createSnapshot = useCallback(async (saveSource, content = null) => {
    const contentToSave = content !== null ? content : currentCodeContent;
    
    if (!activeSession || !currentCodeId || !contentToSave) {
      console.error('No active session, current code, or content');
      return false;
    }

    try {
      // Create snapshot
      const snapshot = await createCodeSnapshot(
        currentCodeId,
        activeSession.id,
        contentToSave,
        saveSource
      );
      
      if (snapshot) {
        console.log(`📸 Created code snapshot (${saveSource})`);
        return snapshot.id;
      }
      return null;
    } catch (error) {
      console.error('Error creating code snapshot:', error);
      return false;
    }
  }, [activeSession, currentCodeId, currentCodeContent]);

  // Auto-select the first code tab if records are loaded but none is selected
  useEffect(() => {
    if (codeRecords.length > 0 && !currentCodeId) {
      setCurrentCodeId(codeRecords[0].id);
      setCurrentCodeContent(codeRecords[0].content || '# Start your project here!\n');
    }
  }, [codeRecords, currentCodeId]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (saveDebounceTimer.current) {
        clearTimeout(saveDebounceTimer.current);
      }
    };
  }, []);

  
  const value = {
    activeSession,
    conversationHistory,
    conversations,
    currentConversationId,
    codeRecords,
    currentCodeId,
    currentCodeContent,
    sessions,
    loading,
    firmwareVersion,
    loadSessions,
    setActiveSessionById,
    getSystemPriming,
    clearConversation,
    updateSessionName,
    switchConversation,
    createNewConversation,
    updateConversationName,
    loadConversations,
    switchCode,
    createNewCode,
    updateCodeName,
    updateCurrentCodeContent,
    createSnapshot,
    loadCodeRecords,
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

