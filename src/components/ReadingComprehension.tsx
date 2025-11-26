import { useState, useRef, forwardRef, useImperativeHandle, useEffect } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Label } from "./ui/label";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { getPersonalizedQuestionFeedback, getPersonalizedQuestionFeedbackWithHeatmap, getPersonalizedQuestionFeedbackVariantC, CursorData } from "../services/geminiService";
import { apiService } from "../services/apiService";
import { ReadingSummary, summarizeCursorSession, computeSentenceRects } from "../summarizeCursor";

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
  onPassageComplete?: (wrongAttempts: number, selectedAnswer: string) => void;
  trackingEnabled?: boolean;
  sessionId?: string | null;
  currentPassageIndex?: number;
  initialIsComplete?: boolean;
  initialSelectedAnswer?: string;
  initialFeedback?: string;
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
  }, ref) {
    const [selectedAnswer, setSelectedAnswer] = useState<string>(initialSelectedAnswer);
    const [showFeedback, setShowFeedback] = useState(initialIsComplete);
    const [feedbackText, setFeedbackText] = useState<string>(initialFeedback);
    const [isLoadingFeedback, setIsLoadingFeedback] = useState(false);
    const [feedbackTextHeatmap, setFeedbackTextHeatmap] = useState<string>('');
    const [isLoadingFeedbackHeatmap, setIsLoadingFeedbackHeatmap] = useState(false);
    const [feedbackTextVariantC, setFeedbackTextVariantC] = useState<string>('');
    const [isLoadingFeedbackVariantC, setIsLoadingFeedbackVariantC] = useState(false);
    const [currentSubmissionCorrect, setCurrentSubmissionCorrect] = useState<boolean>(initialIsComplete);
    const [wrongAttempts, setWrongAttempts] = useState(0);
    const [isComplete, setIsComplete] = useState(initialIsComplete);
    const passageRef = useRef<HTMLDivElement>(null);

    // Reset state when props change (navigating between passages)
    useEffect(() => {
      console.log(`🔄 [Passage Change] Switching to passage ${currentPassageIndex}`);
      console.log(`   └─ Cursor history for this passage: ${cursorHistory?.length || 0} points`);

      // Don't reset feedback if we're on the same passage and just completed it
      // This preserves the Gemini feedback that was just generated
      const shouldPreserveFeedback = isComplete && initialIsComplete;

      setSelectedAnswer(initialSelectedAnswer);
      setShowFeedback(initialIsComplete);
      if (!shouldPreserveFeedback) {
        setFeedbackText(initialFeedback);
        setFeedbackTextHeatmap('');
        setFeedbackTextVariantC('');
      }
      setCurrentSubmissionCorrect(initialIsComplete);
      setIsComplete(initialIsComplete);
      setWrongAttempts(0);
      setIsLoadingFeedback(false);
      setIsLoadingFeedbackHeatmap(false);
      setIsLoadingFeedbackVariantC(false);
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
        setFeedbackTextHeatmap("");
        setFeedbackTextVariantC("");
        setIsLoadingFeedback(false);
        setIsLoadingFeedbackHeatmap(false);
        setIsLoadingFeedbackVariantC(false);
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
      setIsLoadingFeedbackHeatmap(true);
      setIsLoadingFeedbackVariantC(true);

      // Always capture a fresh screenshot to include latest cursor movements
      // This ensures the heatmap reflects all cursor activity up to this point
      let currentScreenshot = screenshot;
      if (onCaptureScreenshot) {
        try {
          currentScreenshot = await onCaptureScreenshot();
          console.log('📸 Screenshot captured for personalized feedback:', currentScreenshot ? 'Success' : 'Failed');
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
      console.log('═══════════════════════════════════════════════════════');
      console.log('📤 [GEMINI API CALLS] Personalized Question Feedback - ALL 3 VARIANTS');
      console.log('═══════════════════════════════════════════════════════');
      console.log(`📍 Passage Index: ${currentPassageIndex}`);
      console.log(`📊 Cursor History: ${cursorPoints} points (tracked locally, NOT sent to Gemini)`);
      console.log(`📸 Screenshot: ${currentScreenshot ? `Yes (${screenshotSizeKB} KB) - includes visual heatmap` : 'No'}`);
      console.log(`📝 Passage Length: ${passageLength} characters`);
      console.log(`✅ Answer Correct: ${isCorrect}`);
      console.log(`🔢 Attempt Number: ${wrongAttempts + 1}`);
      console.log('═══════════════════════════════════════════════════════');

      const container = passageRef.current;
      let readingSummaryJson: string | undefined = undefined;

      if (container && cursorHistory.length > 0) {
        const sentenceRects = computeSentenceRects(container, "[data-sentence-id]");
        const readingSummary: ReadingSummary = summarizeCursorSession(
          cursorHistory,
          sentenceRects
        );
        readingSummaryJson = JSON.stringify(readingSummary);
      }

      // Call all API variants in parallel
      const originalPromise = getPersonalizedQuestionFeedback(
        title || '',
        passage,
        currentScreenshot,
        currentQuestion.question,
        selectedAnswerText,
        correctAnswerText,
        isCorrect,
        readingSummaryJson
      ).then(result => {
        console.log('🤖 [GEMINI RESPONSE - ORIGINAL]:', result.feedback);
        console.log('🤖 [GEMINI RESPONSE LENGTH - ORIGINAL]:', result.feedback.length);
        setFeedbackText(result.feedback);
        setIsLoadingFeedback(false);
        console.log('✅ [STATE UPDATE] setFeedbackText called with:', result.feedback.substring(0, 50) + '...');
        return result;
      }).catch(error => {
        console.error('Failed to get personalized feedback (original):', error);
        const fallback = isCorrect ? 'Correct!' : 'Try again! Focus on the passage to find the answer.';
        setFeedbackText(fallback);
        setIsLoadingFeedback(false);
        return { feedback: fallback, error: error.message };
      });

      const heatmapPromise = getPersonalizedQuestionFeedbackWithHeatmap(
        title || '',
        passage,
        currentScreenshot,
        currentQuestion.question,
        selectedAnswerText,
        correctAnswerText,
        isCorrect
      ).then(result => {
        console.log('🤖 [GEMINI RESPONSE - HEATMAP]:', result.feedback);
        console.log('🤖 [GEMINI RESPONSE LENGTH - HEATMAP]:', result.feedback.length);
        setFeedbackTextHeatmap(result.feedback);
        setIsLoadingFeedbackHeatmap(false);
        return result;
      }).catch(error => {
        console.error('Failed to get personalized feedback (heatmap):', error);
        const fallback = isCorrect ? 'Correct!' : 'Try again! Focus on the passage to find the answer.';
        setFeedbackTextHeatmap(fallback);
        setIsLoadingFeedbackHeatmap(false);
        return { feedback: fallback, error: error.message };
      });

      const variantCPromise = getPersonalizedQuestionFeedbackVariantC(
        title || '',
        passage,
        currentScreenshot,
        currentQuestion.question,
        selectedAnswerText,
        correctAnswerText,
        isCorrect,
        readingSummaryJson
      ).then(result => {
        console.log('🤖 [GEMINI RESPONSE - VARIANT C]:', result.feedback);
        console.log('🤖 [GEMINI RESPONSE LENGTH - VARIANT C]:', result.feedback.length);
        setFeedbackTextVariantC(result.feedback);
        setIsLoadingFeedbackVariantC(false);
        return result;
      }).catch(error => {
        console.error('Failed to get personalized feedback (Variant C):', error);
        const fallback = isCorrect ? 'Correct!' : 'Try again! Focus on the passage to find the answer.';
        setFeedbackTextVariantC(fallback);
        setIsLoadingFeedbackVariantC(false);
        return { feedback: fallback, error: error.message };
      });

      // Wait for all variants to complete before recording to DB
      const [originalResult] = await Promise.all([originalPromise, heatmapPromise, variantCPromise]);

      // Record attempt in cloud if we have a session (only store original feedback)
      if (sessionId) {
        try {
          await apiService.recordAttempt(sessionId, currentPassageIndex, {
            selectedAnswer: selectedAnswerText,
            isCorrect,
            geminiResponse: originalResult.feedback,
            screenshot: currentScreenshot || undefined
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
          onPassageComplete(wrongAttempts, selectedAnswerText);
        }
      }
    };

    const handleTryAgain = () => {
      setShowFeedback(false);
      setFeedbackText("");
      setFeedbackTextHeatmap("");
      setFeedbackTextVariantC("");
      setSelectedAnswer("");
      setIsLoadingFeedback(false);
      setIsLoadingFeedbackHeatmap(false);
      setIsLoadingFeedbackVariantC(false);
      setCurrentSubmissionCorrect(false);
    };

    let globalSentenceId: number = 0
    return (
      <div className="flex gap-4 h-full min-w-0 w-full">
        {/* Reading Passage - 60% width */}
        <Card ref={ref} className="p-6 overflow-hidden flex flex-col min-w-0" style={{ flex: '3 1 0%' }}>
          <h2 className="mb-3 text-lg">Reading Passage</h2>
          <div
            ref={passageRef}
            className="overflow-y-auto flex-1 pr-2"
          >
            {title && (
              <h3
                className="!font-bold !mb-10 !text-gray-900 !leading-tight"
                style={{ fontSize: '2rem', fontWeight: '700' }}
              >
                {title}
              </h3>
            )}
            <div className="prose max-w-none text-base">
              {passage.split("\n\n").map((paragraph, index) => (
                <p
                  key={index}
                  className="mb-3 text-gray-700 leading-relaxed"
                >
                  {renderSentences(paragraph, () => globalSentenceId++)}
                </p>
              ))}
            </div>
          </div>
        </Card>

        {/* Questions Section - 40% width */}
        <Card className="p-4 flex flex-col min-w-0 overflow-hidden" style={{ flex: '2 1 0%' }}>
          <div className="mb-3">
            <h2 className="text-lg">Question</h2>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden min-w-0">
            <div className="flex-1 overflow-y-auto min-w-0">
              <p className="mb-3 text-sm break-words min-w-0 max-w-full" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                {currentQuestion.question}
              </p>

              <div className="min-w-0">
                <RadioGroup
                  value={selectedAnswer}
                  onValueChange={setSelectedAnswer}
                  disabled={showFeedback || !trackingEnabled || isComplete}
                  className="min-w-0"
                >
                  {currentQuestion.choices.map((choice, index) => (
                    <div
                      key={index}
                      className={`flex items-center space-x-2 p-2 rounded-md mb-2 text-sm min-w-0 ${showFeedback && isComplete
                          ? index === currentQuestion.correctAnswer
                            ? "bg-green-50 border-2 border-green-500"
                            : selectedAnswer === index.toString()
                              ? "bg-red-50 border-2 border-red-500"
                              : "bg-gray-50"
                          : showFeedback && !isComplete && selectedAnswer === index.toString()
                            ? "bg-red-50 border-2 border-red-500"
                            : !trackingEnabled
                              ? "bg-gray-50 opacity-50 cursor-not-allowed"
                              : "bg-gray-50 hover:bg-gray-100"
                        }`}
                    >
                      <RadioGroupItem
                        value={index.toString()}
                        id={`choice-${index}`}
                      />
                      <Label
                        htmlFor={`choice-${index}`}
                        className="flex-1 cursor-pointer text-sm break-words min-w-0 max-w-full"
                        style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
                      >
                        {choice}
                      </Label>
                      {showFeedback && isComplete && index === currentQuestion.correctAnswer && (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      )}
                      {showFeedback && !isComplete && selectedAnswer === index.toString() && index !== currentQuestion.correctAnswer && (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                      {showFeedback && isComplete && selectedAnswer === index.toString() && index !== currentQuestion.correctAnswer && (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                  ))}
                </RadioGroup>
              </div>

              {showFeedback && (
                <>
                  {/* Original feedback (JSON-based) - TOP */}
                  <div
                    className={`p-3 rounded-md mt-3 text-sm min-w-0 max-w-full ${currentSubmissionCorrect
                        ? "bg-green-50 text-green-800"
                        : "bg-red-50 text-red-800"
                      }`}
                  >
                    <div className="text-xs font-semibold mb-1 opacity-60">Response A</div>
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

                  {/* Separator */}
                  <div style={{ margin: '4px 0', height: '4px' }}></div>

                  {/* Heatmap feedback - MIDDLE */}
                  <div
                    className={`p-3 rounded-md text-sm min-w-0 max-w-full ${currentSubmissionCorrect
                        ? "bg-green-50 text-green-800"
                        : "bg-red-50 text-red-800"
                      }`}
                  >
                    <div className="text-xs font-semibold mb-1 opacity-60">Response B</div>
                    {isLoadingFeedbackHeatmap ? (
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
                          {feedbackTextHeatmap || (currentSubmissionCorrect ? 'Correct!' : 'Try again! Focus on the passage to find the answer.')}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Separator */}
                  <div style={{ margin: '4px 0', height: '4px' }}></div>

                  {/* Variant C feedback - BOTTOM */}
                  <div
                    className={`p-3 rounded-md text-sm min-w-0 max-w-full ${currentSubmissionCorrect
                        ? "bg-green-50 text-green-800"
                        : "bg-red-50 text-red-800"
                      }`}
                  >
                    <div className="text-xs font-semibold mb-1 opacity-60">Response C</div>
                    {isLoadingFeedbackVariantC ? (
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
                          {feedbackTextVariantC || (currentSubmissionCorrect ? 'Correct!' : 'Try again! Focus on the passage to find the answer.')}
                        </span>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="mt-3 flex gap-2">
              {!showFeedback ? (
                <Button
                  onClick={handleSubmit}
                  disabled={!selectedAnswer || isLoadingFeedback || !trackingEnabled || isComplete}
                  className="flex-1 text-xs py-2"
                >
                  Submit
                </Button>
              ) : isComplete ? (
                <Button
                  disabled
                  className="flex-1 text-xs py-2"
                >
                  Completed
                </Button>
              ) : (
                <Button
                  onClick={handleTryAgain}
                  className="flex-1 text-xs py-2"
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