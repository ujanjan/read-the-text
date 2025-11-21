import React, { useState, useRef, useEffect } from 'react';
import { ReadingComprehension, ReadingComprehensionHandle } from './components/ReadingComprehension';
import { CursorTracker, CursorData } from './components/CursorTracker';
import { CursorTrackingData } from './components/CursorTrackingData';
import { CursorHeatmap, CursorHeatmapHandle } from './components/CursorHeatmap';
//import { RealtimeCursorIndicator } from './components/RealtimeCursorIndicator';
import { Button } from './components/ui/button';
import { Card } from './components/ui/card';
import { MousePointer2, MousePointerClick, PanelRightClose, PanelRightOpen, ChevronLeft, ChevronRight, CheckCircle2, XCircle, Clock } from 'lucide-react';
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
    // Calculate total time
    const totalTime = passages.reduce((total, _, index) => {
      return total + (passageData[index]?.timeSpent || 0);
    }, 0);

    return (
      <div className="h-screen bg-gray-50 p-4 flex flex-col">
        <div className="max-w-4xl mx-auto w-full flex flex-col flex-1">
          <Card className="p-8 flex-1 overflow-y-auto">
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">🎉</div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Quiz Complete!</h1>
              <p className="text-gray-600">You've completed all {passages.length} passages.</p>
              <div className="mt-4 inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-lg">
                <Clock className="h-5 w-5" />
                <span className="font-medium">Total Time: {formatTime(totalTime)}</span>
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <h2 className="text-lg font-semibold text-gray-900">Results by Passage</h2>
              {passages.map((passage, index) => {
                const data = passageData[index];
                const attempts = data?.wrongAttempts || 0;
                const screenshot = data?.screenshot;
                const timeSpent = data?.timeSpent || 0;
                return (
                  <div
                    key={passage.id}
                    className={`flex items-start gap-3 p-4 rounded-lg border ${
                      attempts === 0
                        ? 'bg-green-50 border-green-200'
                        : 'bg-yellow-50 border-yellow-200'
                    }`}
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white flex items-center justify-center font-semibold text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 mb-1">{passage.title}</p>
                      <div className="flex items-center gap-2 mb-2">
                        {attempts === 0 ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Correct on first try
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-yellow-700">
                            <XCircle className="h-3.5 w-3.5" />
                            {attempts} wrong {attempts === 1 ? 'attempt' : 'attempts'}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="h-3 w-3" />
                          {formatTime(timeSpent)}
                        </span>
                      </div>
                      {screenshot && (
                        <div
                          className="cursor-pointer rounded border border-gray-300 overflow-hidden bg-gray-50 hover:bg-gray-100 transition-colors inline-block"
                          onClick={() => setSelectedScreenshot(screenshot)}
                        >
                          <img
                            src={screenshot}
                            alt={`Heatmap for ${passage.title}`}
                            className="w-48 h-auto"
                            style={{ maxHeight: '120px', objectFit: 'contain' }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="text-center">
              <Button onClick={handleRestartQuiz} size="lg">
                Restart Quiz
              </Button>
            </div>
          </Card>
        </div>

        {/* Full-size screenshot modal */}
        {selectedScreenshot && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedScreenshot(null)}
          >
            <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-auto p-4">
              <img
                src={selectedScreenshot}
                alt="Heatmap screenshot"
                className="max-w-full h-auto"
              />
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
