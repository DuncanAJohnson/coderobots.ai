/**
 * Authentication Modal Component
 * Displays Google sign-in UI with error handling
 * In SHOWCASE mode, also displays username/password authentication
 */

import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './ModalBase.css';
import './AuthModal.css';

const AuthModal = ({ visible }) => {
  const { signIn, signInWithPassword, signUpWithPassword, authError, isShowcaseMode } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  if (!visible) return null;

  const handleGoogleSignIn = async () => {
    await signIn();
  };

  const handlePasswordAuth = async (e) => {
    e.preventDefault();
    try {
      if (isSignUp) {
        await signUpWithPassword(email, password);
      } else {
        await signInWithPassword(email, password);
      }
    } catch (error) {
      // Error is handled by AuthContext
      console.error('Password auth error:', error);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content auth-modal">
        <h2>Welcome to the EN1 AI Editor</h2>
        <p>Please sign in to continue.</p>

        {authError && (
          <div className="auth-error">
            {authError}
          </div>
        )}

        {isShowcaseMode && (
          <>
            <form onSubmit={handlePasswordAuth} className="auth-form">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="auth-input"
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="auth-input"
              />
              <button type="submit" className="auth-button password-button">
                {isSignUp ? 'Sign Up' : 'Sign In'}
              </button>
            </form>

            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="auth-toggle-button"
            >
              {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
            </button>

            <div className="auth-divider">
              <span>OR</span>
            </div>
          </>
        )}

        <button 
          className="auth-button" 
          onClick={handleGoogleSignIn}
        >
          <img 
            src="https://www.google.com/favicon.ico" 
            alt="Google icon" 
          />
          Sign in with Google
        </button>
      </div>
    </div>
  );
};

export default AuthModal;

