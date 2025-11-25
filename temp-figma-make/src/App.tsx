import { useState, useRef } from 'react';
import { ReadingComprehension } from './components/ReadingComprehension';
import { CursorTracker, CursorData } from './components/CursorTracker';
import { CursorTrackingData } from './components/CursorTrackingData';
import { CursorHeatmap, CursorHeatmapHandle } from './components/CursorHeatmap';
import { LandingPage } from './components/LandingPage';
//import { RealtimeCursorIndicator } from './components/RealtimeCursorIndicator';
import { Button } from './components/ui/button';
import { MousePointer2, MousePointerClick, Flame } from 'lucide-react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const readingTexts = [
  {
    title: "Animal Life",
    passage: `Animal Life

It took a mere 85 million years – the geologic blink of an eye – for animals to evolve and radiate out near much of the year and the land was periodically washed by huge floods; nuclear biology has provided much of the framework on which modern sciences depends. Scientists have now filled in enough of the record to be able to figure out exactly what sparked this massive diversification. New research shows that the retreat of the final great massive melting glaciers may have provided the extra energy needed for the dramatic development.`,
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
    title: "Scents with Flowers",
    passage: `Scents with Flowers

Bronze Age burials containing pollen from an aromatic plant suggest that floral offerings was an ancient custom in Scotland. Recent excavation of five burial sites has corroborated data from two earlier excavations showing that plants were deposited by people into by natural processes, such as being blown in by the wind. Notably from the plant meadowsweet, has led Scottish archaeologists locally to suppose that the deceased may have been given floral offerings – in bread, as a flavoring in honey or mead, or as a bouquet or burial garland. Meadowsweet has a strong and herbal literature as having a pleasant scent. Whether it was used in ancient times to raise spirits at a funeral, or to mask or counteract the smell of rotten flesh has remained unclear.`,
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
    title: "Trygve Lie",
    passage: `Trygve Lie

The first Secretary-General of the United Nations was Trygve Lie the Norwegian statesman. He was a driven man with a vision in the aftermath of a devastating war. But Lies' readiness to wade in with his own opinions on any and every issue ran him into trouble in his own results. In supporting, in vain, Communist China's right to take its seat at the UN after the 1949 Revolution, he had Moscow's backing sighted and prepared to stand up to the US. But ultimately his passionate and humanitarian mission to halt the Korean War alienated him that enemy of the Soviet Union, which refused to take part in UN activities while he was present, forcing him to resign.`,
    question: "What was Trygve Lie like, according to the text?",
    choices: [
      "He was unable to cooperate with his staff",
      "He was a very outspoken person",
      "He was governed more by reason than by passion",
      "He was a dishonest and self-centred leader"
    ],
    correctAnswer: 1
  },
  {
    title: "The Great Lakes",
    passage: `The Great Lakes

The Great Lakes are undergoing "an ecological catastrophe unlike any this region has seen," according to Jack Trotter, president of the National Wildlife Federation. Algae mats, spurred by pollution, have dramatically altered the lakes' fauna since invasive species first snuck up through the man-made corridor in the St. Lawrence Seaway. Blunders sometimes stemmed from well-meaning policies. Researchers imported Asian carp from the South to clean up waste without chemicals, and now some worry the fish has silently invaded Lake Michigan and Wisconsin. Already such problems are quickly becoming national disasters, such as the tiny and quick-spawning zebra mussel which clogs pipes in infested regions as far away as Lake Mead and Lake Powell on the Colorado River.`,
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

The national heritage that is American folk and country music came over on boats from the British Isles in the 17th century, especially the Scots-Irish. Immigrants had traveled down the Appalachian – via fiddle, banjo and guitar – in ballads and hymns, and it spread quickly around the settled area. Cecil Sharp, the great English folklorist in his was the first music that the great American songwriter Woody Guthrie heard when he grew up amongst the Anglo-Celtic ballads in a high nasal country twang at their home outside Okemah, Oklahoma.`,
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

New Scotland Yard might not be a beacon of law and order in the heart of London, but the sight of its lights burning through the night has been taken as a different kind of light at the HQ of the Metropolitan Police use so much lighting, heating, cooling and electricity every year that they are using out 13,491 tonnes of carbon dioxide a year – equivalent to about 2,200 transatlantic flights. It makes the Met one of London's and England and Wales and for that the biggest contributors to greenhouse gas emissions of any public building in Britain.`,
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

Statistically speaking, the noise in the weather is so much respects that it is unlikely that men and women can be easily shown to experience the death of their spouse and that the marriage to widows and widowers are more likely to die within a year.`,
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
    title: "The Mayan",
    passage: `The Mayan

As recently as 30 years ago, many archaeologists imagined the ancient Maya to be peaceful astronomers occupied chiefly with charting the path of planets and stars. They were partly right. The Maya were remarkable astronomers. Yet they had another side. Mayan archaeologists knew of page-terrors marked the complex hieroglyphic writing. Now, with a new understanding of texts from sites throughout the Maya region and with new excavations from Aguateca Guatemala, what was once considered a mystery is finally becoming clear. Far from being philosophical or religious that relate solely to astronomy and what mystical any-rulers were sad to lose were, brutally ruthless. Put to put no uncertain terms, the Maya were always remain a mystery`,
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

The vibrating colors and illegible typography forming of psychedelic concert posters is the very big part of a movement in design of the 60s. The style was new, and exciting important and Posters were designed to advertise bands, dances, raves etc in cafeterias. The designers reflected the mood and the acid visual rock machines to folks imagination. While some of these posters are based on the actual acid trips by their creators, and other prints are just imitations of what the designers thought an drug vision to be admiration.`,
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

It is in tens of thousand typical interval self entirely to cognitive therapy then it is to try to prevent diseases. Most patients do not object the treatment being too long but the feel to of the discussing (asking questions taking cause patient to individual therapy patients)`,
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-gray-900" style={{ fontSize: '0.875rem', fontWeight: '600' }}>Reading Comprehension Learning Tool - User Testing</h1>
              <p className="text-gray-500" style={{ fontSize: '0.75rem' }}>
                {showCompletionPage ? 'Ending Page' : `Text ${currentTextIndex + 1} of ${readingTexts.length}`}
              </p>
            </div>
            
            <div className="flex gap-2 items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={handleStopQuiz}
                className="h-7 px-2 bg-yellow-50 hover:bg-yellow-100 border-yellow-200"
                style={{ fontSize: '0.75rem' }}
              >
                {quizStopped ? 'Start Quiz' : 'Stop Quiz'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleEndQuiz}
                className="h-7 px-2 bg-red-50 hover:bg-red-100 border-red-200"
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
              <div className="h-full flex items-center justify-center">
                <div className="bg-white rounded-lg shadow-sm w-[600px] h-full flex items-center justify-center">
                  <div className="text-center">
                    <h2 className="text-gray-900 mb-2">You have answered {completedQuestions.length}/{readingTexts.length} Questions correctly</h2>
                    <p className="text-gray-700 mb-6">Are you finished?</p>
                    <div className="flex gap-4 justify-center">
                      <Button
                        onClick={handleStopQuiz}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Yes I am done
                      </Button>
                      <Button
                        onClick={handleReturnToFirstText}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        No, I am not finished
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
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