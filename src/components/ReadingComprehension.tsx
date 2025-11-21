import { useState, useRef, forwardRef, useImperativeHandle } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Label } from "./ui/label";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { getPersonalizedQuestionFeedback, CursorData } from "../services/geminiService";

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
  onPassageComplete?: (wrongAttempts: number) => void;
  trackingEnabled?: boolean;
}

export interface ReadingComprehensionHandle {
  reset: () => void;
  isComplete: () => boolean;
  getPassageElement: () => HTMLDivElement | null;
}

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
  }, ref) {
    const [selectedAnswer, setSelectedAnswer] = useState<string>("");
    const [showFeedback, setShowFeedback] = useState(false);
    const [feedbackText, setFeedbackText] = useState<string>("");
    const [isLoadingFeedback, setIsLoadingFeedback] = useState(false);
    const [currentSubmissionCorrect, setCurrentSubmissionCorrect] = useState<boolean>(false);
    const [wrongAttempts, setWrongAttempts] = useState(0);
    const [isComplete, setIsComplete] = useState(false);
    const passageRef = useRef<HTMLDivElement>(null);

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
          console.log('📸 Screenshot captured for personalized feedback:', currentScreenshot ? 'Success' : 'Failed');
        } catch (error) {
          console.warn('Failed to capture screenshot for feedback:', error);
          // Fallback to existing screenshot if capture fails
          if (!currentScreenshot) {
            currentScreenshot = screenshot;
          }
        }
      }

      // Get personalized feedback
      try {
        const selectedAnswerText = currentQuestion.choices[parseInt(selectedAnswer)];
        const correctAnswerText = currentQuestion.choices[currentQuestion.correctAnswer];

        const result = await getPersonalizedQuestionFeedback(
          title || '',
          passage,
          currentScreenshot,
          cursorHistory,
          currentQuestion.question,
          selectedAnswerText,
          correctAnswerText,
          isCorrect
        );

        setFeedbackText(result.feedback);
      } catch (error) {
        console.error('Failed to get personalized feedback:', error);
        // Fallback to default messages
        setFeedbackText(isCorrect ? 'Correct!' : 'Try again! Focus on the passage to find the answer.');
      } finally {
        setIsLoadingFeedback(false);
      }

      // Mark as complete and notify parent if correct
      if (isCorrect) {
        setIsComplete(true);
        if (onPassageComplete) {
          onPassageComplete(wrongAttempts);
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
                  {paragraph}
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
                      className={`flex items-center space-x-2 p-2 rounded-md mb-2 text-sm min-w-0 ${
                        showFeedback && isComplete
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
                <div
                  className={`p-3 rounded-md mt-3 text-sm min-w-0 max-w-full ${
                    currentSubmissionCorrect
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