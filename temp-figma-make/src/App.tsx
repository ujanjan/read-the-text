import { useState, useRef } from 'react';
import { ReadingComprehension } from './components/ReadingComprehension';
import { CursorTracker, CursorData } from './components/CursorTracker';
import { CursorTrackingData } from './components/CursorTrackingData';
import { CursorHeatmap, CursorHeatmapHandle } from './components/CursorHeatmap';
import { LandingPage } from './components/LandingPage';
import { Questionnaire } from './components/Questionnaire';
//import { RealtimeCursorIndicator } from './components/RealtimeCursorIndicator';
import { Button } from './components/ui/button';
import { MousePointer2, MousePointerClick, Flame, Info } from 'lucide-react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const readingTexts = [
  {
    title: "Animal Life",
    passage: `Animal Life

It took a mere 85 million years – the geologic blink of an eye – for animals to evolve and radiate out over much of the world's land and oceans. Although fossil records and molecular biology have provided much information on the spread of animal life, scientists have not been able to figure out exactly what sparked this massive diversification. New research shows that nutrient-rich runoff from massive melting glaciers may have provided the extra energy needed to fuel this dramatic evolution.`,
    question: "What is said about evolution in this text?",
    choices: [
      "Historically, many animals have early global warming to thank for it.",
      "The extensive spread of animals across our globe can, with certainty, tell us about the conditions on our globe millions of years ago.",
      "A severe shift in the temperature on our planet was probably helped by melting ice.",
      "Millions of years ago, melting led to an end to animal life on earth."
    ],
    correctAnswer: 2
  },
  {
    title: "Saying it with Flowers",
    passage: `Saying it with Flowers

Bronze Age burials containing pollen from an aromatic plant suggest that floral tribute was an ancient custom in Scotland. Recent excavation of five burial sites has corroborated data from two earlier excavations showing that plants were deposited by people, not by natural processes. The discovery of Filipendula pollen, probably from the plant meadowsweet, has led Scottish archaeologist Richard Tipping to speculate that the plant may have been used in graveside offerings—in bread, as a flavoring in honey or mead, or as a bouquet or floral covering. Meadowsweet is described in herbal literature as having a pleasant scent. Whether it was used in ancient times to raise the spirit of mourners or to counteract the smell of rotten flesh has remained unclear.`,
    question: "What conclusion has been drawn from the findings described in the text?",
    choices: [
      "The traces of flowers in the ancient graves are the results of human activity",
      "Dead people's enemies in Scotland during the Bronze Age were performed according to a strict ritual",
      "The people buried in the excavated graves had a high and respected position in society",
      "Pollen is a natural ingredient in the soil found at the excavated sites"
    ],
    correctAnswer: 0
  },
  {
    title: "The Great Lakes",
    passage: `The Great Lakes

The Great Lakes are undergoing "an ecological catastrophe unlike any this continent has seen," according to Pulitzer Prize finalist Dan Egan. Humans have dramatically altered the lakes' fauna since invasive species first snuck up through the man-made Saint Lawrence Seaway. Blunders sometimes stemmed from well-meaning policies. Researchers imported Asian carp to kill river nuisances without chemicals, and now some worry the fish has silently invaded Lake Michigan's floor via the Chicago Sanitary and Ship Canal. And the lakes' imported problems are quickly becoming national disasters, such as the tiny and quick-spawning quagga mussel that has infested regions as far away as Lake Mead and Lake Powell on the Colorado River.`,
    question: "What is implied here?",
    choices: [
      "Measures against environmental destruction tend to be taken only when it is already too late.",
      "Environmental damage caused by chemical waste is usually very difficult to repair.",
      "It is difficult to establish who should have the responsibility for effects on the environment.",
      "Predicting the consequences of actions to protect the environment can be difficult."
    ],
    correctAnswer: 3
  },
  {
    title: "American Folk Music",
    passage: `American Folk Music

The national treasure that is American folk and country music came over on boats from the British Isles in the 17th century, especially the Scots-Irish borderlands. It traveled down the Appalachian – via fiddle, banjo and guitar – in ballads and hymns, the words changing into new songs but the music immutable. For example, it was the first music that the great American songwriter Woody Guthrie ever heard: his mother singing Anglo-Celtic ballads in a high nasal country twang at their home outside Okemah, Oklahoma.`,
    question: "What is said here about the relationship between British and American folk songs?",
    choices: [
      "The British melodies were combined with new lyrics were replaced.",
      "The original British folk songs developed beyond recognition.",
      "American folk music gradually lost touch with its British roots.",
      "American folk singers combined British lyrics with new music."
    ],
    correctAnswer: 0
  },
  {
    title: "New Scotland Yard",
    passage: `New Scotland Yard

New Scotland Yard may be a beacon of law and order in the heart of London, but the sight of its lights burning through the night has taken on a different meaning. Staff at the HQ of the Metropolitan Police use so much lighting, heating, cooling and electricity that the tower pumps out 13,491 tonnes of carbon dioxide a year – equivalent to about 2,200 households. It makes it the most polluting police station in England and Wales and one of the biggest contributors to greenhouse gases of any public building in Britain.`,
    question: "What is indicated here?",
    choices: [
      "The Metropolitan Police are working hard to cut down on greenhouse gases.",
      "New Scotland Yard need to reassess their consumption of electricity.",
      "The Metropolitan Police have never been a guiding light for people in London.",
      "New Scotland Yard have lost the confidence of the British people."
    ],
    correctAnswer: 1
  },
  {
    title: "Men and Women",
    passage: `Men and Women

Biologically speaking, the male is the weaker sex in most respects. One important consequence is that women are more likely than men to experience the death of their spouse and that the marriage market for widows is more restricted than that for widowers.`,
    question: "What does the writer suggest?",
    choices: [
      "It is uncertain whether a death in the family affects a man more than a woman or vice versa.",
      "Within one year of becoming widowed, men are more likely to die than women.",
      "Women who remarry live longer than those who remain widowed.",
      "Women generally cope better with death than men."
    ],
    correctAnswer: 1
  },
  {
    title: "The Mayas",
    passage: `The Mayas

As recently as 30 years ago, many archaeologists imagined the Mayas as peaceful mystics, their lives focused on stately ceremonial centers where astronomer-priests interpreted the stars. However, that picture faded in the 1960s and 1970s as a breed of anthropologists known as epigraphers cracked the complex hieroglyphic system of Maya writing. The glyphs told a lively story of politics and warfare, and the ceremonial centers became  quarrelsome city-states. Now, with a new reading of texts from sites throughout the Maya heartland in Mexico, Guatemala, and Belize, the Mayas have taken another step toward modernity. It seems as if most of the individual city-states were tied in two large, durable alliances. Like NATO and the Warsaw Pact, each alliance was led by a dominant power.`,
    question: "What is the writer's main idea?",
    choices: [
      "That as archaeologists get more information, largest from a peaceful society that is a picture wildlife one.",
      "Hieroglyphic scripts never tell us the truth and it is not possible to show that the ancient Maya lived in violent times not with each other",
      "That new discoveries by archaeologists about the ancient Maya were originally believed",
      "Younger and old discoveries the Mayan will always remain a mystery"
    ],
    correctAnswer: 2
  },
  {
    title: "Rock Posters",
    passage: `Rock Posters

The vibrating colors and illegible typographic lettering of psychedelic concert posters in the late 60's gave us a universal graphic language for the hippie sex, drugs and rock'n'roll era. Posters were designed to advertise bands, appeal to aficionados and off end everyone else. Hip-capitalist entrepreneurs, however, quickly reduced real psychedelia to a youth-culture style that sold everything from tie-dyed neckties to Volkswagen vans. What came next, in the 70's, was punk music – and an anarchic graphic sensibility typified by D.I.Y. (Do It Yourself ), a deliberately clumsy hodgepodge of images that were cut and pasted and frequently stolen and photocopied. Punk was known for its ransom-note aesthetic; it broke the tenets of legibility but telegraphed clear-coded mes sages to its audience.`,
    question: "It is possible to note from the passage that which of the following statements is true of psychedelic concert posters?",
    choices: [
      "That their design is slightly out of keeping with the music",
      "They appeared in both the younger and the older generation.",
      "They cite not the tact to have been particularly easy to read and understand but convey a certain style and mood.",
      "They were made of high quality materials so that they would last longer"
    ],
    correctAnswer: 2
  },
  {
    title: "Therapy",
    passage: `Therapy

The brains of depressed people respond differently to cognitive therapy than to drug therapy, according to a University of Toronto study. Neither treatment appears to work better than the other, researchers found, but the difference should help doctors under stand why one treatment works for some but not for others.`,
    question: "What can be concluded from the text?",
    choices: [
      "That patients do not like the method",
      "It is likely possible to cure the treatment to individual patients",
      "Success of method a standard loved out to be equally effective for most individuals.",
      "It future use may be determined as a more individual basis than the power that art for in"
    ],
    correctAnswer: 3
  }
];

