import React, { useState, useRef, useEffect } from 'react';
import { ReadingComprehension, ReadingComprehensionHandle } from './components/ReadingComprehension';
import { CursorTracker, CursorData } from './components/CursorTracker';
import { CursorTrackingData } from './components/CursorTrackingData';
import { CursorHeatmap, CursorHeatmapHandle } from './components/CursorHeatmap';
//import { RealtimeCursorIndicator } from './components/RealtimeCursorIndicator';
import { Button } from './components/ui/button';
import { Card } from './components/ui/card';
import { MousePointer2, MousePointerClick, PanelRightClose, PanelRightOpen, ChevronLeft, ChevronRight, CheckCircle2, XCircle, Clock, Trophy, Target, Zap } from 'lucide-react';
import { toCanvas } from 'html-to-image';
import { getPassages } from './services/passageService';
import { Passage } from './types/passage';

// Per-passage data storage
interface PassageData {
  cursorHistory: CursorData[];
  screenshot: string | null;
  isComplete: boolean;
  wrongAttempts: number;
  timeSpent: number; // Total time spent in milliseconds
}

export default function App() {
  const [passages, setPassages] = useState<Passage[]>([]);
  const [currentPassageIndex, setCurrentPassageIndex] = useState(0);
  const currentPassage = passages[currentPassageIndex];
  const [trackingEnabled, setTrackingEnabled] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [debugMode, setDebugMode] = useState(false); // Debug mode to show heatmap to user
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null); // For viewing full-size screenshots
  //const [showRealtimeIndicator, setShowRealtimeIndicator] = useState(true);

  // Per-passage data storage
  const [passageData, setPassageData] = useState<Record<number, PassageData>>({});

  // Get current passage data or defaults
  const currentData = passageData[currentPassageIndex] || {
    cursorHistory: [],
    screenshot: null,
    isComplete: false,
    wrongAttempts: 0,
    timeSpent: 0
  };

  // 🔹 Ref to control the CursorHeatmap (for saving image)
  const heatmapRef = useRef<CursorHeatmapHandle | null>(null);
  // 🔹 Ref to control the ReadingComprehension component
  const readingComprehensionRef = useRef<ReadingComprehensionHandle | null>(null);
  // 🔹 Ref to the passage container for CursorHeatmap
  const passageRef = useRef<HTMLDivElement | null>(null);
  // 🔹 Ref to track when user started viewing current passage
  const passageStartTimeRef = useRef<number | null>(null);

  const handleCursorData = (data: CursorData) => {
    setPassageData(prev => ({
      ...prev,
      [currentPassageIndex]: {
        ...currentData,
        cursorHistory: [...currentData.cursorHistory, data]
      }
    }));
  };

  const clearCursorHistory = () => {
    setPassageData(prev => ({
      ...prev,
      [currentPassageIndex]: {
        ...currentData,
        cursorHistory: []
      }
    }));
  };

  // Helper function to accumulate time spent on current passage
  const accumulateTimeForCurrentPassage = () => {
    if (passageStartTimeRef.current && !currentData.isComplete) {
      const elapsed = Date.now() - passageStartTimeRef.current;
      setPassageData(prev => ({
        ...prev,
        [currentPassageIndex]: {
          ...prev[currentPassageIndex],
          cursorHistory: prev[currentPassageIndex]?.cursorHistory || [],
          screenshot: prev[currentPassageIndex]?.screenshot || null,
          isComplete: prev[currentPassageIndex]?.isComplete || false,
          wrongAttempts: prev[currentPassageIndex]?.wrongAttempts || 0,
          timeSpent: (prev[currentPassageIndex]?.timeSpent || 0) + elapsed
        }
      }));
      passageStartTimeRef.current = null;
    }
  };

  // Helper function to format time in seconds or minutes
  const formatTime = (ms: number): string => {
    const seconds = Math.round(ms / 1000);
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  // Load passages on mount
  useEffect(() => {
    getPassages().then(setPassages);
  }, []);

  // Sync passageRef with ReadingComprehension's passage element
  useEffect(() => {
    const element = readingComprehensionRef.current?.getPassageElement();
    if (element) {
      passageRef.current = element;
    }
  });

  const handleToggleTracking = () => {
    if (trackingEnabled) {
      // When stopping, accumulate time and stop tracking
      accumulateTimeForCurrentPassage();
      setTrackingEnabled(false);
    } else {
      // When starting fresh, start timer
      passageStartTimeRef.current = Date.now();
      setTrackingEnabled(true);
    }
  };

  const handleRestartQuiz = () => {
    // Reset the quiz component state
    if (readingComprehensionRef.current) {
      readingComprehensionRef.current.reset();
    }
    // Clear all passage data
    setPassageData({});
    // Reset to first passage
    setCurrentPassageIndex(0);
    // Hide summary
    setShowSummary(false);
    // Start tracking again
    setTrackingEnabled(true);
    // Start timer for first passage
    passageStartTimeRef.current = Date.now();
    // Update passageRef after reset
    setTimeout(() => {
      const element = readingComprehensionRef.current?.getPassageElement();
      if (element) {
        passageRef.current = element;
      }
    }, 0);
  };

  // Navigation between passages
  const handlePreviousPassage = () => {
    if (currentPassageIndex > 0) {
      // Accumulate time for current passage before leaving
      accumulateTimeForCurrentPassage();
      // Reset the component for the new passage
      if (readingComprehensionRef.current) {
        readingComprehensionRef.current.reset();
      }
      setCurrentPassageIndex(currentPassageIndex - 1);
      // Start timer for new passage (only if it's not complete)
      const prevPassageData = passageData[currentPassageIndex - 1];
      if (!prevPassageData?.isComplete) {
        passageStartTimeRef.current = Date.now();
      }
      // Update passageRef after navigation
      setTimeout(() => {
        const element = readingComprehensionRef.current?.getPassageElement();
        if (element) {
          passageRef.current = element;
        }
      }, 0);
    }
  };

  const handleNextPassage = () => {
    if (currentPassageIndex < passages.length - 1) {
      // Accumulate time for current passage before leaving
      accumulateTimeForCurrentPassage();
      // Reset the component for the new passage
      if (readingComprehensionRef.current) {
        readingComprehensionRef.current.reset();
      }
      setCurrentPassageIndex(currentPassageIndex + 1);
      // Start timer for new passage (only if it's not complete)
      const nextPassageData = passageData[currentPassageIndex + 1];
      if (!nextPassageData?.isComplete) {
        passageStartTimeRef.current = Date.now();
      }
      // Update passageRef after navigation
      setTimeout(() => {
        const element = readingComprehensionRef.current?.getPassageElement();
        if (element) {
          passageRef.current = element;
        }
      }, 0);
    }
  };

  // Handle passage completion (correct answer)
  const handlePassageComplete = async (wrongAttempts: number) => {
    // Capture screenshot with heatmap before marking complete
    await handleCaptureScreenshot();

    // Calculate final time for this passage
    let finalTimeSpent = passageData[currentPassageIndex]?.timeSpent || 0;
    if (passageStartTimeRef.current) {
      finalTimeSpent += Date.now() - passageStartTimeRef.current;
      passageStartTimeRef.current = null; // Stop timer
    }

    setPassageData(prev => ({
      ...prev,
      [currentPassageIndex]: {
        ...prev[currentPassageIndex],
        cursorHistory: prev[currentPassageIndex]?.cursorHistory || currentData.cursorHistory,
        screenshot: prev[currentPassageIndex]?.screenshot || null,
        isComplete: true,
        wrongAttempts,
        timeSpent: finalTimeSpent
      }
    }));

    // Check if all passages are complete
    const allComplete = passages.every((_, index) => {
      if (index === currentPassageIndex) return true; // Current one is now complete
      return passageData[index]?.isComplete === true;
    });

    if (allComplete) {
      setTrackingEnabled(false);
      setShowSummary(true);
    }
  };

  const handleCaptureScreenshot = async (): Promise<string | null> => {
    const passageElement = readingComprehensionRef.current?.getPassageElement();
    if (!passageElement) {
      return null;
    }

    try {
      // OPTIMIZATION: Limit pixel ratio to reduce image size
      // Use max 1.5x instead of full device pixel ratio (which can be 2-3x on retina)
      // This significantly reduces file size while maintaining readability
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
      const rect = passageElement.getBoundingClientRect();
      
      // Capture using html-to-image (supports oklch natively)
      const canvas = await toCanvas(passageElement, {
        backgroundColor: '#ffffff',
        pixelRatio: pixelRatio,
      });

      // Composite heatmap onto the screenshot (heatmap is always enabled when tracking)
      if (heatmapRef.current) {
        const heatmapCanvas = heatmapRef.current.getCanvas();
        if (heatmapCanvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            // The heatmap canvas is already sized to match the container exactly
            // and contains only container-relative coordinates (0,0 to width,height)
            // So we can draw it directly without cropping
            
            // However, we need to account for pixel ratio differences
            // The screenshot canvas might be at a different scale than the heatmap canvas
            const screenshotWidth = canvas.width;
            const screenshotHeight = canvas.height;
            const heatmapWidth = heatmapCanvas.width;
            const heatmapHeight = heatmapCanvas.height;
            
            // Save the current context state
            ctx.save();
            
            // Apply the heatmap opacity (0.6) when compositing
            ctx.globalAlpha = 0.6;
            
            // Draw the entire heatmap canvas onto the screenshot
            // Scale it to match the screenshot dimensions exactly
            ctx.drawImage(
              heatmapCanvas,
              0, 0, heatmapWidth, heatmapHeight, // Source: entire heatmap canvas
              0, 0, screenshotWidth, screenshotHeight // Destination: full screenshot canvas
            );
            
            // Restore the context state
            ctx.restore();
          }
        }
      }

      // OPTIMIZATION: Use JPEG instead of PNG for much smaller file size
      // Quality 0.85 provides good balance between quality and file size
      // PNG: ~500KB-2MB, JPEG (0.85): ~50-150KB (10-20x smaller!)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      
      // Log size for monitoring
      const sizeKB = Math.round((dataUrl.length * 0.75) / 1024); // Approximate base64 to bytes
      console.log(`📸 Screenshot captured: ${sizeKB}KB (JPEG quality 0.85, pixelRatio ${pixelRatio.toFixed(1)})`);

      // Store screenshot per-passage
      setPassageData(prev => ({
        ...prev,
        [currentPassageIndex]: {
          ...currentData,
          screenshot: dataUrl
        }
      }));
      return dataUrl;
    } catch (error) {
      console.error('Failed to capture screenshot:', error);
      alert('Failed to capture screenshot. Check console for details.');
      return null;
    }
  };

  // Loading state
  if (!currentPassage) {
    return (
      <div className="h-screen bg-gray-50 p-4 flex items-center justify-center">
        <p className="text-gray-600">Loading passage...</p>
      </div>
    );
  }

  // Check if any passage has been started
  const hasStarted = Object.keys(passageData).length > 0;

  // Summary screen
  if (showSummary) {
    // Calculate statistics
    const totalTime = passages.reduce((total, _, index) => {
      return total + (passageData[index]?.timeSpent || 0);
    }, 0);
    const perfectPassages = passages.filter((_, index) =>
      (passageData[index]?.wrongAttempts || 0) === 0
    ).length;
    const accuracyRate = Math.round((perfectPassages / passages.length) * 100);
    const avgTimePerPassage = totalTime / passages.length;

    return (
      <div className="h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 flex flex-col overflow-hidden">
        <div className="max-w-5xl mx-auto w-full flex flex-col flex-1 min-h-0">
          {/* Header */}
          <div className="text-center py-6 flex-shrink-0">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-full mb-4">
              <Trophy className="h-8 w-8 text-yellow-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Quiz Complete!</h1>
            <p className="text-gray-600">Great job completing all {passages.length} passages</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-4 mb-6 flex-shrink-0">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Clock className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Total Time</p>
                  <p className="text-lg font-bold text-gray-900">{formatTime(totalTime)}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-50 rounded-lg">
                  <Target className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Accuracy</p>
                  <p className="text-lg font-bold text-gray-900">{accuracyRate}%</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <Zap className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Avg Time</p>
                  <p className="text-lg font-bold text-gray-900">{formatTime(avgTimePerPassage)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Passage Results */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 sticky top-0 bg-gradient-to-br from-gray-50 to-gray-100 py-2">
              Reading Pattern Analysis
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pb-4">
              {passages.map((passage, index) => {
                const data = passageData[index];
                const attempts = data?.wrongAttempts || 0;
                const screenshot = data?.screenshot;
                const timeSpent = data?.timeSpent || 0;
                const isPerfect = attempts === 0;

                return (
                  <div
                    key={passage.id}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                  >
                    {/* Heatmap Preview */}
                    {screenshot && (
                      <div
                        className="relative cursor-pointer group aspect-[4/3]"
                        onClick={() => setSelectedScreenshot(screenshot)}
                      >
                        <img
                          src={screenshot}
                          alt={`Reading heatmap for ${passage.title}`}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                          <span className="opacity-0 group-hover:opacity-100 text-white bg-black/60 px-2 py-0.5 rounded text-[10px] font-medium transition-opacity">
                            Enlarge
                          </span>
                        </div>
                        {/* Performance badge */}
                        <div className={`absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          isPerfect
                            ? 'bg-green-500 text-white'
                            : 'bg-yellow-500 text-white'
                        }`}>
                          {isPerfect ? 'Perfect' : `${attempts}x`}
                        </div>
                      </div>
                    )}

                    {/* Passage Info */}
                    <div className="p-2.5">
                      <div className="flex items-start gap-2">
                        <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          isPerfect
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 text-xs leading-tight mb-1.5 line-clamp-2">
                            {passage.title}
                          </h3>
                          <div className="flex items-center gap-2 text-[10px]">
                            <span className={`inline-flex items-center gap-0.5 ${
                              isPerfect ? 'text-green-600' : 'text-yellow-600'
                            }`}>
                              {isPerfect ? (
                                <CheckCircle2 className="h-3 w-3" />
                              ) : (
                                <XCircle className="h-3 w-3" />
                              )}
                              {isPerfect ? '1st' : `${attempts + 1}x`}
                            </span>
                            <span className="inline-flex items-center gap-0.5 text-gray-500">
                              <Clock className="h-3 w-3" />
                              {formatTime(timeSpent)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="pt-4 pb-2 flex-shrink-0">
            <Button onClick={handleRestartQuiz} size="lg" className="w-full">
              Start New Quiz
            </Button>
          </div>
        </div>

        {/* Full-size screenshot modal */}
        {selectedScreenshot && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedScreenshot(null)}
          >
            <div className="bg-white rounded-xl max-w-4xl max-h-[90vh] overflow-auto shadow-2xl">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Reading Heatmap</h3>
                <button
                  className="text-gray-500 hover:text-gray-700 text-sm"
                  onClick={() => setSelectedScreenshot(null)}
                >
                  Close
                </button>
              </div>
              <div className="p-4">
                <img
                  src={selectedScreenshot}
                  alt="Heatmap screenshot"
                  className="max-w-full h-auto rounded-lg"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 p-4 flex flex-col">
      <div className="max-w-[1600px] mx-auto w-full flex flex-col flex-1 min-h-0">
        <div className="mb-3 flex items-start justify-between flex-shrink-0">
          <div>
            <h1 className="text-gray-900">Reading Comprehension</h1>
            <p className="text-gray-600 text-sm">
              Passage {currentPassageIndex + 1} of {passages.length}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Passage navigation */}
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreviousPassage}
              disabled={currentPassageIndex === 0 || !trackingEnabled}
              className="text-xs"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPassage}
              disabled={currentPassageIndex === passages.length - 1 || !trackingEnabled}
              className="text-xs"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>

            <Button
              variant={trackingEnabled ? 'outline' : 'default'}
              size="sm"
              onClick={trackingEnabled ? handleToggleTracking : (hasStarted ? handleRestartQuiz : handleToggleTracking)}
              className="text-xs"
            >
              {trackingEnabled ? (
                <>
                  <MousePointerClick className="h-4 w-4 mr-1" />
                  Stop The Quiz
                </>
              ) : hasStarted ? (
                <>
                  <MousePointer2 className="h-4 w-4 mr-1" />
                  Restart The Quiz
                </>
              ) : (
                <>
                  <MousePointer2 className="h-4 w-4 mr-1" />
                  Start The Quiz
                </>
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSidebar(!showSidebar)}
              className="text-xs"
              title={showSidebar ? 'Hide sidebar' : 'Show sidebar'}
            >
              {showSidebar ? (
                <PanelRightClose className="h-4 w-4" />
              ) : (
                <PanelRightOpen className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        
        <div className="flex-1 min-h-0 flex gap-3 min-w-0">
          <div className="flex-1 min-h-0 min-w-0">
            <ReadingComprehension
              ref={readingComprehensionRef}
              title={currentPassage.title}
              passage={currentPassage.text}
              questions={currentPassage.questions}
              cursorHistory={currentData.cursorHistory}
              screenshot={currentData.screenshot}
              onCaptureScreenshot={handleCaptureScreenshot}
              onPassageComplete={handlePassageComplete}
              trackingEnabled={trackingEnabled}
            />
          </div>
          
          {showSidebar && (
            <div className="w-80 flex-shrink-0">
              <CursorTrackingData
                cursorHistory={currentData.cursorHistory}
                onClear={clearCursorHistory}
                screenshot={currentData.screenshot}
                onSaveHeatmap={() => heatmapRef.current?.saveImage()}
                onSaveScreenshot={handleCaptureScreenshot}
                heatmapRef={heatmapRef}
                title={currentPassage.title}
                passage={currentPassage.text}
                debugMode={debugMode}
                onToggleDebugMode={() => setDebugMode(!debugMode)}
              />
            </div>
          )}
        </div>
      </div>

      <CursorTracker 
        onCursorData={handleCursorData}
        enabled={trackingEnabled}
      />

      {trackingEnabled && (
        <CursorHeatmap
          ref={heatmapRef}
          cursorHistory={currentData.cursorHistory}
          opacity={0.6}
          radius={40}
          containerRef={passageRef}
          visible={debugMode}
        />
      )}
    </div>
  );
}
