import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { debugLog } from '../utils/logger';

// Session storage key (must match App.tsx)
const SESSION_STORAGE_KEY = 'quiz_session_state';

export const QuitPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Clear session storage to reset the quiz state
    sessionStorage.removeItem(SESSION_STORAGE_KEY);

    // Also clear any other quiz-related storage
    sessionStorage.clear();

    debugLog('🚪 Session cleared, redirecting to landing page...');

    // Redirect to landing page
    navigate('/', { replace: true });
  }, [navigate]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <p>Ending session...</p>
    </div>
  );
};
