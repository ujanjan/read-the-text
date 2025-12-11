import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { apiService } from '../services/apiService';
import type { SessionData, PassageAttempt } from '../types/session';
import { Download, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';
import { maskEmail } from '../utils/emailMask';

export const PassageDetailPage: React.FC = () => {
    const { sessionId, passageIndex } = useParams<{ sessionId: string; passageIndex: string }>();
    const navigate = useNavigate();
    const [sessionData, setSessionData] = useState<SessionData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Convert 1-indexed URL param to 0-indexed array index
    const passageIndexNum = passageIndex ? parseInt(passageIndex) - 1 : 0;

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
                    <p className="loading">Loading passage details...</p>
                </div>
            </div>
        );
    }

    if (error || !sessionData) {
        return (
            <div className="admin-page">
                <div className="admin-container">
                    <p className="text-red-500">{error || 'No data found'}</p>
                    <Link to={`/results/${sessionId}`} className="back-link">← Back to Results</Link>
                </div>
            </div>
        );
    }

    const { session, passageResults, attempts } = sessionData;
    const passageResult = passageResults.find((r) => r.passage_index === passageIndexNum);
    const passageAttempts = attempts.filter((a) => a.passage_index === passageIndexNum);

    if (!passageResult) {
        return (
            <div className="admin-page">
                <div className="admin-container">
                    <p className="text-red-500">Passage not found</p>
                    <Link to={`/results/${sessionId}`} className="back-link">← Back to Results</Link>
                </div>
            </div>
        );
    }

    const hasPrevious = passageIndexNum > 0;
    const hasNext = passageIndexNum < 9; // 0-9 = 10 passages

    const handleDownloadSummary = () => {
        // Map attempts to replace screenshot base64 with R2 keys
        const attemptsWithKeys = passageAttempts.map(attempt => ({
            ...attempt,
            screenshot: undefined, // Remove base64 data
            screenshot_r2_key: attempt.screenshot_r2_key, // Keep the R2 key (path)
        }));

        const summaryData = {
            session: {
                id: session.id,
                email: session.email,
                passage_index: passageIndexNum + 1,
            },
            passageResult: {
                ...passageResult,
                cursor_history: undefined, // Exclude cursor history from summary
                screenshot: undefined, // Remove base64 data
                screenshot_r2_key: passageResult.screenshot_r2_key, // Keep the R2 key (path)
            },
            attempts: attemptsWithKeys,
        };

        const blob = new Blob([JSON.stringify(summaryData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `passage_${passageIndexNum + 1}_summary_${session.id}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleDownloadCursorData = () => {
        if (!passageResult.cursor_history) {
            alert('No cursor data available for this passage');
            return;
        }

        const cursorData = {
            [`passage_${passageIndexNum + 1}`]: passageResult.cursor_history,
        };

        const blob = new Blob([JSON.stringify(cursorData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `passage_${passageIndexNum + 1}_cursor_data_${session.id}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="admin-page">
            <div className="admin-container" style={{ maxWidth: '1200px' }}>
                {/* Header with navigation */}
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1>Passage {passageIndexNum + 1} Details</h1>
                        <p className="text-sm text-gray-500 mt-1">{maskEmail(session.email)}</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link to={`/results/${sessionId}`} className="back-link">
                            ← Back to Results
                        </Link>
                    </div>
                </div>

                {/* Sub-header Navigation & Actions */}
                <div className="flex justify-between items-center mb-6">
                    <div className="flex gap-2">
                        <Button
                            onClick={handleDownloadSummary}
                            className="bg-blue-600 hover:bg-blue-700 text-white h-8 text-sm"
                            style={{ backgroundColor: '#2563eb', color: 'white' }}
                        >
                            <Download className="h-4 w-4 mr-2" />
                            Summary
                        </Button>
                        <Button
                            onClick={handleDownloadCursorData}
                            variant="outline"
                            className="h-8 text-sm border-transparent hover:border-transparent"
                            style={{ backgroundColor: '#1f2937', color: 'white' }}
                        >
                            <Download className="h-4 w-4 mr-2" />
                            Cursor Data
                        </Button>
                    </div>

                    <div className="flex items-center gap-2">
                        {hasPrevious && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate(`/results/${sessionId}/${passageIndexNum}`)}
                            >
                                <ChevronLeft className="h-4 w-4 mr-1" />
                                Previous
                            </Button>
                        )}
                        {hasNext && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate(`/results/${sessionId}/${passageIndexNum + 2}`)}
                            >
                                Next
                                <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                        )}
                    </div>
                </div>

                {/* Passage stats */}
                <section className="admin-section">
                    <h2>📊 Performance Summary</h2>
                    <div className="stats-grid mt-4">
                        <div className="stat-card">
                            <span className="stat-value">{passageResult.is_complete ? 'Completed' : 'Incomplete'}</span>
                            <span className="stat-label">Status</span>
                        </div>
                        <div className="stat-card">
                            <span className="stat-value">{passageResult.wrong_attempts}</span>
                            <span className="stat-label">Wrong Attempts</span>
                        </div>
                        <div className="stat-card">
                            <span className="stat-value">{formatTime(passageResult.time_spent_ms)}</span>
                            <span className="stat-label">Time Spent</span>
                        </div>
                    </div>
                </section>

                {/* Screenshot with heatmap */}
                {passageResult.screenshot && (
                    <section className="admin-section">
                        <h2>🌡️ Reading Heatmap</h2>
                        <div className="mt-4 rounded-lg overflow-hidden border border-gray-200">
                            <img
                                src={passageResult.screenshot}
                                alt={`Passage ${passageIndexNum + 1} heatmap`}
                                className="w-full"
                            />
                        </div>
                    </section>
                )}

                {/* All attempts */}
                <section className="admin-section">
                    <h2>📝 All Attempts</h2>
                    <div className="space-y-12 mt-4">
                        {passageAttempts.length > 0 ? (
                            passageAttempts.map((attempt, idx) => (
                                <div
                                    key={idx}
                                    className={`border rounded-lg p-4 mb-12 ${attempt.is_correct ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                                        }`}
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="font-semibold text-gray-900">
                                            Attempt {attempt.attempt_number}
                                        </span>
                                        <span
                                            className={`px-3 py-1 rounded-full text-sm font-medium ${attempt.is_correct
                                                ? 'bg-green-600 text-white'
                                                : 'bg-red-600 text-white'
                                                }`}
                                        >
                                            {attempt.is_correct ? 'Correct' : 'Wrong'}
                                        </span>
                                    </div>

                                    {attempt.screenshot && (
                                        <div className="mb-3 rounded overflow-hidden border border-gray-200">
                                            <img
                                                src={attempt.screenshot}
                                                alt={`Attempt ${attempt.attempt_number} heatmap`}
                                                className="w-full"
                                            />
                                        </div>
                                    )}

                                    <p className="text-sm text-gray-700 mb-2">
                                        <strong>Selected Answer:</strong> {attempt.selected_answer}
                                    </p>

                                    {attempt.gemini_response && (
                                        <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200">
                                            <p className="text-sm font-semibold text-gray-900 mb-1">AI Feedback:</p>
                                            <p className="text-sm text-gray-700">{attempt.gemini_response}</p>
                                        </div>
                                    )}

                                    {attempt.reading_summary && (() => {
                                        try {
                                            const summary = typeof attempt.reading_summary === 'string'
                                                ? JSON.parse(attempt.reading_summary)
                                                : attempt.reading_summary;

                                            return (
                                                <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
                                                    <p className="text-sm font-semibold text-gray-900 mb-2">📊 Reading Summary</p>
                                                    <div className="text-xs text-gray-600 mb-2">
                                                        <strong>Total Time:</strong> {Math.round(summary.total_time_ms / 1000)}s
                                                    </div>
                                                    <div className="space-y-2 max-h-60 overflow-y-auto">
                                                        {summary.sentences?.map((sentence: any, idx: number) => (
                                                            <div key={idx} className="bg-gray-50 p-2 rounded border border-gray-200">
                                                                <p className="text-xs text-gray-700 mb-1">
                                                                    <strong>Sentence {sentence.index + 1}:</strong> {sentence.text.substring(0, 80)}...
                                                                </p>
                                                                <div className="flex gap-3 text-xs text-gray-600">
                                                                    <span>⏱️ {Math.round(sentence.dwell_ms / 1000)}s</span>
                                                                    <span>👁️ {sentence.visits} visits</span>
                                                                    <span>📍 Reading Order: {sentence.first_visit_order !== null ? sentence.first_visit_order + 1 : '-'}</span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        } catch (e) {
                                            console.error('Failed to parse reading summary', e);
                                            return null;
                                        }
                                    })()}
                                </div>
                            ))
                        ) : (
                            <p className="text-gray-500 italic">No attempts recorded</p>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
};

function formatTime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return minutes > 0 ? `${minutes}m ${remainingSeconds}s` : `${seconds}s`;
}
