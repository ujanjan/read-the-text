import { useState, useRef } from 'react';
import { ReadingComprehension } from './components/ReadingComprehension';
import { CursorTracker, CursorData } from './components/CursorTracker';
import { CursorTrackingData } from './components/CursorTrackingData';
import { CursorHeatmap, CursorHeatmapHandle } from './components/CursorHeatmap';
//import { RealtimeCursorIndicator } from './components/RealtimeCursorIndicator';
import { Button } from './components/ui/button';
import { Card } from './components/ui/card';
import { MousePointer2, MousePointerClick } from 'lucide-react';
import { toCanvas } from 'html-to-image';

const samplePassage = `A Flowery Past

The traditional way to study ancient vegetation has been to analyze pollen preserved in peat or lake sediments. However, pollen samples are often dominated by wind-pollinated plants with abundant pollen, which means that insect-pollinated species with low pollen production were frequently underestimated.

In recent years, researchers have begun using ancient DNA rather than pollen to reconstruct past ecosystems. In Arctic permafrost, well-preserved plant remains, fossilized feces, and other materials allow genetic information to be extracted. In a study published in Nature, researchers collected sediment samples from 21 Arctic sites. After dating the samples with the carbon-14 method and analyzing their DNA, they could trace how vegetation in the tundra changed over the past 50,000 years.

They found that species diversity used to be much higher than today. For long periods, flowering herbs dominated the Arctic landscape. DNA from the stomach contents of mammals such as mammoth, woolly rhinoceros, bison, and horse showed that these animals preferred protein-rich flowering herbs over grass. Their grazing likely helped maintain species-rich environments similar to traditional meadows.

But toward the last glacial maximum, biodiversity began to decline, and about 10,000 years ago the flowering meadows were replaced by wetter tundra dominated by grasses and sedges. As temperatures rose and ice sheets melted, grasses became more widespread. Because grass is difficult to digest and less nutritious, the populations of large herbivores decreased, breaking the ecological interaction between flowering meadows and grazing megafauna.`;

const sampleQuestions = [
  {
    id: 1,
    question: 'How did the researchers arrive at the described results regarding Arctic vegetation?',
    choices: [
      'By using modern genetic techniques to compare ancient pollen with present-day pollen.',
      'By combining age determination with genetic information.',
      'By comparing old and new DNA.',
      'Distrust of traditional pollen analysis'
    ],
    correctAnswer: 2
  },
  {
    id: 2,
    question: 'What causes coral bleaching?',
    choices: [
      'Too many fish species',
      'Rising ocean temperatures',
      'Excessive rainfall',
      'Strong ocean currents'
    ],
    correctAnswer: 1
  },
  {
    id: 3,
    question: 'How much coral cover has the Great Barrier Reef lost since 1995?',
    choices: [
      'About one-quarter',
      'Nearly all of it',
      'About half',
      'Less than 10%'
    ],
    correctAnswer: 2
  },
  {
    id: 4,
    question: 'Why are coral reefs called the "rainforests of the sea"?',
    choices: [
      'They receive a lot of rainfall',
      'They are located in tropical areas',
      'They have remarkable biodiversity',
      'They are green in color'
    ],
    correctAnswer: 2
  }
];

