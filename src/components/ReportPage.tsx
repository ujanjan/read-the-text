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
        <div className="mb-8 text-center">
            <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 pb-2" {...props} />
            <div className="h-1 w-24 bg-gradient-to-r from-indigo-600 to-pink-600 mx-auto rounded-full mt-2" />
        </div>
    ),
    h2: ({ node, children, ...props }: any) => {
        // Determine icon based on text content
        const text = String(children).toLowerCase();
        let Icon = Sparkles;
        let colorClass = "text-indigo-600";
        let bgClass = "bg-indigo-100";

        if (text.includes("spirit animal")) {
            Icon = Sparkles;
            colorClass = "text-purple-600";
            bgClass = "bg-purple-100";
        } else if (text.includes("performance") || text.includes("highlights")) {
            Icon = Trophy;
            colorClass = "text-amber-600";
            bgClass = "bg-amber-100";
        } else if (text.includes("deep dive") || text.includes("how you read")) {
            Icon = Brain;
            colorClass = "text-blue-600";
            bgClass = "bg-blue-100";
        } else if (text.includes("tips") || text.includes("growth")) {
            Icon = Sprout;
            colorClass = "text-green-600";
            bgClass = "bg-green-100";
        }

        return (
            <div className="flex items-center gap-3 mt-10 mb-6 border-b border-gray-100 pb-2">
                <div className={`p-2 rounded-lg ${bgClass}`}>
                    <Icon className={`h-6 w-6 ${colorClass}`} />
                </div>
                <h2 className="text-2xl font-bold text-gray-800" {...props}>
                    {children}
                </h2>
            </div>
        );
    },
    p: ({ node, children, ...props }: any) => {
        const text = String(children);
        if (text.includes("You are **") || text.includes("The Bee!") || text.includes("The Eagle") || text.includes("The Turtle") || text.includes("The Cheetah") || text.includes("The Owl")) {
            return (
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-xl border border-indigo-100 shadow-sm my-6 text-lg leading-relaxed text-gray-700">
                    <p {...props}>{children}</p>
                </div>
            );
        }
        return <p className="text-gray-600 leading-relaxed mb-4 text-lg" {...props}>{children}</p>;
    },
    ul: ({ node, ...props }: any) => (
        <ul className="space-y-4 my-6" {...props} />
    ),
    li: ({ node, children, ...props }: any) => (
        <li className="flex items-start gap-3 text-gray-700 bg-white p-4 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <span className="mt-1.5 h-2 w-2 rounded-full bg-indigo-500 flex-shrink-0" />
            <span className="flex-1">{children}</span>
        </li>
    ),
    strong: ({ node, ...props }: any) => (
        <strong className="font-bold text-indigo-700" {...props} />
    ),
    blockquote: ({ node, ...props }: any) => (
        <div className="flex gap-4 p-6 bg-gray-50 rounded-xl border-l-4 border-gray-300 my-6 italic text-gray-600">
            <Quote className="h-8 w-8 text-gray-300 flex-shrink-0" />
            <blockquote {...props} />
        </div>
    ),
    // Handle code blocks just in case they slip through or are intentional
    code: ({ node, inline, className, children, ...props }: any) => {
        if (inline) {
            return <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono text-indigo-600" {...props}>{children}</code>;
        }
        return (
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto my-4 text-sm font-mono">
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
        <div className="min-h-screen bg-gray-50 py-12 px-4 md:px-8 print:bg-white print:p-0">
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Header Actions */}
                <div className="flex items-center justify-between print:hidden">
                    <Button asChild variant="ghost" className="hover:bg-white/50">
                        <Link to={`/results/${sessionId}`} className="flex items-center text-gray-600 hover:text-gray-900 transition-colors">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Results
                        </Link>
                    </Button>
                    <Button variant="outline" onClick={handlePrint} className="bg-white hover:bg-gray-50 shadow-sm">
                        <Download className="mr-2 h-4 w-4" />
                        Save as PDF
                    </Button>
                </div>

                {/* Report Content */}
                <Card className="border-none shadow-2xl bg-white/80 backdrop-blur-sm overflow-hidden print:shadow-none print:bg-white">
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
                    <p>Generated by Read the Text AI • <a href="/" className="underline hover:text-indigo-600 transition-colors">Take the quiz again</a></p>
                </div>
            </div>
        </div>
    );
};
