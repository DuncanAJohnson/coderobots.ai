/**
 * Session Manager Service
 * Handles fetching and creating user sessions from Supabase
 * Ported from Python SessionManager class
 */

import { supabase } from './supabase';

// Table names
const SESSIONS_TABLE = 'sessions';
const CONVERSATIONS_TABLE = 'conversations';
const CODE_TABLE = 'code';
const CONSOLE_TABLE = 'console';

/**
 * Get all sessions for the current user
 */
export const getUserSessions = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('No authenticated user');
      return [];
    }

    const { data, error } = await supabase
      .from(SESSIONS_TABLE)
      .select('*')
      .order('start_time', { ascending: false });

    if (error) {
      console.error('Error fetching sessions:', error);
      return [];
    }

    console.log(`✅ Fetched ${data?.length || 0} sessions`);
    return data || [];
  } catch (error) {
    console.error('Error in getUserSessions:', error);
    return [];
  }
};

/**
 * Create a new session with associated conversation, code, and console records
 */
export const createNewSession = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('No authenticated user');
      return null;
    }

    console.log('Creating new session...');

    // Step 1: Create placeholder session to get ID
    const { data: placeholderSession, error: placeholderError } = await supabase
      .from(SESSIONS_TABLE)
      .insert({ user_id: user.id })
      .select()
      .single();

    if (placeholderError || !placeholderSession) {
      console.error('Error creating placeholder session:', placeholderError);
      return null;
    }

    const sessionId = placeholderSession.id;

    // Step 2: Create conversation
    const { data: newConvo, error: convoError } = await supabase
      .from(CONVERSATIONS_TABLE)
      .insert({
        user_id: user.id,
        session_id: sessionId,
      })
      .select()
      .single();

    if (convoError || !newConvo) {
      console.error('Error creating conversation:', convoError);
      return null;
    }

    const convoId = newConvo.id;

    // Step 3: Create initial code record
    const { data: newCode, error: codeError } = await supabase
      .from(CODE_TABLE)
      .insert({
        user_id: user.id,
        session_id: sessionId,
        content: '# Start your new project here!',
        save_source: 'init',
      })
      .select()
      .single();

    if (codeError || !newCode) {
      console.error('Error creating code record:', codeError);
      return null;
    }

    const codeId = newCode.id;

    // Step 4: Create initial console record
    const { data: newConsole, error: consoleError } = await supabase
      .from(CONSOLE_TABLE)
      .insert({
        user_id: user.id,
        session_id: sessionId,
        content: '',
        save_source: 'init',
      })
      .select()
      .single();

    if (consoleError || !newConsole) {
      console.error('Error creating console record:', consoleError);
      return null;
    }

    const consoleId = newConsole.id;

    // Step 5: Update session with foreign keys
    const { data: updatedSession, error: updateError } = await supabase
      .from(SESSIONS_TABLE)
      .update({
        current_conversation_id: convoId,
        current_code_id: codeId,
        current_console_id: consoleId,
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (updateError || !updatedSession) {
      console.error('Error updating session:', updateError);
      return null;
    }

    console.log(`✅ Successfully created new session with ID: ${updatedSession.id}`);
    return updatedSession;
  } catch (error) {
    console.error('Error in createNewSession:', error);
    return null;
  }
};

/**
 * Update session's current_code_id
 */
export const updateSessionCode = async (sessionId, newCodeId) => {
  try {
    if (!sessionId || !newCodeId) {
      console.error('session_id and new_code_id are required');
      return null;
    }

    const { data, error } = await supabase
      .from(SESSIONS_TABLE)
      .update({
        current_code_id: newCodeId,
        last_updated: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (error) {
      console.error('Error updating session code:', error);
      return null;
    }

    console.log(`✅ Successfully updated session's code pointer`);
    return data;
  } catch (error) {
    console.error('Error in updateSessionCode:', error);
    return null;
  }
};

/**
 * Update session's current_console_id
 */
export const updateSessionConsole = async (sessionId, newConsoleId) => {
  try {
    if (!sessionId || !newConsoleId) {
      console.error('session_id and new_console_id are required');
      return null;
    }

    const { data, error } = await supabase
      .from(SESSIONS_TABLE)
      .update({
        current_console_id: newConsoleId,
        last_updated: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (error) {
      console.error('Error updating session console:', error);
      return null;
    }

    console.log(`✅ Successfully updated session's console pointer`);
    return data;
  } catch (error) {
    console.error('Error in updateSessionConsole:', error);
    return null;
  }
};

/**
 * Update session's name
 */
export const updateSessionName = async (sessionId, name) => {
  try {
    if (!sessionId) {
      console.error('session_id is required');
      return null;
    }

    const { data, error } = await supabase
      .from(SESSIONS_TABLE)
      .update({
        name: name || null,
        last_updated: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (error) {
      console.error('Error updating session name:', error);
      return null;
    }

    console.log(`✅ Successfully updated session name`);
    return data;
  } catch (error) {
    console.error('Error in updateSessionName:', error);
    return null;
  }
};

