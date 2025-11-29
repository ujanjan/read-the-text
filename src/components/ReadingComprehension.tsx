import { useState, useRef, forwardRef, useImperativeHandle, useEffect } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Label } from "./ui/label";
import { CheckCircle2, XCircle, Loader2, ChevronLeft, ChevronRight, Info } from "lucide-react";
import { getPersonalizedQuestionFeedbackVariantC, CursorData } from "../services/geminiService";
import { apiService } from "../services/apiService";
import { ReadingSummary, summarizeCursorSession, computeSentenceRects } from "../summarizeCursor";
import { debugLog } from "../utils/logger";

interface Question {
  id: number;
  question: string;
  choices: string[];
  correctAnswer: number;
}

interface ReadingComprehensionProps {
  title?: string;
  passage: string;
  questions: Question[];
  cursorHistory?: CursorData[];
  screenshot?: string | null;
  onCaptureScreenshot?: () => Promise<string | null>;
  onPassageComplete?: (wrongAttempts: number, selectedAnswer: string, feedbackText: string) => void;
  trackingEnabled?: boolean;
  sessionId?: string | null;
  currentPassageIndex?: number;
  initialIsComplete?: boolean;
  initialSelectedAnswer?: string;
  initialFeedback?: string;
  onNextPassage?: () => void;
  onPreviousPassage?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
  onFinishQuiz?: () => void;
}

export interface ReadingComprehensionHandle {
  reset: () => void;
  isComplete: () => boolean;
  getPassageElement: () => HTMLDivElement | null;
}

const renderSentences = (text: string, nextId: () => number) => {
  const sentences = text.match(/[^.!?]+(?:[.!?]+|$)/g) ?? [];

  return sentences.map((sentence) => {
    const id = nextId();

    return (
      <span
        key={id}
        data-sentence-id={id}
        style={{ display: "inline" }}
      >
        {sentence + " "}
      </span>
    );
  });
};

