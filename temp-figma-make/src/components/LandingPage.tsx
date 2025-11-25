import { useState } from 'react';
import { Button } from './ui/button';
import { BookOpen, Clock, Monitor, Eye, Info } from 'lucide-react';

interface LandingPageProps {
  onStart: () => void;
}

export function LandingPage({ onStart }: LandingPageProps) {
  const [email, setEmail] = useState('');
  const [age, setAge] = useState('');
  const [university, setUniversity] = useState('');
  const [fluency, setFluency] = useState('');
  const [swsat, setSwsat] = useState('');
  const [agreedToData, setAgreedToData] = useState(false);
  const [showPrivacyDetails, setShowPrivacyDetails] = useState(false);

  const isFormValid = email && age && university && fluency && swsat && agreedToData;

  const handleStart = () => {
    if (isFormValid) {
      onStart();
    }
  };

  return (
    <div className="h-full flex items-center justify-center p-8">
      <div className="max-w-6xl w-full grid grid-cols-2 gap-12">
        {/* Left Column */}
        <div>
          <h1 className="text-gray-900 mb-2">Reading Comprehension Study</h1>
          <p className="text-gray-500 mb-8">
            DM2730 Technology Enhanced Learning • KTH Royal Institute of Technology
          </p>

          <div className="space-y-6 mb-8">
            <div className="flex gap-8">
              <div className="flex gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-gray-900">Read & Answer</p>
                  <p className="text-gray-500 text-xs">10 short passages</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-gray-900">~25 Minutes</p>
                  <p className="text-gray-500 text-xs">Complete in one sitting</p>
                </div>
              </div>
            </div>

            <div className="flex gap-8">
              <div className="flex gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Monitor className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-gray-900">Desktop Only</p>
                  <p className="text-gray-500 text-xs">Mouse recommended</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Eye className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-gray-900">Eye Tracking</p>
                  <p className="text-gray-500 text-xs">Via cursor movement</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
            <div className="flex gap-2">
              <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-900">
                <span className="font-semibold">Important:</span> Please follow the text with your cursor as you read. This acts as a proxy for eye-tracking.
              </p>
            </div>
          </div>

          <div className="border-t pt-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-gray-600">
                <Info className="w-4 h-4" />
                <span className="text-xs">Data Collection & Privacy</span>
              </div>
              <button
                onClick={() => setShowPrivacyDetails(!showPrivacyDetails)}
                className="text-xs text-blue-600 hover:underline"
              >
                {showPrivacyDetails ? 'Hide Details' : 'Show Details'}
              </button>
            </div>
            <p className="text-xs text-gray-500">
              We collect reading patterns, answers, and demographics for research purposes. All data is anonymized and stored securely.
            </p>
            {showPrivacyDetails && (
              <div className="mt-3 text-xs text-gray-500 space-y-2">
                <p>• Your cursor movements and reading patterns will be recorded</p>
                <p>• Your answers to comprehension questions will be stored</p>
                <p>• Demographic information helps us understand participant backgrounds</p>
                <p>• All data is anonymized and used solely for academic research</p>
                <p>• Data is stored securely and will not be shared with third parties</p>
              </div>
            )}
          </div>

          <div className="mt-6 text-xs text-gray-500">
            Questions? <a href="mailto:user@kth.se" className="text-blue-600 hover:underline">user@kth.se</a> | <a href="#" className="text-blue-600 hover:underline">Course Info</a>
          </div>

          <Button
            onClick={onStart}
            className="mt-4 w-full py-6 bg-pink-500 hover:bg-pink-600 text-white rounded-lg"
          >
            temporary button
          </Button>
        </div>

        {/* Right Column */}
        <div>
          <h2 className="text-gray-900 mb-6">Your Information</h2>

          <div className="space-y-5">
            <div>
              <label className="block text-gray-700 mb-2 text-xs">Enter your email:</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g., john@example.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
              />
              <p className="text-xs text-gray-400 mt-2">
                Tip: You can continue a past session or view your results by entering your previous email.
              </p>
            </div>

            <div>
              <label className="block text-gray-700 mb-2 text-xs">Age:</label>
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="Enter your age"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
              />
            </div>

            <div>
              <label className="block text-gray-700 mb-2 text-xs">Have you attended university?</label>
              <select
                value={university}
                onChange={(e) => setUniversity(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs appearance-none bg-white"
              >
                <option value="">Select an option</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
                <option value="currently">Currently attending</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-700 mb-2 text-xs">English Fluency:</label>
              <select
                value={fluency}
                onChange={(e) => setFluency(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs appearance-none bg-white"
              >
                <option value="">Select an option</option>
                <option value="native">Native speaker</option>
                <option value="fluent">Fluent (C1-C2)</option>
                <option value="advanced">Advanced (B2)</option>
                <option value="intermediate">Intermediate (B1)</option>
                <option value="beginner">Beginner (A1-A2)</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-700 mb-2 text-xs">Have you taken the SWSAT (Högskoleprovet)?</label>
              <select
                value={swsat}
                onChange={(e) => setSwsat(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs appearance-none bg-white"
              >
                <option value="">Select an option</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
                <option value="planning">Planning to</option>
              </select>
            </div>

            <div className="flex items-start gap-3 pt-2">
              <input
                type="checkbox"
                id="dataAgreement"
                checked={agreedToData}
                onChange={(e) => setAgreedToData(e.target.checked)}
                className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="dataAgreement" className="text-xs text-gray-700">
                I agree to data collection and recording of my reading patterns
              </label>
            </div>

            <Button
              onClick={handleStart}
              disabled={!isFormValid}
              className="w-full py-6 bg-blue-400 hover:bg-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg"
            >
              <span className="mr-2">📊</span> Start the Study
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}