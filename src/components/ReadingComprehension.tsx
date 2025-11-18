import { useState, useRef, forwardRef } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Label } from "./ui/label";
import { CheckCircle2, XCircle } from "lucide-react";

interface Question {
  id: number;
  question: string;
  choices: string[];
  correctAnswer: number;
}

interface ReadingComprehensionProps {
  passage: string;
  questions: Question[];
}

export const ReadingComprehension = forwardRef<HTMLDivElement, ReadingComprehensionProps>(
  function ReadingComprehension({
    passage,
    questions,
  }, ref) {
    const [currentQuestionIndex, setCurrentQuestionIndex] =
      useState(0);
    const [selectedAnswer, setSelectedAnswer] =
      useState<string>("");
    const [showFeedback, setShowFeedback] = useState(false);
    const [score, setScore] = useState(0);
    const [answeredQuestions, setAnsweredQuestions] = useState<
      number[]
    >([]);
    const passageRef = useRef<HTMLDivElement>(null);

    const currentQuestion = questions[currentQuestionIndex];
    const isCorrect =
      selectedAnswer ===
      currentQuestion?.correctAnswer.toString();
    const allQuestionsAnswered =
      answeredQuestions.length === questions.length;

    const handleSubmit = () => {
      if (!selectedAnswer) return;

      setShowFeedback(true);

      if (
        isCorrect &&
        !answeredQuestions.includes(currentQuestion.id)
      ) {
        setScore(score + 1);
      }

      if (!answeredQuestions.includes(currentQuestion.id)) {
        setAnsweredQuestions([
          ...answeredQuestions,
          currentQuestion.id,
        ]);
      }
    };

    const handleNext = () => {
      setShowFeedback(false);
      setSelectedAnswer("");
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      }
    };

    const handlePrevious = () => {
      setShowFeedback(false);
      setSelectedAnswer("");
      if (currentQuestionIndex > 0) {
        setCurrentQuestionIndex(currentQuestionIndex - 1);
      }
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
                          showFeedback
                            ? index ===
                              currentQuestion.correctAnswer
                              ? "bg-green-50 border-2 border-green-500"
                              : selectedAnswer ===
                                  index.toString()
                                ? "bg-red-50 border-2 border-red-500"
                                : "bg-gray-50"
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
                          index ===
                            currentQuestion.correctAnswer && (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          )}
                        {showFeedback &&
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
                      isCorrect
                        ? "bg-green-50 text-green-800"
                        : "bg-red-50 text-red-800"
                    }`}
                  >
                    {isCorrect ? (
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="text-xs">
                          Correct! I love you.
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2">
                        <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span className="text-xs">
                          Incorrect. Git gud or git out.
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
                ) : (
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