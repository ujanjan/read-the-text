import { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Download, Eye, EyeOff, Trash2, MousePointer2, Flame, Camera, Sparkles, Loader2 } from 'lucide-react';
import { CursorData } from './CursorTracker';
import { CursorHeatmapHandle } from './CursorHeatmap';
import { analyzeReadingBehavior } from '../services/geminiService';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';

// Component to format tips with markdown support
function FormattedTips({ text }: { text: string }) {
  // Split by double newlines to create paragraphs
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim());
  
  const formatText = (text: string): (string | JSX.Element)[] => {
    const parts: (string | JSX.Element)[] = [];
    let lastIndex = 0;
    const boldRegex = /\*\*(.+?)\*\*/g;
    let match;
    let keyCounter = 0;
    const matches: Array<{ index: number; length: number; text: string }> = [];

    // Collect all bold matches first
    while ((match = boldRegex.exec(text)) !== null) {
      matches.push({
        index: match.index,
        length: match[0].length,
        text: match[1],
      });
    }

    // Process text with bold formatting and newlines
    if (matches.length === 0) {
      // No bold formatting, just handle newlines
      const lines = text.split('\n');
      lines.forEach((line, lineIdx) => {
        if (lineIdx > 0) {
          parts.push(<br key={`br-${keyCounter++}`} />);
        }
        parts.push(line);
      });
    } else {
      // Process with bold formatting
      matches.forEach((boldMatch, matchIdx) => {
        // Add text before this bold match
        if (boldMatch.index > lastIndex) {
          const beforeText = text.substring(lastIndex, boldMatch.index);
          const lines = beforeText.split('\n');
          lines.forEach((line, lineIdx) => {
            if (lineIdx > 0) {
              parts.push(<br key={`br-${keyCounter++}`} />);
            }
            if (line) {
              parts.push(line);
            }
          });
        }
        // Add bold text
        parts.push(
          <strong key={`bold-${keyCounter++}`} className="font-semibold text-gray-900">
            {boldMatch.text}
          </strong>
        );
        lastIndex = boldMatch.index + boldMatch.length;
      });

      // Add remaining text after last bold match
      if (lastIndex < text.length) {
        const remainingText = text.substring(lastIndex);
        const lines = remainingText.split('\n');
        lines.forEach((line, lineIdx) => {
          if (lineIdx > 0) {
            parts.push(<br key={`br-${keyCounter++}`} />);
          }
          if (line) {
            parts.push(line);
          }
        });
      }
    }

    return parts.length > 0 ? parts : [text];
  };
  
  return (
    <div className="space-y-3">
      {paragraphs.map((paragraph, idx) => {
        const content = formatText(paragraph);

        return (
          <p key={idx} className="leading-relaxed">
            {content}
          </p>
        );
      })}
    </div>
  );
}

interface CursorTrackingDataProps {
  cursorHistory: CursorData[];
  onClear: () => void;
  screenshot: string | null;
  showHeatmap: boolean;
  onToggleHeatmap: () => void;
  onSaveHeatmap: () => void;
  onSaveScreenshot: () => Promise<string | null>;
  heatmapRef: React.RefObject<CursorHeatmapHandle | null>;
  passage: string;
}

