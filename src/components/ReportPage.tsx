import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Loader2, ArrowLeft, Download, Sparkles, Trophy, Brain, Sprout, Quote } from 'lucide-react';

const API_BASE = '/api';

// Helper to clean Gemini output (remove markdown code blocks)
const cleanMarkdown = (text: string) => {
    if (!text) return '';
    // Remove wrapping ```markdown ... ``` or just ``` ... ```
    return text.replace(/^```(?:markdown)?\n([\s\S]*?)\n```$/i, '$1').trim();
};

// Custom components for Markdown rendering
const MarkdownComponents = {
    h1: ({ node, ...props }: any) => (
        <div className="mb-12 text-center" style={{ marginBottom: '3rem', textAlign: 'center' }}>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight mb-4" style={{ fontSize: '2.25rem', fontWeight: 700, color: '#111827', letterSpacing: '-0.025em', marginBottom: '1rem' }} {...props} />
            <div className="h-1 w-16 bg-indigo-600 mx-auto rounded-full opacity-80" style={{ height: '0.25rem', width: '4rem', backgroundColor: '#4f46e5', margin: '0 auto', borderRadius: '9999px', opacity: 0.8 }} />
        </div>
    ),
    h2: ({ node, children, ...props }: any) => {
        // Determine icon based on text content
        const text = String(children).toLowerCase();
        let Icon = Sparkles;
        let colorClass = "text-indigo-600";
        let bgClass = "bg-indigo-50";
        let colorStyle = '#4f46e5';
        let bgStyle = '#eef2ff';

        if (text.includes("spirit animal")) {
            Icon = Sparkles;
            colorClass = "text-purple-600";
            bgClass = "bg-purple-50";
            colorStyle = '#9333ea';
            bgStyle = '#faf5ff';
        } else if (text.includes("performance") || text.includes("highlights")) {
            Icon = Trophy;
            colorClass = "text-amber-600";
            bgClass = "bg-amber-50";
            colorStyle = '#d97706';
            bgStyle = '#fffbeb';
        } else if (text.includes("deep dive") || text.includes("how you read")) {
            Icon = Brain;
            colorClass = "text-blue-600";
            bgClass = "bg-blue-50";
            colorStyle = '#2563eb';
            bgStyle = '#eff6ff';
        } else if (text.includes("tips") || text.includes("growth")) {
            Icon = Sprout;
            colorClass = "text-emerald-600";
            bgClass = "bg-emerald-50";
            colorStyle = '#059669';
            bgStyle = '#ecfdf5';
        }

        return (
            <div className="flex items-center gap-3 mt-12 mb-6 pb-2 border-b border-gray-100" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '3rem', marginBottom: '1.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid #f3f4f6' }}>
                <div className={`p-2 rounded-lg ${bgClass}`} style={{ padding: '0.5rem', borderRadius: '0.5rem', backgroundColor: bgStyle }}>
                    <Icon className={`h-5 w-5 ${colorClass}`} style={{ height: '1.25rem', width: '1.25rem', color: colorStyle }} />
                </div>
                <h2 className="text-xl font-bold text-gray-800 tracking-tight" style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1f2937', letterSpacing: '-0.025em', margin: 0 }} {...props}>
                    {children}
                </h2>
            </div>
        );
    },
    p: ({ node, children, ...props }: any) => {
        const text = String(children);
        if (text.includes("You are **") || text.includes("The Bee!") || text.includes("The Eagle") || text.includes("The Turtle") || text.includes("The Cheetah") || text.includes("The Owl")) {
            return (
                <div className="bg-gradient-to-br from-indigo-50/50 to-purple-50/50 p-8 rounded-2xl border border-indigo-100/50 my-8 text-lg leading-relaxed text-gray-800 shadow-sm" style={{ background: 'linear-gradient(to bottom right, rgba(238, 242, 255, 0.5), rgba(250, 245, 255, 0.5))', padding: '2rem', borderRadius: '1rem', border: '1px solid rgba(224, 231, 255, 0.5)', marginTop: '2rem', marginBottom: '2rem', fontSize: '1.125rem', lineHeight: 1.625, color: '#1f2937', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                    <p {...props} style={{ margin: 0 }}>{children}</p>
                </div>
            );
        }
        return <p className="text-gray-600 leading-7 mb-4 text-base font-normal" style={{ color: '#4b5563', lineHeight: 1.75, marginBottom: '1rem', fontSize: '1rem', fontWeight: 400 }} {...props}>{children}</p>;
    },
    ul: ({ node, ...props }: any) => (
        <ul className="space-y-3 my-6" style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }} {...props} />
    ),
    li: ({ node, children, ...props }: any) => (
        <li className="flex items-start gap-3 text-gray-700" style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', color: '#374151', marginBottom: '0.75rem' }}>
            <span className="mt-2 h-1.5 w-1.5 rounded-full bg-indigo-400 flex-shrink-0" style={{ marginTop: '0.5rem', height: '0.375rem', width: '0.375rem', borderRadius: '9999px', backgroundColor: '#818cf8', flexShrink: 0 }} />
            <span className="flex-1 leading-7" style={{ flex: 1, lineHeight: 1.75 }}>{children}</span>
        </li>
    ),
    strong: ({ node, ...props }: any) => (
        <strong className="font-semibold text-gray-900" style={{ fontWeight: 600, color: '#111827' }} {...props} />
    ),
    blockquote: ({ node, ...props }: any) => (
        <div className="flex gap-4 p-6 bg-gray-50/50 rounded-xl border-l-4 border-gray-200 my-8 italic text-gray-600" style={{ display: 'flex', gap: '1rem', padding: '1.5rem', backgroundColor: 'rgba(249, 250, 251, 0.5)', borderRadius: '0.75rem', borderLeft: '4px solid #e5e7eb', marginTop: '2rem', marginBottom: '2rem', fontStyle: 'italic', color: '#4b5563' }}>
            <Quote className="h-6 w-6 text-gray-300 flex-shrink-0" style={{ height: '1.5rem', width: '1.5rem', color: '#d1d5db', flexShrink: 0 }} />
            <blockquote {...props} style={{ margin: 0 }} />
        </div>
    ),
    // Handle code blocks just in case they slip through or are intentional
    code: ({ node, inline, className, children, ...props }: any) => {
        if (inline) {
            return <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-gray-800" style={{ backgroundColor: '#f3f4f6', padding: '0.125rem 0.375rem', borderRadius: '0.25rem', fontSize: '0.875rem', fontFamily: 'monospace', color: '#1f2937' }} {...props}>{children}</code>;
        }
        return (
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto my-6 text-sm font-mono shadow-lg" style={{ backgroundColor: '#111827', color: '#f3f4f6', padding: '1rem', borderRadius: '0.5rem', overflowX: 'auto', marginTop: '1.5rem', marginBottom: '1.5rem', fontSize: '0.875rem', fontFamily: 'monospace', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' }}>
                <code {...props}>{children}</code>
            </pre>
        );
    },
    pre: ({ node, ...props }: any) => <div {...props} /> // Let code component handle styling
};

