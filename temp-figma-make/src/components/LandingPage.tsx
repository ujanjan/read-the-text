import { useState } from 'react';
import { Button } from './ui/button';
import { BookOpen, Clock, Monitor, Info, ChevronDown } from 'lucide-react';

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
      <div className="max-w-6xl w-full grid grid-cols-[40fr_60fr] gap-12">
        {/* Left Column - Your Information */}
        <div className="flex items-center">
          <div className="w-full">
            <div className="space-y-3">
              <div>
                <label className="block text-gray-700 mb-1 text-xs">Enter your email:</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g., john@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs bg-white"
                />
              </div>

              <div>
                <label className="block text-gray-700 mb-1 text-xs">Age:</label>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="Enter your age"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs bg-white"
                />
              </div>

              <div>
                <label className="block text-gray-700 mb-1 text-xs">Have you attended university?</label>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setUniversity('yes')}
                    className="flex items-center gap-2"
                  >
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                      university === 'yes'
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-gray-300 bg-white'
                    }`}>
                      {university === 'yes' && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                    <span className="text-xs text-gray-700">Yes</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setUniversity('no')}
                    className="flex items-center gap-2"
                  >
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                      university === 'no'
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-gray-300 bg-white'
                    }`}>
                      {university === 'no' && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                    <span className="text-xs text-gray-700">No</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setUniversity('currently')}
                    className="flex items-center gap-2"
                  >
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                      university === 'currently'
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-gray-300 bg-white'
                    }`}>
                      {university === 'currently' && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                    <span className="text-xs text-gray-700">Currently attending</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-gray-700 mb-1 text-xs">English Fluency:</label>
                <div className="relative">
                  <select
                    value={fluency}
                    onChange={(e) => setFluency(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs appearance-none bg-white pr-8"
                  >
                    <option value="">Select an option</option>
                    <option value="native">Native speaker</option>
                    <option value="fluent">Fluent (C1-C2)</option>
                    <option value="advanced">Advanced (B2)</option>
                    <option value="intermediate">Intermediate (B1)</option>
                    <option value="beginner">Beginner (A1-A2)</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 mb-1 text-xs">Have you previously taken the SWSAT (Högskoleprovet)?</label>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setSwsat('yes')}
                    className="flex items-center gap-2"
                  >
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                      swsat === 'yes'
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-gray-300 bg-white'
                    }`}>
                      {swsat === 'yes' && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                    <span className="text-xs text-gray-700">Yes</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSwsat('no')}
                    className="flex items-center gap-2"
                  >
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                      swsat === 'no'
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-gray-300 bg-white'
                    }`}>
                      {swsat === 'no' && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                    <span className="text-xs text-gray-700">No</span>
                  </button>
                </div>
              </div>

              <div className="flex items-start gap-2 pt-1">
                <label htmlFor="dataAgreement" className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    id="dataAgreement"
                    checked={agreedToData}
                    onChange={(e) => setAgreedToData(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`mt-0.5 w-3.5 h-3.5 border-2 rounded flex items-center justify-center flex-shrink-0 ${
                    agreedToData 
                      ? 'bg-green-600 border-green-600' 
                      : 'bg-white border-gray-300'
                  }`}>
                    {agreedToData && (
                      <svg className="w-2.5 h-2.5 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                        <path d="M5 13l4 4L19 7"></path>
                      </svg>
                    )}
                  </div>
                  <span className="text-xs text-gray-700">
                    I agree to data collection and recording of my reading patterns
                  </span>
                </label>
              </div>
            </div>

            <div className="border-t pt-3 mt-3">
              <div className="flex items-center gap-2 text-gray-600 mb-1">
                <Info className="w-3 h-3" />
                <span className="text-[10px]">Data Collection & Privacy</span>
              </div>
              <p className="text-[10px] text-gray-500">
                We collect reading patterns, answers, and demographics for research purposes. All data is anonymized and stored securely.{' '}
                <button
                  onClick={() => setShowPrivacyDetails(!showPrivacyDetails)}
                  className="text-[10px] text-blue-600 hover:underline"
                >
                  {showPrivacyDetails ? 'Hide Details' : 'Show Details'}
                </button>
              </p>
              {showPrivacyDetails && (
                <div className="mt-2 text-[10px] text-gray-500 space-y-1">
                  <p>• Your cursor movements and reading patterns will be recorded</p>
                  <p>• Your answers to comprehension questions will be stored</p>
                  <p>• Demographic information helps us understand participant backgrounds</p>
                  <p>• All data is anonymized and used solely for academic research</p>
                  <p>• Data is stored securely and will not be shared with third parties</p>
                </div>
              )}
            </div>

            <div className="mt-3 text-[10px] text-gray-500">
              Questions? <a href="mailto:user@kth.se" className="text-blue-600 hover:underline">user@kth.se</a> | <a href="#" className="text-blue-600 hover:underline">Course Info</a>
            </div>
          </div>
        </div>

        {/* Right Column - Instructions */}
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
                  <p className="text-gray-500 text-xs">10 short texts</p>
                </div>
              </div>
            </div>

            <div className="flex gap-8">
              <div className="flex gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5 text-blue-600" />
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
            </div>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
            <div className="flex gap-2">
              <Info className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-red-900">
                <p className="mb-2 font-semibold">
                  Important!<br />
                  For this test it is crucial that you show your line of sight with the cursor of your mouse.
                </p>
                <p>In other words - keep the mouse where you are looking at all times. This will produce an invisible heatmap of where your eyes and focus are during the test.</p>
              </div>
            </div>
          </div>

          <Button
            onClick={handleStart}
            disabled={!isFormValid}
            className="w-full py-6 bg-blue-400 hover:bg-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg mb-6"
          >
            Start the Study
          </Button>

          <Button
            onClick={onStart}
            className="w-full py-4 bg-pink-500 hover:bg-pink-600 text-white rounded-lg text-xs"
          >
            temporary button to skip to first text
          </Button>
        </div>
      </div>
    </div>
  );
}