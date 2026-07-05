/**
 * Authentication Modal Component
 * Displays email/password sign-in and sign-up UI
 */

import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import './ModalBase.css';
import './AuthModal.css';

const AuthModal = ({ visible }) => {
  const { signInWithPassword, signUpWithPassword, authError } = useAuth();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  if (!visible) return null;

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
        <h2>{t('authWelcome')}</h2>
        <p>{t('authSignInPrompt')}</p>

        {authError && (
          <div className="auth-error">
            {authError}
          </div>
        )}

        <form onSubmit={handlePasswordAuth} className="auth-form">
          <input
            type="email"
            placeholder={t('email')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="auth-input"
          />
          <input
            type="password"
            placeholder={t('password')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="auth-input"
          />
          <button type="submit" className="auth-button password-button">
            {isSignUp ? t('signUp') : t('signIn')}
          </button>
        </form>

        <button
          type="button"
          onClick={() => setIsSignUp(!isSignUp)}
          className="auth-toggle-button"
        >
          {isSignUp ? t('authHaveAccount') : t('authNeedAccount')}
        </button>
      </div>
    </div>
  );
};

export default AuthModal;
