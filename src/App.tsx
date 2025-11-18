import React, { useState, useRef } from 'react';
import { ReadingComprehension } from './components/ReadingComprehension';
import { CursorTracker, CursorData } from './components/CursorTracker';
import { CursorTrackingData } from './components/CursorTrackingData';
import { CursorHeatmap, CursorHeatmapHandle } from './components/CursorHeatmap';
//import { RealtimeCursorIndicator } from './components/RealtimeCursorIndicator';
import { Button } from './components/ui/button';
import { Card } from './components/ui/card';
import { MousePointer2, MousePointerClick, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { toCanvas } from 'html-to-image';

const sampleTitle = `A Flowery Past`;

const samplePassage = `The traditional way to study ancient vegetation has been to analyze pollen preserved in peat or lake sediments. However, pollen samples are often dominated by wind-pollinated plants with abundant pollen, which means that insect-pollinated species with low pollen production were frequently underestimated.

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
    question: 'What was the main limitation of the traditional pollen analysis method mentioned in the passage?',
    choices: [
      'It could not extract DNA from preserved samples.',
      'It often underestimated insect-pollinated species with low pollen production.',
      'It required samples from 21 different sites.',
      'It could not determine the age of samples accurately.'
    ],
    correctAnswer: 1
  },
  {
    id: 3,
    question: 'What did the researchers discover about Arctic vegetation in the past compared to today?',
    choices: [
      'Species diversity was much lower in the past.',
      'Grasses and sedges dominated the landscape for 50,000 years.',
      'Species diversity used to be much higher than today.',
      'Flowering herbs were never common in the Arctic.'
    ],
    correctAnswer: 2
  },
  {
    id: 4,
    question: 'According to the passage, why did large herbivore populations decrease about 10,000 years ago?',
    choices: [
      'Because flowering herbs became less nutritious.',
      'Because grasses became more widespread and are difficult to digest and less nutritious.',
      'Because the Arctic became too cold for large mammals.',
      'Because there were no more flowering meadows available.'
    ],
    correctAnswer: 1
  }
];

export default function App() {
  const [trackingEnabled, setTrackingEnabled] = useState(false);
  const [cursorHistory, setCursorHistory] = useState<CursorData[]>([]);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
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

  const handleCaptureScreenshot = async (): Promise<string | null> => {
    if (!passageRef.current) {
      return null;
    }

    try {
      const pixelRatio = window.devicePixelRatio || 1;
      const rect = passageRef.current.getBoundingClientRect();
      
      // Capture using html-to-image (supports oklch natively)
      const canvas = await toCanvas(passageRef.current, {
        backgroundColor: '#ffffff',
        pixelRatio: pixelRatio,
      });

      // If heatmap is visible, composite it onto the screenshot
      if (showHeatmap && heatmapRef.current) {
        const heatmapCanvas = heatmapRef.current.getCanvas();
        if (heatmapCanvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            // The heatmap canvas is already sized to match the container exactly
            // and contains only container-relative coordinates (0,0 to width,height)
            // So we can draw it directly without cropping
            
            // However, we need to account for pixel ratio differences
            // The screenshot canvas might be at a different scale than the heatmap canvas
            const screenshotWidth = canvas.width;
            const screenshotHeight = canvas.height;
            const heatmapWidth = heatmapCanvas.width;
            const heatmapHeight = heatmapCanvas.height;
            
            // Save the current context state
            ctx.save();
            
            // Apply the heatmap opacity (0.6) when compositing
            ctx.globalAlpha = 0.6;
            
            // Draw the entire heatmap canvas onto the screenshot
            // Scale it to match the screenshot dimensions exactly
            ctx.drawImage(
              heatmapCanvas,
              0, 0, heatmapWidth, heatmapHeight, // Source: entire heatmap canvas
              0, 0, screenshotWidth, screenshotHeight // Destination: full screenshot canvas
            );
            
            // Restore the context state
            ctx.restore();
          }
        }
      }

      const dataUrl = canvas.toDataURL('image/png');
      setScreenshot(dataUrl);
      return dataUrl;
    } catch (error) {
      console.error('Failed to capture screenshot:', error);
      alert('Failed to capture screenshot. Check console for details.');
      return null;
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
          
          <div className="flex items-center gap-2">
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
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSidebar(!showSidebar)}
              className="text-xs"
              title={showSidebar ? 'Hide sidebar' : 'Show sidebar'}
            >
              {showSidebar ? (
                <PanelRightClose className="h-4 w-4" />
              ) : (
                <PanelRightOpen className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        
        <div className="flex-1 min-h-0 flex gap-3">
          <div className="flex-1 min-h-0">
            <ReadingComprehension 
              ref={passageRef}
              title={sampleTitle}
              passage={samplePassage} 
              questions={sampleQuestions}
              cursorHistory={cursorHistory}
              screenshot={screenshot}
              onCaptureScreenshot={handleCaptureScreenshot}
            />
          </div>
          
          {showSidebar && (
            <div className="w-80 flex-shrink-0">
              <CursorTrackingData 
                cursorHistory={cursorHistory}
                onClear={clearCursorHistory}
                screenshot={screenshot}
                showHeatmap={showHeatmap}
                onToggleHeatmap={() => setShowHeatmap(!showHeatmap)}
                onSaveHeatmap={() => heatmapRef.current?.saveImage()}
                onSaveScreenshot={handleCaptureScreenshot}
                heatmapRef={heatmapRef}
                title={sampleTitle}
                passage={samplePassage}
              />
            </div>
          )}
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
