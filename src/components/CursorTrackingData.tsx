import { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Download, Eye, EyeOff, Trash2, MousePointer2 } from 'lucide-react';
import { CursorData } from './CursorTracker';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';

interface CursorTrackingDataProps {
  cursorHistory: CursorData[];
  onClear: () => void;
  screenshot: string | null;
}

export function CursorTrackingData({ cursorHistory, onClear, screenshot }: CursorTrackingDataProps) {
  const [showData, setShowData] = useState(false);
  const [showScreenshotDialog, setShowScreenshotDialog] = useState(false);

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

  const summary = getDataSummary();

  return (
    <Card className="p-3 h-full flex flex-col">
      <div className="flex items-center justify-between mb-2 flex-shrink-0">
        <div className="flex items-center gap-2">
          <MousePointer2 className="h-4 w-4 text-blue-600" />
          <h3 className="text-sm">Cursor Data</h3>
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