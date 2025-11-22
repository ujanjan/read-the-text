import React, { useState } from 'react';
import { apiService } from '../services/apiService';
import type { SessionData } from '../types/session';

interface LandingPageProps {
  onStartQuiz: (sessionId: string, passageOrder: number[], isResume: boolean, resumeData?: SessionData) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onStartQuiz }) => {
  const [nickname, setNickname] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [existingSession, setExistingSession] = useState<{
    sessionId: string;
    currentPassageIndex: number;
    passageOrder: number[];
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim() || !agreed) return;

    setLoading(true);
    setError('');

    try {
      const checkResult = await apiService.checkNickname(nickname.trim());

      if (checkResult.exists) {
        if (checkResult.status === 'completed') {
          // Redirect to results
          window.location.href = `/results/${checkResult.sessionId}`;
          return;
        } else {
          // Show resume modal
          setExistingSession({
            sessionId: checkResult.sessionId!,
            currentPassageIndex: checkResult.currentPassageIndex!,
            passageOrder: checkResult.passageOrder!
          });
          setShowResumeModal(true);
        }
      } else {
        // Create new session
        const newSession = await apiService.createSession(nickname.trim());
        onStartQuiz(newSession.sessionId, newSession.passageOrder, false);
      }
    } catch (err) {
      setError('Failed to connect to server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResume = async () => {
    if (!existingSession) return;

    try {
      const sessionData = await apiService.getSession(existingSession.sessionId);
      onStartQuiz(
        existingSession.sessionId,
        existingSession.passageOrder,
        true,
        sessionData
      );
      setShowResumeModal(false);
    } catch (err) {
      setError('Failed to load session data.');
    }
  };

  const handleStartFresh = async () => {
    if (!existingSession) return;

    try {
      // Delete old session and create new
      await apiService.deleteSession(existingSession.sessionId);
      const newSession = await apiService.createSession(nickname.trim());
      onStartQuiz(newSession.sessionId, newSession.passageOrder, false);
      setShowResumeModal(false);
    } catch (err) {
      setError('Failed to create new session.');
    }
  };

  return (
    <div className="landing-page">
      <div className="landing-container">
        <h1>Reading Comprehension Study</h1>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="nickname">Enter your nickname:</label>
            <input
              id="nickname"
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="e.g., JohnDoe123"
              required
              disabled={loading}
            />
            <p className="tip-text">
              Tip: You can continue a past session or view your results by entering your previous nickname.
            </p>
          </div>

          <div className="requirements-box">
            <h3>Requirements</h3>
            <ul>
              <li>Use a desktop browser</li>
              <li>Use a mouse if possible</li>
            </ul>
          </div>

          <div className="data-notice-box">
            <h3>Data Collection Notice</h3>
            <p>This study records the following data for research purposes:</p>
            <ul>
              <li>Cursor movements and reading patterns</li>
              <li>Time spent on each passage</li>
              <li>Answer attempts and responses</li>
              <li>Screenshots of reading behavior heatmaps</li>
            </ul>
            <p>Your data will be stored securely and used only for research analysis.</p>
          </div>

          <div className="consent-checkbox">
            <label>
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                disabled={loading}
              />
              I agree to the data collection and understand my reading patterns will be recorded
            </label>
          </div>

          {error && <div className="error-message">{error}</div>}

          <button
            type="submit"
            disabled={!nickname.trim() || !agreed || loading}
            className="start-button"
          >
            {loading ? 'Loading...' : 'Start Quiz'}
          </button>
        </form>
      </div>

      {/* Resume Modal */}
      {showResumeModal && existingSession && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Session Found</h2>
            <p>
              You have an incomplete session ({existingSession.currentPassageIndex}/10 passages completed).
            </p>
            <p>Would you like to continue or start fresh?</p>
            <div className="modal-actions">
              <button onClick={handleResume} className="primary-button">
                Continue Session
              </button>
              <button onClick={handleStartFresh} className="secondary-button">
                Start Fresh
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