export default function App() {
  const [trackingEnabled, setTrackingEnabled] = useState(false);
  const [cursorHistory, setCursorHistory] = useState<CursorData[]>([]);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [quizStopped, setQuizStopped] = useState(false);
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [showCompletionPage, setShowCompletionPage] = useState(false);
  const [completedQuestions, setCompletedQuestions] = useState<number[]>([]);
  const [showLandingPage, setShowLandingPage] = useState(true);
  const [questionnaireSubmitted, setQuestionnaireSubmitted] = useState(false);
  //const [showRealtimeIndicator, setShowRealtimeIndicator] = useState(true);

  // 🔹 Ref to control the CursorHeatmap (for saving image)
  const heatmapRef = useRef<CursorHeatmapHandle | null>(null);

  const currentText = readingTexts[currentTextIndex];

  const handleCursorData = (data: CursorData) => {
    setCursorHistory(prev => [...prev, data]);
  };

  const clearCursorHistory = () => {
    setCursorHistory([]);
  };

  const handleToggleTracking = () => {
    setTrackingEnabled(!trackingEnabled);
  };

  const handleStopQuiz = () => {
    setQuizStopped(!quizStopped);
  };

  const handleEndQuiz = () => {
    setShowCompletionPage(true);
  };

  const handleReturnToFirstText = () => {
    setCurrentTextIndex(0);
    setShowCompletionPage(false);
  };

  const handleStartStudy = () => {
    setShowLandingPage(false);
    setTrackingEnabled(true);
  };

  const handleQuestionCompleted = (questionIndex: number) => {
    if (!completedQuestions.includes(questionIndex)) {
      setCompletedQuestions([...completedQuestions, questionIndex]);
    }
  };

  const handleNextText = () => {
    // Find the next uncompleted question
    let nextIndex = currentTextIndex + 1;
    while (nextIndex < readingTexts.length && completedQuestions.includes(nextIndex)) {
      nextIndex++;
    }

    if (nextIndex < readingTexts.length) {
      setCurrentTextIndex(nextIndex);
      setCursorHistory([]);
    } else {
      // No more uncompleted questions, go to ending page
      handleEndQuiz();
    }
  };

  const handlePreviousText = () => {
    if (showCompletionPage) {
      setShowCompletionPage(false);
    } else if (currentTextIndex > 0) {
      setCurrentTextIndex(currentTextIndex - 1);
      setCursorHistory([]);
    }
  };

  // Check if all questions are completed
  const allQuestionsCompleted = completedQuestions.length === readingTexts.length;

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {showLandingPage ? (
        <LandingPage onStart={handleStartStudy} />
      ) : (
      <div className="flex-1 flex flex-col min-h-0">
        {/* Header */}
        <div className="flex-shrink-0 px-6 py-3 bg-gray-50">
          <div className="flex items-center justify-between gap-6">
            <div className="flex-1 flex items-center justify-between">
              <div>
                <h1 className="text-gray-900" style={{ fontSize: '0.875rem', fontWeight: '600' }}>Reading Comprehension Learning Tool - User Testing</h1>
                <p className="text-gray-500" style={{ fontSize: '0.75rem' }}>
                  {showCompletionPage ? (questionnaireSubmitted ? '' : 'Questionnaire') : `Text ${currentTextIndex + 1} of ${readingTexts.length}`}
                </p>
              </div>
              {!showCompletionPage && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-center gap-2">
                  <Info className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
                  <span className="text-xs text-red-900"><span className="font-semibold">Remember!</span> Show your eyeline with your cursor</span>
                </div>
              )}
            </div>
            
            <div className="w-[600px] flex justify-end">
              <Button
                size="sm"
                onClick={handleEndQuiz}
                className="h-7 px-2 bg-red-600 hover:bg-red-700 text-white flex-shrink-0"
                style={{ fontSize: '0.75rem' }}
              >
                End Quiz
              </Button>
            </div>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="flex-1 min-h-0 flex px-6 pt-0 pb-4 gap-6">
          <div className="flex-1 min-h-0">
            {!showCompletionPage ? (
              <ReadingComprehension 
                passage={currentText.passage} 
                questions={[{
                  id: 1,
                  question: currentText.question,
                  choices: currentText.choices,
                  correctAnswer: currentText.correctAnswer
                }]}
                title={currentText.title}
                onNext={handleNextText}
                onPrevious={handlePreviousText}
                hasNext={currentTextIndex < readingTexts.length - 1 || !showCompletionPage}
                hasPrevious={currentTextIndex > 0}
                onQuestionCompleted={() => handleQuestionCompleted(currentTextIndex)}
              />
            ) : (
              <Questionnaire 
                onNext={handleNextText}
                onPrevious={handlePreviousText}
                hasNext={false}
                hasPrevious={true}
                onSubmit={() => setQuestionnaireSubmitted(true)}
              />
            )}
          </div>
        </div>
      </div>
      )}

      <CursorTracker 
        onCursorData={handleCursorData}
        enabled={trackingEnabled}
      />
    </div>
  );
}