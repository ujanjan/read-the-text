import React from 'react';
import { Card } from './ui/card';
import { CheckCircle2 } from 'lucide-react';

export function ThankYouPage() {
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

                    <p className="text-gray-600 text-base">
                        Your responses have been recorded.
                    </p>
                </Card>
            </div>
        </div>
    );
}
