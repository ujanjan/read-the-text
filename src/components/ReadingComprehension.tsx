import { useState, useRef, forwardRef } from "react";
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
}

export const ReadingComprehension = forwardRef<HTMLDivElement, ReadingComprehensionProps>(
  function ReadingComprehension({
    title,
    passage,
    questions,
    cursorHistory = [],
    screenshot = null,
    onCaptureScreenshot,
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
    const passageRef = useRef<HTMLDivElement>(null);

    const currentQuestion = questions[currentQuestionIndex];
    const isCurrentQuestionCorrectlyAnswered = correctlyAnsweredQuestions.includes(currentQuestion.id);
    const allQuestionsAnswered =
      correctlyAnsweredQuestions.length === questions.length;

    const handleSubmit = async () => {
      if (!selectedAnswer || isLoadingFeedback) return;

      const isCorrect = selectedAnswer === currentQuestion?.correctAnswer.toString();
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
          setScore(score + 1);
          setCorrectlyAnsweredQuestions([
            ...correctlyAnsweredQuestions,
            currentQuestion.id,
          ]);
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
            <div className="flex justify-between items-center mb-1">
              <h2 className="text-lg">Questions</h2>
              <div className="text-xs text-gray-600">
                {score} / {questions.length}
              </div>
            </div>
            <div className="text-xs text-gray-600">
              Q {currentQuestionIndex + 1} of {questions.length}
            </div>
          </div>

          {!allQuestionsAnswered ? (
            <div className="flex-1 flex flex-col overflow-hidden min-w-0">
              <div className="flex-1 overflow-y-auto min-w-0">
                <p className="mb-3 text-sm break-words min-w-0 max-w-full" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                  {currentQuestion.question}
                </p>

                <div className="min-w-0">
                  <RadioGroup
                    value={selectedAnswer}
                    onValueChange={setSelectedAnswer}
                    disabled={showFeedback}
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
                  disabled={currentQuestionIndex === 0}
                  className="flex-1 text-xs py-2"
                >
                  Previous
                </Button>
                {!showFeedback ? (
                  <Button
                    onClick={handleSubmit}
                    disabled={!selectedAnswer || isLoadingFeedback}
                    className="flex-1 text-xs py-2"
                  >
                    Submit
                  </Button>
                ) : isCurrentQuestionCorrectlyAnswered ? (
                  <Button
                    onClick={handleNext}
                    disabled={
                      currentQuestionIndex ===
                      questions.length - 1
                    }
                    className="flex-1 text-xs py-2"
                  >
                    Next
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
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <div>
                <div className="text-4xl mb-3">
                  {score === questions.length
                    ? "🎉"
                    : score >= questions.length / 2
                      ? "👍"
                      : "📚"}
                </div>
                <h3 className="mb-2 text-base">Quiz Complete!</h3>
                <p className="text-gray-600 text-sm">
                  You scored {score} out of {questions.length}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {score === questions.length
                    ? "Perfect score!"
                    : score >= questions.length / 2
                      ? "Good job!"
                      : "Keep practicing!"}
                </p>
              </div>
            </div>
          )}
        </Card>
      </div>
    );
  }
);