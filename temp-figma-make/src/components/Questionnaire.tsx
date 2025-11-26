import { useState } from "react";
import { Button } from "./ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface QuestionnaireProps {
  onNext: () => void;
  onPrevious: () => void;
  hasNext: boolean;
  hasPrevious: boolean;
  onSubmit?: () => void;
}

export function Questionnaire({ onNext, onPrevious, hasNext, hasPrevious, onSubmit }: QuestionnaireProps) {
  const [responses, setResponses] = useState({
    question1: "",
    question2: "",
    question3: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const questions = [
    "What is your impression of the interface, as a tool for independent learning?",
    "What are your thoughts on the AI-generated feedback?",
    "Please share any general feedback you have about the application as a tool for learning?",
  ];

  const handleInputChange = (questionKey: string, value: string) => {
    setResponses({
      ...responses,
      [questionKey]: value,
    });
  };

  const handleSubmit = () => {
    setSubmitted(true);
    if (onSubmit) {
      onSubmit();
    }
  };

  const allAnswered = responses.question1 && responses.question2 && responses.question3;

  return (
    <div className="h-full flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-sm w-[800px] max-h-full overflow-y-auto">
        {!submitted && (
          <div className="px-8 py-3 flex items-center justify-between border-b border-gray-200">
            <h2 className="text-gray-900 font-medium">Feedback Questionnaire</h2>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={onPrevious}
                disabled={!hasPrevious}
                className="h-8 w-8"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onNext}
                disabled={!hasNext}
                className="h-8 w-8"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </div>
        )}
        
        <div className="px-8 pb-8 pt-4">
          {!submitted ? (
            <>
              <p className="text-gray-600 text-sm mb-4">
                Please take a moment to answer the following questions about your experience.
              </p>
              <div className="space-y-4">
                {questions.map((question, index) => (
                  <div key={index}>
                    <label className="block text-gray-900 mb-1.5 text-sm font-medium">
                      {index + 1}. {question}
                    </label>
                    <textarea
                      value={responses[`question${index + 1}` as keyof typeof responses]}
                      onChange={(e) =>
                        handleInputChange(`question${index + 1}`, e.target.value)
                      }
                      className="w-full min-h-[70px] p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y text-gray-900 text-sm"
                      placeholder="Type your answer here..."
                    />
                  </div>
                ))}

                <div className="pt-2">
                  <Button
                    onClick={handleSubmit}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    I am done, Please Submit!
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <div className="mb-4">
                <svg
                  className="w-16 h-16 text-green-600 mx-auto"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-gray-900 mb-2">Thank you for your feedback!</h3>
              <p className="text-gray-600">Your responses have been recorded.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}