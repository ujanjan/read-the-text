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
        {/* Header */}
        <div className="landing-header">
          <h1>📚 Reading Comprehension Research Study</h1>
          <div className="course-info">
            <p>Part of <strong>DM2730 Technology Enhanced Learning</strong></p>
            <p>KTH Royal Institute of Technology</p>
            <a href="https://www.kth.se/student/kurser/kurs/DM2730?l=en" target="_blank" rel="noopener noreferrer">
              View Course Information →
            </a>
          </div>
        </div>

        {/* Contact */}
        <div className="contact-info">
          <p>📧 Questions? Contact us at: <strong>user@kth.se</strong></p>
        </div>

        {/* About Section */}
        <div className="about-section">
          <h2>About This Study</h2>
          <p><strong>What you'll do:</strong></p>
          <ul>
            <li>Read 10 short passages</li>
            <li>Answer comprehension questions</li>
            <li>Your cursor movements will be tracked while you read</li>
          </ul>
          <p><strong>Requirements:</strong></p>
          <ul>
            <li>✅ Use a desktop or laptop computer</li>
            <li>✅ Use a mouse if possible (trackpads work but mouse is better)</li>
            <li>⏱️ Takes about 20-30 minutes to complete</li>
          </ul>
          <div className="important-tip">
            <p>🖱️ <strong>Important:</strong> SHOW YOUR EYESIGHT WITH THE CURSOR</p>
            <p>Move your cursor as you read each line. This helps us understand your reading patterns!</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <h2>Your Information</h2>

          {/* Email */}
          <div className="input-group">
            <label htmlFor="email">Email Address *</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your.email@example.com"
              required
              disabled={loading}
            />
            <p className="tip-text">
              💡 Save this email! You can use it to resume your session or view your results later.
            </p>
          </div>

          {/* Age */}
          <div className="input-group">
            <label htmlFor="age">Age *</label>
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

          {/* University */}
          <div className="input-group">
            <label>Have you attended university? *</label>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  name="university"
                  value="yes"
                  checked={university === 'yes'}
                  onChange={(e) => setUniversity(e.target.value as 'yes')}
                  disabled={loading}
                  required
                />
                Yes
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="university"
                  value="currently_attending"
                  checked={university === 'currently_attending'}
                  onChange={(e) => setUniversity(e.target.value as 'currently_attending')}
                  disabled={loading}
                  required
                />
                Currently attending
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="university"
                  value="no"
                  checked={university === 'no'}
                  onChange={(e) => setUniversity(e.target.value as 'no')}
                  disabled={loading}
                  required
                />
                No
              </label>
            </div>
          </div>

          {/* English Fluency */}
          <div className="input-group">
            <label>How fluent are you in English? *</label>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  name="englishFluency"
                  value="first_language"
                  checked={englishFluency === 'first_language'}
                  onChange={(e) => setEnglishFluency(e.target.value as 'first_language')}
                  disabled={loading}
                  required
                />
                English is my first language
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="englishFluency"
                  value="young_age"
                  checked={englishFluency === 'young_age'}
                  onChange={(e) => setEnglishFluency(e.target.value as 'young_age')}
                  disabled={loading}
                  required
                />
                Learned at a young age
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="englishFluency"
                  value="high_school"
                  checked={englishFluency === 'high_school'}
                  onChange={(e) => setEnglishFluency(e.target.value as 'high_school')}
                  disabled={loading}
                  required
                />
                Learned in high school
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="englishFluency"
                  value="university"
                  checked={englishFluency === 'university'}
                  onChange={(e) => setEnglishFluency(e.target.value as 'university')}
                  disabled={loading}
                  required
                />
                Learned at university
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="englishFluency"
                  value="not_at_all"
                  checked={englishFluency === 'not_at_all'}
                  onChange={(e) => setEnglishFluency(e.target.value as 'not_at_all')}
                  disabled={loading}
                  required
                />
                Not at all
              </label>
            </div>
          </div>

          {/* First Language - Conditional */}
          {englishFluency && englishFluency !== 'first_language' && (
            <div className="input-group">
              <label htmlFor="firstLanguage">If English is not your first language, what is? *</label>
              <input
                id="firstLanguage"
                type="text"
                value={firstLanguage}
                onChange={(e) => setFirstLanguage(e.target.value)}
                placeholder="e.g., Swedish, Spanish, Mandarin..."
                required
                disabled={loading}
                maxLength={100}
              />
            </div>
          )}

          {/* SWESAT */}
          <div className="input-group">
            <label>Have you ever completed a SWESAT (Högskoleprovet) before? *</label>
            <p className="help-text">The SWESAT (Högskoleprovet) is the Swedish university admission test</p>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  name="swesat"
                  value="yes"
                  checked={swesat === 'yes'}
                  onChange={(e) => setSwesat(e.target.value as 'yes')}
                  disabled={loading}
                  required
                />
                Yes
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="swesat"
                  value="no"
                  checked={swesat === 'no'}
                  onChange={(e) => setSwesat(e.target.value as 'no')}
                  disabled={loading}
                  required
                />
                No
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="swesat"
                  value="unsure"
                  checked={swesat === 'unsure'}
                  onChange={(e) => setSwesat(e.target.value as 'unsure')}
                  disabled={loading}
                  required
                />
                What's that?
              </label>
            </div>
          </div>

          {/* Data Collection Notice */}
          <div className="data-notice-box">
            <h3>What Data We Collect</h3>
            <p>We will record and save the following information:</p>

            <p><strong>📍 Your Reading Behavior:</strong></p>
            <ul>
              <li>Where your cursor moves on the screen</li>
              <li>How long you spend on each passage</li>
              <li>Heatmaps showing where you focused while reading</li>
            </ul>

            <p><strong>✍️ Your Answers:</strong></p>
            <ul>
              <li>Which answers you select</li>
              <li>How many attempts it takes to get the right answer</li>
              <li>Time spent on each question</li>
            </ul>

            <p><strong>📋 Background Information:</strong></p>
            <ul>
              <li>Email address</li>
              <li>Age</li>
              <li>Education level</li>
              <li>English fluency</li>
              <li>First language (if not English)</li>
              <li>SWESAT experience</li>
            </ul>

            <p><strong>📸 Visual Records:</strong></p>
            <ul>
              <li>Screenshots showing your reading patterns with heatmap overlays</li>
              <li>These help us see which parts you read carefully</li>
            </ul>

            <p><strong>How we use your data:</strong></p>
            <ul>
              <li>All data is used only for research purposes</li>
              <li>Your information is stored securely</li>
              <li>Results may be used in academic publications (anonymized)</li>
              <li>You can request your data by emailing user@kth.se</li>
            </ul>
          </div>

          {/* Consent */}
          <div className="consent-checkbox">
            <label>
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                disabled={loading}
              />
              I am at least 18 years old and agree to participate in this research study.
              I understand that my reading patterns, cursor movements, answers, and
              background information will be recorded and used for academic research purposes.
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

        {/* Footer */}
        <div className="landing-footer">
          <p>DM2730 Technology Enhanced Learning</p>
          <p>KTH Royal Institute of Technology</p>
          <p>📧 user@kth.se | 🔗 <a href="https://www.kth.se/student/kurser/kurs/DM2730?l=en" target="_blank" rel="noopener noreferrer">kth.se/student/kurser/kurs/DM2730</a></p>
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
