import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { apiService } from '../services/apiService';

interface PassageDetailData {
    passage: { id: string; title: string; index: number };
    overview: { totalParticipants: number; avgTimeMs: number; firstTryRate: number; totalAttempts: number };
    participants: Array<{
        sessionId: string;
        email: string;
        timeSpentMs: number;
        wrongAttempts: number;
        isCorrect: boolean;
        latestAttemptScreenshot: string | null;
        latestGeminiResponse: string | null;
    }>;
    sentenceStats: Array<{
        index: number;
        text: string;
        avgDwellMs: number;
        avgVisits: number;
        avgReadingOrder: number | null;
        timesRead: number;
    }>;
    answerDistribution: Array<{
        choice: string;
        count: number;
        percentage: number;
        isCorrect: boolean;
    }>;
    trapAnswer: { choice: string; count: number; percentage: number } | null;
    aiFeedbackSamples: Array<{ response: string; wasCorrect: boolean }>;
}

export const AdminPassageDetailPage: React.FC = () => {
    const { passageId } = useParams<{ passageId: string }>();
    const navigate = useNavigate();
    const [data, setData] = useState<PassageDetailData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [expandedParticipant, setExpandedParticipant] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const result = await apiService.getPassageDetail(passageId!);
                setData(result);
            } catch (err) {
                if (err instanceof Error && err.message === 'Unauthorized') {
                    localStorage.removeItem('admin_token');
                    navigate('/admin');
                }
                setError('Failed to load passage data');
            } finally {
                setLoading(false);
            }
        };
        if (passageId) fetchData();
    }, [passageId, navigate]);

    if (loading) {
        return (
            <div className="admin-page">
                <div className="admin-container">
                    <p className="loading">Loading passage analytics...</p>
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="admin-page">
                <div className="admin-container">
                    <p className="text-red-500">{error || 'No data found'}</p>
                    <Link to="/admin" className="back-link">← Back to Admin</Link>
                </div>
            </div>
        );
    }

    const formatTime = (ms: number) => {
        if (!ms) return '-';
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return minutes > 0 ? `${minutes}m ${remainingSeconds}s` : `${seconds}s`;
    };

    return (
        <div className="admin-page">
            <div className="admin-container" style={{ maxWidth: '1200px' }}>
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <h1>{data.passage.title}</h1>
                    <Link to="/admin" className="back-link">← Back to Admin</Link>
                </div>

                {/* Overview Stats */}
                <section className="admin-section">
                    <h2>📊 Overview</h2>
                    <div className="stats-grid">
                        <div className="stat-card">
                            <span className="stat-value">{data.overview.totalParticipants}</span>
                            <span className="stat-label">Participants</span>
                        </div>
                        <div className="stat-card">
                            <span className="stat-value">{formatTime(data.overview.avgTimeMs)}</span>
                            <span className="stat-label">Avg Time</span>
                        </div>
                        <div className="stat-card">
                            <span className="stat-value">{data.overview.firstTryRate}%</span>
                            <span className="stat-label">First Try Correct</span>
                        </div>
                        <div className="stat-card">
                            <span className="stat-value">{data.overview.totalAttempts}</span>
                            <span className="stat-label">Total Attempts</span>
                        </div>
                    </div>
                </section>

                {/* Participants Table */}
                <section className="admin-section">
                    <h2>👥 Participants</h2>
                    {data.participants.length === 0 ? (
                        <p className="no-data">No participants yet</p>
                    ) : (
                        <table className="sessions-table">
                            <thead>
                                <tr>
                                    <th>Email</th>
                                    <th>Time</th>
                                    <th>Wrong Attempts</th>
                                    <th>Result</th>
                                    <th>Heatmap</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.participants.map((p) => (
                                    <React.Fragment key={p.sessionId}>
                                        <tr className="cursor-pointer hover:bg-gray-50">
                                            <td>{p.email}</td>
                                            <td>{formatTime(p.timeSpentMs)}</td>
                                            <td>{p.wrongAttempts}</td>
                                            <td>
                                                <span className={`status-badge ${p.isCorrect ? 'completed' : 'in_progress'}`}>
                                                    {p.isCorrect ? '✓ Correct' : '✗ Wrong'}
                                                </span>
                                            </td>
                                            <td>
                                                {p.latestAttemptScreenshot && (
                                                    <button
                                                        onClick={() => setExpandedParticipant(
                                                            expandedParticipant === p.sessionId ? null : p.sessionId
                                                        )}
                                                        className="text-blue-600 hover:underline text-sm"
                                                    >
                                                        {expandedParticipant === p.sessionId ? 'Hide' : 'View'}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                        {expandedParticipant === p.sessionId && p.latestAttemptScreenshot && (
                                            <tr>
                                                <td colSpan={5} className="p-4 bg-gray-50">
                                                    <img
                                                        src={p.latestAttemptScreenshot}
                                                        alt={`Heatmap for ${p.email}`}
                                                        className="w-full max-w-3xl mx-auto rounded-lg border"
                                                    />
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    )}
                </section>

                {/* Sentence Analytics */}
                <section className="admin-section">
                    <h2>📖 Sentence Analytics</h2>
                    {data.sentenceStats.length === 0 ? (
                        <p className="no-data">No reading data available</p>
                    ) : (
                        <div className="sentence-analytics">
                            {data.sentenceStats.map((s) => (
                                <div key={s.index} className="sentence-stat-row">
                                    <div className="sentence-header">
                                        <span className="sentence-number">S{s.index + 1}</span>
                                        <span className="sentence-text">{s.text.substring(0, 100)}...</span>
                                    </div>
                                    <div className="sentence-metrics">
                                        <span title="Average dwell time">⏱️ {formatTime(s.avgDwellMs)}</span>
                                        <span title="Average visits">👁️ {s.avgVisits} visits</span>
                                        <span title="Average reading order">
                                            📍 {s.avgReadingOrder !== null ? `#${Math.round(s.avgReadingOrder + 1)}` : '-'}
                                        </span>
                                        <span title="Times read">📊 {s.timesRead} readers</span>
                                    </div>
                                    <div className="dwell-bar">
                                        <div
                                            className="dwell-fill"
                                            style={{
                                                width: `${Math.min(100, (s.avgDwellMs / 10000) * 100)}%`,
                                                backgroundColor: s.avgDwellMs > 5000 ? '#ef4444' : s.avgDwellMs > 2000 ? '#f59e0b' : '#22c55e'
                                            }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* Answer Distribution */}
                <section className="admin-section">
                    <h2>📝 Answer Distribution</h2>
                    <div className="answer-distribution">
                        {data.answerDistribution.map((a) => (
                            <div
                                key={a.choice}
                                className={`answer-bar-container ${a.isCorrect ? 'correct' : ''}`}
                            >
                                <div className="answer-label">
                                    <span className="choice">{a.choice}</span>
                                    {a.isCorrect && <span className="correct-badge">✓</span>}
                                    {data.trapAnswer?.choice === a.choice && !a.isCorrect && (
                                        <span className="trap-badge">⚠️ Trap</span>
                                    )}
                                </div>
                                <div className="answer-bar">
                                    <div
                                        className="answer-fill"
                                        style={{
                                            width: `${a.percentage}%`,
                                            backgroundColor: a.isCorrect ? '#22c55e' : '#ef4444'
                                        }}
                                    />
                                </div>
                                <span className="answer-count">{a.count} ({a.percentage}%)</span>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Heatmap Gallery */}
                <section className="admin-section">
                    <h2>🔥 Heatmap Gallery</h2>
                    <div className="heatmap-gallery">
                        {data.participants
                            .filter(p => p.latestAttemptScreenshot)
                            .slice(0, 8)
                            .map((p) => (
                                <div key={p.sessionId} className="heatmap-card">
                                    <img
                                        src={p.latestAttemptScreenshot!}
                                        alt={`Heatmap for ${p.email}`}
                                    />
                                    <div className="heatmap-label">
                                        <span className={p.isCorrect ? 'text-green-600' : 'text-red-600'}>
                                            {p.isCorrect ? '✓' : '✗'}
                                        </span>
                                        {p.email.split('@')[0]}
                                    </div>
                                </div>
                            ))}
                    </div>
                </section>

                {/* AI Feedback Samples */}
                <section className="admin-section">
                    <h2>🤖 AI Feedback Samples</h2>
                    {data.aiFeedbackSamples.length === 0 ? (
                        <p className="no-data">No AI feedback recorded</p>
                    ) : (
                        <div className="ai-feedback-list">
                            {data.aiFeedbackSamples.map((fb, idx) => (
                                <div
                                    key={idx}
                                    className={`ai-feedback-card ${fb.wasCorrect ? 'correct' : 'wrong'}`}
                                >
                                    <span className="feedback-badge">
                                        {fb.wasCorrect ? '✓ After correct answer' : '✗ After wrong answer'}
                                    </span>
                                    <p>{fb.response}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
};
