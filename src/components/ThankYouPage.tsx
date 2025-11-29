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
            <div className="w-[90%] md:w-[60%] mx-auto">
                <Card
                    className="text-center flex flex-col items-center gap-0 !p-20"
                    style={{ padding: '80px' }}
                >
                    <div className="flex justify-center mb-12">
                        <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center">
                            <CheckCircle2 className="h-14 w-14 text-green-600" />
                        </div>
                    </div>

                    <h1 className="text-3xl font-semibold text-gray-900 mb-8">
                        Thank you for your feedback!
                    </h1>

                    <p className="text-gray-600 text-lg mb-20">
                        Your responses have been recorded.
                    </p>
                    <br></br>
                    <Button
                        onClick={onReturnToLanding}
                        className="mt-16 px-10 py-7 text-xl rounded-lg shadow-md transition-colors hover:bg-blue-700"
                        style={{ backgroundColor: '#2563eb', color: '#ffffff' }}
                    >
                        <Home className="w-6 h-6 mr-3" />
                        Return to Home
                    </Button>
                </Card>
            </div>
        </div>
    );
}
