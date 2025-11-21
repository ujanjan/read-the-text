import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiService } from '../services/apiService';
import type { SessionData, PassageAttempt } from '../types/session';

export const ResultsPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPassage, setSelectedPassage] = useState<number | null>(null);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const data = await apiService.getSession(sessionId!);
        setSessionData(data);
      } catch (err) {
        setError('Session not found');
      } finally {
        setLoading(false);
      }
    };

    if (sessionId) {
      fetchSession();
    }
  }, [sessionId]);

  if (loading) {
    return (
      <div className="results-page">
        <div className="loading">Loading results...</div>
      </div>
    );
  }

  if (error || !sessionData) {
    return (
      <div className="results-page">
        <div className="error-message">{error || 'No data found'}</div>
      </div>
    );
  }

  const { session, passageResults, attempts } = sessionData;

  // Calculate stats
  const completedPassages = passageResults.filter((p) => p.is_complete).length;
  const perfectPassages = passageResults.filter((p) => p.wrong_attempts === 0 && p.is_complete).length;
  const totalTime = passageResults.reduce((sum, p) => sum + (p.time_spent_ms || 0), 0);

  // Group attempts by passage
  const attemptsByPassage: Record<number, PassageAttempt[]> = {};
  attempts.forEach((attempt) => {
    if (!attemptsByPassage[attempt.passage_index]) {
      attemptsByPassage[attempt.passage_index] = [];
    }
    attemptsByPassage[attempt.passage_index].push(attempt);
  });

  return (
    <div className="results-page">
      <div className="results-container">
        <h1>Quiz Results</h1>
        <p className="nickname-display">Participant: {session.nickname}</p>

        <div className="stats-summary">
          <div className="stat-card">
            <span className="stat-value">{completedPassages}/10</span>
            <span className="stat-label">Completed</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{Math.round((perfectPassages / 10) * 100)}%</span>
            <span className="stat-label">Accuracy</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{formatTime(totalTime)}</span>
            <span className="stat-label">Total Time</span>
          </div>
        </div>

        <h2>Reading Pattern Analysis</h2>
        <div className="passage-grid">
          {session.passageOrder.map((passageId: number, index: number) => {
            const result = passageResults.find((r) => r.passage_index === index);

            return (
              <div
                key={index}
                className={`passage-card ${result?.is_complete ? 'complete' : 'incomplete'}`}
                onClick={() => setSelectedPassage(index)}
              >
                {result?.screenshot && (
                  <img src={result.screenshot} alt={`Passage ${index + 1}`} />
                )}
                <div className="passage-info">
                  <h3>Passage {index + 1}</h3>
                  {result?.is_complete ? (
                    <>
                      <p className={result.wrong_attempts === 0 ? 'perfect' : 'attempts'}>
                        {result.wrong_attempts === 0 ? 'Perfect!' : `${result.wrong_attempts} wrong attempts`}
                      </p>
                      <p className="time">{formatTime(result.time_spent_ms)}</p>
                    </>
                  ) : (
                    <p className="incomplete-text">Not completed</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Detailed view modal */}
        {selectedPassage !== null && (
          <div className="modal-overlay" onClick={() => setSelectedPassage(null)}>
            <div className="modal large" onClick={(e) => e.stopPropagation()}>
              <h2>Passage {selectedPassage + 1} Details</h2>

              {/* Screenshot */}
              {passageResults.find((r) => r.passage_index === selectedPassage)?.screenshot && (
                <img
                  src={passageResults.find((r) => r.passage_index === selectedPassage)!.screenshot}
                  alt="Heatmap"
                  className="full-screenshot"
                />
              )}

              {/* All attempts with Gemini responses */}
              <div className="attempts-list">
                <h3>Your Attempts</h3>
                {attemptsByPassage[selectedPassage]?.map((attempt, idx) => (
                  <div key={idx} className={`attempt-card ${attempt.is_correct ? 'correct' : 'wrong'}`}>
                    <div className="attempt-header">
                      <span>Attempt {attempt.attempt_number}</span>
                      <span className={attempt.is_correct ? 'correct-badge' : 'wrong-badge'}>
                        {attempt.is_correct ? 'Correct' : 'Wrong'}
                      </span>
                    </div>
                    <p><strong>Selected:</strong> {attempt.selected_answer}</p>
                    {attempt.gemini_response && (
                      <div className="gemini-feedback">
                        <strong>Feedback:</strong>
                        <p>{attempt.gemini_response}</p>
                      </div>
                    )}
                  </div>
                )) || <p>No attempts recorded</p>}
              </div>

              <button onClick={() => setSelectedPassage(null)} className="close-button">
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return minutes > 0
    ? `${minutes}m ${remainingSeconds}s`
    : `${seconds}s`;
}
