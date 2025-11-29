import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { apiService } from '../services/apiService';
import type { SessionData, PassageAttempt } from '../types/session';
import { Download, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';

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
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-gray-600">Loading passage details...</div>
            </div>
        );
    }

    if (error || !sessionData) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-red-600">{error || 'No data found'}</div>
            </div>
        );
    }

    const { session, passageResults, attempts } = sessionData;
    const passageResult = passageResults.find((r) => r.passage_index === passageIndexNum);
    const passageAttempts = attempts.filter((a) => a.passage_index === passageIndexNum);

    if (!passageResult) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-red-600">Passage not found</div>
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
        <div className="min-h-screen bg-gray-50 py-8 px-4">
            <div className="max-w-5xl mx-auto">
                {/* Header with navigation */}
                <div className="mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link to={`/results/${sessionId}`}>
                            <Button variant="outline" size="sm">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back to Results
                            </Button>
                        </Link>
                        <h1 className="text-2xl font-bold text-gray-900">
                            Passage {passageIndexNum + 1} Details
                        </h1>
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

                {/* Download buttons */}
                <div className="mb-6 flex gap-3">
                    <Button
                        onClick={handleDownloadSummary}
                        className="text-white"
                        style={{ backgroundColor: '#2563eb', color: 'white' }}
                    >
                        <Download className="h-4 w-4 mr-2" />
                        Download Summary
                    </Button>
                    <Button
                        onClick={handleDownloadCursorData}
                        variant="outline"
                        className="text-white border-transparent hover:border-transparent"
                        style={{ backgroundColor: '#1f2937', color: 'white' }}
                    >
                        <Download className="h-4 w-4 mr-2" />
                        Download Cursor Data
                    </Button>
                </div>

                {/* Passage stats */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Performance Summary</h2>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <p className="text-sm text-gray-500">Status</p>
                            <p className="text-lg font-semibold text-gray-900">
                                {passageResult.is_complete ? 'Completed' : 'Incomplete'}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Wrong Attempts</p>
                            <p className="text-lg font-semibold text-gray-900">
                                {passageResult.wrong_attempts}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Time Spent</p>
                            <p className="text-lg font-semibold text-gray-900">
                                {formatTime(passageResult.time_spent_ms)}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Screenshot with heatmap */}
                {passageResult.screenshot && (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Reading Heatmap</h2>
                        <img
                            src={passageResult.screenshot}
                            alt={`Passage ${passageIndexNum + 1} heatmap`}
                            className="w-full rounded-lg border border-gray-200"
                        />
                    </div>
                )}

                {/* All attempts */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">All Attempts</h2>
                    {passageAttempts.length > 0 ? (
                        <div className="space-y-4">
                            {passageAttempts.map((attempt, idx) => (
                                <div
                                    key={idx}
                                    className={`border rounded-lg p-4 ${attempt.is_correct ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
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
                                        <div className="mb-3">
                                            <img
                                                src={attempt.screenshot}
                                                alt={`Attempt ${attempt.attempt_number} heatmap`}
                                                className="w-full rounded-lg border border-gray-200"
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
                                            const summary = JSON.parse(attempt.reading_summary);
                                            return (
                                                <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                                    <p className="text-sm font-semibold text-gray-900 mb-2">📊 Reading Summary</p>
                                                    <div className="text-xs text-gray-600 mb-2">
                                                        <strong>Total Time:</strong> {Math.round(summary.total_time_ms / 1000)}s
                                                    </div>
                                                    <div className="space-y-2 max-h-60 overflow-y-auto">
                                                        {summary.sentences?.map((sentence: any, idx: number) => (
                                                            <div key={idx} className="bg-white p-2 rounded border border-gray-200">
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
                                            return null;
                                        }
                                    })()}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500">No attempts recorded</p>
                    )}
                </div>
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
