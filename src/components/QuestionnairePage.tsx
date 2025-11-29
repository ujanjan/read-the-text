import React, { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Loader2, RotateCcw, PlayCircle, AlertTriangle } from 'lucide-react';

interface QuestionnairePageProps {
    sessionId: string;
    onSubmit: (responses: QuestionnaireResponses) => Promise<void>;
    onResumeQuiz?: () => void;
    onRestartQuiz?: () => void;
    responses: QuestionnaireResponses;
    onResponseChange: (responses: QuestionnaireResponses) => void;
    isQuizComplete: boolean;
}

export interface QuestionnaireResponses {
    question1: string;
    question2: string;
    question3: string;
}

export function QuestionnairePage({
    sessionId,
    onSubmit,
    onResumeQuiz,
    onRestartQuiz,
    responses,
    onResponseChange,
    isQuizComplete
}: QuestionnairePageProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showRestartConfirm, setShowRestartConfirm] = useState(false);

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            await onSubmit(responses);
        } catch (error) {
            console.error('Failed to submit questionnaire:', error);
            alert('Failed to submit questionnaire. Please try again.');
            setIsSubmitting(false);
        }
    };

    const handleChange = (field: keyof QuestionnaireResponses, value: string) => {
        onResponseChange({
            ...responses,
            [field]: value
        });
    };

    return (
        <div className="h-screen bg-gray-50 flex flex-col">
            {/* Header with Resume/Restart buttons (only shown if quiz incomplete) */}
            {!isQuizComplete && onResumeQuiz && onRestartQuiz && (
                <div className="bg-white border-b border-gray-200 px-4 py-3">
                    <div className="max-w-3xl mx-auto flex items-center justify-between">
                        <h2 className="text-sm font-medium text-gray-700">
                            Quiz in Progress
                        </h2>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onResumeQuiz}
                                className="text-xs"
                            >
                                <PlayCircle className="h-4 w-4 mr-1" />
                                Resume Quiz
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowRestartConfirm(true)}
                                className="text-xs"
                            >
                                <RotateCcw className="h-4 w-4 mr-1" />
                                Restart Quiz
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header for Completed Quiz */}
            {isQuizComplete && onResumeQuiz && (
                <div className="bg-green-50 border-b border-green-200 px-4 py-3">
                    <div className="max-w-3xl mx-auto flex items-center justify-between">
                        <h2 className="text-sm font-medium text-green-800">
                            Quiz Completed
                        </h2>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onResumeQuiz}
                            className="text-xs bg-white hover:bg-green-50 text-green-700 border-green-200"
                        >
                            <PlayCircle className="h-4 w-4 mr-1" />
                            Review Quiz
                        </Button>
                    </div>
                </div>
            )}

            {/* Main content */}
            <div className="flex-1 p-4 flex items-center justify-center overflow-y-auto">
                <div className="w-[90%] md:w-[60%] mx-auto">
                    <Card className="p-8">
                        <div className="mb-6">
                            <h1 className="text-2xl font-semibold text-gray-900 mb-2">Feedback Questionnaire</h1>
                            <p className="text-gray-600 text-sm">
                                Please take a moment to answer the following questions about your experience.
                            </p>
                        </div>

                        <div className="space-y-6">
                            {/* Question 1 */}
                            <div>
                                <label className="block text-sm font-medium text-gray-900 mb-2">
                                    1. What is your impression of the interface, as a tool for independent learning?
                                </label>
                                <textarea
                                    value={responses.question1}
                                    onChange={(e) => handleChange('question1', e.target.value)}
                                    placeholder="Type your answer here..."
                                    className="w-full min-h-[200px] p-4 border border-gray-400 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
                                    style={{ border: '1.5px solid #9ca3af', padding: '16px', minHeight: '120px' }}
                                    disabled={isSubmitting}
                                />
                            </div>

                            {/* Question 2 */}
                            <div>
                                <label className="block text-sm font-medium text-gray-900 mb-2">
                                    2. What are your thoughts on the AI-generated feedback?
                                </label>
                                <textarea
                                    value={responses.question2}
                                    onChange={(e) => handleChange('question2', e.target.value)}
                                    placeholder="Type your answer here..."
                                    className="w-full min-h-[200px] p-4 border border-gray-400 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
                                    style={{ border: '1.5px solid #9ca3af', padding: '16px', minHeight: '120px' }}
                                    disabled={isSubmitting}
                                />
                            </div>

                            {/* Question 3 */}
                            <div>
                                <label className="block text-sm font-medium text-gray-900 mb-2">
                                    3. Please share any general feedback you have about the application as a tool for learning?
                                </label>
                                <textarea
                                    value={responses.question3}
                                    onChange={(e) => handleChange('question3', e.target.value)}
                                    placeholder="Type your answer here..."
                                    className="w-full min-h-[200px] p-4 border border-gray-400 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
                                    style={{ border: '1.5px solid #9ca3af', padding: '16px', minHeight: '120px' }}
                                    disabled={isSubmitting}
                                />
                            </div>
                        </div>

                        <div className="mt-8">
                            <Button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="w-full py-3 text-base font-semibold"
                                style={{
                                    backgroundColor: '#155dfc',
                                    color: 'white'
                                }}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                                        Submitting...
                                    </>
                                ) : (
                                    'I am done, Please Submit!'
                                )}
                            </Button>
                        </div>
                    </Card>
                </div>
            </div>
            {/* Restart Confirmation Modal */}
            {showRestartConfirm && (
                <div
                    className="fixed inset-0 flex items-center justify-center z-50 p-4"
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)' }}
                >
                    <div
                        className="rounded-lg max-w-md w-full p-6 shadow-2xl"
                        style={{ backgroundColor: '#18181b', border: '1px solid #27272a' }}
                    >
                        <div className="flex items-center gap-3 mb-4" style={{ color: '#f59e0b' }}>
                            <div className="p-2 rounded-full" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)' }}>
                                <AlertTriangle className="h-6 w-6" />
                            </div>
                            <h3 className="text-lg font-semibold" style={{ color: 'white' }}>Restart Quiz?</h3>
                        </div>

                        <div className="mb-6">
                            <p style={{ color: '#d4d4d8' }}>
                                Are you sure you want to restart? Your current progress will be reset and a new session will be started.
                            </p>
                            <div className="mt-4 text-sm" style={{ color: '#71717a' }}>
                                Note: Your previous attempt will be saved as incomplete for research purposes.
                            </div>
                        </div>

                        <div className="flex justify-end gap-3">
                            <Button
                                variant="outline"
                                onClick={() => setShowRestartConfirm(false)}
                                className="hover:bg-zinc-800"
                                style={{
                                    borderColor: '#3f3f46',
                                    color: '#e4e4e7',
                                    backgroundColor: 'transparent'
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={() => {
                                    setShowRestartConfirm(false);
                                    onRestartQuiz?.();
                                }}
                                style={{
                                    backgroundColor: '#d97706',
                                    color: 'white',
                                    border: 'none'
                                }}
                            >
                                Yes, Restart Quiz
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

