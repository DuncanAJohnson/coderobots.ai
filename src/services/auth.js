/**
 * Authentication Service
 * Handles Google OAuth, email validation, and session management
 */

import { supabase } from './supabase';

// Configuration
const ALLOWED_EMAIL_DOMAINS = ['tufts.edu', 'purdue.edu'];
const CAMPS_EMAIL_DOMAINS = ['tufts.edu', 'purdue.edu'];

// Check if we're in SHOWCASE deployment mode
const DEPLOYMENT_MODE = import.meta.env.VITE_DEPLOYMENT_MODE;
export const isShowcaseMode = () => DEPLOYMENT_MODE === 'SHOWCASE';

/**
 * Check if an email is authorized (domain or whitelist)
 * In SHOWCASE mode, all emails are authorized
 */
export const isEmailAuthorized = (email) => {
  if (!email) return false;

  // In SHOWCASE mode, skip email domain checks
  if (isShowcaseMode()) {
    return true;
  }

  const lowerEmail = email.toLowerCase();

  // Check allowed domains
  for (const domain of ALLOWED_EMAIL_DOMAINS) {
    if (lowerEmail.endsWith(`@${domain.toLowerCase()}`)) {
      return true;
    }
  }

  return false;
};

/**
 * Check if user is admin for UI gating.
 * Source of truth is JWT/app metadata role used by RLS policies.
 */
export const isAdmin = (userOrEmail) => {
  if (!userOrEmail) return false;

  if (typeof userOrEmail === 'object') {
    const role = userOrEmail.app_metadata?.role;
    if (role === 'admin') {
      return true;
    }
  }
};

/**
 * Determine access level based on email domain
 * @param {string} email - User's email address
 * @returns {string} - 'camps' or 'standard'
 */
export const getAccessLevelFromEmail = (email) => {
  if (!email) return 'standard';
  
  const lowerEmail = email.toLowerCase();
  
  // Check if email domain matches CAMPS domains
  for (const domain of CAMPS_EMAIL_DOMAINS) {
    if (lowerEmail.endsWith(`@${domain.toLowerCase()}`)) {
      return 'camps';
    }
  }
  
  return 'standard';
};

/**
 * Sign in with Google OAuth
 */
export const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
      queryParams: {
        prompt: 'select_account',
      },
    },
  });

  if (error) {
    console.error('Google sign-in error:', error);
    throw error;
  }

  return data;
};

/**
 * Sign in with email and password
 * Only available in SHOWCASE mode
 */
export const signInWithPassword = async (email, password) => {
  if (!isShowcaseMode()) {
    throw new Error('Password authentication is only available in SHOWCASE mode');
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error('Password sign-in error:', error);
    throw error;
  }

  return data;
};

/**
 * Sign up with email and password
 * Only available in SHOWCASE mode
 */
export const signUpWithPassword = async (email, password) => {
  if (!isShowcaseMode()) {
    throw new Error('Password authentication is only available in SHOWCASE mode');
  }

  // Determine access level based on email domain
  const accessLevel = getAccessLevelFromEmail(email);

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        access_level: accessLevel,
      },
    },
  });

  if (error) {
    console.error('Password sign-up error:', error);
    throw error;
  }

  return data;
};

/**
 * Sign out current user
 */
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Sign out error:', error);
    throw error;
  }
};

/**
 * Get current session
 */
export const getSession = async () => {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.error('Get session error:', error);
    throw error;
  }
  return data.session;
};

/**
 * Get current user
 */
export const getUser = async () => {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    console.error('Get user error:', error);
    throw error;
  }
  return data.user;
};

/**
 * Listen for auth state changes
 */
export const onAuthStateChange = (callback) => {
  return supabase.auth.onAuthStateChange(callback);
};

/**
 * Check and set access level for OAuth users (called after sign-in)
 * This ensures OAuth users get their access_level set based on email domain
 * @param {Object} user - Optional user object (if already available from session)
 */
export const ensureAccessLevel = async (user = null) => {
  try {
    // If user not provided, fetch it (with timeout)
    if (!user) {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('getUser timeout')), 5000)
      );
      
      const getUserPromise = supabase.auth.getUser();
      
      const result = await Promise.race([getUserPromise, timeoutPromise]);
      user = result.data?.user;
    }
    
    if (!user) {
      return;
    }

    // Check if user already has access_level set
    if (user.user_metadata?.access_level) {
      return; // Already set, no need to update
    }

    // Determine access level from email
    const accessLevel = getAccessLevelFromEmail(user.email);

    console.log('Setting access level to:', accessLevel);

    // Update user metadata
    const { error } = await supabase.auth.updateUser({
      data: {
        access_level: accessLevel,
      },
    });

    if (error) {
      console.error('Error setting access level:', error);
    } else {
      console.log(`Access level set to '${accessLevel}' for ${user.email}`);
    }
  } catch (error) {
    console.error('Error in ensureAccessLevel:', error);
    // Don't throw - we don't want to block auth flow
  }
};