export default function App() {
  const [trackingEnabled, setTrackingEnabled] = useState(false);
  const [cursorHistory, setCursorHistory] = useState<CursorData[]>([]);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  //const [showRealtimeIndicator, setShowRealtimeIndicator] = useState(true);

  // 🔹 Ref to control the CursorHeatmap (for saving image)
  const heatmapRef = useRef<CursorHeatmapHandle | null>(null);
  // 🔹 Ref to the passage container for screenshot capture
  const passageRef = useRef<HTMLDivElement>(null);

  const handleCursorData = (data: CursorData) => {
    setCursorHistory(prev => [...prev, data]);
  };

  const clearCursorHistory = () => {
    setCursorHistory([]);
  };

  const handleToggleTracking = () => {
    setTrackingEnabled(!trackingEnabled);
  };

  const handleCaptureScreenshot = async () => {
    if (!passageRef.current) {
      return;
    }

    try {
      // Capture using html-to-image (supports oklch natively)
      const canvas = await toCanvas(passageRef.current, {
        backgroundColor: '#ffffff',
        useCORS: true,
        pixelRatio: window.devicePixelRatio || 1,
      });

      // If heatmap is visible, composite it onto the screenshot
      if (showHeatmap && heatmapRef.current) {
        const heatmapCanvas = heatmapRef.current.getCanvas();
        if (heatmapCanvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            // Get the bounding rect of the passage container
            const rect = passageRef.current.getBoundingClientRect();
            
            // Save the current context state
            ctx.save();
            
            // Apply the heatmap opacity (0.6) when compositing
            ctx.globalAlpha = 0.6;
            
            // Draw the heatmap canvas onto the passage screenshot
            // The heatmap is full viewport, so we need to crop to the passage area
            ctx.drawImage(
              heatmapCanvas,
              rect.left, rect.top, rect.width, rect.height, // Source: crop heatmap to passage area
              0, 0, canvas.width, canvas.height // Destination: full canvas
            );
            
            // Restore the context state
            ctx.restore();
          }
        }
      }

      const dataUrl = canvas.toDataURL('image/png');
      setScreenshot(dataUrl);
    } catch (error) {
      console.error('Failed to capture screenshot:', error);
      alert('Failed to capture screenshot. Check console for details.');
    }
  };

  return (
    <div className="h-screen bg-gray-50 p-4 flex flex-col">
      <div className="max-w-[1600px] mx-auto w-full flex flex-col flex-1 min-h-0">
        <div className="mb-3 flex items-start justify-between flex-shrink-0">
          <div>
            <h1 className="text-gray-900">Reading Comprehension</h1>
            <p className="text-gray-600 text-sm">
              Read the passage carefully and answer the questions below.
            </p>
          </div>
          
          <Button
            variant={trackingEnabled ? 'destructive' : 'default'}
            size="sm"
            onClick={handleToggleTracking}
            className="text-xs"
          >
            {trackingEnabled ? (
              <>
                <MousePointerClick className="h-4 w-4 mr-1" />
                Stop Tracking
              </>
            ) : (
              <>
                <MousePointer2 className="h-4 w-4 mr-1" />
                Start Cursor Tracking
              </>
            )}
          </Button>
        </div>
        
        <div className="flex-1 min-h-0 flex gap-3">
          <div className="flex-1 min-h-0">
            <ReadingComprehension 
              ref={passageRef}
              passage={samplePassage} 
              questions={sampleQuestions}
            />
          </div>
          
          <div className="w-80 flex-shrink-0">
            {trackingEnabled ? (
              <CursorTrackingData 
                cursorHistory={cursorHistory}
                onClear={clearCursorHistory}
                screenshot={screenshot}
                showHeatmap={showHeatmap}
                onToggleHeatmap={() => setShowHeatmap(!showHeatmap)}
                onSaveHeatmap={() => heatmapRef.current?.saveImage()}
                onSaveScreenshot={handleCaptureScreenshot}
                heatmapRef={heatmapRef}
              />
            ) : (
              <Card className="h-full flex items-center justify-center p-4">
                <p className="text-sm text-gray-500 text-center">
                  Start cursor tracking to view controls and data
                </p>
              </Card>
            )}
          </div>
        </div>
      </div>

      <CursorTracker 
        onCursorData={handleCursorData}
        enabled={trackingEnabled}
      />

      {trackingEnabled && showHeatmap && (
        <CursorHeatmap 
          ref={heatmapRef}
          cursorHistory={cursorHistory}
          opacity={0.6}
          radius={40}
          containerRef={passageRef}
        />
      )}
    </div>
  );
}