export function CursorTrackingData({ 
  cursorHistory, 
  onClear, 
  screenshot,
  showHeatmap,
  onToggleHeatmap,
  onSaveHeatmap,
  onSaveScreenshot,
  heatmapRef,
  passage
}: CursorTrackingDataProps) {
  const [showData, setShowData] = useState(false);
  const [showScreenshotDialog, setShowScreenshotDialog] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [tips, setTips] = useState<string>('');
  const [analysisError, setAnalysisError] = useState<string>('');
  const [analysisStage, setAnalysisStage] = useState<'idle' | 'capturing-screenshot' | 'preparing-json' | 'analyzing'>('idle');

  const downloadData = () => {
    const dataStr = JSON.stringify(cursorHistory, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cursor-tracking-data-${new Date().toISOString()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadCSV = () => {
    const csv = [
      ['Timestamp', 'X', 'Y', 'Time (ISO)'],
      ...cursorHistory.map(d => [
        d.timestamp,
        d.x.toFixed(2),
        d.y.toFixed(2),
        new Date(d.timestamp).toISOString()
      ])
    ].map(row => row.join(',')).join('\n');

    const dataBlob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cursor-tracking-data-${new Date().toISOString()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getDataSummary = () => {
    if (cursorHistory.length === 0) return null;

    const startTime = cursorHistory[0].timestamp;
    const endTime = cursorHistory[cursorHistory.length - 1].timestamp;
    const duration = (endTime - startTime) / 1000; // seconds

    return {
      totalPoints: cursorHistory.length,
      duration: duration.toFixed(1),
      startTime: new Date(startTime).toLocaleTimeString(),
      endTime: new Date(endTime).toLocaleTimeString()
    };
  };

  const downloadScreenshot = () => {
    if (!screenshot) return;

    const link = document.createElement('a');
    link.href = screenshot;
    link.download = `reading-passage-screenshot-${new Date().toISOString()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAnalyzeWithGemini = async () => {
    // Validate required data
    if (!passage) {
      setAnalysisError('Reading passage is required for analysis.');
      return;
    }

    if (cursorHistory.length === 0) {
      setAnalysisError('No cursor tracking data available. Please start tracking your cursor movements.');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError('');
    setTips('');
    setAnalysisStage('idle');

    try {
      let currentScreenshot = screenshot;

      // Step 1: Capture screenshot if not available
      if (!currentScreenshot && showHeatmap) {
        setAnalysisStage('capturing-screenshot');
        currentScreenshot = await onSaveScreenshot();
        // Small delay to show the stage
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      // Step 2: Prepare JSON data
      setAnalysisStage('preparing-json');
      // JSON is already prepared (cursorHistory), but we show the stage
      await new Promise(resolve => setTimeout(resolve, 300));

      // Step 3: Analyze with Gemini
      setAnalysisStage('analyzing');
      const result = await analyzeReadingBehavior(
        passage,
        currentScreenshot,
        cursorHistory
      );

      if (result.error) {
        setAnalysisError(result.error);
        setTips('');
      } else {
        setTips(result.tips);
        setAnalysisError('');
      }
    } catch (error: any) {
      setAnalysisError(error.message || 'Failed to analyze reading behavior.');
      setTips('');
    } finally {
      setIsAnalyzing(false);
      setAnalysisStage('idle');
    }
  };

  const summary = getDataSummary();

  return (
    <Card className="p-3 h-full flex flex-col">
      {/* Controls Section */}
      <div className="mb-3 pb-3 border-b border-gray-200 flex-shrink-0">
        <h3 className="text-sm font-semibold mb-2 text-gray-700">Controls</h3>
        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onToggleHeatmap}
            className="text-xs w-full justify-start"
          >
            <Flame className="h-4 w-4 mr-2" />
            {showHeatmap ? 'Hide' : 'Show'} Heatmap
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onSaveHeatmap}
            className="text-xs w-full justify-start"
            disabled={cursorHistory.length === 0}
          >
            <Flame className="h-4 w-4 mr-2" />
            Save Heatmap
          </Button>

          {showHeatmap && (
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await onSaveScreenshot();
              }}
              className="text-xs w-full justify-start"
            >
              <Camera className="h-4 w-4 mr-2" />
              Save Screenshot
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleAnalyzeWithGemini}
            className="text-xs w-full justify-start"
            disabled={isAnalyzing || cursorHistory.length === 0 || !passage}
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {analysisStage === 'capturing-screenshot' && 'Capturing screenshot...'}
                {analysisStage === 'preparing-json' && 'Preparing JSON data...'}
                {analysisStage === 'analyzing' && 'Analyzing with Gemini...'}
                {analysisStage === 'idle' && 'Processing...'}
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Analyze with Gemini
              </>
            )}
          </Button>
          
          {isAnalyzing && (
            <div className="text-xs text-gray-600 mt-2 space-y-1">
              {analysisStage === 'capturing-screenshot' && (
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                  <span>Capturing screenshot with heatmap...</span>
                </div>
              )}
              {analysisStage === 'preparing-json' && (
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  <span>Preparing cursor tracking data...</span>
                </div>
              )}
              {analysisStage === 'analyzing' && (
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse" />
                  <span>Sending data to Gemini API...</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Reading Tips Section */}
      {(tips || analysisError) && (
        <div className="mb-3 pb-3 border-b border-gray-200 flex-shrink-0">
          <h3 className="text-sm font-semibold mb-2 text-gray-700 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-600" />
            Reading Tips
          </h3>
          {analysisError && (
            <div className="text-xs text-red-600 bg-red-50 p-2 rounded mb-2">
              {analysisError}
            </div>
          )}
          {tips && (
            <div className="text-xs text-gray-700 bg-purple-50 p-3 rounded">
              <FormattedTips text={tips} />
            </div>
          )}
        </div>
      )}

      {/* Cursor Data Section */}
      <div className="flex items-center justify-between mb-2 flex-shrink-0">
        <div className="flex items-center gap-2">
          <MousePointer2 className="h-4 w-4 text-blue-600" />
          <h3 className="text-sm font-semibold text-gray-700">Cursor Data</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowData(!showData)}
          className="h-7 w-7 p-0"
        >
          {showData ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
        </Button>
      </div>

      <div className="space-y-2 flex-1 min-h-0 flex flex-col">
        {summary && (
          <div className="text-xs text-gray-600 space-y-0.5 flex-shrink-0">
            <div>Hover points: {summary.totalPoints}</div>
            <div>Duration: {summary.duration}s</div>
            <div className="pt-1 border-t border-gray-200 space-y-0.5">
              <div>Start: {summary.startTime}</div>
              <div>End: {summary.endTime}</div>
            </div>
          </div>
        )}

        {screenshot && (
          <div className="flex-shrink-0 pt-2 border-t border-gray-200">
            <div className="text-xs text-gray-600 mb-2">Screenshot</div>
            <div
              onClick={() => setShowScreenshotDialog(true)}
              className="cursor-pointer rounded border border-gray-300 overflow-hidden bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <img
                src={screenshot}
                alt="Reading passage screenshot"
                className="w-full h-auto"
                style={{ maxHeight: '120px', objectFit: 'contain' }}
              />
            </div>
          </div>
        )}

        {showData && cursorHistory.length > 0 && (
          <div className="flex-1 min-h-0 overflow-y-auto bg-gray-50 p-2 rounded text-xs">
            <div className="space-y-1">
              {cursorHistory.slice(-15).map((data, idx) => (
                <div key={idx} className="font-mono text-gray-600 text-[10px]">
                  ({data.x.toFixed(0)}, {data.y.toFixed(0)})
                  {' '}
                  <span className="text-gray-400">
                    {new Date(data.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
              {cursorHistory.length > 15 && (
                <div className="text-gray-500 italic text-[10px]">
                  ... and {cursorHistory.length - 15} more
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-1.5 flex-shrink-0">
          <Button
            onClick={downloadCSV}
            size="sm"
            disabled={cursorHistory.length === 0}
            className="flex-1 text-[11px] h-7 px-2"
          >
            <Download className="h-3 w-3 mr-1" />
            CSV
          </Button>
          <Button
            onClick={downloadData}
            size="sm"
            disabled={cursorHistory.length === 0}
            className="flex-1 text-[11px] h-7 px-2"
          >
            <Download className="h-3 w-3 mr-1" />
            JSON
          </Button>
          <Button
            onClick={onClear}
            variant="destructive"
            size="sm"
            disabled={cursorHistory.length === 0}
            className="text-[11px] h-7 px-2"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <Dialog open={showScreenshotDialog} onOpenChange={setShowScreenshotDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Reading Passage Screenshot</DialogTitle>
          </DialogHeader>
          <div className="overflow-auto max-h-[70vh] flex justify-center">
            {screenshot && (
              <img
                src={screenshot}
                alt="Reading passage screenshot"
                className="max-w-full h-auto"
              />
            )}
          </div>
          <DialogFooter>
            <Button onClick={downloadScreenshot} disabled={!screenshot}>
              <Download className="h-4 w-4 mr-2" />
              Download Screenshot
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}