export const ReadingComprehension = forwardRef<ReadingComprehensionHandle, ReadingComprehensionProps>(
  function ReadingComprehension({
    title,
    passage,
    questions,
    cursorHistory = [],
    screenshot = null,
    onCaptureScreenshot,
    onPassageComplete,
    trackingEnabled = false,
    sessionId = null,
    currentPassageIndex = 0,
    initialIsComplete = false,
    initialSelectedAnswer = "",
    initialFeedback = "",
    onNextPassage,
    onPreviousPassage,
    hasPrevious = false,
    hasNext = false,
    onFinishQuiz,
  }, ref) {
    const [selectedAnswer, setSelectedAnswer] = useState<string>(initialSelectedAnswer);
    const [showFeedback, setShowFeedback] = useState(initialIsComplete);
    const [feedbackText, setFeedbackText] = useState<string>(initialFeedback);
    const [isLoadingFeedback, setIsLoadingFeedback] = useState(false);
    const [currentSubmissionCorrect, setCurrentSubmissionCorrect] = useState<boolean>(initialIsComplete);
    const [wrongAttempts, setWrongAttempts] = useState(0);
    const [isComplete, setIsComplete] = useState(initialIsComplete);
    const passageRef = useRef<HTMLDivElement>(null);

    // Reset state when props change (navigating between passages)
    useEffect(() => {
      debugLog(`🔄 [Passage Change] Switching to passage ${currentPassageIndex}`);
      debugLog(`   └─ Cursor history for this passage: ${cursorHistory?.length || 0} points`);

      setSelectedAnswer(initialSelectedAnswer);
      setShowFeedback(initialIsComplete);
      // Always restore feedback from initialFeedback for completed passages
      setFeedbackText(initialFeedback);
      setCurrentSubmissionCorrect(initialIsComplete);
      setIsComplete(initialIsComplete);
      setWrongAttempts(0);
      setIsLoadingFeedback(false);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentPassageIndex, initialIsComplete, initialSelectedAnswer, initialFeedback]);

    // Only use first question
    const currentQuestion = questions[0];

    // Expose reset method and completion status via ref
    useImperativeHandle(ref, () => ({
      reset() {
        setSelectedAnswer("");
        setShowFeedback(false);
        setFeedbackText("");
        setIsLoadingFeedback(false);
        setCurrentSubmissionCorrect(false);
        setWrongAttempts(0);
        setIsComplete(false);
      },
      isComplete() {
        return isComplete;
      },
      getPassageElement() {
        return passageRef.current;
      }
    }));

    const handleSubmit = async () => {
      if (!selectedAnswer || isLoadingFeedback || isComplete) return;

      const isCorrect = selectedAnswer === currentQuestion?.correctAnswer.toString();

      // Track wrong attempts
      if (!isCorrect) {
        setWrongAttempts(prev => prev + 1);
      }

      setCurrentSubmissionCorrect(isCorrect);
      setShowFeedback(true);
      setIsLoadingFeedback(true);

      // Always capture a fresh screenshot to include latest cursor movements
      // This ensures the heatmap reflects all cursor activity up to this point
      let currentScreenshot = screenshot;
      if (onCaptureScreenshot) {
        try {
          currentScreenshot = await onCaptureScreenshot();
          debugLog('📸 Screenshot captured for personalized feedback:', currentScreenshot ? 'Success' : 'Failed');
        } catch (error) {
          console.warn('Failed to capture screenshot for feedback:', error);
          // Fallback to existing screenshot if capture fails
          if (!currentScreenshot) {
            currentScreenshot = screenshot;
          }
        }
      }

      // Get personalized feedback from ALL variants in parallel
      const selectedAnswerText = currentQuestion.choices[parseInt(selectedAnswer)];
      const correctAnswerText = currentQuestion.choices[currentQuestion.correctAnswer];

      // LOG DATA BEING SENT TO GEMINI
      const screenshotSizeKB = currentScreenshot ? Math.round((currentScreenshot.length * 0.75) / 1024) : 0;
      const passageLength = passage.length;
      const cursorPoints = cursorHistory.length;
      debugLog('═══════════════════════════════════════════════════════');
      debugLog('📤 [GEMINI API CALL] Personalized Question Feedback - VARIANT C ONLY');
      debugLog('═══════════════════════════════════════════════════════');
      debugLog(`📍 Passage Index: ${currentPassageIndex}`);
      debugLog(`📊 Cursor History: ${cursorPoints} points (tracked locally, NOT sent to Gemini)`);
      debugLog(`📸 Screenshot: ${currentScreenshot ? `Yes (${screenshotSizeKB} KB) - includes visual heatmap` : 'No'}`);
      debugLog(`📝 Passage Length: ${passageLength} characters`);
      debugLog(`✅ Answer Correct: ${isCorrect}`);
      debugLog(`🔢 Attempt Number: ${wrongAttempts + 1}`);
      debugLog('═══════════════════════════════════════════════════════');

      const container = passageRef.current;
      let readingSummaryJson: string | undefined = undefined;

      debugLog('═══════════════════════════════════════════════════════');
      debugLog('🔍 [ReadingComprehension] Submit debug:');
      debugLog('  - Container exists:', !!container);
      debugLog('  - Cursor history length:', cursorHistory.length);

      if (container && cursorHistory.length > 0) {
        const sentenceRects = computeSentenceRects(container, "[data-sentence-id]");
        const readingSummary: ReadingSummary = summarizeCursorSession(
          cursorHistory,
          sentenceRects
        );
        readingSummaryJson = JSON.stringify(readingSummary);
        debugLog('📊 [SENTENCE-LEVEL READING SUMMARY]:');
        debugLog(readingSummaryJson);
      }

      // Call only Variant C (strategy-focused feedback)
      const feedbackResult = await getPersonalizedQuestionFeedbackVariantC(
        title || '',
        passage,
        currentScreenshot,
        currentQuestion.question,
        selectedAnswerText,
        correctAnswerText,
        isCorrect,
        readingSummaryJson
      ).then(result => {
        debugLog('🤖 [GEMINI RESPONSE - VARIANT C]:', result.feedback);
        debugLog('🤖 [GEMINI RESPONSE LENGTH - VARIANT C]:', result.feedback.length);
        setFeedbackText(result.feedback);
        setIsLoadingFeedback(false);
        debugLog('✅ [STATE UPDATE] setFeedbackText called with:', result.feedback.substring(0, 50) + '...');
        return result;
      }).catch(error => {
        console.error('Failed to get personalized feedback (Variant C):', error);
        const fallback = isCorrect ? 'Correct!' : 'Try again! Focus on the passage to find the answer.';
        setFeedbackText(fallback);
        setIsLoadingFeedback(false);
        return { feedback: fallback, error: error.message };
      });

      // Record attempt in cloud if we have a session
      if (sessionId) {
        try {
          await apiService.recordAttempt(sessionId, currentPassageIndex, {
            selectedAnswer: selectedAnswerText,
            isCorrect,
            geminiResponse: feedbackResult.feedback,
            screenshot: currentScreenshot || undefined,
            readingSummary: readingSummaryJson
          });
        } catch (err) {
          console.error('Failed to record attempt:', err);
        }
      }

      // Mark as complete and notify parent if correct
      if (isCorrect) {
        setIsComplete(true);
        if (onPassageComplete) {
          const selectedAnswerText = currentQuestion.choices[parseInt(selectedAnswer)];
          // Pass the feedback text to the parent so it can be stored in passageData
          onPassageComplete(wrongAttempts, selectedAnswerText, feedbackResult.feedback);
        }
      }
    };

    const handleTryAgain = () => {
      setShowFeedback(false);
      setFeedbackText("");
      setSelectedAnswer("");
      setIsLoadingFeedback(false);
      setCurrentSubmissionCorrect(false);
    };

    let globalSentenceId: number = 0
    return (
      <div className="flex gap-4 h-full min-w-0 w-full">
        {/* Reading Passage - 60% width */}
        <div className="flex flex-col min-w-0" style={{ flex: '3 1 0%' }}>
          <Card className="p-6 overflow-hidden flex flex-col min-w-0 flex-1">
            <div className="mb-3">
              <h2 className="text-lg font-bold">{title || 'Reading Passage'}</h2>
            </div>
            <div
              ref={passageRef}
              className="overflow-y-auto flex-1 pr-2"
            >

              <div className="prose max-w-none text-base">
                {passage.split("\n\n").map((paragraph, index) => (
                  <p
                    key={index}
                    className="mb-4 text-gray-700"
                    style={{ lineHeight: '1.3cm' }}
                  >
                    {renderSentences(paragraph, () => globalSentenceId++)}
                  </p>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* Questions Section - 40% width */}
        <Card className="p-4 flex flex-col min-w-0 overflow-hidden" style={{ flex: '2 1 0%' }}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg">Question</h2>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={onPreviousPassage}
                disabled={!hasPrevious || !trackingEnabled}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onNextPassage}
                disabled={!hasNext || !trackingEnabled}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden min-w-0">
            <div className="flex-1 overflow-y-auto min-w-0">
              <p className="mb-3 text-sm break-words min-w-0 max-w-full" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                {currentQuestion.question}
              </p>

              <div className="min-w-0 space-y-3">
                <RadioGroup
                  value={selectedAnswer}
                  onValueChange={setSelectedAnswer}
                  disabled={showFeedback || !trackingEnabled || isComplete}
                  className="min-w-0 space-y-3"
                >
                  {currentQuestion.choices.map((choice, index) => {
                    const isChosen = selectedAnswer === index.toString();
                    const isCorrect = index === currentQuestion.correctAnswer;
                    const showingFeedback = showFeedback;

                    return (
                      <div
                        key={index}
                        style={{
                          backgroundColor: showingFeedback && !isLoadingFeedback
                            ? isChosen
                              ? currentSubmissionCorrect
                                ? "#f0fdf4" // green-50 (user's correct answer)
                                : "#fef2f2" // red-50 (user's wrong answer)
                              : isComplete && isCorrect
                                ? "#f0fdf4" // green-50 (show correct answer in green for completed passages)
                                : "#F5F5F5" // lighter gray for all other options
                            : !trackingEnabled
                              ? "#F5F5F5"
                              : isChosen
                                ? "#dbeafe" // blue-100 (selected, including during loading)
                                : "#F5F5F5", // lighter gray default
                          border: showingFeedback && !isLoadingFeedback && isChosen
                            ? currentSubmissionCorrect
                              ? "2px solid #22c55e" // green border for correct answer
                              : "2px solid #ef4444" // red border for wrong answer
                            : isComplete && isCorrect && showingFeedback && !isLoadingFeedback
                              ? "2px solid #22c55e" // green border for correct answer on completed passages
                              : "none",
                          opacity: !trackingEnabled ? 0.5 : 1,
                          cursor: (!trackingEnabled || showingFeedback || isComplete) ? "not-allowed" : "pointer"
                        }}
                        className="flex items-center space-x-2 p-3 rounded-md text-xs min-w-0 transition-all hover:bg-[#E8E8E8]"
                        onClick={() => {
                          if (trackingEnabled && !showingFeedback && !isComplete) {
                            setSelectedAnswer(index.toString());
                          }
                        }}
                        onMouseEnter={(e) => {
                          if (trackingEnabled && !showingFeedback && !isChosen) {
                            e.currentTarget.style.backgroundColor = "#E8E8E8";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (trackingEnabled && !showingFeedback && !isChosen) {
                            e.currentTarget.style.backgroundColor = "#F5F5F5";
                          }
                        }}
                      >
                        <RadioGroupItem
                          value={index.toString()}
                          id={`choice-${index}`}
                          className="sr-only"
                          style={{ display: 'none' }}
                        />
                        <Label
                          htmlFor={`choice-${index}`}
                          className="flex-1 font-bold text-xs text-gray-900 break-words min-w-0 max-w-full pointer-events-none"
                          style={{ wordBreak: 'break-word', overflowWrap: 'break-word', cursor: 'inherit' }}
                        >
                          {choice}
                        </Label>
                        {showFeedback && !isLoadingFeedback && isComplete && index === currentQuestion.correctAnswer && (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        )}
                        {showFeedback && !isLoadingFeedback && !isComplete && selectedAnswer === index.toString() && index !== currentQuestion.correctAnswer && (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                        {showFeedback && !isLoadingFeedback && isComplete && selectedAnswer === index.toString() && index !== currentQuestion.correctAnswer && (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                    );
                  })}
                </RadioGroup>
              </div>

              {showFeedback && (
                <div
                  className={`p-3 rounded-md mt-3 text-sm min-w-0 max-w-full ${isLoadingFeedback
                    ? "bg-gray-100 text-gray-700"
                    : currentSubmissionCorrect
                      ? "bg-green-50 text-green-800"
                      : "bg-red-50 text-red-800"
                    }`}
                >
                  {isLoadingFeedback ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-xs">
                        Generating personalized feedback...
                      </span>
                    </div>
                  ) : (
                    <div className={`flex items-start gap-2 min-w-0 w-full ${currentSubmissionCorrect ? 'items-center' : ''}`}>
                      {currentSubmissionCorrect ? (
                        <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      )}
                      <span className="text-xs break-words min-w-0 max-w-full" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                        {feedbackText || (currentSubmissionCorrect ? 'Correct!' : 'Try again! Focus on the passage to find the answer.')}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mt-3 flex gap-2">
              {!showFeedback ? (
                // State 1 (disabled) or State 2 (active - ready to submit)
                <Button
                  onClick={handleSubmit}
                  disabled={!selectedAnswer || isLoadingFeedback || !trackingEnabled || isComplete}
                  style={{
                    backgroundColor: (!selectedAnswer || !trackingEnabled) ? '#d1d5dc' : '#155dfc',
                    color: 'white',
                    opacity: 1,
                    cursor: (!selectedAnswer || !trackingEnabled) ? 'not-allowed' : 'pointer'
                  }}
                  className="flex-1 text-sm py-3 font-semibold rounded-lg transition-all"
                >
                  Submit Answer
                </Button>
              ) : isLoadingFeedback ? (
                // Loading state - keep blue button while waiting for feedback
                <Button
                  disabled
                  style={{
                    backgroundColor: '#155dfc',
                    color: 'white',
                    opacity: 0.7,
                    cursor: 'not-allowed'
                  }}
                  className="flex-1 text-sm py-3 font-semibold rounded-lg transition-all"
                >
                  Loading feedback...
                </Button>
              ) : currentSubmissionCorrect ? (
                // State 4 (correct - green "Good Job - Next Question") - only show after feedback loaded
                <Button
                  onClick={hasNext ? onNextPassage : onFinishQuiz}
                  disabled={!hasNext && !onFinishQuiz}
                  style={{
                    backgroundColor: '#00a63e',
                    color: 'white',
                    opacity: 1,
                    cursor: 'pointer'
                  }}
                  className="flex-1 text-sm py-3 font-semibold rounded-lg transition-all"
                >
                  {hasNext ? "Good Job - Next Question" : "Finish The Quiz"}
                </Button>
              ) : (
                // State 3 (wrong - red "Submit Again") - only show after feedback loaded
                <Button
                  onClick={handleTryAgain}
                  style={{
                    backgroundColor: '#e7000b',
                    color: 'white',
                    opacity: 1
                  }}
                  className="flex-1 text-sm py-3 font-semibold rounded-lg transition-all"
                >
                  Try Again
                </Button>
              )}
            </div>
          </div>
        </Card>
      </div>
    );
  }
);