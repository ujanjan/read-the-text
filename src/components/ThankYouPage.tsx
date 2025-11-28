import React from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { CheckCircle2, Home } from 'lucide-react';

interface ThankYouPageProps {
    onReturnToLanding: () => void;
}

export function ThankYouPage({ onReturnToLanding }: ThankYouPageProps) {
    return (
        <div className="h-screen bg-gray-50 p-4 flex items-center justify-center">
            <div className="max-w-2xl w-full">
                <Card className="p-12 text-center">
                    <div className="flex justify-center mb-6">
                        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                            <CheckCircle2 className="h-12 w-12 text-green-600" />
                        </div>
                    </div>

                    <h1 className="text-2xl font-semibold text-gray-900 mb-3">
                        Thank you for your feedback!
                    </h1>

                    <p className="text-gray-600 text-base mb-8">
                        Your responses have been recorded.
                    </p>

                    <Button
                        onClick={onReturnToLanding}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-8"
                    >
                        <Home className="w-4 h-4 mr-2" />
                        Return to Home
                    </Button>
                </Card>
            </div>
        </div>
    );
}
