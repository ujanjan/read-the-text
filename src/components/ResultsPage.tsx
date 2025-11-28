import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiService } from '../services/apiService';
import type { SessionData, PassageAttempt } from '../types/session';
import { Download } from 'lucide-react';

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

  // Helper function to format demographic labels
  const formatUniversity = (value?: string) => {
    if (!value) return null;
    switch (value) {
      case 'yes': return 'Yes';
      case 'no': return 'No';
      case 'currently_attending': return 'Currently attending';
      default: return value;
    }
  };

  const formatEnglishFluency = (value?: string) => {
    if (!value) return null;
    switch (value) {
      case 'first_language': return 'English is my first language';
      case 'young_age': return 'Learned at a young age';
      case 'high_school': return 'Learned in high school';
      case 'university': return 'Learned at university';
      case 'not_at_all': return 'Not at all';
      default: return value;
    }
  };

  const formatSwesat = (value?: string) => {
    if (!value) return null;
    switch (value) {
      case 'yes': return 'Yes';
      case 'no': return 'No';
      case 'unsure': return "Don't know";
      default: return value;
    }
  };

  const hasDemographics = session.age || session.has_attended_university || session.english_fluency;

  return (
    <div className="results-page">
      <div className="results-container">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1>Quiz Results</h1>
            <p className="email-display">Participant: {session.email}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                // Create summary JSON (excluding heavy cursor history)
                const summaryData = {
                  ...sessionData,
                  passageResults: sessionData.passageResults.map(({ cursor_history, ...rest }) => rest)
                };
                const blob = new Blob([JSON.stringify(summaryData, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `summary_${session.id}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <Download className="h-4 w-4" />
              Download Summary
            </button>
            <button
              onClick={() => {
                // Create cursor data JSON
                const cursorData = sessionData.passageResults.reduce((acc, result) => {
                  if (result.cursor_history) {
                    acc[`passage_${result.passage_index}`] = result.cursor_history;
                  }
                  return acc;
                }, {} as Record<string, any[]>);

                const blob = new Blob([JSON.stringify(cursorData, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `cursor_data_${session.id}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors text-sm font-medium"
            >
              <Download className="h-4 w-4" />
              Download Cursor Data
            </button>
          </div>
        </div>

        {/* Demographics Section */}
        {hasDemographics && (
          <div className="demographics-card">
            <h2>Your Profile</h2>
            <div className="demographics-grid">
              {session.age && (
                <div className="demo-item">
                  <span className="demo-label">Age:</span>
                  <span className="demo-value">{session.age}</span>
                </div>
              )}
              {session.has_attended_university && (
                <div className="demo-item">
                  <span className="demo-label">University:</span>
                  <span className="demo-value">{formatUniversity(session.has_attended_university)}</span>
                </div>
              )}
              {session.english_fluency && (
                <div className="demo-item">
                  <span className="demo-label">English Fluency:</span>
                  <span className="demo-value">{formatEnglishFluency(session.english_fluency)}</span>
                </div>
              )}
              {session.first_language && (
                <div className="demo-item">
                  <span className="demo-label">First Language:</span>
                  <span className="demo-value">{session.first_language}</span>
                </div>
              )}
              {session.completed_swesat && (
                <div className="demo-item">
                  <span className="demo-label">SWESAT Experience:</span>
                  <span className="demo-value">{formatSwesat(session.completed_swesat)}</span>
                </div>
              )}
            </div>
          </div>
        )}

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
                    {attempt.screenshot && (
                      <img
                        src={attempt.screenshot}
                        alt={`Attempt ${attempt.attempt_number} heatmap`}
                        className="attempt-screenshot"
                      />
                    )}
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
