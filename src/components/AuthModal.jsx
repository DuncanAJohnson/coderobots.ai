/**
 * Authentication Modal Component
 * Displays Google sign-in UI with error handling
 */

import { useAuth } from '../contexts/AuthContext';
import './AuthModal.css';

const AuthModal = ({ visible, onClose }) => {
  const { signIn, authError } = useAuth();

  if (!visible) return null;

  const handleGoogleSignIn = async () => {
    await signIn();
  };

  return (
    <div className={`auth-modal-overlay ${visible ? 'visible' : ''}`}>
      <div className="auth-modal">
        <h2>Welcome to the EN1 AI Editor</h2>
        <p>Please sign in to continue.</p>

        {authError && (
          <div className="auth-error">
            {authError}
          </div>
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

