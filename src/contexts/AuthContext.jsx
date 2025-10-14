/**
 * Authentication Context
 * Provides authentication state and functions globally
 */

import { createContext, useContext, useState, useEffect } from 'react';
import {
  signInWithGoogle,
  signInWithPassword,
  signUpWithPassword,
  signOut,
  getSession,
  onAuthStateChange,
  isEmailAuthorized,
  isAdmin as checkIsAdmin,
  isShowcaseMode,
} from '../services/auth';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    // Check active session on mount
    getSession().then((session) => {
      if (session?.user) {
        const email = session.user.email;
        
        // Validate email authorization
        if (isEmailAuthorized(email)) {
          setSession(session);
          setUser(session.user);
          setIsAdmin(checkIsAdmin(email));
          setAuthError(null);
        } else {
          // Unauthorized email - sign out
          setAuthError(`Access denied. Please sign in with a @tufts.edu email or whitelisted account.`);
          signOut();
        }
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: authListener } = onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event, session?.user?.email);

      if (session?.user) {
        const email = session.user.email;
        
        // Validate on every auth change
        if (isEmailAuthorized(email)) {
          setSession(session);
          setUser(session.user);
          setIsAdmin(checkIsAdmin(email));
          setAuthError(null);
        } else {
          setAuthError(`Access denied. Please sign in with a @tufts.edu email or whitelisted account.`);
          await signOut();
          setSession(null);
          setUser(null);
          setIsAdmin(false);
        }
      } else {
        setSession(null);
        setUser(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  // Refresh session on window focus
  useEffect(() => {
    const handleFocus = async () => {
      console.log('Window focused, refreshing session...');
      const currentSession = await getSession();
      if (currentSession) {
        setSession(currentSession);
        setUser(currentSession.user);
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const handleSignIn = async () => {
    try {
      setAuthError(null);
      await signInWithGoogle();
    } catch (error) {
      setAuthError(error.message);
      console.error('Sign in error:', error);
    }
  };

  const handlePasswordSignIn = async (email, password) => {
    try {
      setAuthError(null);
      await signInWithPassword(email, password);
    } catch (error) {
      setAuthError(error.message);
      console.error('Password sign-in error:', error);
      throw error;
    }
  };

  const handlePasswordSignUp = async (email, password) => {
    try {
      setAuthError(null);
      await signUpWithPassword(email, password);
    } catch (error) {
      setAuthError(error.message);
      console.error('Password sign-up error:', error);
      throw error;
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setUser(null);
      setSession(null);
      setIsAdmin(false);
      setAuthError(null);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const value = {
    user,
    session,
    loading,
    isAdmin,
    authError,
    signIn: handleSignIn,
    signInWithPassword: handlePasswordSignIn,
    signUpWithPassword: handlePasswordSignUp,
    signOut: handleSignOut,
    isShowcaseMode: isShowcaseMode(),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

