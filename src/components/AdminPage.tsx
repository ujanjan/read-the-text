import React, { useEffect, useState } from 'react';
import { apiService } from '../services/apiService';
import type { AdminSession } from '../types/session';
import { useNavigate } from 'react-router-dom';

export const AdminPage: React.FC = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('');

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
                <th>Email</th>
                <th>Status</th>
                <th>Progress</th>
                <th>Created</th>
                <th>Total Time</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => (
                <tr key={session.id} onClick={() => navigate(`/results/${session.id}`)} className="cursor-pointer hover:bg-gray-50">
                  <td>{session.email}</td>
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
