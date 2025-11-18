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
  passage: string;
  questions: Question[];
  cursorHistory?: CursorData[];
  screenshot?: string | null;
}

export const ReadingComprehension = forwardRef<HTMLDivElement, ReadingComprehensionProps>(
  function ReadingComprehension({
    passage,
    questions,
    cursorHistory = [],
    screenshot = null,
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
      if (!selectedAnswer) return;

      const isCorrect = selectedAnswer === currentQuestion?.correctAnswer.toString();
      setCurrentSubmissionCorrect(isCorrect);
      setShowFeedback(true);
      setIsLoadingFeedback(true);

      // Get personalized feedback
      try {
        const selectedAnswerText = currentQuestion.choices[parseInt(selectedAnswer)];
        const correctAnswerText = currentQuestion.choices[currentQuestion.correctAnswer];
        
        const result = await getPersonalizedQuestionFeedback(
          passage,
          screenshot,
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
      <div className="flex gap-4 h-full">
        {/* Reading Passage - Takes remaining width */}
        <Card ref={ref} className="flex-1 p-6 overflow-hidden flex flex-col">
          <h2 className="mb-3 text-lg">Reading Passage</h2>
          <div
            ref={passageRef}
            className="prose max-w-none overflow-y-auto flex-1 pr-2 text-base"
          >
            {passage.split("\n\n").map((paragraph, index) => (
              <p
                key={index}
                className="mb-3 text-gray-700 leading-relaxed"
              >
                {paragraph}
              </p>
            ))}
          </div>
        </Card>

        {/* Questions Section - Fixed width to match Controls */}
        <Card className="w-80 flex-shrink-0 p-4 flex flex-col">
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
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto">
                <p className="mb-3 text-sm">
                  {currentQuestion.question}
                </p>

                <RadioGroup
                  value={selectedAnswer}
                  onValueChange={setSelectedAnswer}
                  disabled={showFeedback}
                >
                  {currentQuestion.choices.map(
                    (choice, index) => (
                      <div
                        key={index}
                        className={`flex items-center space-x-2 p-2 rounded-md mb-2 text-sm ${
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
                          className="flex-1 cursor-pointer text-sm"
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

                {showFeedback && (
                  <div
                    className={`p-3 rounded-md mt-3 text-sm ${
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
                      <div className={`flex items-start gap-2 ${currentSubmissionCorrect ? 'items-center' : ''}`}>
                        {currentSubmissionCorrect ? (
                          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                        ) : (
                          <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        )}
                        <span className="text-xs">
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
                    disabled={!selectedAnswer}
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