
import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { apiService } from '../services/apiService';
import type { SessionData } from '../types/session';
import { maskEmail } from '../utils/emailMask';

export const ResultsPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
      <div className="admin-page">
        <div className="admin-container">
          <p className="loading">Loading results...</p>
        </div>
      </div>
    );
  }

  if (error || !sessionData) {
    return (
      <div className="admin-page">
        <div className="admin-container">
          <p className="text-red-500">{error || 'No data found'}</p>
          <Link to="/admin" className="back-link">← Back to Admin</Link>
        </div>
      </div>
    );
  }

  const { session, passageResults, questionnaireResponse } = sessionData;

  // Calculate stats
  const completedPassages = passageResults.filter((p) => p.is_complete).length;
  const perfectPassages = passageResults.filter((p) => p.wrong_attempts === 0 && p.is_complete).length;
  const totalTime = passageResults.reduce((sum, p) => sum + (p.time_spent_ms || 0), 0);

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
      case 'first_language': return 'Native/First';
      case 'young_age': return 'Young Age';
      case 'high_school': return 'High School';
      case 'university': return 'University';
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
    <div className="admin-page">
      <div className="admin-container" style={{ maxWidth: '1200px' }}>
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1>Participant Results</h1>
            <p className="text-sm text-gray-500 mt-1">{maskEmail(session.email)}</p>
          </div>
          <Link to="/admin" className="back-link">← Back to Admin</Link>
        </div>

        {/* Profile Section */}
        {hasDemographics && (
          <section className="admin-section">
            <h2>👤 Profile & Demographics</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4">
              {(session.age || 0) > 0 && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <span className="text-xs text-gray-500 uppercase tracking-wide block mb-1">Age</span>
                  <span className="font-semibold text-gray-800">{session.age}</span>
                </div>
              )}
              {session.has_attended_university && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <span className="text-xs text-gray-500 uppercase tracking-wide block mb-1">University</span>
                  <span className="font-semibold text-gray-800">{formatUniversity(session.has_attended_university)}</span>
                </div>
              )}
              {session.first_language && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <span className="text-xs text-gray-500 uppercase tracking-wide block mb-1">First Language</span>
                  <span className="font-semibold text-gray-800">{session.first_language}</span>
                </div>
              )}
              {session.english_fluency && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <span className="text-xs text-gray-500 uppercase tracking-wide block mb-1">English Fluency</span>
                  <span className="font-semibold text-gray-800">{formatEnglishFluency(session.english_fluency)}</span>
                </div>
              )}
              {session.completed_swesat && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <span className="text-xs text-gray-500 uppercase tracking-wide block mb-1">SWESAT</span>
                  <span className="font-semibold text-gray-800">{formatSwesat(session.completed_swesat)}</span>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Overview Stats */}
        <section className="admin-section">
          <div className="flex justify-between items-center mb-4">
            <h2>📊 Performance Overview</h2>
            <Link
              to={`/report/${sessionId}`}
              className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <span>✨ Generate Reading Report</span>
            </Link>
          </div>
          <div className="stats-grid">
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
        </section>

        {/* Passage Analysis */}
        <section className="admin-section">
          <h2>📚 Reading Pattern Analysis</h2>
          <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1.5rem' }}>
            Detailed breakdown of each passage attempt. Click to view full details.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {session.passageOrder.map((passageId: number, index: number) => {
              const result = passageResults.find((r) => r.passage_index === index);
              const isComplete = result?.is_complete;
              const isPerfect = isComplete && result?.wrong_attempts === 0;

              return (
                <Link
                  key={index}
                  to={`/results/${sessionId}/${index + 1}`}
                  className={`
                                        block p-4 rounded-lg border transition-all hover:shadow-md
                                        ${isComplete
                      ? 'bg-white border-gray-200 hover:border-blue-300'
                      : 'bg-gray-50 border-gray-200 opacity-60'
                    }
                                    `}
                  style={{ textDecoration: 'none' }}
                >
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-medium text-gray-900 m-0">Passage {index + 1}</h3>
                    {isComplete && (
                      <span className={`
                                                px-2 py-0.5 text-xs font-semibold rounded-full
                                                ${isPerfect ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}
                                            `}>
                        {isPerfect ? 'Perfect' : `${result.wrong_attempts} attempts`}
                      </span>
                    )}
                  </div>

                  {result?.screenshot && (
                    <div className="aspect-[4/3] w-full bg-gray-100 mb-3 rounded overflow-hidden">
                      <img src={result.screenshot} alt={`Passage ${index + 1}`} className="w-full h-full object-cover" />
                    </div>
                  )}

                  <div className="flex justify-between items-center text-sm text-gray-500">
                    <span>{isComplete ? formatTime(result.time_spent_ms) : 'Not started'}</span>
                    {isComplete && <span className="text-blue-600">View Details →</span>}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Feedback Section */}
        {questionnaireResponse && (
          <section className="admin-section">
            <h2>💬 User Feedback</h2>
            <div className="space-y-6 mt-4">
              {[
                { q: "Impression as a tool for independent learning?", a: questionnaireResponse.question_1_response },
                { q: "Thoughts on AI-generated feedback?", a: questionnaireResponse.question_2_response },
                { q: "General feedback?", a: questionnaireResponse.question_3_response }
              ].map((item, idx) => item.a && (
                <div key={idx} className="pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">{idx + 1}. {item.q}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{item.a}</p>
                </div>
              ))}
            </div>
          </section>
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
