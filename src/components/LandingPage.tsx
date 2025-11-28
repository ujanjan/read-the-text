import React, { useState } from 'react';
import { apiService } from '../services/apiService';
import type { SessionData, UserDemographics } from '../types/session';
import { useIsMobile } from './ui/use-mobile';
import { BookOpen, Clock, Monitor, Eye, Info } from 'lucide-react';

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
    const [linkCopied, setLinkCopied] = useState(false);
    const [mobileEmail, setMobileEmail] = useState('');
    const [mobileEmailSent, setMobileEmailSent] = useState(false);
    const [mobileEmailLoading, setMobileEmailLoading] = useState(false);
    const [mobileEmailError, setMobileEmailError] = useState('');
    const isMobile = useIsMobile();

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setLinkCopied(true);
            setTimeout(() => setLinkCopied(false), 3000);
        } catch (err) {
            const textArea = document.createElement('textarea');
            textArea.value = window.location.href;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            setLinkCopied(true);
            setTimeout(() => setLinkCopied(false), 3000);
        }
    };

    const handleSendLinkToEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!mobileEmail.trim()) return;

        setMobileEmailLoading(true);
        setMobileEmailError('');

        try {
            const result = await apiService.sendStudyLink(mobileEmail.trim());
            if (result.success) {
                setMobileEmailSent(true);
            } else {
                setMobileEmailError(result.error || 'Failed to send email. Please try again.');
            }
        } catch (err) {
            setMobileEmailError('Failed to send email. Please try again.');
        } finally {
            setMobileEmailLoading(false);
        }
    };

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
                    window.location.href = `/results/${checkResult.sessionId}`;
                    return;
                } else {
                    setExistingSession({
                        sessionId: checkResult.sessionId!,
                        currentPassageIndex: checkResult.currentPassageIndex!,
                        passageOrder: checkResult.passageOrder!
                    });
                    setShowResumeModal(true);
                }
            } else {
                const demographics: UserDemographics = {
                    age: parseInt(age),
                    hasAttendedUniversity: university as 'yes' | 'no' | 'currently_attending',
                    englishFluency: englishFluency as 'not_at_all' | 'young_age' | 'high_school' | 'university' | 'first_language',
                    firstLanguage: englishFluency === 'first_language' ? 'English' : firstLanguage.trim(),
                    completedSwesat: swesat as 'yes' | 'no' | 'unsure'
                };
                const newSession = await apiService.createSession(email.trim(), demographics);

                apiService.sendWelcomeEmail(email.trim()).catch(err => {
                    console.warn('Failed to send welcome email:', err);
                });

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
            await apiService.deleteSession(existingSession.sessionId);
            const demographics: UserDemographics = {
                age: parseInt(age),
                hasAttendedUniversity: university as 'yes' | 'no' | 'currently_attending',
                englishFluency: englishFluency as 'not_at_all' | 'young_age' | 'high_school' | 'university' | 'first_language',
                firstLanguage: englishFluency === 'first_language' ? 'English' : firstLanguage.trim(),
                completedSwesat: swesat as 'yes' | 'no' | 'unsure'
            };
            const newSession = await apiService.createSession(email.trim(), demographics);

            apiService.sendWelcomeEmail(email.trim()).catch(err => {
                console.warn('Failed to send welcome email:', err);
            });

            onStartQuiz(newSession.sessionId, newSession.passageOrder, false);
            setShowResumeModal(false);
        } catch (err) {
            setError('Failed to create new session.');
        }
    };

    if (isMobile) {
        return (
            <div className="mobile-warning-overlay">
                <div className="mobile-warning-modal">
                    <div className="mobile-warning-icon">💻</div>
                    <h1>Desktop Required</h1>
                    <p className="mobile-warning-text">
                        This reading comprehension study requires a <strong>desktop or laptop computer</strong> with a mouse.
                    </p>
                    <div className="mobile-warning-reasons">
                        <div className="reason-item">
                            <span className="reason-icon">🖱️</span>
                            <span>We track cursor movement as a proxy for eye-tracking</span>
                        </div>
                        <div className="reason-item">
                            <span className="reason-icon">📐</span>
                            <span>The interface is optimized for larger screens</span>
                        </div>
                        <div className="reason-item">
                            <span className="reason-icon">📊</span>
                            <span>Accurate data collection requires desktop environment</span>
                        </div>
                    </div>

                    <div className="mobile-email-section">
                        <h2>📧 Send Link to Your Email</h2>
                        {!mobileEmailSent ? (
                            <form onSubmit={handleSendLinkToEmail} className="mobile-email-form">
                                <input
                                    type="email"
                                    value={mobileEmail}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMobileEmail(e.target.value)}
                                    placeholder="your@email.com"
                                    required
                                    disabled={mobileEmailLoading}
                                    className="mobile-email-input"
                                />
                                {mobileEmailError && (
                                    <p className="mobile-email-error">{mobileEmailError}</p>
                                )}
                                <button
                                    type="submit"
                                    disabled={!mobileEmail.trim() || mobileEmailLoading}
                                    className="mobile-email-button"
                                >
                                    {mobileEmailLoading ? 'Sending...' : '📧 Send Me the Link'}
                                </button>
                            </form>
                        ) : (
                            <div className="mobile-email-success">
                                <span className="success-icon">✅</span>
                                <p>Link sent to <strong>{mobileEmail}</strong>!</p>
                                <p className="success-hint">Check your inbox and open the link on your desktop.</p>
                            </div>
                        )}
                    </div>

                    <div className="mobile-divider">
                        <span>or</span>
                    </div>

                    <div className="mobile-copy-section">
                        <h2>📋 Copy Link</h2>
                        <div className="copy-link-container">
                            <div className="link-display">{window.location.href}</div>
                            <button
                                onClick={handleCopyLink}
                                className={`copy-link-button ${linkCopied ? 'copied' : ''}`}
                            >
                                {linkCopied ? '✓ Copied!' : 'Copy'}
                            </button>
                        </div>
                        {linkCopied && (
                            <p className="copy-success-hint">
                                ✅ Link copied! Paste it in your desktop browser.
                            </p>
                        )}
                    </div>

                    <div className="mobile-warning-footer">
                        <p>DM2730 Technology Enhanced Learning • KTH</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-white px-8 py-12">
            <div className="w-full max-w-6xl mx-auto grid grid-cols-2 gap-16">
                {/* Left Column - Form */}
                <div className="flex flex-col">
                    <form id="user-info-form" onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-gray-700 mb-2 text-xs font-medium">Enter your email:</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                                placeholder="e.g., john@example.com"
                                required
                                disabled={loading}
                                className="w-full px-4 py-3 border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs disabled:bg-gray-50"
                                style={{ border: '1.5px solid #9ca3af' }}
                            />
                        </div>

                        <div>
                            <label className="block text-gray-700 mb-2 text-xs font-medium">Age:</label>
                            <input
                                type="number"
                                min="18"
                                max="99"
                                value={age}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAge(e.target.value)}
                                placeholder="Enter your age"
                                required
                                disabled={loading}
                                className="w-full px-4 py-3 border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs disabled:bg-gray-50"
                                style={{ border: '1.5px solid #9ca3af' }}
                            />
                        </div>

                        <div>
                            <label className="block text-gray-700 mb-3 text-xs font-medium">Have you attended university?</label>
                            <div className="flex gap-6">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="university"
                                        value="yes"
                                        checked={university === 'yes'}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUniversity(e.target.value as 'yes' | 'no' | 'currently_attending')}
                                        required
                                        disabled={loading}
                                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer"
                                    />
                                    <span className="text-xs text-gray-700">Yes</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="university"
                                        value="no"
                                        checked={university === 'no'}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUniversity(e.target.value as 'yes' | 'no' | 'currently_attending')}
                                        required
                                        disabled={loading}
                                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer"
                                    />
                                    <span className="text-xs text-gray-700">No</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="university"
                                        value="currently_attending"
                                        checked={university === 'currently_attending'}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUniversity(e.target.value as 'yes' | 'no' | 'currently_attending')}
                                        required
                                        disabled={loading}
                                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer"
                                    />
                                    <span className="text-xs text-gray-700">Currently attending</span>
                                </label>
                            </div>
                        </div>

                        <div>
                            <label className="block text-gray-700 mb-2 text-xs font-medium">English Fluency:</label>
                            <select
                                value={englishFluency}
                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setEnglishFluency(e.target.value as 'not_at_all' | 'young_age' | 'high_school' | 'university' | 'first_language' | '')}
                                required
                                disabled={loading}
                                className="w-full px-4 py-3 border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs appearance-none bg-white disabled:bg-gray-50"
                                style={{ border: '1.5px solid #9ca3af' }}
                            >
                                <option value="">Select an option</option>
                                <option value="first_language">English is my first language</option>
                                <option value="young_age">Learned at a young age</option>
                                <option value="high_school">Learned in high school</option>
                                <option value="university">Learned at university</option>
                                <option value="not_at_all">Not fluent</option>
                            </select>
                        </div>

                        {englishFluency && englishFluency !== 'first_language' && (
                            <div>
                                <label className="block text-gray-700 mb-2 text-xs font-medium">What is your first language?</label>
                                <input
                                    type="text"
                                    value={firstLanguage}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFirstLanguage(e.target.value)}
                                    placeholder="e.g., Swedish, Spanish..."
                                    required
                                    disabled={loading}
                                    maxLength={100}
                                    className="w-full px-4 py-3 border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs disabled:bg-gray-50"
                                    style={{ border: '1.5px solid #9ca3af' }}
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-gray-700 mb-3 text-xs font-medium">Have you previously taken the SWSAT (Högskoleprovet)?</label>
                            <div className="flex gap-6">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="swesat"
                                        value="yes"
                                        checked={swesat === 'yes'}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSwesat(e.target.value as 'yes' | 'no' | 'unsure')}
                                        required
                                        disabled={loading}
                                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer"
                                    />
                                    <span className="text-xs text-gray-700">Yes</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="swesat"
                                        value="no"
                                        checked={swesat === 'no'}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSwesat(e.target.value as 'yes' | 'no' | 'unsure')}
                                        required
                                        disabled={loading}
                                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer"
                                    />
                                    <span className="text-xs text-gray-700">No</span>
                                </label>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 pt-2">
                            <input
                                type="checkbox"
                                id="dataAgreement"
                                checked={agreed}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAgreed(e.target.checked)}
                                disabled={loading}
                                className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                            />
                            <label htmlFor="dataAgreement" className="text-xs text-gray-700">
                                I agree to data collection and recording of my reading patterns
                            </label>
                        </div>

                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700">
                                {error}
                            </div>
                        )}

                        <div className="border-t pt-6">
                            <div className="flex items-center gap-2 text-gray-600 mb-2">
                                <Info className="w-4 h-4" />
                                <span className="text-xs font-medium">Data Collection & Privacy</span>
                            </div>
                            <p className="text-xs text-gray-500">
                                We collect reading patterns, answers, and demographics for research purposes. All data is anonymized and stored securely. <button
                                    onClick={() => setShowDataDetails(!showDataDetails)}
                                    className="text-xs text-blue-600 hover:underline"
                                >
                                    {showDataDetails ? 'Hide Details' : 'Show Details'}
                                </button>
                            </p>
                            {showDataDetails && (
                                <div className="mt-3 text-xs text-gray-500 space-y-2">
                                    <p>• Your cursor movements and reading patterns will be recorded</p>
                                    <p>• Your answers to comprehension questions will be stored</p>
                                    <p>• Demographic information helps us understand participant backgrounds</p>
                                    <p>• All data is anonymized and used solely for academic research</p>
                                    <p>• Data is stored securely and will not be shared with third parties</p>
                                </div>
                            )}
                        </div>

                        <div className="text-xs text-gray-500">
                            Questions? <a href="mailto:user@kth.se" className="text-blue-600 hover:underline">user@kth.se</a> | <a href="https://www.kth.se/student/kurser/kurs/DM2730?l=en" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Course Info</a>
                        </div>
                    </form>
                </div>

                {/* Right Column - Study Information */}
                <div className="flex flex-col">
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Reading Comprehension Study</h1>
                        <p className="text-sm text-gray-500">
                            DM2730 Technology Enhanced Learning • KTH Royal Institute of Technology
                        </p>
                    </div>

                    <div className="space-y-4 mb-8">
                        <div className="flex gap-3">
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <BookOpen className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <p className="font-semibold text-gray-900 text-sm">Read & Answer</p>
                                <p className="text-gray-500 text-xs">10 short texts</p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <Clock className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <p className="font-semibold text-gray-900 text-sm">~25 Minutes</p>
                                <p className="text-gray-500 text-xs">Complete in one sitting</p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <Monitor className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <p className="font-semibold text-gray-900 text-sm">Desktop Only</p>
                                <p className="text-gray-500 text-xs">Mouse recommended</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-red-50 border border-red-300 rounded-lg p-5 mb-8">
                        <div className="flex gap-3">
                            <div className="flex-shrink-0">
                                <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
                                    <Info className="w-4 h-4 text-red-700" />
                                </div>
                            </div>
                            <div>
                                <p className="text-sm font-bold text-red-900 mb-2">Important!</p>
                                <p className="text-sm text-red-900 font-semibold mb-2">
                                    For this test it is crucial that you show your line of sight with the cursor of your mouse.
                                </p>
                                <p className="text-sm text-red-800">
                                    In other words - keep the mouse where you are looking at all times. This will produce an invisible heatmap of where your eyes and focus are during the test.
                                </p>
                            </div>
                        </div>
                    </div>



                    <button
                        type="submit"
                        form="user-info-form"
                        disabled={!isFormValid() || loading}
                        className="w-full py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
                    >
                        {loading ? 'Loading...' : (
                            <>
                                <span className="mr-2">📊</span> Start the Study
                            </>
                        )}
                    </button>
                </div>
            </div>

            {showResumeModal && existingSession && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg p-8 max-w-md w-full shadow-lg">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Session Found</h2>
                        <p className="text-gray-600 mb-2">
                            You have an incomplete session ({existingSession.currentPassageIndex}/10 passages completed).
                        </p>
                        <p className="text-gray-600 mb-6">Would you like to continue or start fresh?</p>
                        <div className="flex gap-3">
                            <button
                                onClick={handleResume}
                                className="flex-1 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
                            >
                                Continue Session
                            </button>
                            <button
                                onClick={handleStartFresh}
                                className="flex-1 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg text-sm font-medium transition-colors"
                            >
                                Start Fresh
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};