/**
 * Authentication Service
 * Handles Google OAuth, email validation, and session management
 */

import { supabase } from './supabase';

// Configuration
const ALLOWED_EMAIL_DOMAIN = 'tufts.edu';
const WHITELISTED_EMAILS = [
  'bill@crcs.works',
  'williamchurch17@gmail.com',
  'duncanjohnson99@gmail.com',
];

/**
 * Check if an email is authorized (domain or whitelist)
 */
export const isEmailAuthorized = (email) => {
  if (!email) return false;

  const lowerEmail = email.toLowerCase();

  // Check whitelist
  if (WHITELISTED_EMAILS.some((e) => e.toLowerCase() === lowerEmail)) {
    return true;
  }

  // Check domain
  if (ALLOWED_EMAIL_DOMAIN && lowerEmail.endsWith(`@${ALLOWED_EMAIL_DOMAIN.toLowerCase()}`)) {
    return true;
  }

  return false;
};

/**
 * Check if user is admin (in whitelist)
 */
export const isAdmin = (email) => {
  if (!email) return false;
  const lowerEmail = email.toLowerCase();
  return WHITELISTED_EMAILS.some((e) => e.toLowerCase() === lowerEmail);
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

