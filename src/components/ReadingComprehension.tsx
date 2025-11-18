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
  onQuizComplete?: () => void;
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
    onQuizComplete,
    trackingEnabled = false,
  }, ref) {
    const [currentQuestionIndex, setCurrentQuestionIndex] =
      useState(0);
    const [selectedAnswer, setSelectedAnswer] =
      useState<string>("");
    const [showFeedback, setShowFeedback] = useState(false);
    const [feedbackText, setFeedbackText] = useState<string>("");
    const [isLoadingFeedback, setIsLoadingFeedback] = useState(false);
    const [currentSubmissionCorrect, setCurrentSubmissionCorrect] = useState<boolean>(false);
    const [score, setScore] = useState(0);
    const [correctlyAnsweredQuestions, setCorrectlyAnsweredQuestions] = useState<
      number[]
    >([]);
    const [quizStartTime, setQuizStartTime] = useState<Date | null>(null);
    const [quizEndTime, setQuizEndTime] = useState<Date | null>(null);
    const [wrongAttempts, setWrongAttempts] = useState<Record<number, number>>({});
    const [quizFinished, setQuizFinished] = useState(false);
    const passageRef = useRef<HTMLDivElement>(null);

    const currentQuestion = questions[currentQuestionIndex];
    const isCurrentQuestionCorrectlyAnswered = correctlyAnsweredQuestions.includes(currentQuestion.id);
    const allQuestionsAnswered =
      correctlyAnsweredQuestions.length === questions.length;
    // Only show completion screen if all questions are answered AND Finish was clicked
    const showCompletionScreen = allQuestionsAnswered && quizFinished;

    // Expose reset method and completion status via ref
    useImperativeHandle(ref, () => ({
      reset() {
        setCurrentQuestionIndex(0);
        setSelectedAnswer("");
        setShowFeedback(false);
        setFeedbackText("");
        setIsLoadingFeedback(false);
        setCurrentSubmissionCorrect(false);
        setScore(0);
        setCorrectlyAnsweredQuestions([]);
        setQuizStartTime(null);
        setQuizEndTime(null);
        setWrongAttempts({});
        setQuizFinished(false);
      },
      isComplete() {
        return allQuestionsAnswered;
      },
      getPassageElement() {
        return passageRef.current;
      }
    }));

    const handleSubmit = async () => {
      if (!selectedAnswer || isLoadingFeedback) return;

      // Track quiz start time on first submission
      if (quizStartTime === null) {
        setQuizStartTime(new Date());
      }

      const isCorrect = selectedAnswer === currentQuestion?.correctAnswer.toString();
      
      // Track wrong attempts (only if question hasn't been correctly answered yet)
      if (!isCorrect && currentQuestion && !correctlyAnsweredQuestions.includes(currentQuestion.id)) {
        setWrongAttempts(prev => ({
          ...prev,
          [currentQuestion.id]: (prev[currentQuestion.id] || 0) + 1
        }));
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
        setFeedbackText(isCorrect ? 'Correct! I love you.' : 'Try again! Focus on the passage to find the answer.');
      } finally {
        setIsLoadingFeedback(false);
      }

      // Only update score and mark as answered if correct
      if (isCorrect) {
        if (!correctlyAnsweredQuestions.includes(currentQuestion.id)) {
          const newCorrectlyAnswered = [...correctlyAnsweredQuestions, currentQuestion.id];
          setScore(score + 1);
          setCorrectlyAnsweredQuestions(newCorrectlyAnswered);
        }
      }
    };

    const handleNext = () => {
      setShowFeedback(false);
      setFeedbackText("");
      setSelectedAnswer("");
      setIsLoadingFeedback(false);
      setCurrentSubmissionCorrect(false);
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      }
    };

    const handleFinish = () => {
      // Mark quiz as finished
      setQuizFinished(true);
      // Stop the timer when finishing the quiz
      if (quizEndTime === null) {
        setQuizEndTime(new Date());
      }
      // Automatically stop the quiz tracking
      if (onQuizComplete) {
        onQuizComplete();
      }
    };

    const handlePrevious = () => {
      setShowFeedback(false);
      setFeedbackText("");
      setSelectedAnswer("");
      setIsLoadingFeedback(false);
      setCurrentSubmissionCorrect(false);
      if (currentQuestionIndex > 0) {
        setCurrentQuestionIndex(currentQuestionIndex - 1);
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
            <div className="flex justify-between items-center">
              <h2 className="text-lg">Questions</h2>
              <div className="text-xs text-gray-600">
                {currentQuestionIndex + 1} / {questions.length}
              </div>
            </div>
          </div>

          {!showCompletionScreen ? (
            <div className="flex-1 flex flex-col overflow-hidden min-w-0">
              <div className="flex-1 overflow-y-auto min-w-0">
                <p className="mb-3 text-sm break-words min-w-0 max-w-full" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                  {currentQuestion.question}
                </p>

                <div className="min-w-0">
                  {!trackingEnabled && (
                    <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                      <p className="text-xs text-yellow-800">
                        Please click "Start The Quiz" to begin answering questions.
                      </p>
                    </div>
                  )}
                  <RadioGroup
                    value={selectedAnswer}
                    onValueChange={setSelectedAnswer}
                    disabled={showFeedback || !trackingEnabled}
                    className="min-w-0"
                  >
                  {currentQuestion.choices.map(
                    (choice, index) => (
                      <div
                        key={index}
                        className={`flex items-center space-x-2 p-2 rounded-md mb-2 text-sm min-w-0 ${
                          showFeedback && isCurrentQuestionCorrectlyAnswered
                            ? index ===
                              currentQuestion.correctAnswer
                              ? "bg-green-50 border-2 border-green-500"
                              : selectedAnswer ===
                                  index.toString()
                                ? "bg-red-50 border-2 border-red-500"
                                : "bg-gray-50"
                            : showFeedback && !isCurrentQuestionCorrectlyAnswered && selectedAnswer === index.toString()
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
                        {showFeedback &&
                          isCurrentQuestionCorrectlyAnswered &&
                          index ===
                            currentQuestion.correctAnswer && (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          )}
                        {showFeedback &&
                          !isCurrentQuestionCorrectlyAnswered &&
                          selectedAnswer === index.toString() &&
                          index !==
                            currentQuestion.correctAnswer && (
                            <XCircle className="h-4 w-4 text-red-600" />
                          )}
                        {showFeedback &&
                          isCurrentQuestionCorrectlyAnswered &&
                          selectedAnswer === index.toString() &&
                          index !==
                            currentQuestion.correctAnswer && (
                            <XCircle className="h-4 w-4 text-red-600" />
                          )}
                      </div>
                    ),
                  )}
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
                          {feedbackText || (currentSubmissionCorrect ? 'Correct! I love you.' : 'Try again! Focus on the passage to find the answer.')}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-3 flex gap-2">
                <Button
                  onClick={handlePrevious}
                  variant="outline"
                  disabled={currentQuestionIndex === 0 || !trackingEnabled}
                  className="flex-1 text-xs py-2"
                >
                  Previous
                </Button>
                {!showFeedback ? (
                  <Button
                    onClick={handleSubmit}
                    disabled={!selectedAnswer || isLoadingFeedback || !trackingEnabled}
                    className="flex-1 text-xs py-2"
                  >
                    Submit
                  </Button>
                ) : isCurrentQuestionCorrectlyAnswered ? (
                  currentQuestionIndex === questions.length - 1 ? (
                    <Button
                      onClick={handleFinish}
                      className="flex-1 text-xs py-2"
                    >
                      Finish
                    </Button>
                  ) : (
                    <Button
                      onClick={handleNext}
                      className="flex-1 text-xs py-2"
                    >
                      Next
                    </Button>
                  )
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
          ) : (
            <div className="flex-1 flex flex-col overflow-y-auto">
              <div className="w-full max-w-2xl mx-auto px-4 py-6">
                {/* Header Section */}
                <div className="text-center mb-6">
                  <div className="text-5xl mb-4">
                    {score === questions.length
                      ? "🎉"
                      : score >= questions.length / 2
                        ? "👍"
                        : "📚"}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">Quiz Complete!</h3>
                </div>
                
                {/* Stats Section */}
                <div className="space-y-4 mb-6">
                  {/* Quiz Duration */}
                  {quizStartTime && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Time taken</span>
                        <span className="text-sm font-semibold text-gray-900">
                          {(() => {
                            // Use end time if quiz is complete (timer stopped), otherwise use current time
                            const endTime = quizEndTime || new Date();
                            const duration = Math.floor((endTime.getTime() - quizStartTime.getTime()) / 1000);
                            const minutes = Math.floor(duration / 60);
                            const seconds = duration % 60;
                            return minutes > 0 
                              ? `${minutes} minute${minutes !== 1 ? 's' : ''} ${seconds} second${seconds !== 1 ? 's' : ''}`
                              : `${seconds} second${seconds !== 1 ? 's' : ''}`;
                          })()}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Wrong Attempts per Question */}
                <div className="border-t border-gray-200 pt-6">
                  <h4 className="text-sm font-semibold text-gray-900 mb-4">Question Results</h4>
                  <div className="space-y-3">
                    {questions.map((question) => {
                      const attempts = wrongAttempts[question.id] || 0;
                      return (
                        <div 
                          key={question.id} 
                          className={`flex items-start gap-3 p-3 rounded-lg border ${
                            attempts === 0 
                              ? 'bg-green-50 border-green-200' 
                              : 'bg-red-50 border-red-200'
                          }`}
                        >
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white flex items-center justify-center font-semibold text-xs ${
                            attempts === 0 ? 'text-green-700' : 'text-red-700'
                          }">
                            {question.id}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-700 mb-3" style={{
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden'
                            }}>
                              {question.question}
                            </p>
                            <div className="flex items-center gap-2">
                              {attempts === 0 ? (
                                <span className="inline-flex items-center gap-2 text-xs font-medium text-green-700">
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  Correct on first try
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-2 text-xs font-medium text-red-700">
                                  <XCircle className="h-3.5 w-3.5" />
                                  {attempts} wrong {attempts === 1 ? 'answer' : 'answers'} before correct
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    );
  }
);