export const ReportPage: React.FC = () => {
    const { sessionId } = useParams<{ sessionId: string }>();
    const [report, setReport] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchReport = async () => {
            if (!sessionId) return;

            try {
                const response = await fetch(`${API_BASE}/report/${sessionId}`);
                if (!response.ok) {
                    throw new Error('Failed to generate report');
                }
                const data = await response.json() as { report: string };
                setReport(cleanMarkdown(data.report));
            } catch (err: any) {
                setError(err.message || 'Something went wrong');
            } finally {
                setLoading(false);
            }
        };

        fetchReport();
    }, [sessionId]);

    const handlePrint = () => {
        window.print();
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
                <div className="text-center space-y-6 max-w-md">
                    <div className="relative mx-auto w-24 h-24">
                        <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-xl animate-pulse"></div>
                        <div className="relative bg-white p-6 rounded-full shadow-xl">
                            <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
                        </div>
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Analyzing Reading DNA...</h2>
                        <p className="text-gray-500">
                            Consulting the reading spirits to reveal your archetype.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
                <Card className="w-full max-w-md border-red-100 shadow-xl">
                    <CardContent className="pt-8 text-center space-y-4">
                        <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                            <span className="text-2xl">⚠️</span>
                        </div>
                        <h2 className="text-xl font-bold text-gray-900">Unable to Generate Report</h2>
                        <p className="text-gray-500">{error}</p>
                        <Button asChild variant="outline" className="mt-4">
                            <Link to={`/results/${sessionId}`}>
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Results
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="admin-page print:bg-white print:p-0">
            <div className="admin-container" style={{ maxWidth: '1200px' }}>
                {/* Header Actions */}
                <div className="flex items-center justify-between mb-6 print:hidden">
                    <Link
                        to={`/results/${sessionId}`}
                        className="flex items-center text-gray-600 hover:text-gray-900 transition-colors font-medium"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Results
                    </Link>
                    <Button variant="outline" onClick={handlePrint} className="bg-white hover:bg-gray-50 shadow-sm border-gray-200">
                        <Download className="mr-2 h-4 w-4" />
                        Save as PDF
                    </Button>
                </div>

                {/* Report Content */}
                <Card className="border-none shadow-2xl bg-white/80 backdrop-blur-sm overflow-hidden print:shadow-none print:bg-white mb-8">
                    <div className="h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
                    <CardContent className="p-8 md:p-16">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={MarkdownComponents}
                        >
                            {report || ''}
                        </ReactMarkdown>
                    </CardContent>

                    {/* Decorative footer in card */}
                    <div className="bg-gray-50 p-6 text-center border-t border-gray-100">
                        <p className="text-sm text-gray-400 font-medium">
                            READ THE TEXT AI • PERSONALIZED INSIGHTS
                        </p>
                    </div>
                </Card>

                {/* Footer */}
                <div className="text-center text-sm text-gray-400 pb-8 print:hidden">
                    <p>Generated by Read the Text AI • <Link to="/" className="underline hover:text-indigo-600 transition-colors">Take the quiz again</Link></p>
                </div>
            </div>
        </div>
    );
};
