import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiService } from '../services/apiService';
import type { SessionData } from '../types/session';

export const ResultsPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
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
        <div className="mb-6">
          <h1>Quiz Results</h1>
          <p className="email-display">Participant: {session.email}</p>
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

        <div className="flex justify-center mb-12">
          <Link
            to={`/report/${sessionId}`}
            className="group relative inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-full font-semibold text-base shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5"
            style={{
              backgroundColor: '#4f46e5', // Fallback color (indigo-600)
              color: 'white',
              padding: '0.75rem 1.5rem',
              borderRadius: '9999px',
              fontWeight: 600,
              fontSize: '1rem',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
              transition: 'all 0.2s ease-in-out'
            }}
          >
            <span className="text-lg">✨</span>
            <span>Generate Reading Insights Report</span>
          </Link>
        </div>

        <h2>Reading Pattern Analysis</h2>
        <div className="passage-grid">
          {session.passageOrder.map((passageId: number, index: number) => {
            const result = passageResults.find((r) => r.passage_index === index);

            return (
              <Link
                key={index}
                to={`/results/${sessionId}/${index + 1}`}
                className={`passage-card ${result?.is_complete ? 'complete' : 'incomplete'}`}
                target="_blank"
                rel="noopener noreferrer"
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
                  ) : result ? (
                    <>
                      <p className="incomplete-text">In progress</p>
                      {result.wrong_attempts > 0 && (
                        <p className="attempts">{result.wrong_attempts} attempts so far</p>
                      )}
                      {result.time_spent_ms > 0 && (
                        <p className="time">{formatTime(result.time_spent_ms)}</p>
                      )}
                    </>
                  ) : (
                    <p className="incomplete-text">Not started</p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>

        {/* Questionnaire Responses Section */}
        {questionnaireResponse && (
          <div className="questionnaire-section">
            <h2>Your Feedback</h2>
            <div className="questionnaire-responses">
              {questionnaireResponse.question_1_response && (
                <div className="questionnaire-item">
                  <h3 className="questionnaire-question">
                    1. What is your impression of the interface, as a tool for independent learning?
                  </h3>
                  <p className="questionnaire-answer">
                    {questionnaireResponse.question_1_response}
                  </p>
                </div>
              )}
              {questionnaireResponse.question_2_response && (
                <div className="questionnaire-item">
                  <h3 className="questionnaire-question">
                    2. What are your thoughts on the AI-generated feedback?
                  </h3>
                  <p className="questionnaire-answer">
                    {questionnaireResponse.question_2_response}
                  </p>
                </div>
              )}
              {questionnaireResponse.question_3_response && (
                <div className="questionnaire-item">
                  <h3 className="questionnaire-question">
                    3. Please share any general feedback you have about the application as a tool for learning?
                  </h3>
                  <p className="questionnaire-answer">
                    {questionnaireResponse.question_3_response}
                  </p>
                </div>
              )}
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
