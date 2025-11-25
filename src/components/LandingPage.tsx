import React, { useState } from 'react';
import { apiService } from '../services/apiService';
import type { SessionData, UserDemographics } from '../types/session';

interface LandingPageProps {
  onStartQuiz: (sessionId: string, passageOrder: number[], isResume: boolean, resumeData?: SessionData) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onStartQuiz }) => {
  const [email, setEmail] = useState('');
  const [age, setAge] = useState('');
  const [university, setUniversity] = useState<'yes' | 'no' | 'currently_attending' | ''>('');
  const [englishFluency, setEnglishFluency] = useState<'not_at_all' | 'young_age' | 'high_school' | 'university' | 'first_language' | ''>('');
  const [firstLanguage, setFirstLanguage] = useState('');
  const [swesat, setSwesat] = useState<'yes' | 'no' | 'unsure' | ''>('');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [existingSession, setExistingSession] = useState<{
    sessionId: string;
    currentPassageIndex: number;
    passageOrder: number[];
  } | null>(null);
  const [showDataDetails, setShowDataDetails] = useState(false);

  // Validation
  const isFormValid = () => {
    if (!email.trim() || !agreed) return false;
    const ageNum = parseInt(age);
    if (!age || isNaN(ageNum) || ageNum < 18 || ageNum > 99) return false;
    if (!university) return false;
    if (!englishFluency) return false;
    if (englishFluency !== 'first_language' && !firstLanguage.trim()) return false;
    if (!swesat) return false;
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid()) return;

    setLoading(true);
    setError('');

    try {
      const checkResult = await apiService.checkEmail(email.trim());

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
        // Create new session with demographics
        const demographics: UserDemographics = {
          age: parseInt(age),
          hasAttendedUniversity: university as 'yes' | 'no' | 'currently_attending',
          englishFluency: englishFluency as 'not_at_all' | 'young_age' | 'high_school' | 'university' | 'first_language',
          firstLanguage: englishFluency === 'first_language' ? 'English' : firstLanguage.trim(),
          completedSwesat: swesat as 'yes' | 'no' | 'unsure'
        };
        const newSession = await apiService.createSession(email.trim(), demographics);
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
      // Delete old session and create new with demographics
      await apiService.deleteSession(existingSession.sessionId);
      const demographics: UserDemographics = {
        age: parseInt(age),
        hasAttendedUniversity: university as 'yes' | 'no' | 'currently_attending',
        englishFluency: englishFluency as 'not_at_all' | 'young_age' | 'high_school' | 'university' | 'first_language',
        firstLanguage: englishFluency === 'first_language' ? 'English' : firstLanguage.trim(),
        completedSwesat: swesat as 'yes' | 'no' | 'unsure'
      };
      const newSession = await apiService.createSession(email.trim(), demographics);
      onStartQuiz(newSession.sessionId, newSession.passageOrder, false);
      setShowResumeModal(false);
    } catch (err) {
      setError('Failed to create new session.');
    }
  };

  return (
    <div className="landing-page">
      <div className="landing-container">
        <div className="landing-grid">
          <div className="info-column">
            <div className="landing-header">
              <h1>Reading Comprehension Study</h1>
              <div className="course-info">
                <p>DM2730 Technology Enhanced Learning • KTH Royal Institute of Technology</p>
              </div>
            </div>

            <div className="about-section compact">
              <div className="feature-grid">
                <div className="feature-item">
                  <span className="feature-icon">📖</span>
                  <div className="feature-text">
                    <strong>Read & Answer</strong>
                    <p>10 short passages</p>
                  </div>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">⏱️</span>
                  <div className="feature-text">
                    <strong>~25 Minutes</strong>
                    <p>Complete in one sitting</p>
                  </div>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">💻</span>
                  <div className="feature-text">
                    <strong>Desktop Only</strong>
                    <p>Mouse recommended</p>
                  </div>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">👁️</span>
                  <div className="feature-text">
                    <strong>Eye Tracking</strong>
                    <p>Via cursor movement</p>
                  </div>
                </div>
              </div>

              <div className="important-tip">
                <p><strong>🖱️ Important:</strong> Please follow the text with your cursor as you read. This acts as a proxy for eye-tracking.</p>
              </div>
            </div>

            <div className="data-notice-box">
              <div 
                className="data-notice-header" 
                onClick={() => setShowDataDetails(!showDataDetails)}
                style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <h3>📋 Data Collection & Privacy</h3>
                <span style={{ fontSize: '0.8rem', color: '#3b82f6' }}>
                  {showDataDetails ? 'Hide Details' : 'Show Details'}
                </span>
              </div>
              
              {!showDataDetails && (
                <p className="data-summary">
                  We collect reading patterns, answers, and demographics for research purposes. 
                  All data is anonymized and stored securely.
                </p>
              )}

              {showDataDetails && (
                <div className="data-details">
                  <p><strong>We collect:</strong></p>
                  <ul className="compact-list">
                    <li>📍 <strong>Behavior:</strong> Cursor movement, time spent, heatmaps</li>
                    <li>✍️ <strong>Performance:</strong> Answers, attempts, timing</li>
                    <li>📋 <strong>Demographics:</strong> Age, education, language background</li>
                  </ul>
                  <p className="data-usage">
                    Data is used solely for academic research at KTH. 
                    Questions? Contact <a href="mailto:user@kth.se">user@kth.se</a>.
                  </p>
                </div>
              )}
            </div>
            
            <div className="contact-compact">
               <p>Questions? <a href="mailto:user@kth.se">user@kth.se</a> | <a href="https://www.kth.se/student/kurser/kurs/DM2730?l=en" target="_blank" rel="noopener noreferrer">Course Info</a></p>
            </div>
          </div>

          <div className="form-column">
            <form onSubmit={handleSubmit}>
              <h2>Your Information</h2>
              <div className="input-group">
                <label htmlFor="email">Enter your email:</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g., john@example.com"
                  required
                  disabled={loading}
                />
                <p className="tip-text">
                  Tip: You can continue a past session or view your results by entering your previous email.
                </p>
              </div>

              <div className="input-group">
                <label htmlFor="age">Age:</label>
                <input
                  id="age"
                  type="number"
                  min="18"
                  max="99"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="Enter your age"
                  required
                  disabled={loading}
                />
              </div>

              <div className="input-group">
                <label htmlFor="university">Have you attended university?</label>
                <select
                  id="university"
                  value={university}
                  onChange={(e) => setUniversity(e.target.value as any)}
                  required
                  disabled={loading}
                >
                  <option value="" disabled>Select an option</option>
                  <option value="yes">Yes</option>
                  <option value="currently_attending">Currently attending</option>
                  <option value="no">No</option>
                </select>
              </div>

              <div className="input-group">
                <label htmlFor="englishFluency">English Fluency:</label>
                <select
                  id="englishFluency"
                  value={englishFluency}
                  onChange={(e) => setEnglishFluency(e.target.value as any)}
                  required
                  disabled={loading}
                >
                  <option value="" disabled>Select an option</option>
                  <option value="first_language">English is my first language</option>
                  <option value="young_age">Learned at a young age</option>
                  <option value="high_school">Learned in high school</option>
                  <option value="university">Learned at university</option>
                  <option value="not_at_all">Not fluent</option>
                </select>
              </div>

              {englishFluency && englishFluency !== 'first_language' && (
                <div className="input-group">
                  <label htmlFor="firstLanguage">What is your first language?</label>
                  <input
                    id="firstLanguage"
                    type="text"
                    value={firstLanguage}
                    onChange={(e) => setFirstLanguage(e.target.value)}
                    placeholder="e.g., Swedish, Spanish..."
                    required
                    disabled={loading}
                    maxLength={100}
                  />
                </div>
              )}

              <div className="input-group">
                <label htmlFor="swesat">Have you taken the SWESAT (Högskoleprovet)?</label>
                <select
                  id="swesat"
                  value={swesat}
                  onChange={(e) => setSwesat(e.target.value as any)}
                  required
                  disabled={loading}
                >
                  <option value="" disabled>Select an option</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                  <option value="unsure">What's that?</option>
                </select>
              </div>

              <div className="consent-checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    disabled={loading}
                  />
                  I agree to data collection and recording of my reading patterns
                </label>
              </div>

              {error && <div className="error-message">{error}</div>}

              <button
                type="submit"
                disabled={!isFormValid() || loading}
                className="start-button"
              >
                {loading ? 'Loading...' : '🚀 Start the Study'}
              </button>
            </form>
          </div>
        </div>
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