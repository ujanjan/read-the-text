import { useState, useRef } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Label } from "./ui/label";
import { CheckCircle2, XCircle, ChevronLeft, ChevronRight } from "lucide-react";

interface Question {
  id: number;
  question: string;
  choices: string[];
  correctAnswer: number;
}

interface ReadingComprehensionProps {
  passage: string;
  questions: Question[];
  title?: string;
  onNext?: () => void;
  onPrevious?: () => void;
  hasNext?: boolean;
  hasPrevious?: boolean;
  onQuestionCompleted?: (questionIndex: number) => void;
}

export function ReadingComprehension({
  passage,
  questions,
  title = "Reading Text",
  onNext,
  onPrevious,
  hasNext,
  hasPrevious,
  onQuestionCompleted,
}: ReadingComprehensionProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] =
    useState(0);
  const [selectedAnswer, setSelectedAnswer] =
    useState<string>("");
  const [evaluatedAnswer, setEvaluatedAnswer] =
    useState<string>("");
  const [showFeedback, setShowFeedback] = useState(false);
  const [score, setScore] = useState(0);
  const [answeredQuestions, setAnsweredQuestions] = useState<
    number[]
  >([]);
  const [questionLocked, setQuestionLocked] = useState(false);
  const passageRef = useRef<HTMLDivElement>(null);

  const currentQuestion = questions[currentQuestionIndex];
  const isCorrect =
    selectedAnswer ===
    currentQuestion?.correctAnswer.toString();
  const allQuestionsAnswered =
    answeredQuestions.length === questions.length;

  const handleSubmit = () => {
    if (!selectedAnswer) return;

    // Store which answer was evaluated
    setEvaluatedAnswer(selectedAnswer);
    setShowFeedback(true);

    if (isCorrect) {
      // Lock the question only when correct
      setQuestionLocked(true);
      
      if (!answeredQuestions.includes(currentQuestion.id)) {
        setScore(score + 1);
        // Mark question as completed only when correct
        if (onQuestionCompleted) {
          onQuestionCompleted(currentQuestionIndex);
        }
      }
    }

    if (!answeredQuestions.includes(currentQuestion.id)) {
      setAnsweredQuestions([
        ...answeredQuestions,
        currentQuestion.id,
      ]);
    }
  };

  const handleAnswerSelect = (index: string) => {
    // Don't allow changing answer if question is locked (correct answer found)
    if (questionLocked) return;
    setSelectedAnswer(index);
  };

  const handleNext = () => {
    if (onNext) {
      setShowFeedback(false);
      setSelectedAnswer("");
      setQuestionLocked(false); // Unlock the question for the next one
      onNext();
    }
  };

  const handlePrevious = () => {
    if (onPrevious) {
      setShowFeedback(false);
      setSelectedAnswer("");
      setQuestionLocked(false); // Unlock the question for the previous one
      onPrevious();
    }
  };

  const handleTryAgain = () => {
    setShowFeedback(false);
    setSelectedAnswer("");
    setQuestionLocked(false); // Unlock the question to try again
  };

  return (
    <div className="h-full flex gap-6">
      {/* Reading Passage - Left Column */}
      <div className="flex-1 flex flex-col bg-white rounded-lg overflow-hidden shadow-sm">
        <div className="px-8 py-3">
          <h2 className="text-gray-900 font-black">{title}</h2>
        </div>
        <div className="px-8 pb-4 overflow-y-auto">
          <div className="prose max-w-none">
            {passage.split("\n\n").slice(1).map((paragraph, index) => (
              <p
                key={index}
                className="mb-4 text-gray-700 leading-relaxed"
                style={{ lineHeight: '1.3cm' }}
              >
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      </div>

      {/* Question - Right Column */}
      <div className="w-[600px] flex flex-col bg-white rounded-lg overflow-hidden shadow-sm">
        <div className="px-8 py-3 flex items-center justify-between">
          <h2 className="text-gray-900 font-medium">Question</h2>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrevious}
              disabled={!hasPrevious}
              className="h-8 w-8"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNext}
              disabled={!hasNext}
              className="h-8 w-8"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-8 pb-4 flex flex-col">
          <>
            <p className="mb-4 text-gray-900">
              {currentQuestion.question}
            </p>

            <div className="space-y-3 mb-6">
              {currentQuestion.choices.map(
                (choice, index) => {
                  const isSelected = selectedAnswer === index.toString();
                  const isCorrectAnswer = index === currentQuestion.correctAnswer;
                  // Show correct answer in green when question is locked
                  const showAsCorrect = showFeedback && questionLocked && isCorrectAnswer && isCorrect;
                  const showAsIncorrect = showFeedback && !questionLocked && evaluatedAnswer === index.toString();

                  return (
                    <div
                      key={index}
                      onClick={() => handleAnswerSelect(index.toString())}
                      className={`p-3 rounded ${questionLocked ? 'cursor-not-allowed' : 'cursor-pointer'} transition-all ${
                        showAsCorrect
                          ? "bg-green-50"
                          : showAsIncorrect
                            ? "bg-red-100"
                            : isSelected
                              ? "bg-blue-100"
                              : "bg-gray-100 hover:bg-gray-200"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-gray-900 leading-relaxed font-bold text-xs">
                          {choice}
                        </p>
                        {showAsCorrect && (
                          <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 ml-3" />
                        )}
                      </div>
                    </div>
                  );
                },
              )}
            </div>

            {showFeedback && questionLocked && (
              <div
                className="p-3 rounded-lg mb-6 flex items-start gap-2 bg-green-50 text-green-800 text-xs leading-relaxed"
              >
                <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <p>
                  That's right! The heatmap shows you focused on the first paragraph, where the text mentions the excessive use of "lighting, heating, cooling and electricity" which directly implies the need to reassess their consumption.
                </p>
              </div>
            )}

            {showFeedback && !questionLocked && (
              <div
                className="p-3 rounded-lg mb-6 flex items-start gap-2 bg-red-50 text-red-800 text-xs leading-relaxed"
              >
                <XCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <p>
                  Not quite. You selected: "{currentQuestion.choices[parseInt(evaluatedAnswer)]}". Try looking at the passage again. The correct answer directly relates to the main point discussed in the text.
                </p>
              </div>
            )}

            <div className="mt-auto">
              {!showFeedback ? (
                <Button
                  onClick={handleSubmit}
                  disabled={!selectedAnswer}
                  className={`w-full ${
                    !selectedAnswer 
                      ? 'bg-gray-300 hover:bg-gray-300 cursor-not-allowed' 
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  Submit Answer
                </Button>
              ) : questionLocked ? (
                <Button
                  onClick={handleNext}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  Good Job - Next Question
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={!selectedAnswer}
                  className="w-full bg-red-600 hover:bg-red-700"
                >
                  Submit Again
                </Button>
              )}
            </div>
          </>
        </div>
      </div>
    </div>
  );
}