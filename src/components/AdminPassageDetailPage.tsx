import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { apiService } from '../services/apiService';
import { maskEmail } from '../utils/emailMask';

interface PassageDetailData {
    passage: { id: string; title: string; index: number; text: string; question: string; choices: string[]; correctAnswer: number };
    overview: { totalParticipants: number; avgTimeMs: number; firstTryRate: number; totalAttempts: number };
    participants: Array<{
        sessionId: string;
        email: string;
        timeSpentMs: number;
        wrongAttempts: number;
        totalAttempts?: number;
        isCorrect: boolean;
        latestAttemptScreenshot: string | null;
        latestGeminiResponse: string | null;
        passageIndex: number;
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
    correctFeedbackSamples: Array<{ response: string }>;
    wrongFeedbackSamples: Array<{ response: string }>;
}

export const AdminPassageDetailPage: React.FC = () => {
    const { passageId } = useParams<{ passageId: string }>();
    const navigate = useNavigate();
    const [data, setData] = useState<PassageDetailData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [feedbackTab, setFeedbackTab] = useState<'correct' | 'wrong'>('correct');
    const [selectedScreenshot, setSelectedScreenshot] = useState<{ url: string; email: string } | null>(null);

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

                {/* Passage Content */}
                <section className="admin-section">
                    <p style={{ lineHeight: 1.7, marginBottom: '1.5rem', color: '#374151' }}>
                        {data.passage.text}
                    </p>
                    <div style={{ background: '#f8fafc', borderRadius: '0.5rem', padding: '1rem', borderLeft: '4px solid #3b82f6' }}>
                        <strong style={{ color: '#1f2937' }}>Question: </strong>
                        <span style={{ color: '#374151' }}>{data.passage.question}</span>
                        <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {data.passage.choices.map((choice, idx) => (
                                <div key={idx} style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: '0.5rem',
                                    padding: '0.5rem',
                                    borderRadius: '0.25rem',
                                    background: idx === data.passage.correctAnswer ? '#ecfdf5' : 'transparent'
                                }}>
                                    <span style={{
                                        fontWeight: 600,
                                        color: idx === data.passage.correctAnswer ? '#10b981' : '#6b7280',
                                        minWidth: '1.5rem'
                                    }}>
                                        {['A', 'B', 'C', 'D'][idx]}
                                    </span>
                                    <span style={{ color: '#374151' }}>
                                        {choice}
                                        {idx === data.passage.correctAnswer && <span style={{ color: '#10b981', marginLeft: '0.5rem' }}>✓</span>}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>


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
                                    <th>Total Attempts</th>
                                    <th>Detail</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.participants.map((p) => (
                                    <tr key={p.sessionId} className="cursor-pointer hover:bg-gray-50">
                                        <td>{maskEmail(p.email)}</td>
                                        <td>{formatTime(p.timeSpentMs)}</td>
                                        <td>{p.wrongAttempts}</td>
                                        <td>{p.totalAttempts}</td>
                                        <td>
                                            <a
                                                href={`/results/${p.sessionId}/${p.passageIndex + 1}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-600 hover:underline text-sm"
                                            >
                                                View →
                                            </a>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </section>

                {/* First Choice Distribution */}
                <section className="admin-section">
                    <h2>📝 First Choice Distribution</h2>
                    <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>
                        Shows what each participant selected on their <strong>first attempt only</strong>. Subsequent retries are not counted.
                    </p>
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
                    <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>
                        Shows reading heatmaps captured during the <strong>correct attempt</strong>. Click a thumbnail to view full size.
                    </p>
                    <div className="heatmap-gallery">
                        {data.participants
                            .filter(p => p.latestAttemptScreenshot && p.isCorrect)
                            .slice(0, 8)
                            .map((p) => (
                                <div
                                    key={p.sessionId}
                                    className="heatmap-card"
                                    onClick={() => setSelectedScreenshot({ url: p.latestAttemptScreenshot!, email: maskEmail(p.email) })}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <img
                                        src={p.latestAttemptScreenshot!}
                                        alt={`Heatmap for ${maskEmail(p.email)}`}
                                    />
                                    <div className="heatmap-label">
                                        <span className="text-green-600">✓</span>
                                        {maskEmail(p.email).split('@')[0]}
                                    </div>
                                </div>
                            ))}
                        {data.participants.filter(p => p.latestAttemptScreenshot && p.isCorrect).length === 0 && (
                            <p className="no-data">No correct answer heatmaps available</p>
                        )}
                    </div>
                </section>

                {/* AI Feedback Samples */}
                <section className="admin-section">
                    <h2>🤖 AI Feedback Samples</h2>

                    {/* Sub-tabs for correct/wrong */}
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                        <button
                            onClick={() => setFeedbackTab('correct')}
                            style={{
                                padding: '0.5rem 1rem',
                                borderRadius: '0.375rem',
                                border: 'none',
                                cursor: 'pointer',
                                fontWeight: 500,
                                backgroundColor: feedbackTab === 'correct' ? '#22c55e' : '#e5e7eb',
                                color: feedbackTab === 'correct' ? 'white' : '#374151'
                            }}
                        >
                            ✓ Correct Responses ({data.correctFeedbackSamples.length})
                        </button>
                        <button
                            onClick={() => setFeedbackTab('wrong')}
                            style={{
                                padding: '0.5rem 1rem',
                                borderRadius: '0.375rem',
                                border: 'none',
                                cursor: 'pointer',
                                fontWeight: 500,
                                backgroundColor: feedbackTab === 'wrong' ? '#ef4444' : '#e5e7eb',
                                color: feedbackTab === 'wrong' ? 'white' : '#374151'
                            }}
                        >
                            ✗ Wrong Responses ({data.wrongFeedbackSamples.length})
                        </button>
                    </div>

                    {feedbackTab === 'correct' && (
                        data.correctFeedbackSamples.length === 0 ? (
                            <p className="no-data">No correct response feedback recorded</p>
                        ) : (
                            <div className="ai-feedback-list">
                                {data.correctFeedbackSamples.map((fb, idx) => (
                                    <div
                                        key={idx}
                                        className="ai-feedback-card correct"
                                    >
                                        <span className="feedback-badge">✓ After correct answer</span>
                                        <p>{fb.response}</p>
                                    </div>
                                ))}
                            </div>
                        )
                    )}

                    {feedbackTab === 'wrong' && (
                        data.wrongFeedbackSamples.length === 0 ? (
                            <p className="no-data">No wrong response feedback recorded</p>
                        ) : (
                            <div className="ai-feedback-list">
                                {data.wrongFeedbackSamples.map((fb, idx) => (
                                    <div
                                        key={idx}
                                        className="ai-feedback-card wrong"
                                    >
                                        <span className="feedback-badge">✗ After wrong answer</span>
                                        <p>{fb.response}</p>
                                    </div>
                                ))}
                            </div>
                        )
                    )}
                </section>
            </div>

            {/* Screenshot Modal */}
            {selectedScreenshot && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        padding: '2rem'
                    }}
                    onClick={() => setSelectedScreenshot(null)}
                >
                    <div
                        style={{
                            position: 'relative',
                            maxWidth: '90vw',
                            maxHeight: '90vh',
                            backgroundColor: 'white',
                            borderRadius: '0.75rem',
                            overflow: 'hidden',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{
                            padding: '0.75rem 1rem',
                            borderBottom: '1px solid #e5e7eb',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            backgroundColor: '#f9fafb'
                        }}>
                            <span style={{ fontWeight: 500, color: '#374151' }}>
                                {selectedScreenshot.email}
                            </span>
                            <button
                                onClick={() => setSelectedScreenshot(null)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    fontSize: '1.5rem',
                                    cursor: 'pointer',
                                    color: '#6b7280',
                                    lineHeight: 1
                                }}
                            >
                                ×
                            </button>
                        </div>
                        <img
                            src={selectedScreenshot.url}
                            alt={`Heatmap for ${selectedScreenshot.email}`}
                            style={{
                                maxWidth: '100%',
                                maxHeight: 'calc(90vh - 60px)',
                                display: 'block'
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};
