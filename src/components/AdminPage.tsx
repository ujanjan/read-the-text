import React, { useEffect, useState } from 'react';
import { apiService } from '../services/apiService';
import type { AdminSession, SessionData, PassageAttempt } from '../types/session';

export const AdminPage: React.FC = () => {
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('');
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [sessionDetail, setSessionDetail] = useState<SessionData | null>(null);
  const [selectedPassage, setSelectedPassage] = useState<number | null>(null);

  useEffect(() => {
    fetchSessions();
  }, [filter]);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const data = await apiService.getAdminSessions(filter || undefined);
      setSessions(data.sessions);
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this session?')) return;

    try {
      await apiService.deleteAdminSession(sessionId);
      fetchSessions();
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  };

  const handleViewDetails = async (sessionId: string) => {
    try {
      const data = await apiService.getAdminSessionDetail(sessionId);
      setSessionDetail(data);
      setSelectedSession(sessionId);
    } catch (err) {
      console.error('Failed to fetch session details:', err);
    }
  };

  // Group attempts by passage for detail view
  const attemptsByPassage: Record<number, PassageAttempt[]> = {};
  if (sessionDetail) {
    sessionDetail.attempts.forEach((attempt) => {
      if (!attemptsByPassage[attempt.passage_index]) {
        attemptsByPassage[attempt.passage_index] = [];
      }
      attemptsByPassage[attempt.passage_index].push(attempt);
    });
  }

  return (
    <div className="admin-page">
      <div className="admin-container">
        <h1>Admin Dashboard</h1>

        <div className="admin-controls">
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">All Sessions</option>
            <option value="completed">Completed</option>
            <option value="in_progress">In Progress</option>
          </select>
          <button onClick={fetchSessions} className="refresh-button">
            Refresh
          </button>
        </div>

        {loading ? (
          <p className="loading">Loading...</p>
        ) : sessions.length === 0 ? (
          <p className="no-data">No sessions found</p>
        ) : (
          <table className="sessions-table">
            <thead>
              <tr>
                <th>Nickname</th>
                <th>Status</th>
                <th>Progress</th>
                <th>Created</th>
                <th>Total Time</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => (
                <tr key={session.id} onClick={() => handleViewDetails(session.id)}>
                  <td>{session.nickname}</td>
                  <td>
                    <span className={`status-badge ${session.status}`}>
                      {session.status === 'in_progress' ? 'In Progress' : 'Completed'}
                    </span>
                  </td>
                  <td>{session.completed_passages}/{session.total_passages}</td>
                  <td>{new Date(session.created_at).toLocaleDateString()}</td>
                  <td>{session.total_time_ms ? formatTime(session.total_time_ms) : '-'}</td>
                  <td>
                    <button
                      onClick={(e) => handleDelete(session.id, e)}
                      className="delete-button"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Session detail modal */}
        {selectedSession && sessionDetail && (
          <div className="modal-overlay" onClick={() => {
            setSelectedSession(null);
            setSelectedPassage(null);
          }}>
            <div className="modal large" onClick={(e) => e.stopPropagation()}>
              <h2>{sessionDetail.session.nickname}'s Session</h2>

              <div className="session-stats">
                <p><strong>Status:</strong> {sessionDetail.session.status}</p>
                <p><strong>Total Time:</strong> {formatTime(sessionDetail.session.total_time_ms)}</p>
                <p><strong>Created:</strong> {new Date(sessionDetail.session.created_at).toLocaleString()}</p>
              </div>

              <h3>Passages</h3>
              <div className="passage-list">
                {sessionDetail.session.passageOrder.map((passageId: number, index: number) => {
                  const result = sessionDetail.passageResults.find((r) => r.passage_index === index);

                  return (
                    <div
                      key={index}
                      className={`passage-item ${result?.is_complete ? 'complete' : 'incomplete'}`}
                      onClick={() => setSelectedPassage(selectedPassage === index ? null : index)}
                    >
                      <div className="passage-header">
                        <span>Passage {index + 1}</span>
                        {result?.is_complete && (
                          <span className="passage-stats">
                            {result.wrong_attempts} wrong | {formatTime(result.time_spent_ms)}
                          </span>
                        )}
                      </div>

                      {selectedPassage === index && (
                        <div className="passage-details">
                          {result?.screenshot && (
                            <img src={result.screenshot} alt="Heatmap" className="detail-screenshot" />
                          )}
                          <div className="attempts-section">
                            <h4>Attempts</h4>
                            {attemptsByPassage[index]?.map((attempt, idx) => (
                              <div key={idx} className={`attempt-item ${attempt.is_correct ? 'correct' : 'wrong'}`}>
                                <p><strong>#{attempt.attempt_number}:</strong> {attempt.selected_answer}</p>
                                {attempt.gemini_response && (
                                  <p className="feedback">{attempt.gemini_response}</p>
                                )}
                              </div>
                            )) || <p>No attempts</p>}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <button
                onClick={() => {
                  setSelectedSession(null);
                  setSelectedPassage(null);
                }}
                className="close-button"
              >
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
